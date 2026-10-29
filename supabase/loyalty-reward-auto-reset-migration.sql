-- Run after loyalty-program-settings-migration.sql and loyalty-migration.sql.
-- Automatically claims the configured free haircut and resets the member's
-- current points balance while keeping a negative entry in the point history.

create or replace function public.claim_loyalty_reward()
returns public.loyalty_cards
language plpgsql
security definer set search_path = public
as $$
declare
  current_card public.loyalty_cards;
  updated_card public.loyalty_cards;
  required_points integer;
  used_points integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select greatest(1, coalesce(loyalty_visits_for_reward, 10) - 1)
  into required_points
  from public.site_settings
  where id = true;
  required_points := coalesce(required_points, 9);

  select * into current_card
  from public.loyalty_cards
  where profile_id = auth.uid()
  for update;

  if current_card.id is null then
    raise exception 'Loyalty card not found';
  end if;

  if current_card.points < required_points then
    return current_card;
  end if;

  used_points := current_card.points;
  update public.loyalty_cards
  set points = 0,
      updated_at = now()
  where id = current_card.id
  returning * into updated_card;

  insert into public.loyalty_point_events (loyalty_card_id, point_delta, created_by)
  values (current_card.id, -used_points, auth.uid());

  return updated_card;
end;
$$;

revoke all on function public.claim_loyalty_reward() from public;
grant execute on function public.claim_loyalty_reward() to authenticated;
