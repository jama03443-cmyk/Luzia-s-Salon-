begin;

-- Delete one reservation as an admin and release its reserved time slot atomically.
create or replace function public.delete_client_reservation(target_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_slot_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select availability_slot_id
  into target_slot_id
  from public.reservations
  where id = target_reservation_id
  for update;

  if not found then
    return false;
  end if;

  if target_slot_id is not null then
    update public.availability_slots
    set reserved_at = null
    where id = target_slot_id;
  end if;

  delete from public.reservations
  where id = target_reservation_id;

  return true;
end;
$$;

revoke all on function public.delete_client_reservation(uuid) from public, anon;
grant execute on function public.delete_client_reservation(uuid) to authenticated;

commit;
