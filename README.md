# FRVtubers Website

Site vitrine open-source de la communauté FRVtubers, construit avec Next.js 16 et l’App Router. L’application met en avant les activités du serveur Discord, propose un onboarding pour les nouveaux créateurs et expose des données dynamiques (statistiques, présence en ligne, connexion Discord).

## ✨ Fonctionnalités

- **Hero dynamique** : rotation des drapeaux de la francophonie, statistiques mises à jour depuis le widget Discord.
- **Authentification Discord** : NextAuth avec scopes `identify`, `email`, `guilds`, `guilds.members.read`, récupération automatique des rôles.
- **Onboarding VTuber** : formulaire envoyé via webhook, statut temps réel du rôle (attente/validé).
- **Menu responsive** : header accessible, thème clair/sombre, burger menu animé.
- **Vitrine Kokori** : galerie vidéo des modèles disponibles avec une carte communautaire invitant à proposer votre propre avatar sous licence Creative Commons.
- **Stack moderne** : Next.js 16, React 19, Sass modules, FontAwesome, App Router.

## 🧱 Architecture

```
src/
 ├─ app/                # Routage App Router
 │   ├─ api/            # Routes API Next.js (auth, webhooks)
 │   ├─ login/          # Page d’authentification
 │   ├─ onboarding/     # Parcours d’accueil
 │   └─ page.tsx        # Page d’accueil
 ├─ components/
 │   ├─ home/           # Sections réutilisables (Hero, Header…)
 │   ├─ onboarding/     # Formulaire & styles onboarding
 │   └─ SessionProvider # Wrapper NextAuth
 ├─ assets/             # Images statiques
 └─ scss/               # Styles globaux / variables
```

## ⚙️ Prérequis

