# API FRVtubers
Ce document r\u00e9sume les routes backend expos\u00e9es par l'application Next.js et explique comment consommer l'authentification Discord depuis d'autres projets React.

- URL de base de l'environnement local : `http://localhost:3000`
- URL de base de production (exemple) : `https://frvtubers.example.com`

> Remplacez `https://frvtubers.example.com` par votre domaine r\u00e9el dans les exemples ci-dessous.

## Authentification Discord (NextAuth)

| Route | M\u00e9thode | Description | Auth requise |
| --- | --- | --- | --- |
| `/api/auth/[...nextauth]` | GET / POST | Point d'entr\u00e9e NextAuth (signin, callback, session...) | Non |
| `/api/auth/session` | GET | Retourne la session courante (via NextAuth) | Oui (cookie) |
| `/api/auth/csrf` | GET | Retourne le token CSRF NextAuth | Non |
| `/api/auth/signin/discord` | GET / POST | D\u00e9marre l'OAuth Discord | Non |
| `/api/auth/signout` | POST | Termine la session | Oui (cookie) |

### Variables d'environnement li\u00e9es

- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` : Application OAuth Discord.
- `DISCORD_GUILD_ID` : Identifiant du serveur FRVtubers.
- `DISCORD_VTUBER_ROLE_ID` : R\u00f4le Discord qui d\u00e9clenche `hasVtuberRole`.
- `NEXTAUTH_SECRET` : Secret NextAuth (g\u00e9n\u00e9rez-le via `npx auth secret`).
- `NEXTAUTH_URL` : URL publique de l'application (`http://localhost:3000` en local).
- `NEXTAUTH_URL_INTERNAL` : URL interne ou priv\u00e9e que les services annexes utilisent pour valider les cookies g\u00e9n\u00e9r\u00e9s par le site principal.
- `NEXTAUTH_COOKIE_DOMAIN` : Domaine parent (ex. `.frvtubers.example.com`) utilis\u00e9 pour les cookies NextAuth (`next-auth.session-token`, `__Secure-next-auth.session-token`, `next-auth.csrf-token`).
- `NEXTAUTH_SESSION_MAX_AGE` : Dur\u00e9e de vie (en secondes) du cookie de session JWT (par d\u00e9faut 30 jours).
- `NEXTAUTH_FORCE_SECURE_COOKIES` : Force `Secure` m\u00eame si NextAuth ne d\u00e9tecte pas HTTPS (pratique pour les previews/tunnels).
- `NEXTAUTH_ALLOWED_REDIRECTS` : URLs suppl\u00e9mentaires autoris\u00e9es pour les callbacks OAuth (s\u00e9par\u00e9es par des virgules). Exemple : `http://localhost:5173/login`.
- `NEXTAUTH_LOG_REDIRECTS` : Active (`true`) ou d�sactive (`false`) un log console lors des d�cisions de redirection OAuth.
- `NEXTAUTH_VERBOSE_LOG` : Active (`true`) les logs NextAuth (erreurs/warn/debug) pour diagnostiquer les callbacks OAuth.

### Donn\u00e9es renvoy\u00e9es par la session

Exemple de r\u00e9ponse `GET /api/auth/session` (format JSON) :

```json
{
  "user": {
    "id": "123456789012345678",
    "name": "Utilisateur",
    "email": "user@example.com",
    "image": "https://cdn.discordapp.com/avatars/123456789012345678/avatar.png?size=256"
  },
  "discordMember": {
    "roles": ["1234567890", "2345678901"],
    "pending": false
  },
  "hasVtuberRole": true,
  "isGuildMember": true,
  "adminRole": "MODERATOR",
  "expires": "2025-05-05T16:30:00.000Z"
}
```

Champs personnalis\u00e9s disponibles :

