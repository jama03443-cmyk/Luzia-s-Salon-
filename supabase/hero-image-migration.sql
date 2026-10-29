-- Run in the Supabase SQL Editor to enable admin-managed hero and brand settings.
begin;

create table if not exists public.site_settings (
  id boolean primary key default true check (id = true),
  hero_image_url text,
  body_color text not null default '#fffdf7',
  footer_color text not null default '#171614',
  button_color text not null default '#d9ad3b',
  logo_style text not null default 'classic',
  updated_at timestamptz not null default now()
);

alter table public.site_settings
  add column if not exists body_color text not null default '#fffdf7',
  add column if not exists footer_color text not null default '#171614',
  add column if not exists button_color text not null default '#d9ad3b',
  add column if not exists logo_style text not null default 'classic';

alter table public.site_settings
  alter column body_color set default '#000000',
  alter column footer_color set default '#000000',
  alter column button_color set default '#ffffff';

-- Carry forward the previously requested black site/footer and white buttons,
-- while preserving any colors that were deliberately customized already.
update public.site_settings
set body_color = '#000000'
where body_color = '#fffdf7';
update public.site_settings
set footer_color = '#000000'
where footer_color = '#171614';
update public.site_settings
set button_color = '#ffffff'
where button_color = '#d9ad3b';

insert into public.site_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings"
  on public.site_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

commit;
