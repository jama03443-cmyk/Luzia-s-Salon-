# Alep Salon PWA

Site public React/Vite avec réservation, programme de fidélité et administration Supabase.

## Installation

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local`. La clé `anon` est publique et protégée par les politiques RLS. N’ajoutez jamais une clé `service_role` aux variables `VITE_*`.

## Déployer sur Vercel

Le fichier `vercel.json` configure la compilation Vite, le dossier publié et les routes de l’application. Lors de l’import dans Vercel :

1. Importez le dépôt GitHub `jama03443-cmyk/Luzia-s-Salon-`. Choisissez la racine du dépôt comme **Root Directory** : `package.json` et `vercel.json` s’y trouvent.
2. Dans **Environment Variables**, ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` pour **Production**, **Preview** et **Development**.
3. Laissez Vercel utiliser `npm run build` et le dossier de sortie `dist`, puis lancez le déploiement.

Après le premier déploiement, ajoutez le domaine Vercel de production aux URL de redirection autorisées dans **Supabase → Authentication → URL Configuration**. La connexion Google fidélité revient sur `/fidelite`.

## Configurer Supabase

Pour une nouvelle base Supabase, exécutez chaque script une fois dans le SQL Editor, dans cet ordre :

1. `schema.sql`
2. `loyalty-migration.sql`
3. `availability-migration.sql`
4. `barbers-availability-migration.sql`
5. `reservation-status-migration.sql`
6. `delete-client-reservation-migration.sql`
7. `instant-booking-migration.sql`
8. `booking-time-validation-migration.sql`
9. `service-images-migration.sql`
10. `hero-image-migration.sql`
11. `loyalty-program-settings-migration.sql`
12. `loyalty-steps-migration.sql`
13. `loyalty-reward-auto-reset-migration.sql`
14. `loyalty-reward-points-threshold-migration.sql`
15. `clear-client-records-migration.sql`

`loyalty-first-login-fix.sql` est un script de réparation pour les anciennes bases dont la procédure de première connexion fidélité n’a pas été mise à jour. La version actuelle de cette procédure est déjà incluse dans `loyalty-migration.sql`, donc ce correctif ne sert pas lors d’une nouvelle installation.

Pour une base déjà utilisée, ne relancez pas toute la liste : exécutez seulement les migrations qui n’y ont pas encore été appliquées. Pour activer la remise à zéro automatique après une récompense, une base ayant déjà les réglages fidélité doit uniquement recevoir `loyalty-reward-auto-reset-migration.sql`.

Créez ensuite un compte dans Supabase Auth, puis attribuez-lui le rôle admin avec son UUID :

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

## Routes

- `/` : site public et réservations.
- `/admin-pwa` : entrée à installer pour ajouter l’application admin séparément de la PWA client.
- `/admin-portal` : connexion admin.
- `/admin-dashboard` : tableau de bord réservé aux admins.
- `/fidelite` : connexion Google et carte de fidélité.

Les informations publiques utilisent des valeurs locales de secours si Supabase n’est pas configuré. Les réservations exigent Supabase et des créneaux actifs configurés pour un barbier.
