-- MiniCAD incident logging foundation
--
-- This migration owns the data integrity and authorization rules for the
-- dispatcher incident form. Browser input is treated as untrusted: creator,
-- initial status, incident number, and timestamps are generated or checked by
-- Postgres rather than accepted from form fields.

create extension if not exists pgcrypto;

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number bigint generated always as identity (start with 1000) unique,
  caller_name text not null,
  caller_phone text not null,
  location text not null,
  incident_type text not null,
  priority text not null,
  description text not null,
  status text not null default 'new',
  created_by uuid not null references auth.users (id) on delete restrict,
  claimed_by uuid references auth.users (id) on delete restrict,
  dispatched_at timestamptz,
  claimed_at timestamptz,
  en_route_at timestamptz,
  on_scene_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint incidents_caller_name_valid
    check (caller_name = btrim(caller_name) and char_length(caller_name) between 2 and 120),
  constraint incidents_caller_phone_valid
    check (caller_phone = btrim(caller_phone) and char_length(caller_phone) between 7 and 32),
  constraint incidents_location_valid
    check (location = btrim(location) and char_length(location) between 3 and 500),
  constraint incidents_type_valid
    check (incident_type = btrim(incident_type) and char_length(incident_type) between 2 and 80),
  constraint incidents_priority_valid
    check (priority in ('low', 'medium', 'high', 'critical')),
  constraint incidents_description_valid
    check (description = btrim(description) and char_length(description) between 5 and 1000),
  constraint incidents_status_valid
    check (status in ('new', 'dispatched', 'claimed', 'en_route', 'on_scene', 'resolved')),
  constraint incidents_claim_state_valid
    check (
      (status in ('new', 'dispatched') and claimed_by is null and claimed_at is null)
      or
      (status in ('claimed', 'en_route', 'on_scene', 'resolved') and claimed_by is not null and claimed_at is not null)
    )
);

comment on table public.incidents is
  'Emergency incidents logged by dispatchers and shared with the officer application.';
comment on column public.incidents.incident_number is
  'Human-readable sequence formatted as MC-###### by application clients.';
comment on column public.incidents.created_by is
  'Authenticated dispatcher who logged the incident.';

-- Foreign-key columns are not indexed automatically by Postgres.
create index incidents_created_by_idx on public.incidents (created_by);
create index incidents_claimed_by_idx on public.incidents (claimed_by)
  where claimed_by is not null;

-- The live queue reads unresolved incidents newest-first and may filter by status.
create index incidents_open_queue_idx on public.incidents (status, created_at desc)
  where status <> 'resolved';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create trigger incidents_set_updated_at
before update on public.incidents
for each row execute function public.set_updated_at();

-- RLS is the final authorization boundary for website, mobile, and direct API calls.
alter table public.incidents enable row level security;

revoke all on table public.incidents from anon, authenticated;
revoke all on sequence public.incidents_incident_number_seq from anon, authenticated;
grant select, insert on table public.incidents to authenticated;
grant usage, select on sequence public.incidents_incident_number_seq to authenticated;

create policy incidents_dispatcher_select
on public.incidents
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'dispatcher'
);

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

create policy incidents_dispatcher_insert
on public.incidents
for insert
to authenticated
with check (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'dispatcher'
  and created_by = (select auth.uid())
  and status = 'new'
  and claimed_by is null
  and claimed_at is null
  and dispatched_at is null
  and en_route_at is null
  and on_scene_at is null
  and resolved_at is null
);

-- Realtime still evaluates SELECT RLS for every subscriber before sending rows.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'incidents'
  ) then
    alter publication supabase_realtime add table public.incidents;
  end if;
end;
$$;
