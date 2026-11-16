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
6. Redémarrer le processus de l'application selon votre procédure habituelle.

## 4. Nouvelle variable d'environnement

`NEXT_PUBLIC_SITE_HOSTNAME` : **nom d'hôte uniquement**, sans schéma ni port (ex. `exemple.org`, pas `https://exemple.org`). Elle sert au paramètre `parent` des lecteurs Twitch intégrés.

Attention : le préfixe `NEXT_PUBLIC_` signifie que la valeur est **intégrée au build**. Elle doit être définie dans `.env` (ou l'environnement) **avant `npm run build`** ; la modifier ensuite impose un nouveau build. Sans elle, le lecteur Twitch utilise `localhost` et ne s'affichera pas en production.

## 5. Dossiers d'uploads

`public/galerie`, `public/evenements` et `public/staff` ne sont pas dans git. Ils doivent :

- être **accessibles en écriture par l'utilisateur qui exécute l'application** ;
- être **inclus dans les sauvegardes régulières du VPS** (avec `public/magazines` et le fichier SQLite).

## 6. Service des fichiers uploadés

**Constat (vérifié en `npm run build` puis `next start`, Next 16.0.10)** : Next.js prend un instantané de `public/` au démarrage. Un fichier ajouté dans `public/` **après** le démarrage n'est pas servi (HTTP 404), alors qu'un fichier présent au build l'est (HTTP 200).

C'est probablement aussi pourquoi les uploads du magazine n'apparaissent aujourd'hui qu'après un redémarrage (explication probable, **non vérifiée**).

**Solution retenue : l'application sert elle-même ses uploads.** Des route handlers répondent aux mêmes URL que celles stockées en base :

- `/galerie/<slug>/<fichier>`
- `/evenements/<slug>/<fichier>`
- `/staff/<slug>/<fichier>`

Ils lisent le fichier sur disque (`public/<racine>/<slug>/<fichier>`) à chaque requête, n'acceptent que des noms d'images (`.jpg`, `.png`, `.webp`, `.gif`) et répondent 404 pour tout le reste (extension inconnue, tentative de sortie du dossier, fichier absent). Les réponses portent `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'` et un `Cache-Control` long (les noms de fichiers sont uniques). Aucune configuration serveur n'est nécessaire : les images sont visibles immédiatement après l'upload.

Les fichiers d'un évènement en brouillon restent accessibles par leur URL exacte (noms difficiles à deviner) ; c'est accepté.

**Optionnel : nginx devant l'application.** Servir directement ces trois chemins depuis le disque (un `location` avec `alias` vers `<racine du projet>/public/galerie/`, etc.) est une simple optimisation. La route de l'application reste inoffensive derrière.

## 7. Retour arrière

La migration est additive : les nouvelles tables peuvent rester en base, l'ancien code les ignore. Pour revenir en arrière, préférer `git revert` des commits concernés, ou redéployer le tag de la release précédente, puis `npm ci`, `npm run build` et redémarrage. Attention : `git checkout <commit>` laisse le dépôt en « detached HEAD », à éviter pour un déploiement durable.

Restaurer la sauvegarde SQLite de la section 2 **efface les données écrites depuis cette sauvegarde** (nouveaux évènements, photos, comptes, etc.) : à réserver aux cas graves.

## 8. Test manuel après déploiement

- [ ] Se connecter avec un compte MODÉRATEUR : les cartes « Évènements » et « Staff » apparaissent sur `/admin`.
- [ ] Créer un évènement en brouillon, ajouter un bloc image, **enregistrer deux fois de suite sans recharger la page** et vérifier que l'image s'affiche toujours.
- [ ] Publier l'évènement.
- [ ] Envoyer 3 photos dans l'album de l'évènement.
- [ ] Vérifier les pages publiques `/galerie`, `/evenements` et `/staff` (images visibles, voir section 6).
- [ ] Lightbox de la galerie au clavier : flèches gauche/droite pour naviguer, Échap pour fermer.
- [ ] Avec un compte MEMBRE : `/admin/evenements` doit rediriger hors de l'admin.
- [ ] Si un bloc Twitch est utilisé : le lecteur s'affiche (valide `NEXT_PUBLIC_SITE_HOSTNAME`).
