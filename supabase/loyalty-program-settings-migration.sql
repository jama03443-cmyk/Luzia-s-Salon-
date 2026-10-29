-- Add admin-managed copy and reward threshold for the public loyalty page.
-- Run once in the Supabase SQL Editor after hero-image-migration.sql.

begin;

alter table public.site_settings
  add column if not exists loyalty_visits_for_reward integer not null default 10,
  add column if not exists loyalty_reward_title text not null default 'Votre {visits}e coupe offerte',
  add column if not exists loyalty_reward_description text not null default 'À chaque visite avec une coupe, vos points sont ajoutés à votre carte numérique dans l’application Alep Salon. Tout est sur votre téléphone : pas de carte papier ni de tampons à garder.',
  add column if not exists loyalty_birthday_title text not null default 'Cadeau d’anniversaire',
  add column if not exists loyalty_birthday_description text not null default 'Pendant le mois de votre anniversaire, nous vous offrons une coupe. Une fois par an, si votre date de naissance est enregistrée chez nous.',
  add column if not exists loyalty_referral_title text not null default 'Inviter des amis',
  add column if not exists loyalty_referral_description text not null default 'Partagez votre lien personnel. Quand une nouvelle personne vient chez Alep et reçoit son premier point, vous recevez un point bonus sur votre carte numérique.',
  add column if not exists loyalty_review_title text not null default 'Avis Google',
  add column if not exists loyalty_review_description text not null default 'Pour votre avis Google sincère, vous recevez une seule fois un point bonus sur votre carte numérique.';

-- Refresh only the original examples; preserve copy customized by the admin.
update public.site_settings
set loyalty_reward_title = 'Votre {visits}e coupe offerte'
where loyalty_reward_title in ('Chaque {visits}e coupe offerte', 'Chaque 10e coupe offerte');

update public.site_settings
set loyalty_reward_description = 'Cumulez vos points directement dans l’application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.'
where loyalty_reward_description in (
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque {stamps} tampons sont réunis, la coupe suivante est offerte.',
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque 9 tampons sont réunis, la coupe suivante est offerte.'
);

update public.site_settings
set loyalty_reward_description = 'À chaque visite avec une coupe, vos points sont ajoutés à votre carte numérique dans l’application Alep Salon. Tout est sur votre téléphone : pas de carte papier ni de tampons à garder.'
where loyalty_reward_description in (
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque {stamps} tampons sont réunis, la coupe suivante est offerte.',
  'À chaque visite avec une coupe, l’équipe ajoute un tampon. Lorsque 9 tampons sont réunis, la coupe suivante est offerte.',
  'Cumulez vos points avec l’application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
  'Cumulez vos points directement dans l’application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.',
  'Cumulez vos points avec votre application Alep Salon : après {points} coupes, la {visits}e vous est offerte. Votre carte reste dans votre téléphone, sans carte ni tampon papier.'
);

update public.site_settings
set loyalty_referral_description = 'Partagez votre lien personnel. Quand une nouvelle personne vient chez Alep et reçoit son premier point, vous recevez un point bonus sur votre carte numérique.'
where loyalty_referral_description = 'Partagez votre lien personnel. Quand une nouvelle personne vient chez Alep et reçoit son premier tampon, vous recevez un tampon bonus.';

update public.site_settings
set loyalty_review_description = 'Pour votre avis Google sincère, vous recevez une seule fois un point bonus sur votre carte numérique.'
where loyalty_review_description = 'Pour votre avis Google sincère, vous recevez une seule fois un tampon.';

alter table public.site_settings
  drop constraint if exists site_settings_loyalty_visits_for_reward_check;
alter table public.site_settings
  add constraint site_settings_loyalty_visits_for_reward_check
  check (loyalty_visits_for_reward between 2 and 100);

commit;
