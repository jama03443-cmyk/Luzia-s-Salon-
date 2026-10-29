-- Barbers and per-barber availability
-- Run this once AFTER availability-migration.sql.

begin;

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  salon_id text not null references public.salons(id) on delete cascade,
  name text not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists barbers_salon_active_idx
  on public.barbers (salon_id, name)
  where is_active = true;

alter table public.availability_slots
  add column if not exists barber_id uuid references public.barbers(id) on delete cascade;

-- The first availability migration used one unique time per salon. Now each
-- barber has their own agenda, so several barbers can work at the same time.
alter table public.availability_slots
  drop constraint if exists availability_slots_salon_id_appointment_date_appointment_time_key;

create unique index if not exists availability_slots_unique_barber_time_idx
  on public.availability_slots (salon_id, barber_id, appointment_date, appointment_time);

create index if not exists availability_slots_barber_lookup_idx
  on public.availability_slots (barber_id, appointment_date, appointment_time)
  where is_active = true and reserved_at is null;

alter table public.barbers enable row level security;

drop policy if exists "Public can read active barbers" on public.barbers;
create policy "Public can read active barbers"
  on public.barbers for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage barbers" on public.barbers;
create policy "Admins can manage barbers"
  on public.barbers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Replace the booking function so every booking is tied to one barber.
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

  update public.availability_slots
  set reserved_at = now()
  where id = target_slot_id
    and barber_id is not null
    and is_active = true
    and reserved_at is null
    and (appointment_date + appointment_time) > (now() at time zone 'Europe/Zurich')
    and exists (
      select 1
      from public.barbers barber
      where barber.id = availability_slots.barber_id
        and barber.is_active = true
    )
  returning * into selected_slot;

  if selected_slot.id is null then
    raise exception 'This time slot is no longer available';
  end if;

  insert into public.reservations (
    client_name, client_phone, salon_id, service_name,
    appointment_date, appointment_time, availability_slot_id
  ) values (
    btrim(customer_name), btrim(customer_phone), selected_slot.salon_id,
    btrim(requested_service), selected_slot.appointment_date,
    selected_slot.appointment_time, selected_slot.id
  ) returning * into created_reservation;

  return created_reservation;
end;
$$;

grant select, insert, update, delete on public.barbers to authenticated;
grant select on public.barbers to anon;

commit;
