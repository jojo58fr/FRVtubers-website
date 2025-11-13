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