- `discordMember.roles` : liste des ID de r\u00f4le Discord (si l'utilisateur est membre de la guilde).
- `discordMember.pending` : statut d\u2019adh\u00e9sion en attente dans Discord.
- `hasVtuberRole` : `true` si l'utilisateur poss\u00e8de le r\u00f4le `DISCORD_VTUBER_ROLE_ID`.
- `isGuildMember` : `true` si l'utilisateur est dans le serveur, `false` s'il ne l'est pas, `undefined` si l'information n'est pas disponible.
- `adminRole` : r\u00f4le interne d'administration (`MEMBER`, `MODERATOR`, `COMITE`) synchronis\u00e9 depuis la base, `MEMBER` par d\u00e9faut.

Le backend rafra\u00eechit automatiquement les tokens Discord et met \u00e0 jour les r\u00f4les \u00e0 chaque requ\u00eate de session.

## Onboarding VTuber

| Route | M\u00e9thode | Description | Auth requise |
| --- | --- | --- | --- |
| `/api/onboarding/application` | POST | Envoie une candidature VTuber via webhook Discord | Oui (session NextAuth) |

### Corps de requ\u00eate

```json
{
  "vtuberType": "PNG / Live2D / IRL...",
  "pseudo": "MonPseudo",
  "platforms": "Twitch, YouTube",
  "links": "https://twitch.tv/monspeudo",
  "socials": "@twitterHandle"
}
```

- Champs requis : `vtuberType`, `pseudo`, `platforms`, `links`.
- `socials` est facultatif.

Exemple en TypeScript :

```ts
const response = await fetch('https://frvtubers.example.com/api/onboarding/application', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include', // indispensable pour envoyer les cookies de session
  body: JSON.stringify({
    vtuberType: 'Live2D',
    pseudo: 'MonPseudo',
    platforms: 'Twitch',
    links: 'https://twitch.tv/monpseudo',
    socials: '@monpseudo'
  })
})

if (!response.ok) {
  const { error } = await response.json()
  throw new Error(error)
}
```

R\u00e9ponses possibles :

- `200 OK` : `{ "ok": true }`
- `400 Bad Request` : `{ "error": "Champ requis: <field>" }`
- `401 Unauthorized` : `{ "error": "Non authentifié" }` (si l'utilisateur n'est pas connect\u00e9)
- `500` / `502` : erreurs li\u00e9es au webhook Discord.


## Ressources (FRVResources)

Cette partie de l'API est celle consommee par le site FRVResources. Les ressources proposees via FRVResources sont envoyees a l'API FRVtubers pour validation. Les moderateurs valident/refusent et peuvent mettre des ressources en avant dans l'espace admin.

| Route | Methode | Description | Auth requise |
| --- | --- | --- | --- |
| `/api/resources` | POST | Soumettre une nouvelle ressource | Non |
| `/api/resources` | GET | Lister les ressources validees (publiques) | Non |
| `/api/resources/tags` | GET | Lister les tags disponibles | Non |
| `/api/resources/random` | GET | Lister les ressources aleatoires (avec filtres) | Non |
| `/api/resources/:id/click` | POST | Enregistrer un clic sur une ressource | Non |
| `/api/admin/resources` | GET | Lister toutes les ressources (admin) | Oui |
| `/api/admin/resources/:id` | PATCH | Mettre a jour le statut ou la mise en avant | Oui |
| `/api/admin/resources/:id` | DELETE | Supprimer une ressource | Oui |

Les routes publiques resources exposent des en-tetes CORS lorsque l'origin figure dans NEXTAUTH_CORS_ALLOWED_ORIGINS (ou NEXTAUTH_URL / NEXTAUTH_URL_INTERNAL). Les preflights OPTIONS sont supportes pour GET et POST.

### Soumettre une ressource

Corps JSON attendu (POST `/api/resources`) :

```json
{
  "submitterName": "Ton nom",
  "submitterEmail": "email@example.com",
  "submitterDiscord": "@pseudo#1234",
  "assetTitle": "Titre de l'asset",
  "creatorName": "Nom du createur",
  "assetType": "overlay / emotes / audio...",
  "assetUrl": "https://exemple.com/asset",
  "description": "Description (optionnel)",
  "previewImageUrl": "https://exemple.com/preview.png",
  "price": 0,
  "languages": ["FR", "EN"]
}
```

Champs requis : `submitterName`, `assetTitle`, `creatorName`, `assetUrl`.

Champs optionnels : `submitterEmail`, `submitterDiscord`, `assetType`, `description`, `previewImageUrl`, `price`, `languages`. `languages` accepte `FR`, `EN`, `OTHER` et peut contenir plusieurs valeurs.

Reponses possibles :

- `201 Created` : `{ "ok": true, "resource": { "id": "...", "status": "PENDING", "createdAt": "..." } }`
- `400 Bad Request` : `{ "error": "Champ requis: <field>" }` ou `{ "error": "URL de l'asset invalide." }`

### Lister les ressources validees

`GET /api/resources?featured=true&limit=50` retourne uniquement les ressources validees (statut `APPROVED`).

Parametres additionnels :

- `tags=overlay,emotes` : filtre par tags (slugs, separes par des virgules).
- `tagMode=any|all` : `any` (defaut) retourne les ressources qui ont au moins un des tags, `all` exige tous les tags.
- `type=overlay` : filtre par type (`assetType`).

### Lister les tags

`GET /api/resources/tags` retourne la liste des tags et le nombre de ressources publiees par tag.

### Ressources aleatoires

`GET /api/resources/random?limit=6&type=overlay&tags=emotes,rigging&tagMode=any` renvoie une selection aleatoire.

- `limit` : nombre max (defaut 6, max 50).
- `type` : filtre par `assetType`.
- `tags` / `tagMode` : idem que `/api/resources`.

### Compter les clics

`POST /api/resources/:id/click` enregistre un clic et renvoie le compteur mis a jour.

Exemple de reponse : `{ "ok": true, "resourceId": "...", "clickCount": 12 }`.

Les routes publiques (`/api/resources`, `/api/resources/random`, `/api/admin/resources`) incluent desormais `clickCount` pour chaque ressource.

## Utiliser l'auth dans d'autres applications React

La route `/api/auth/[...nextauth]` agit comme un fournisseur d'identit\u00e9 centralis\u00e9. Vous pouvez r\u00e9utiliser la connexion Discord dans d'autres apps React en respectant les points suivants.

### 1. Partager le domaine ou le sous-domaine

Les cookies NextAuth (session JWT chiffr\u00e9) sont li\u00e9s au domaine. Pour qu'une nouvelle application React consomme la session existante :

- D\u00e9ployez-la sur le m\u00eame domaine ou un sous-domaine commun (ex. `app.frvtubers.example.com`).
- Configurez `NEXTAUTH_URL=https://frvtubers.example.com` sur le backend, et ajoutez `NEXT_PUBLIC_FRVTUBERS_AUTH_ORIGIN=https://frvtubers.example.com` dans vos autres apps pour pointer vers l'API centrale.
- Ajoutez un en-t\u00eate `credentials: 'include'` dans vos requ\u00eates `fetch` afin que les cookies soient envoy\u00e9s.

Assurez-vous que `NEXTAUTH_URL_INTERNAL` pointe \u00e9galement vers le domaine principal et que `NEXTAUTH_COOKIE_DOMAIN` commence par un point (ex. `.frvtubers.example.com`). Les cookies NextAuth (`next-auth.session-token`, `__Secure-next-auth.session-token`, `next-auth.csrf-token`) sont configur\u00e9s avec `SameSite=None`, `Secure` et ce domaine parent pour \u00eatre partag\u00e9s par tous les sous-domaines.

### 2. Next.js 13+ avec `next-auth/react`

Si vos autres apps sont aussi en Next.js :

1. Installez `next-auth`.
2. Dans `next.config.js`, d\u00e9finissez `NEXT_PUBLIC_NEXTAUTH_URL` vers l'URL du site principal.
3. Cr\u00e9ez un provider r\u00e9utilisant l'API centrale :

```tsx
// app/providers.tsx
'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus>
      {children}
    </SessionProvider>
  )
}
```

4. Utilisez les helpers `signIn('discord')`, `signOut()` et `useSession()` de `next-auth/react`. Ils pointeront automatiquement vers `https://frvtubers.example.com/api/auth` gr\u00e2ce \u00e0 la variable `NEXTAUTH_URL`.
5. Pour prot\u00e9ger une page, appelez `const { status, data } = useSession()` et redirigez si `status === 'unauthenticated'`.

### 3. SPA React (Vite, CRA, etc.)

Pour une application React sans Next.js :

1. Cr\u00e9ez un fichier utilitaire pour r\u00e9cup\u00e9rer la session :

```ts
const AUTH_BASE_URL = import.meta.env.VITE_FRVTUBERS_AUTH_ORIGIN ?? 'https://frvtubers.example.com'

export async function fetchSession() {
  const response = await fetch(`${AUTH_BASE_URL}/api/auth/session`, {
    credentials: 'include'
  })
  if (!response.ok) return null
  return (await response.json()) as {
    user?: { id?: string; name?: string; image?: string }
    hasVtuberRole?: boolean
    isGuildMember?: boolean
  } | null
}

export function getSignInUrl(callbackUrl?: string) {
  const params = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''
  return `${AUTH_BASE_URL}/api/auth/signin/discord${params}`
}
```

2. Lorsqu'un utilisateur clique sur \u00ab Se connecter \u00bb, redirigez-le vers `getSignInUrl(window.location.href)`. Apr\u00e8s l'OAuth, Discord redirigera l'utilisateur vers `callbackUrl`, avec les cookies NextAuth positionn\u00e9s sur le domaine principal. En local (ex. Vite sur `http://localhost:5173/login`), ajoutez `NEXTAUTH_ALLOWED_REDIRECTS=http://localhost:5173/login` dans votre `.env` NextAuth pour autoriser cette redirection.
3. Pour savoir si l'utilisateur est connect\u00e9, appelez `fetchSession()` au montage et stockez le r\u00e9sultat dans votre state.
4. Ajoutez un bouton \u00ab Se d\u00e9connecter \u00bb qui fait `POST ${AUTH_BASE_URL}/api/auth/signout` avec `credentials: 'include'`.

> Important : les cookies de session ne sont partag\u00e9s que si vos applications partagent le m\u00eame domaine (ou sous-domaine) et si le navigateur autorise les cookies inter-sous-domaines. Pr\u00e9voyez un sous-domaine parent commun (`*.frvtubers.example.com`) et param\u00e8tres `NEXTAUTH_URL`/`NEXTAUTH_URL_INTERNAL` en cons\u00e9quence.

### 4. FRVStream (client vid\u00e9o)

Le front FRVStream tourne sur un sous-domaine et a besoin de r\u00e9utiliser la session du site principal. Il doit appeler `POST https://frvtubers.example.com/api/v1/auth/sync` avec `credentials: 'include'` pour transmettre les cookies NextAuth. L'endpoint r\u00e9pond avec la m\u00eame session enrichie (`user`, `discordMember`, `hasVtuberRole`, `isGuildMember`, etc.) et repose uniquement sur les cookies (pas d'Authorization header). Gr\u00e2ce au domaine parent `.frvtubers.example.com`, aux cookies `SameSite=None`/`Secure` et \u00e0 `NEXTAUTH_URL_INTERNAL`, les navigateurs incluent automatiquement la session. En cas de session manquante, FRVStream re\u00e7oit `401` et doit rediriger vers la page de connexion centrale.

