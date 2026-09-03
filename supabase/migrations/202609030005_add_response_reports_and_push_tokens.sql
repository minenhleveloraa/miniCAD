-- MiniCAD response pipeline, reports, and push-token registry
--
-- Every operational mutation is exposed as a narrow RPC. Mobile clients never
-- receive direct UPDATE/INSERT privileges for incident ownership, status, or
-- reports, and push tokens are not readable through the public Data API.

create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null unique references public.incidents (id) on delete restrict,
  officer_id uuid not null references public.profiles (id) on delete restrict,
  actions_taken text not null,
  outcome text not null,
  resolved_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint incident_reports_actions_valid
    check (actions_taken = btrim(actions_taken) and char_length(actions_taken) between 10 and 2000),
  constraint incident_reports_outcome_valid
    check (outcome = btrim(outcome) and char_length(outcome) between 3 and 1000)
);

comment on table public.incident_reports is
  'Final officer-authored response record. One immutable report belongs to one resolved incident.';

create index incident_reports_officer_created_idx
  on public.incident_reports (officer_id, created_at desc);

create trigger incident_reports_set_updated_at
before update on public.incident_reports
for each row execute function public.set_updated_at();

alter table public.incident_reports enable row level security;

revoke all on table public.incident_reports from anon, authenticated;
grant select on table public.incident_reports to authenticated;

create policy incident_reports_dispatcher_select
on public.incident_reports
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'dispatcher'
);

create policy incident_reports_officer_select_own
on public.incident_reports
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'officer'
  and officer_id = (select auth.uid())
);

create table public.officer_push_tokens (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint officer_push_tokens_token_valid
    check (expo_push_token = btrim(expo_push_token) and char_length(expo_push_token) between 20 and 300),
  constraint officer_push_tokens_platform_valid
    check (platform in ('android', 'ios'))
);

comment on table public.officer_push_tokens is
  'Private Expo device tokens used by the server-side dispatch notification function.';

create index officer_push_tokens_officer_idx
  on public.officer_push_tokens (officer_id);

alter table public.officer_push_tokens enable row level security;
revoke all on table public.officer_push_tokens from public, anon, authenticated;

create or replace function public.register_officer_push_token(
  p_expo_push_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_officer_id uuid := auth.uid();
  safe_token text := btrim(coalesce(p_expo_push_token, ''));
begin
  if authenticated_officer_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'officer' then
    raise exception using errcode = '42501', message = 'OFFICER_ROLE_REQUIRED';
  end if;

  if p_platform not in ('android', 'ios')
    or char_length(safe_token) not between 20 and 300 then
    raise exception using errcode = '22023', message = 'INVALID_PUSH_TOKEN';
  end if;

  insert into public.officer_push_tokens (
    officer_id,
    expo_push_token,
    platform,
    last_seen_at
  )
  values (
    authenticated_officer_id,
    safe_token,
    p_platform,
    now()
  )
  on conflict (expo_push_token) do update
  set officer_id = excluded.officer_id,
      platform = excluded.platform,
      last_seen_at = excluded.last_seen_at;
end;
$$;

revoke all on function public.register_officer_push_token(text, text) from public, anon;
grant execute on function public.register_officer_push_token(text, text) to authenticated;

-- An officer remains operationally available while responding. They cannot
-- turn themselves off duty until the report resolves their active incident.
create or replace function public.set_officer_duty(p_is_on_duty boolean)
returns public.officer_duty
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  updated_duty public.officer_duty;
begin
  if authenticated_user_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'officer' then
    raise exception using errcode = '42501', message = 'OFFICER_ROLE_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = authenticated_user_id
      and role = 'officer'
  ) then
    raise exception using errcode = '42501', message = 'OFFICER_NOT_PROVISIONED';
  end if;

  if p_is_on_duty = false and exists (
    select 1
    from public.incidents
    where claimed_by = authenticated_user_id
      and status in ('claimed', 'en_route', 'on_scene')
  ) then
    raise exception using errcode = 'P0001', message = 'OFFICER_HAS_ACTIVE_INCIDENT';
  end if;

  insert into public.officer_duty (officer_id, is_on_duty, changed_at)
  values (authenticated_user_id, p_is_on_duty, now())
  on conflict (officer_id) do update
  set is_on_duty = excluded.is_on_duty,
      changed_at = excluded.changed_at
  returning * into updated_duty;

  return updated_duty;
end;
$$;

revoke all on function public.set_officer_duty(boolean) from public, anon;
grant execute on function public.set_officer_duty(boolean) to authenticated;

-- The partial unique index is a final concurrency backstop against one officer
-- owning two active incidents from separate devices at the same time.
create unique index incidents_one_active_assignment_per_officer_idx
  on public.incidents (claimed_by)
  where claimed_by is not null
    and status in ('claimed', 'en_route', 'on_scene');

