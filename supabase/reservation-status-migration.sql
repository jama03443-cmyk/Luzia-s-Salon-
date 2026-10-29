-- Reservation status fields used by immediate booking and the admin dashboard.
-- Run after availability-migration.sql and barbers-availability-migration.sql.

begin;

alter table public.reservations
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'confirmed', 'cancelled'));

alter table public.reservations
  add column if not exists confirmed_at timestamptz;

create index if not exists reservations_status_idx
  on public.reservations (status, appointment_date, appointment_time);

commit;