### 5. Acc\u00e8s API depuis un backend externe

Si vous avez un backend Node/Express ou un worker qui doit v\u00e9rifier l'identit\u00e9 :

1. R\u00e9cup\u00e9rez le cookie `next-auth.session-token` transmis par le frontend.
2. Appelez `GET https://frvtubers.example.com/api/auth/session` en transmettant ce cookie (`Cookie: next-auth.session-token=...`).
3. Analysez les champs personnalis\u00e9s (`hasVtuberRole`, `isGuildMember`, `discordMember.roles`) pour g\u00e9rer vos autorisations.

## Kokori pour les créateurs – galerie vidéo

La page `/kokori-pour-les-createurs` s'appuie sur des données statiques (`assetVideos` dans `src/app/kokori-pour-les-createurs/page.tsx`) pour alimenter la galerie « Découvrez Kokori en action ». Chaque entrée suit la structure :

```ts
type AssetVideo = {
  title: string
  description: string
  source?: string
  file?: string
}
```

- Lorsque `source` et `file` sont fournis, la carte affiche un extrait vidéo et un bouton de téléchargement.
- Si ces propriétés sont omises, la carte reste centrée et sert d'appel à la contribution (par exemple « Pourquoi pas le vôtre ? » pour inviter les nouvelles propositions via le support).

Les propositions de nouveaux avatars doivent être déposées via le ticket-support Discord et respecter la licence Creative Commons (CC BY-NC 4.0) appliquée à Kokori.

## Tests rapides

- `curl -i http://localhost:3000/api/auth/session` : v\u00e9rifie la session courante (ajoutez `--cookie` avec un token si besoin).
- `curl -X POST http://localhost:3000/api/onboarding/application -H "Content-Type: application/json" -d '{"pseudo":"Test", ...}'` : v\u00e9rifie la validation des champs (n\u00e9cessite un cookie de session).
- Sur une nouvelle app React, testez la redirection `window.location.href = getSignInUrl(window.location.href)`.

En cas de probl\u00e8me, contr\u00f4lez :

- Les variables d'environnement (notamment `NEXTAUTH_URL`).
- Les scopes autoris\u00e9s c\u00f4t\u00e9 Discord (`identify email guilds guilds.members.read`).
- Les erreurs dans vos logs Next.js (`npm run dev` affiche les erreurs d'OAuth ou de webhook).
