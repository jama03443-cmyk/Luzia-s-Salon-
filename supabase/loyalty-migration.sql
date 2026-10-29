-- Loyalty module migration
-- Run this once in the Supabase SQL Editor after schema.sql.

begin;

-- Client account details shown to the admin. New accounts use email/password;
-- WhatsApp remains required during registration as a contact channel.
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists email text;
create unique index if not exists profiles_phone_idx
  on public.profiles (phone)
  where phone is not null;
create unique index if not exists profiles_email_idx
  on public.profiles (email)
  where email is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, first_name, last_name, phone, whatsapp, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.phone,
    nullif(new.raw_user_meta_data ->> 'whatsapp', ''),
    new.email
  )
  on conflict (id) do update set
    phone = excluded.phone,
    first_name = coalesce(nullif(excluded.first_name, ''), public.profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name, ''), public.profiles.last_name),
    whatsapp = coalesce(excluded.whatsapp, public.profiles.whatsapp),
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
  return new;
end;
$$;

update public.profiles profile
set phone = auth_user.phone
from auth.users auth_user
where profile.id = auth_user.id
  and profile.phone is null
  and auth_user.phone is not null;

update public.profiles profile
set email = auth_user.email
from auth.users auth_user
where profile.id = auth_user.id
  and profile.email is null
  and auth_user.email is not null;

-- A Google-authenticated client may only update their own contact fields.
-- The function intentionally cannot update the role or another client's profile.
create or replace function public.complete_loyalty_profile(
  profile_first_name text,
  profile_last_name text,
  profile_whatsapp text
)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(btrim(profile_first_name), '') is null
    or nullif(btrim(profile_last_name), '') is null
    or profile_whatsapp is null
    or profile_whatsapp !~ '^\+41[0-9]{9}$' then
    raise exception 'Invalid profile details';
  end if;

  insert into public.profiles (id, full_name, first_name, last_name, whatsapp, email)
  values (
    auth.uid(),
    btrim(profile_first_name) || ' ' || btrim(profile_last_name),
    btrim(profile_first_name),
    btrim(profile_last_name),
    profile_whatsapp,
    auth.jwt() ->> 'email'
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    full_name = excluded.full_name,
    whatsapp = excluded.whatsapp,
    email = coalesce(public.profiles.email, excluded.email)
  returning * into updated_profile;

  insert into public.loyalty_cards (profile_id)
  values (auth.uid())
  on conflict (profile_id) do nothing;

  return updated_profile;
end;
$$;

revoke all on function public.complete_loyalty_profile(text, text, text) from public;
grant execute on function public.complete_loyalty_profile(text, text, text) to authenticated;

create table if not exists public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  member_code uuid not null unique default gen_random_uuid(),
  points integer not null default 0 check (points >= 0),
  downloaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_point_events (
  id uuid primary key default gen_random_uuid(),
  loyalty_card_id uuid not null references public.loyalty_cards(id) on delete cascade,
  point_delta integer not null check (point_delta <> 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_cards_points_idx on public.loyalty_cards (points desc);
create index if not exists loyalty_point_events_card_idx on public.loyalty_point_events (loyalty_card_id, created_at desc);

-- Every newly registered client automatically receives one loyalty card.
create or replace function public.create_loyalty_card_for_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.loyalty_cards (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_create_loyalty_card on public.profiles;
create trigger on_profile_created_create_loyalty_card
  after insert on public.profiles
  for each row execute procedure public.create_loyalty_card_for_profile();

-- Create a card for profiles that already existed before this migration.
insert into public.loyalty_cards (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

alter table public.loyalty_cards enable row level security;
alter table public.loyalty_point_events enable row level security;

drop policy if exists "Clients can read their own loyalty card" on public.loyalty_cards;
create policy "Clients can read their own loyalty card"
  on public.loyalty_cards for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Admins can read loyalty cards" on public.loyalty_cards;
create policy "Admins can read loyalty cards"
  on public.loyalty_cards for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can manage loyalty cards" on public.loyalty_cards;
create policy "Admins can manage loyalty cards"
  on public.loyalty_cards for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read loyalty point events" on public.loyalty_point_events;
create policy "Admins can read loyalty point events"
  on public.loyalty_point_events for select to authenticated
  using (public.is_admin());

drop policy if exists "Clients can read their own loyalty point events" on public.loyalty_point_events;
create policy "Clients can read their own loyalty point events"
  on public.loyalty_point_events for select to authenticated
  using (
    exists (
      select 1
      from public.loyalty_cards
      where loyalty_cards.id = loyalty_point_events.loyalty_card_id
        and loyalty_cards.profile_id = auth.uid()
    )
  );

drop policy if exists "Admins can insert loyalty point events" on public.loyalty_point_events;
create policy "Admins can insert loyalty point events"
  on public.loyalty_point_events for insert to authenticated
  with check (public.is_admin());

-- Admin-only atomic adjustment; keeps the points balance and its audit history in sync.
create or replace function public.adjust_loyalty_points(target_card_id uuid, point_delta integer)
returns public.loyalty_cards
language plpgsql
security definer set search_path = public
as $$
declare
  updated_card public.loyalty_cards;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if point_delta = 0 then
    raise exception 'Point delta cannot be zero';
  end if;

  update public.loyalty_cards
  set points = points + point_delta,
      updated_at = now()
  where id = target_card_id
    and points + point_delta >= 0
  returning * into updated_card;

  if updated_card.id is null then
    raise exception 'Card not found or insufficient points';
  end if;

  insert into public.loyalty_point_events (loyalty_card_id, point_delta, created_by)
  values (target_card_id, point_delta, auth.uid());

  return updated_card;
end;
$$;

revoke all on function public.adjust_loyalty_points(uuid, integer) from public;
grant execute on function public.adjust_loyalty_points(uuid, integer) to authenticated;
grant select on public.loyalty_cards, public.loyalty_point_events to authenticated;

commit;