-- "On duty" is necessary but not sufficient for dispatch eligibility: an
-- officer already responding remains on duty while their toggle is locked.
create or replace function public.dispatch_incident(p_incident_id uuid)
returns public.incidents
language plpgsql
security definer
set search_path = ''
as $$
declare
  dispatched_incident public.incidents;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'dispatcher' then
    raise exception using errcode = '42501', message = 'DISPATCHER_ROLE_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.officer_duty as duty
    where duty.is_on_duty = true
      and not exists (
        select 1
        from public.incidents as assigned_incident
        where assigned_incident.claimed_by = duty.officer_id
          and assigned_incident.status in ('claimed', 'en_route', 'on_scene')
      )
  ) then
    raise exception using errcode = 'P0001', message = 'NO_AVAILABLE_OFFICERS';
  end if;

  update public.incidents
  set status = 'dispatched',
      dispatched_at = now()
  where id = p_incident_id
    and status = 'new'
    and claimed_by is null
  returning * into dispatched_incident;

  if not found then
    raise exception using errcode = 'P0001', message = 'INCIDENT_NOT_DISPATCHABLE';
  end if;

  return dispatched_incident;
end;
$$;

revoke all on function public.dispatch_incident(uuid) from public, anon;
grant execute on function public.dispatch_incident(uuid) to authenticated;

create or replace function public.advance_incident_status(
  p_incident_id uuid,
  p_next_status text
)
returns public.incidents
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_officer_id uuid := auth.uid();
  updated_incident public.incidents;
begin
  if authenticated_officer_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'officer' then
    raise exception using errcode = '42501', message = 'OFFICER_ROLE_REQUIRED';
  end if;

  if p_next_status not in ('en_route', 'on_scene') then
    raise exception using errcode = '22023', message = 'INVALID_NEXT_STATUS';
  end if;

  update public.incidents
  set status = p_next_status,
      en_route_at = case when p_next_status = 'en_route' then now() else en_route_at end,
      on_scene_at = case when p_next_status = 'on_scene' then now() else on_scene_at end
  where id = p_incident_id
    and claimed_by = authenticated_officer_id
    and (
      (status = 'claimed' and p_next_status = 'en_route')
      or (status = 'en_route' and p_next_status = 'on_scene')
    )
  returning * into updated_incident;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INCIDENT_TRANSITION';
  end if;

  return updated_incident;
end;
$$;

revoke all on function public.advance_incident_status(uuid, text) from public, anon;
grant execute on function public.advance_incident_status(uuid, text) to authenticated;

create or replace function public.submit_incident_report(
  p_incident_id uuid,
  p_actions_taken text,
  p_outcome text
)
returns public.incident_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_officer_id uuid := auth.uid();
  safe_actions text := btrim(coalesce(p_actions_taken, ''));
  safe_outcome text := btrim(coalesce(p_outcome, ''));
  resolved_time timestamptz := now();
  current_status text;
  current_owner uuid;
  created_report public.incident_reports;
begin
  if authenticated_officer_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'officer' then
    raise exception using errcode = '42501', message = 'OFFICER_ROLE_REQUIRED';
  end if;

  if char_length(safe_actions) not between 10 and 2000
    or char_length(safe_outcome) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'INVALID_REPORT_DETAILS';
  end if;

  select status, claimed_by
  into current_status, current_owner
  from public.incidents
  where id = p_incident_id
  for update;

  if current_status is null
    or current_owner is distinct from authenticated_officer_id
    or current_status <> 'on_scene' then
    raise exception using errcode = 'P0001', message = 'INCIDENT_NOT_READY_FOR_REPORT';
  end if;

  insert into public.incident_reports (
    incident_id,
    officer_id,
    actions_taken,
    outcome,
    resolved_at
  )
  values (
    p_incident_id,
    authenticated_officer_id,
    safe_actions,
    safe_outcome,
    resolved_time
  )
  returning * into created_report;

  update public.incidents
  set status = 'resolved',
      resolved_at = resolved_time
  where id = p_incident_id;

  return created_report;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'REPORT_ALREADY_SUBMITTED';
end;
$$;

revoke all on function public.submit_incident_report(uuid, text, text) from public, anon;
grant execute on function public.submit_incident_report(uuid, text, text) to authenticated;

-- Dispatcher-only report notifications. The payload is deliberately minimal;
-- the website re-fetches report content through table RLS.
drop policy if exists minicad_dispatchers_receive_report_broadcasts
on realtime.messages;

create policy minicad_dispatchers_receive_report_broadcasts
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'minicad:reports'
  and realtime.messages.extension = 'broadcast'
  and coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata'
      ->> 'role',
    ''
  ) = 'dispatcher'
);

create or replace function public.broadcast_incident_report_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'report_id', new.id,
      'incident_id', new.incident_id,
      'officer_id', new.officer_id
    ),
    'report-filed',
    'minicad:reports',
    true
  );

  return null;
end;
$$;

revoke all on function public.broadcast_incident_report_created() from public, anon, authenticated;

drop trigger if exists incident_reports_broadcast_created on public.incident_reports;

create trigger incident_reports_broadcast_created
after insert on public.incident_reports
for each row execute function public.broadcast_incident_report_created();
