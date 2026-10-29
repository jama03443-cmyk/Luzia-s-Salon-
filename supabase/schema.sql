-- Barber Concept / Alep Salon — Supabase schema
-- Run this entire file in the Supabase SQL editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'client' check (role in ('client', 'admin'))
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Coupes', 'Barbe', 'Soins')),
  name text not null,
  price text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.salons (
  id text primary key check (id in ('bienne', 'neuchatel', 'berne')),
  name text not null,
  address text not null,
  hours text not null,
  image_url text
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  salon_id text not null references public.salons(id) on delete restrict,
  service_name text not null,
  appointment_date date not null,
  appointment_time time not null,
  created_at timestamptz not null default now()
);

create index if not exists reservations_salon_date_idx
  on public.reservations (salon_id, appointment_date, appointment_time);

create unique index if not exists services_category_name_idx
  on public.services (category, name);

-- A profile is created automatically whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SECURITY DEFINER avoids RLS recursion when policies need to test an admin role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.salons enable row level security;
alter table public.reservations enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public can read services" on public.services;
create policy "Public can read services"
  on public.services for select to anon, authenticated
  using (true);

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
  on public.services for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public can read salons" on public.salons;
create policy "Public can read salons"
  on public.salons for select to anon, authenticated
  using (true);

drop policy if exists "Admins can manage salons" on public.salons;
create policy "Admins can manage salons"
  on public.salons for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Guests can create reservations" on public.reservations;
create policy "Guests can create reservations"
  on public.reservations for insert to anon, authenticated
  with check (true);

drop policy if exists "Admins can read reservations" on public.reservations;
create policy "Admins can read reservations"
  on public.reservations for select to authenticated
  using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.services, public.salons to anon, authenticated;
grant insert on public.reservations to anon, authenticated;
grant select, insert, update, delete on public.services, public.salons to authenticated;
grant select on public.profiles to authenticated;

-- Public bucket used by the private dashboard to update salon images.
insert into storage.buckets (id, name, public)
values ('barber-assets', 'barber-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view barber assets" on storage.objects;
create policy "Public can view barber assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'barber-assets');

drop policy if exists "Admins can upload barber assets" on storage.objects;
create policy "Admins can upload barber assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'barber-assets' and public.is_admin());

drop policy if exists "Admins can update barber assets" on storage.objects;
create policy "Admins can update barber assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'barber-assets' and public.is_admin())
  with check (bucket_id = 'barber-assets' and public.is_admin());

drop policy if exists "Admins can delete barber assets" on storage.objects;
create policy "Admins can delete barber assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'barber-assets' and public.is_admin());

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

-- Initial public content. Replace the contact information before going live.
insert into public.salons (id, name, address, hours, image_url)
values
  ('bienne', 'Bienne', 'Rue Centrale 56, 2502 Biel/Bienne', 'Mer-Ven 09:00-19:00, Sam 08:00-16:00, Dim fermé, Lun 13:00-18:00, Mar 09:00-19:00', null),
  ('neuchatel', 'Neuchâtel', 'Adresse à annoncer — Neuchâtel', 'Horaires à annoncer', null),
  ('berne', 'Berne', 'Adresse à annoncer — Berne', 'Horaires à annoncer', null)
on conflict (id) do nothing;

insert into public.services (category, name, price)
values
  ('Coupes', 'Coupe classique', 'CHF 35.–'),
  ('Coupes', 'Coupe signature', 'CHF 48.–'),
  ('Coupes', 'Coupe & barbe', 'CHF 68.–'),
  ('Barbe', 'Taille de barbe', 'CHF 28.–'),
  ('Barbe', 'Rasage traditionnel', 'CHF 38.–'),
  ('Barbe', 'Barbe signature', 'CHF 45.–'),
  ('Soins', 'Soin visage express', 'CHF 25.–'),
  ('Soins', 'Rituel serviette chaude', 'CHF 18.–'),
  ('Soins', 'Pack entretien', 'CHF 22.–')
on conflict (category, name) do nothing;

-- Promote the intended account only after it has registered through Supabase Auth:
-- update public.profiles set role = 'admin' where id = '<auth-user-uuid>';

commit;
