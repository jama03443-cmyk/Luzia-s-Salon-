-- Repair the first-login loyalty profile flow for existing Supabase projects.
-- Run after schema.sql and loyalty-migration.sql.

begin;

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

commit;
