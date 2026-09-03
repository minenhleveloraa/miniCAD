-- MiniCAD officer identity and duty-state foundation
--
-- Authentication proves who is using the app. Availability is a separate,
-- explicit operational choice, so signing in never places an officer on duty.
-- The mobile client changes only its own duty row through the RPC below.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null,
  display_name text not null,
  badge_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_role_valid
    check (role in ('dispatcher', 'officer')),
  constraint profiles_display_name_valid
    check (display_name = btrim(display_name) and char_length(display_name) between 2 and 120),
  constraint profiles_badge_number_valid
    check (
      badge_number is null
      or (badge_number = btrim(badge_number) and char_length(badge_number) between 2 and 40)
    )
);

comment on table public.profiles is
  'Application-safe identity data derived from Supabase Auth users.';
comment on column public.profiles.role is
  'Mirrors the trusted Auth app_metadata role used by RLS policies.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.officer_duty (
  officer_id uuid primary key references public.profiles (id) on delete cascade,
  is_on_duty boolean not null default false,
  changed_at timestamptz not null default now()
);

comment on table public.officer_duty is
  'Explicit officer-controlled on-duty state; authentication alone never changes it.';

-- Keep application-safe profile rows aligned when administrators seed users in
-- Supabase Auth. Authorization always reads raw_app_meta_data, not user-editable
-- raw_user_meta_data.
create or replace function public.handle_minicad_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_role text := coalesce(new.raw_app_meta_data ->> 'role', '');
  safe_display_name text;
  safe_badge_number text;
begin
  if user_role not in ('dispatcher', 'officer') then
    return new;
  end if;

  safe_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'MiniCAD user'
  );
  safe_badge_number := nullif(btrim(new.raw_user_meta_data ->> 'badge_number'), '');

  insert into public.profiles (id, role, display_name, badge_number)
  values (new.id, user_role, safe_display_name, safe_badge_number)
  on conflict (id) do update
  set role = excluded.role,
      display_name = excluded.display_name,
      badge_number = excluded.badge_number;

  if user_role = 'officer' then
    insert into public.officer_duty (officer_id, is_on_duty)
    values (new.id, false)
    on conflict (officer_id) do nothing;
  else
    delete from public.officer_duty where officer_id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_minicad_auth_user() from public;

create trigger minicad_auth_user_profile
after insert or update of email, raw_app_meta_data, raw_user_meta_data on auth.users
for each row execute function public.handle_minicad_auth_user();

-- Backfill users that were seeded before this migration was applied.
insert into public.profiles (id, role, display_name, badge_number)
select
  user_record.id,
  user_record.raw_app_meta_data ->> 'role',
  coalesce(
    nullif(btrim(user_record.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(split_part(coalesce(user_record.email, ''), '@', 1)), ''),
    'MiniCAD user'
  ),
  nullif(btrim(user_record.raw_user_meta_data ->> 'badge_number'), '')
from auth.users as user_record
where user_record.raw_app_meta_data ->> 'role' in ('dispatcher', 'officer')
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    badge_number = excluded.badge_number;

insert into public.officer_duty (officer_id, is_on_duty)
select profile.id, false
from public.profiles as profile
where profile.role = 'officer'
on conflict (officer_id) do nothing;

-- RLS is the final boundary for mobile, website, and direct API access.
alter table public.profiles enable row level security;
alter table public.officer_duty enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.officer_duty from anon, authenticated;
grant select on table public.profiles, public.officer_duty to authenticated;

create policy profiles_dispatcher_select
on public.profiles
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'dispatcher'
);

create policy profiles_officer_select_self
on public.profiles
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'officer'
  and id = (select auth.uid())
);

create policy officer_duty_dispatcher_select
on public.officer_duty
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'dispatcher'
);

create policy officer_duty_officer_select_self
on public.officer_duty
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'officer'
  and officer_id = (select auth.uid())
);

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
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'officer' then
    raise exception using errcode = '42501', message = 'Only officer accounts can set duty state.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = authenticated_user_id and role = 'officer'
  ) then
    raise exception using errcode = '42501', message = 'Officer profile is not provisioned.';
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

-- Realtime evaluates SELECT RLS before sending an officer-duty change.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'officer_duty'
  ) then
    alter publication supabase_realtime add table public.officer_duty;
  end if;
end;
$$;
