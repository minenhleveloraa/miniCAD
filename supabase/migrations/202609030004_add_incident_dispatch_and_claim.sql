-- MiniCAD dispatch and first-wins incident claiming
--
-- Clients never update incident ownership directly. These narrow RPCs enforce
-- role, duty state, and valid status transitions inside one database
-- transaction. The conditional claim UPDATE is the concurrency boundary: when
-- officers tap together, PostgreSQL locks the row and only the first matching
-- UPDATE can return it.

-- Officers may inspect dispatched work while off duty, but only the officer
-- who owns an incident may continue seeing it after it has been claimed.
drop policy if exists incidents_officer_select on public.incidents;

create policy incidents_officer_select
on public.incidents
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'officer'
  and (
    status = 'dispatched'
    or claimed_by = (select auth.uid())
  )
);

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
    from public.officer_duty
    where is_on_duty = true
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

create or replace function public.claim_incident(p_incident_id uuid)
returns public.incidents
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_officer_id uuid := auth.uid();
  claimed_incident public.incidents;
begin
  if authenticated_officer_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'officer' then
    raise exception using errcode = '42501', message = 'OFFICER_ROLE_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = authenticated_officer_id
      and role = 'officer'
  ) then
    raise exception using errcode = '42501', message = 'OFFICER_NOT_PROVISIONED';
  end if;

  if not exists (
    select 1
    from public.officer_duty
    where officer_id = authenticated_officer_id
      and is_on_duty = true
  ) then
    raise exception using errcode = 'P0001', message = 'OFFICER_NOT_AVAILABLE';
  end if;

  if exists (
    select 1
    from public.incidents
    where claimed_by = authenticated_officer_id
      and status in ('claimed', 'en_route', 'on_scene')
  ) then
    raise exception using errcode = 'P0001', message = 'OFFICER_ALREADY_ASSIGNED';
  end if;

  update public.incidents
  set status = 'claimed',
      claimed_by = authenticated_officer_id,
      claimed_at = now()
  where id = p_incident_id
    and status = 'dispatched'
    and claimed_by is null
  returning * into claimed_incident;

  if not found then
    raise exception using errcode = 'P0001', message = 'INCIDENT_ALREADY_CLAIMED';
  end if;

  return claimed_incident;
end;
$$;

revoke all on function public.claim_incident(uuid) from public, anon;
grant execute on function public.claim_incident(uuid) to authenticated;

-- Broadcast only an invalidation key. Each client then re-reads its authorized
-- snapshot under table RLS, so caller data is never copied into a shared topic.
drop policy if exists minicad_users_receive_incident_broadcasts
on realtime.messages;

create policy minicad_users_receive_incident_broadcasts
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'minicad:incidents'
  and realtime.messages.extension = 'broadcast'
  and coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata'
      ->> 'role',
    ''
  ) in ('dispatcher', 'officer')
);

create or replace function public.broadcast_incident_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_incident_id uuid;
begin
  changed_incident_id := case when tg_op = 'DELETE' then old.id else new.id end;

  perform realtime.send(
    jsonb_build_object('incident_id', changed_incident_id),
    'incident-changed',
    'minicad:incidents',
    true
  );

  return null;
end;
$$;

revoke all on function public.broadcast_incident_change() from public, anon, authenticated;

drop trigger if exists incidents_broadcast_change on public.incidents;

create trigger incidents_broadcast_change
after insert or update or delete on public.incidents
for each row execute function public.broadcast_incident_change();
