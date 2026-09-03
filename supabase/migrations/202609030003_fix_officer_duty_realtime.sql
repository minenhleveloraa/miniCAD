-- Reliable officer-duty delivery for the open dispatcher dashboard
--
-- A database trigger emits one private Broadcast message after every committed
-- duty change. Only authenticated dispatcher JWTs may join this exact topic.
-- This avoids making the UI depend on a table-publication toggle while keeping
-- the persisted officer_duty row as the source of truth.

drop policy if exists minicad_dispatchers_receive_officer_duty_broadcasts
on realtime.messages;

create policy minicad_dispatchers_receive_officer_duty_broadcasts
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'minicad:officer-duty'
  and realtime.messages.extension = 'broadcast'
  and coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata'
      ->> 'role',
    ''
  ) = 'dispatcher'
);

create or replace function public.broadcast_officer_duty_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_officer_id uuid;
  changed_is_on_duty boolean;
  changed_at_value timestamptz;
begin
  if tg_op = 'DELETE' then
    changed_officer_id := old.officer_id;
    changed_is_on_duty := false;
    changed_at_value := now();
  else
    changed_officer_id := new.officer_id;
    changed_is_on_duty := new.is_on_duty;
    changed_at_value := new.changed_at;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'officer_id', changed_officer_id,
      'is_on_duty', changed_is_on_duty,
      'changed_at', changed_at_value
    ),
    'officer-duty-changed',
    'minicad:officer-duty',
    true
  );

  return null;
end;
$$;

revoke all on function public.broadcast_officer_duty_change() from public, anon, authenticated;

drop trigger if exists officer_duty_broadcast_change on public.officer_duty;

create trigger officer_duty_broadcast_change
after insert or update or delete on public.officer_duty
for each row execute function public.broadcast_officer_duty_change();
