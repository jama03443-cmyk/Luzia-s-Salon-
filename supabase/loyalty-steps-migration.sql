-- Store an editable list of loyalty program steps for the client page.
-- Run after hero-image-migration.sql. The program columns are added here too
-- so this migration also works when loyalty-program-settings-migration.sql
-- has not yet been applied.

begin;

alter table public.site_settings
  add column if not exists loyalty_visits_for_reward integer not null default 10,
  add column if not exists loyalty_reward_title text not null default 'Votre {visits}e coupe offerte',
  add column if not exists loyalty_reward_description text not null default 'À chaque visite avec une coupe, vos points sont ajoutés directement sur votre carte numérique.',
  add column if not exists loyalty_birthday_title text not null default 'Cadeau d’anniversaire',
  add column if not exists loyalty_birthday_description text not null default 'Pendant le mois de votre anniversaire, nous vous offrons une coupe. Une fois par an, si votre date de naissance est enregistrée chez nous.',
  add column if not exists loyalty_referral_title text not null default 'Inviter des amis',
  add column if not exists loyalty_referral_description text not null default 'Partagez votre lien personnel. Quand une nouvelle personne vient chez Luzia’s Salon et reçoit son premier point, vous recevez un point bonus.',
  add column if not exists loyalty_review_title text not null default 'Avis Google',
  add column if not exists loyalty_review_description text not null default 'Pour votre avis Google sincère, vous recevez une seule fois un point bonus sur votre carte numérique.',
  add column if not exists loyalty_steps jsonb;

update public.site_settings
set loyalty_steps = jsonb_build_array(
  jsonb_build_object('id', 'reward', 'title', loyalty_reward_title, 'description', loyalty_reward_description, 'icon', 'scissors'),
  jsonb_build_object('id', 'birthday', 'title', loyalty_birthday_title, 'description', loyalty_birthday_description, 'icon', 'gift'),
  jsonb_build_object('id', 'referral', 'title', loyalty_referral_title, 'description', loyalty_referral_description, 'icon', 'friends'),
  jsonb_build_object('id', 'review', 'title', loyalty_review_title, 'description', loyalty_review_description, 'icon', 'star')
)
where loyalty_steps is null;

alter table public.site_settings
  alter column loyalty_steps set default '[]'::jsonb,
  alter column loyalty_steps set not null;

commit;
