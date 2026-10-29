-- Run after schema.sql and loyalty-migration.sql.
-- Promotes the existing Google Auth user used for the admin dashboard.
do $$
declare
  target_user auth.users%rowtype;
begin
  select * into target_user
  from auth.users
  where lower(email) = lower('admin@luziasalon.ch')
  limit 1;

  if target_user.id is null then
    raise exception 'No Supabase Auth user found for admin@luziasalon.ch. Sign in once first.';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    target_user.id,
    coalesce(nullif(target_user.raw_user_meta_data ->> 'full_name', ''), target_user.email),
    target_user.email,
    'admin'
  )
  on conflict (id) do update
  set role = 'admin',
      email = excluded.email,
      full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name);
end;
$$;
