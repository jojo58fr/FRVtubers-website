# Déploiement : évènements, galerie et staff

Document pour Taku. Les migrations Prisma sont appliquées à la main sur le VPS.

## 1. Ce qui est livré

- **Base de données** : nouvelles tables (migration `prisma/migrations/20261116154431_add_events_gallery_staff/migration.sql`, purement additive : aucune table existante n'est modifiée ni supprimée).
- **Pages publiques** : `/evenements`, `/evenements/[slug]`, `/galerie`, `/galerie/[slug]`, `/staff`.
- **Pages admin** : `/admin/evenements` (création/édition d'évènements, articles par blocs), `/admin/evenements/[id]/photos` (album photos), `/admin/staff`. Les modérateurs et le comité y accèdent depuis le tableau de bord admin.
- **Dossiers d'uploads** (écrits à l'exécution, **absents de git**) : `public/galerie/`, `public/evenements/`, `public/staff/`.

## 2. Avant de migrer : sauvegardes

1. **Fichier SQLite** : `prisma/schema.prisma` lit `DATABASE_URL` (provider `sqlite`). La valeur est définie dans le fichier `.env` du serveur (non versionné). Un chemin relatif `file:./xxx.db` est résolu par Prisma depuis le dossier `prisma/`. Repérer le fichier réel avec la valeur de `DATABASE_URL` dans votre `.env`, arrêter l'écriture si possible, puis le copier (ex. `cp prisma/xxx.db prisma/xxx.db.bak-AAAAMMJJ`, ou `sqlite3 <fichier> ".backup '<copie>'"` si `sqlite3` est installé).
2. **Dossiers d'uploads** : copier `public/galerie`, `public/evenements`, `public/staff` (s'ils existent déjà) et `public/magazines`.

## 3. Étapes

1. Ajouter la variable d'environnement `NEXT_PUBLIC_SITE_HOSTNAME` (voir section 4) **avant** le build.
2. `git pull`
3. `npm ci`
4. `npm run build`
5. `npm run prisma:deploy` (= `prisma migrate deploy`)
6. Redémarrer le processus de l'application (pm2/systemd selon votre installation).

## 4. Nouvelle variable d'environnement

`NEXT_PUBLIC_SITE_HOSTNAME` : **nom d'hôte uniquement**, sans schéma ni port (ex. `frvtubers.com`, pas `https://frvtubers.com`). Elle sert au paramètre `parent` des lecteurs Twitch intégrés.

Attention : le préfixe `NEXT_PUBLIC_` signifie que la valeur est **intégrée au build**. Elle doit être définie dans `.env` (ou l'environnement) **avant `npm run build`** ; la modifier ensuite impose un nouveau build. Sans elle, le lecteur Twitch utilise `localhost` et ne s'affichera pas en production.

## 5. Dossiers d'uploads

`public/galerie`, `public/evenements` et `public/staff` ne sont pas dans git. Ils doivent :

- être **accessibles en écriture par l'utilisateur qui exécute l'application** ;
- être **inclus dans les sauvegardes régulières du VPS** (avec `public/magazines` et le fichier SQLite).

## 6. Service des fichiers uploadés : à trancher

**Constat (vérifié en `npm run build` puis `next start`, Next 16.0.10)** : un fichier ajouté dans `public/` **après le démarrage** du serveur n'est **pas servi** par Next.

- `curl -I /galerie/verif-task11/test.png` (PNG créé après le démarrage) : **HTTP 404**, `Content-Type: text/html; charset=utf-8` (page 404 de Next).
- `curl -I /assets/FRVtubersLogo.png` (fichier présent au build) : **HTTP 200**, `Content-Type: image/png`.

Conséquence : en production, les images uploadées via l'admin (photos de galerie, images d'évènements, avatars staff) renverraient 404 tant que rien d'autre ne les sert. Pas de contournement implémenté dans le code ; deux options, **à trancher** :

- **A. Reverse proxy** (nginx ou équivalent) : servir directement depuis le disque les chemins `/galerie/`, `/evenements/` et `/staff/` (par ex. un `location` avec `alias` vers `<racine du projet>/public/galerie/` etc.), le reste étant transmis à Next. Aucun changement de code, et les fichiers sont servis immédiatement après upload.
- **B. Côté code** : une route handler Next qui lit le fichier sur disque, plus des `rewrites` dans `next.config` pour y rediriger ces chemins. À décider et à implémenter par le contrôleur du projet.

Tant que l'option A ou B n'est pas en place, les uploads fonctionnent (fichiers écrits) mais ne s'affichent pas.

## 7. Retour arrière

La migration est additive : revenir à la version précédente du code (`git checkout` du commit précédent, `npm ci`, `npm run build`, redémarrage) est sans risque. Les nouvelles tables peuvent rester en base, l'ancien code les ignore. En cas de souci majeur, restaurer le fichier SQLite sauvegardé en section 2.

## 8. Test manuel après déploiement

- [ ] Se connecter avec un compte MODÉRATEUR : les cartes « Évènements » et « Staff » apparaissent sur `/admin`.
- [ ] Créer un évènement en brouillon, ajouter un bloc image, **enregistrer deux fois de suite sans recharger la page** et vérifier que l'image s'affiche toujours.
- [ ] Publier l'évènement.
- [ ] Envoyer 3 photos dans l'album de l'évènement.
- [ ] Vérifier les pages publiques `/galerie`, `/evenements` et `/staff` (images visibles, voir section 6).
- [ ] Lightbox de la galerie au clavier : flèches gauche/droite pour naviguer, Échap pour fermer.
- [ ] Avec un compte MEMBRE : `/admin/evenements` doit rediriger hors de l'admin.
- [ ] Si un bloc Twitch est utilisé : le lecteur s'affiche (valide `NEXT_PUBLIC_SITE_HOSTNAME`).
