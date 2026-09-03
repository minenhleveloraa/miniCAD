-- Add 'new' status to the officer SELECT policy so officers can see
-- incidents the moment a dispatcher logs them, before they are formally
-- dispatched. This supports the assessment requirement that "every incident
-- added by a dispatcher is instantly visible to the officer app."
--
-- Run this against your Supabase project via the SQL editor or as a new
-- migration file.

-- Drop the existing policy first, then recreate with the broader condition.
drop policy if exists incidents_officer_select on public.incidents;

create policy incidents_officer_select
on public.incidents
for select
to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'officer'
  and (
    status in ('new', 'dispatched')
    or claimed_by = (select auth.uid())
  )
);
