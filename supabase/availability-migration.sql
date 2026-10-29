-- Booking availability module
-- Run this once in the Supabase SQL Editor after schema.sql and loyalty-migration.sql.

begin;

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  salon_id text not null references public.salons(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  is_active boolean not null default true,
  reserved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (salon_id, appointment_date, appointment_time)
);

create index if not exists availability_slots_lookup_idx
  on public.availability_slots (salon_id, appointment_date, appointment_time)
  where is_active = true and reserved_at is null;

alter table public.reservations
  add column if not exists availability_slot_id uuid unique
  references public.availability_slots(id) on delete restrict;

alter table public.availability_slots enable row level security;

drop policy if exists "Public can read open availability slots" on public.availability_slots;
create policy "Public can read open availability slots"
  on public.availability_slots for select to anon, authenticated
  using (is_active = true and reserved_at is null and appointment_date >= current_date);

drop policy if exists "Admins can manage availability slots" on public.availability_slots;
create policy "Admins can manage availability slots"
  on public.availability_slots for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Reservations must be created through the function below, so a time slot
-- cannot be booked twice by two clients at the same moment.
drop policy if exists "Guests can create reservations" on public.reservations;
revoke insert on public.reservations from anon, authenticated;

create or replace function public.book_available_slot(
  target_slot_id uuid,
  customer_name text,
  customer_phone text,
  requested_service text
)
returns public.reservations
language plpgsql
security definer set search_path = public
as $$
declare
  selected_slot public.availability_slots;
  created_reservation public.reservations;
begin
  if nullif(btrim(customer_name), '') is null
    or nullif(btrim(customer_phone), '') is null
    or nullif(btrim(requested_service), '') is null then
    raise exception 'Missing reservation information';
  end if;

  -- The update locks and reserves one available slot atomically.
  update public.availability_slots
  set reserved_at = now()
  where id = target_slot_id
    and is_active = true
    and reserved_at is null
    and appointment_date >= current_date
  returning * into selected_slot;

  if selected_slot.id is null then
    raise exception 'This time slot is no longer available';
  end if;

  insert into public.reservations (
    client_name,
    client_phone,
    salon_id,
    service_name,
    appointment_date,
    appointment_time,
    availability_slot_id
  )
  values (
    btrim(customer_name),
    btrim(customer_phone),
    selected_slot.salon_id,
    btrim(requested_service),
    selected_slot.appointment_date,
    selected_slot.appointment_time,
    selected_slot.id
  )
  returning * into created_reservation;

  return created_reservation;
exception when others then
  -- If the insert fails after the slot was locked, the transaction rolls back
  -- automatically and the slot remains available.
  raise;
end;
$$;

revoke all on function public.book_available_slot(uuid, text, text, text) from public;
grant execute on function public.book_available_slot(uuid, text, text, text) to anon, authenticated;
grant select, insert, update, delete on public.availability_slots to authenticated;
grant select on public.availability_slots to anon;

commit;
