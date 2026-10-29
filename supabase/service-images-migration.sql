-- Run once in Supabase SQL Editor to enable administrator-managed service photos.
begin;

alter table public.services
  add column if not exists image_url text,
  add column if not exists image_title text,
  add column if not exists image_urls text[] not null default '{}';

update public.services
set image_urls = array[image_url]
where image_url is not null and cardinality(image_urls) = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'services_image_urls_max_three'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_image_urls_max_three
      check (cardinality(image_urls) <= 3);
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('service-assets', 'service-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view service assets" on storage.objects;
create policy "Public can view service assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'service-assets');

drop policy if exists "Admins can upload service assets" on storage.objects;
create policy "Admins can upload service assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'service-assets' and public.is_admin());

drop policy if exists "Admins can update service assets" on storage.objects;
create policy "Admins can update service assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'service-assets' and public.is_admin())
  with check (bucket_id = 'service-assets' and public.is_admin());

drop policy if exists "Admins can delete service assets" on storage.objects;
create policy "Admins can delete service assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'service-assets' and public.is_admin());

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

commit;
