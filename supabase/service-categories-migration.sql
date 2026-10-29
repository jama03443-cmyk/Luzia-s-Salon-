-- Dynamic service categories for the admin dashboard and customer site.
-- Run after schema.sql and the core Supabase migrations.

begin;

create table if not exists public.service_categories (
  name text primary key check (char_length(btrim(name)) between 2 and 50),
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

insert into public.service_categories (name, sort_order)
values ('Coupes', 10), ('Barbe', 20), ('Soins', 30)
on conflict (name) do nothing;

insert into public.service_categories (name)
select distinct category from public.services
on conflict (name) do nothing;

-- Remove the original fixed category list so admins can use their own categories.
alter table public.services drop constraint if exists services_category_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'services_category_fkey'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_category_fkey
      foreign key (category) references public.service_categories(name)
      on update cascade on delete restrict;
  end if;
end;
$$;

alter table public.service_categories enable row level security;

drop policy if exists "Public can read service categories" on public.service_categories;
create policy "Public can read service categories"
  on public.service_categories for select to anon, authenticated
  using (true);

drop policy if exists "Admins can manage service categories" on public.service_categories;
create policy "Admins can manage service categories"
  on public.service_categories for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.service_categories to anon, authenticated;
grant insert, update, delete on public.service_categories to authenticated;

commit;