- Node.js 20+
- npm (ou pnpm / yarn / bun)
- Accès au [Portail développeur Discord](https://discord.com/developers/applications)

## 🔐 Variables d’environnement

Copiez d’abord le fichier exemple :

```bash
cp .env.example .env.local
```

Complétez ensuite :

| Variable | Rôle |
| --- | --- |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Application OAuth Discord |
| `DISCORD_GUILD_ID` | Identifiant du serveur FRVtubers |
| `DISCORD_VTUBER_ROLE_ID` | Rôle attribué aux VTuber validés |
| `DISCORD_APPLICATION_WEBHOOK_URL` | Webhook de candidature (channel staff) |
| `NEXTAUTH_SECRET` | Secret NextAuth (`npx auth secret`) |
| `NEXTAUTH_URL` | URL publique (dev : `http://localhost:3000`) |
| `NEXT_PUBLIC_DISCORD_INVITE` | Lien d’invitation affiché à l’utilisateur |
| `MAGAZINE_UPLOAD_DIR` | Répertoire persistant facultatif pour les PDF et couvertures uploadés (par défaut : `public/magazines`) |

> Dans Discord > Paramètres serveur > *Widget*, activez le widget et récupérez l’ID du serveur. Les scopes OAuth requis : `identify`, `email`, `guilds`, `guilds.members.read`.

## 🚀 Démarrage

```bash
npm install
npm run dev
```

- Ouvrez [http://localhost:3000](http://localhost:3000)
- Utilisez `/login` pour tester l’authentification Discord ou les credentials démo (`user@example.com` / `password`).

Scripts utiles :

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre le serveur Next.js en mode développement |
| `npm run build` | Compile la version production |
| `npm run start` | Lance le serveur production |
| `npm run lint` | Vérifie le code avec ESLint |

## 🔄 Flux Discord

1. L’utilisateur clique « Se connecter » (NextAuth + Discord OAuth).
2. À la connexion, l’API `/api/auth/[...nextauth]` récupère les rôles et vérifie l’appartenance au serveur (widget + API guilds).
3. La page `/onboarding` affiche ou masque le formulaire selon le statut (`isGuildMember`, rôle VTuber).
4. Le formulaire envoie la candidature via `POST /api/onboarding/application` vers le webhook staff.
5. Une fois le rôle attribué dans Discord, l’utilisateur voit « Candidature validée » (rafraîchissement automatique du rôle à chaque visite).

## 📦 Déploiement

- Configurer `NEXTAUTH_URL` avec le domaine final (https) et mettre à jour les redirect URI Discord.
- Vérifier que les variables d’environnement sont renseignées dans la plateforme (Vercel, Netlify, Docker…).
- Pour les magazines uploadés, monter un volume persistant et définir `MAGAZINE_UPLOAD_DIR` vers ce volume. Les fichiers sont servis dynamiquement sous `/magazines/*`, sans redémarrer Next.js.
- Utiliser `npm run build && npm run start` pour tester en local avant upload.

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de consulter [CONTRIBUTING.md](./CONTRIBUTING.md) pour connaître :

- Le workflow Git (fork, branche, PR)
- Les conventions de code / linting
- Les tests et validations attendus

## 📜 Licence

Ce projet est publié sous licence MIT. Voir [LICENSE](./LICENSE) pour plus de détails.

## 🙏 Remerciements

- Communauté FRVtubers pour les retours et l’inspiration design
- [Next.js](https://nextjs.org/) et [Vercel](https://vercel.com/) pour l’écosystème App Router
- [Discord](https://discord.dev) pour les APIs OAuth & Guilds

---

💬 Besoin d’aide ou envie d’échanger ? Rejoignez-nous sur Discord : [discord.gg/meyHQYWvjU](https://discord.gg/meyHQYWvjU).


## Sécurité de l'authentification et vérifications

L'authentification utilise exclusivement Discord. Les identifiants de démonstration ne sont plus acceptés. La configuration serveur se trouve dans `src/lib/auth.ts` ; la route NextAuth expose uniquement GET/POST.

À chaque validation de session, le compte et son compte OAuth Discord lié doivent encore exister en base. Une absence ou une erreur de lecture invalide l'identité de session : une reconnexion peut donc être nécessaire après une panne de base. Les rôles métier MEMBER/MODERATOR/COMITE sont conservés. `ADMIN_DISCORD_IDS` reconnaît les identifiants Discord vérifiés du compte lié, tout en conservant la compatibilité avec les identifiants internes déjà configurés. Cette exception reste prioritaire sur le rôle en base : retirer un accès de cette liste exige de modifier la configuration serveur.

`session.user.id` est l'identifiant interne ; `session.user.discordId` est l'identifiant Discord. Aucun jeton OAuth n'est renvoyé dans la session publique. Les scopes Discord et le partage de session existants sont conservés ; leur minimisation reste un chantier distinct.

Les candidatures vérifient côté serveur l'appartenance au serveur et le rôle déjà validé. Leur contenu est borné et les notifications de mentions Discord sont désactivées. Les mutations par cookie contrôlent aussi leur origine ; les clients serveur sans en-têtes navigateur restent compatibles.

Les logs applicatifs de sécurité ne reçoivent que des noms d'événements fixes et éventuellement un statut HTTP. Même le mode NextAuth verbeux ne doit pas réintroduire profils, requêtes, erreurs brutes, URLs de redirection ou tokens. Les logs du reverse proxy/hébergeur doivent être contrôlés séparément.

Les nouveaux avatars ont un nom opaque dérivé par HMAC ; les téléchargements sont limités au CDN Discord canonique, à 5 Mio et aux signatures PNG/GIF attendues. Aucun avatar historique n'est supprimé ou migré automatiquement. Les avatars restent publics ; des noms opaques ne constituent pas un contrôle d'accès. Une rotation de NEXTAUTH_SECRET peut créer de nouveaux noms sans effacer les anciennes copies.

Commandes disponibles :

```sh
npm run typecheck
npm run lint
npm test
npm run check:secrets -- --history
```

Les tests unitaires exécutent les modules TypeScript réels avec les I/O remplacées par des doubles : aucune base réelle, aucun webhook réel. Le contrôle de secrets compare des signatures connues et les secrets locaux en mémoire, sans les afficher, puis vérifie les bundles `.next/static` lorsqu'ils existent. L'option `--history` recherche les valeurs locales connues dans les révisions Git accessibles ; ce n'est pas une analyse exhaustive de tous les secrets historiques.

Après un build, `npm run test:http` (Node >= 22.13 avec `node:sqlite`) lance uniquement un serveur sur 127.0.0.1 et utilise une nouvelle base SQLite synthétique. Il teste de vrais cookies JWT et les autorisations HTTP, puis arrête ce serveur. Les bases `prisma/security-smoke-*.db` sont ignorées par Git et ne contiennent que des fixtures. Pour valider un build sans données réelles, utiliser également une base de build isolée et des secrets factices ; ne pas exécuter de nettoyage contre la base de production.

Ces vérifications ne remplacent pas un essai OAuth Discord réel avec compte de test, ni la revue des sous-domaines, contrats, sauvegardes, journaux d'infrastructure et procédures RGPD.

## Pages légales en préparation

Les routes `/confidentialite` et `/mentions-legales` sont des documents de travail en français, accessibles depuis le pied de page. Les formulaires de contact et de candidature affichent une information sur les données ; la connexion passe par `/login` pour présenter l’information avant l’autorisation Discord. Aucune case d’acceptation globale du RGPD n’est ajoutée.

Les notices renvoient à la rubrique concernée et à l’exercice des droits. Les pages disposent d’un sommaire et d’un lien d’évitement clavier. `tests/legal-pages.test.cjs` contrôle leur structure, leurs liens et les contrastes des couleurs par défaut ; `npm run test:http` vérifie également leur rendu HTTP public. Ces contrôles ne remplacent pas une vérification visuelle sur mobile et au clavier.

`docs/` est aussi exclu du traçage des fichiers de déploiement Next.js ; le test HTTP vérifie cette exclusion dans les manifestes produits par le build. Un paquet d’hébergement ou une archive préparés manuellement doivent appliquer leur propre exclusion : `.gitignore` ne les protège pas.

Le lecteur Twitch reste désactivé avant un choix explicite. Les choix sont centralisés par **vanilla-cookieconsent 3.3.0**, installé via npm et servi avec les fichiers du site, sans script CDN ni compte de service externe. L’accord et le refus sont conservés 180 jours dans le stockage local de l’origine courante, sans renouvellement à chaque visite. Le bouton **Gérer mes cookies** du footer ouvre le panneau de la bibliothèque ; `/parametres-confidentialite` propose également le retrait. Seul le bouton d’activation apparaît sous la prévisualisation ; il est masqué une fois Twitch autorisé. Le formulaire Open Collective reste un lien externe. Les appels serveur Discord, les cookies de connexion et les préférences thème/langue restent distincts de ce choix.

### Maintenir le gestionnaire de consentement

Documentation officielle : [intégration React](https://cookieconsent.orestbida.com/essential/getting-started.html#react), [configuration](https://cookieconsent.orestbida.com/reference/configuration-reference.html), [API](https://cookieconsent.orestbida.com/reference/api-reference.html).

| Fichier | Responsabilité |
| --- | --- |
| `src/lib/cookie-consent-config.ts` | Catégories/services, durée, révision et textes français/anglais |
| `src/components/privacy/CookieConsentManager.tsx` | Initialisation côté client unique depuis le layout ; suit la langue du document |
| `src/lib/twitch-consent.ts` | Pont entre la bibliothèque et React ; expiration, synchronisation et refus sûr en cas d’échec |
| `src/components/privacy/useTwitchConsent.ts` | Abonnement React au choix, actions et événements navigateur |
| `src/components/privacy/TwitchPlayer.tsx` | Monte l’iframe uniquement quand `choice === 'granted'` et la démonte au retrait |
| `src/app/cookie-consent.scss` | Variables de thème, focus et boutons du panneau ; CSS de la bibliothèque importé dans le layout |
| `tests/third-party-tracking.test.cjs` | Bibliothèque réelle dans un DOM jsdom isolé, choix, panneau, langues, expiration, retrait, migration et pannes |

Configuration volontaire : mode `opt-in`, catégorie `necessary` non désactivable, catégorie `media` facultative avec le seul service `twitch`. `autoShow: false` conserve une demande contextuelle sur le lecteur au lieu d’une fenêtre sur toutes les pages. Le gestionnaire reste accessible depuis le footer. Les traductions de ce panneau sont définies dans la configuration ; cela ne traduit pas les pages éditoriales du site.

`manageScriptTags: false` : la bibliothèque ne détecte ni ne bloque magiquement les iframes, images ou appels réseau. **Le blocage effectif reste dans le composant React avant tout chargement.** `autoClearCookies: false` évite une suppression générique des cookies ; retirer l’accord ne supprime pas les cookies d’une autre origine, notamment Twitch. Ne pas ajouter de règles d’effacement qui toucheraient aux cookies NextAuth.

Stockage unique : `localStorage.frvtubers_consent`, avec catégories/services, révision, horodatages, expiration, langue et `consentId` aléatoire généré par la bibliothèque. Aucun journal ni envoi serveur de cet identifiant n’est ajouté. Il ne constitue pas une preuve centralisée de consentement. Le choix reste limité au navigateur et à l’origine, sans partage avec les sous-domaines. Le pont revalide le stockage entre onglets, au focus/retour de page et à l’expiration ; si l’écriture est bloquée, un choix explicite peut fonctionner en mémoire sur la page courante.

Migration : l’ancienne clé `frvtubers:twitch-consent` est ignorée puis retirée si le stockage est disponible. **Les anciens accords ne sont pas importés** : un nouveau choix sera demandé à l’activation du lecteur. Aucun compte, avatar, message ou cookie de connexion n’est supprimé.

Pour ajouter un service :

1. Inventorier ses requêtes et finalités, identifier le responsable et examiner ses traceurs ; une URL externe ne suffit pas à justifier une catégorie soumise au consentement.
2. Ajouter le service dans une catégorie facultative de `cookie-consent-config.ts`, désactivée par défaut, et renseigner les textes/liens en français et anglais. Ne jamais classer un service de publicité ou de mesure comme nécessaire pour contourner le choix.
3. Relier le composant concerné à `acceptedService(service, category)` via un abonnement React, comme le pont Twitch. Tant que le choix n’est pas valide, ne monter aucune ressource du service et ne pas ajouter de préconnexion/préchargement. Prévoir aussi le démontage au retrait.
4. Incrémenter `CONSENT_REVISION` lors d’un changement substantiel des finalités/services/destinataires ou de l’information nécessitant un nouvel accord. `CONSENT_DAYS` définit la durée commune (180 jours actuellement). Ne pas renouveler le stockage à chaque visite.
5. Mettre à jour `/confidentialite`, les tests et le rapport privé `docs/rgpd/third-party-tracking.md`, puis contrôler le réseau dans un vrai navigateur avant publication.

Après une modification : `npm test`, `npm run typecheck`, lint ciblé, build avec une base synthétique, puis `npm run test:http`. `jsdom` est une dépendance de développement pour exécuter la bibliothèque réelle dans les tests (Node 22.13+ recommandé pour l’ensemble des tests, dont HTTP) ; il ne fournit ni rendu visuel ni audit réseau navigateur. Tester manuellement l’ouverture/fermeture du panneau, le clavier et le focus, le mobile, le choix mémorisé, sa révocation dans un autre onglet et l’absence de trafic Twitch avant accord. Une bibliothèque ne garantit pas à elle seule la conformité RGPD.

`tests/third-party-tracking.test.cjs` couvre le blocage initial, l’activation, la conservation, l’expiration, les pannes de stockage et le retrait. Le test HTTP contrôle aussi le HTML et les indications de préchargement initiaux. Ces contrôles ne constituent pas une observation du réseau dans un navigateur ; la procédure manuelle est dans `docs/rgpd/third-party-tracking.md` (document privé ignoré).