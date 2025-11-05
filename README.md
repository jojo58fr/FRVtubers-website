# FRVtubers Website

Site vitrine Next.js pour la communauté FRVtubers. Le projet utilise l’App Router, NextAuth pour l’authentification et Sass pour le style.

## Prérequis

- Node.js 20+
- npm (ou pnpm / yarn / bun)
- Un compte Discord pour créer une application OAuth2

## Configuration

1. Copiez le fichier d’exemple d’environnement :

   ```bash
   cp .env.example .env.local
   ```

2. Créez une application sur le [Portail développeur Discord](https://discord.com/developers/applications) :

   - Onglet **OAuth2 → General** :
     - Ajoutez un **Redirect URL** `http://localhost:3000/api/auth/callback/discord` pour le développement local.
     - Copiez le `CLIENT ID` et le `CLIENT SECRET` puis complétez `.env.local`.
   - Onglet **OAuth2 → URL Generator** :
     - Cochez les scopes `identify`, `email`, `guilds` et `guilds.members.read`.

3. Activez le **Server Widget** dans les paramètres de votre serveur Discord (Paramètres du serveur → *Widget* → activer). Copiez l’identifiant du serveur (mode développeur → clic droit → *Copier l’identifiant*) et renseignez :

   - `DISCORD_GUILD_ID` pour la récupération des membres en ligne.
   - `DISCORD_VTUBER_ROLE_ID` avec l’identifiant du rôle accordé aux VTubers.
   - `DISCORD_APPLICATION_WEBHOOK_URL` avec le webhook du canal où seront envoyées les candidatures.

4. Facultatif : ajustez `NEXT_PUBLIC_DISCORD_INVITE` si vous utilisez une autre invitation que celle fournie par défaut.

5. Générez un secret pour NextAuth :

   ```bash
   npx auth secret
   ```

   Collez la valeur dans `NEXTAUTH_SECRET`. Vérifiez que `NEXTAUTH_URL` pointe vers l’URL de votre environnement (par défaut `http://localhost:3000`).

## Développement

```bash
npm install
npm run dev
```

Rendez-vous sur [http://localhost:3000](http://localhost:3000).

## Authentification Discord

- Le bouton **Se connecter** dans l’en-tête lance le flux OAuth2 Discord.
- La page `/login` permet également l’authentification (Discord ou démo locale `user@example.com` / `password`).
- Après connexion, les rôles Discord de l’utilisateur sont récupérés (scope `guilds.members.read`) et exposés dans la session NextAuth.

## Onboarding VTuber

- La page `/onboarding` guide les nouveaux membres :
  1. Lien d’invitation vers le Discord FRVTubers.
  2. Formulaire de candidature, envoyé via le webhook configuré.
  3. Statut dynamique indiquant si le rôle VTuber est accordé ou en attente.

Assurez-vous que toutes les variables d’environnement sont présentes avant de lancer l’application ; NextAuth et le webhook refuseront de fonctionner si certaines valeurs manquent.
