-- Make client reservations confirmed at the moment the slot is booked.
-- Run after reservation-status-migration.sql and barbers-availability-migration.sql.

begin;

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
  if regexp_replace(btrim(customer_phone), '[^0-9+]', '', 'g') !~ '^\+41[2-9][0-9]{8}$' then
    raise exception 'Invalid Swiss phone number';
  end if;

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
    client_name,
    client_phone,
    salon_id,
    service_name,
    appointment_date,
    appointment_time,
    availability_slot_id,
    status,
    confirmed_at
  ) values (
    btrim(customer_name),
    btrim(customer_phone),
    selected_slot.salon_id,
    btrim(requested_service),
    selected_slot.appointment_date,
    selected_slot.appointment_time,
    selected_slot.id,
    'confirmed',
    now()
  ) returning * into created_reservation;

  return created_reservation;
end;
$$;

grant execute on function public.book_available_slot(uuid, text, text, text) to anon, authenticated;

-- Existing pending requests are also treated as confirmed in the new workflow.
update public.reservations
set status = 'confirmed',
    confirmed_at = coalesce(confirmed_at, now())
where status = 'pending';

commit;
