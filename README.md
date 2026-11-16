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

**Ne pas publier ces textes en l’état.** Compléter les marqueurs `[À COMPLÉTER]`, confirmer les bases légales et vérifier l’identité de l’éditeur, du responsable et de l’hébergeur, les destinataires, durées et garanties des prestataires avant publication. Le bandeau de brouillon et `noindex` signalent ce statut ; ils ne constituent ni un contrôle d’accès ni un mécanisme bloquant de déploiement. Les rapports et la liste des informations à valider sont conservés localement dans `docs/rgpd/`, actuellement ignoré par Git : prévoir leur sauvegarde dans un espace privé séparé. Les pages ne règlent pas à elles seules les traceurs, la conservation ou l’exercice des droits.
