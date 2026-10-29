-- Reservation cleanup only; loyalty cards and customer profiles are not touched.
-- Also schedule an automatic daily purge of reservations older than seven days.

begin;

-- Remove the earlier combined-clear function, if its migration was already run.
drop function if exists public.clear_client_records();

create or replace function public.clear_client_reservations()
returns table (
  reservations_deleted bigint,
  slots_reopened bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_count bigint;
  slot_count bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.availability_slots
  set reserved_at = null
  where reserved_at is not null;
  get diagnostics slot_count = row_count;

  delete from public.reservations
  where id is not null;
  get diagnostics reservation_count = row_count;

  return query select reservation_count, slot_count;
end;
$$;

revoke all on function public.clear_client_reservations() from public, anon;
grant execute on function public.clear_client_reservations() to authenticated;

create extension if not exists pg_cron;

create or replace function public.delete_expired_reservations()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff_date date := (now() at time zone 'Europe/Zurich')::date - 7;
  deleted_count bigint;
begin
  update public.availability_slots as slot
  set reserved_at = null
  where slot.reserved_at is not null
    and exists (
      select 1
      from public.reservations as reservation
      where reservation.availability_slot_id = slot.id
        and reservation.appointment_date <= cutoff_date
    );

  delete from public.reservations
  where id is not null
    and appointment_date <= cutoff_date;
  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_reservations() from public, anon, authenticated;

-- Apply the retention rule immediately, then keep it current each day.
select public.delete_expired_reservations();

select cron.unschedule(jobid)
from cron.job
where jobname = 'delete-expired-reservations-daily';

select cron.schedule(
  'delete-expired-reservations-daily',
  '0 3 * * *',
  'select public.delete_expired_reservations();'
);

commit;
