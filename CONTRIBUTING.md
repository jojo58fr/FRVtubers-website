# Contribuer au projet FRVtubers Website

Merci de votre intérêt pour ce projet open-source ! Ce guide explique comment préparer votre environnement, proposer des changements et collaborer efficacement.

## 🧰 Préparer son environnement

1. **Fork** du dépôt puis **clone** sur votre machine.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Créez un fichier `.env.local` (copie de `.env.example`) et renseignez les variables nécessaires.
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

## 🌱 Workflow Git

- Travaillez sur une branche dédiée :  
  `feat/nom-fonctionnalite`, `fix/bug-description`, `docs/mise-a-jour-readme`, etc.
- Commits concis et explicites. Utilisez l’impératif :  
  `feat: add onboarding status badge`.
- Ouvrez une Pull Request (PR) dès que possible et cochez la checklist (tests, lint, captures si UI).

## ✅ Qualité & tests

Avant toute PR :

- `npm run lint` doit passer sans erreur.
- Vérifiez le rendu sur desktop **et** mobile (menu burger, onboarding).
- Lorsque vous modifiez l’API ou la configuration, décrivez la procédure de test (screenshots, requêtes, etc.).

## 🧭 Lignes directrices

- **Langue** : le contenu et les messages utilisateur sont en français.
- **Styles** : privilégiez les modules SCSS existants. Les variables de thème (`--background`, `--text-primary`, etc.) doivent être utilisées.
- **Accessibilité** : garder les attributs `aria-*`, les textes alternatifs et les rôles.
- **Dépendances** : évitez d’ajouter une librairie sans justification. Préférez une PR séparée si nécessaire.
- **Fichiers générés** : ne commitez pas les outputs (`.next`, `node_modules`, fichiers temporaires…).

## 📄 Documentation

- Mettez à jour le `README.md` lorsque vous ajoutez une fonctionnalité ou changez le setup.
- Ajoutez/chiffrez les nouvelles variables dans `.env.example` et documentez-les.
- Pour des instructions de contribution longues ou spécifiques, créez une nouvelle section dans ce `CONTRIBUTING.md`.

## 🗣 Processus de review

- Les PR sont revues par les mainteneurs FRVtubers.
- Précisez ce qui doit être examiné (UX, code, performance, accessibilité…).
- Répondez aux commentaires et marquez les conversations comme résolues lorsque c’est le cas.

## 💬 Besoin d’aide ?

- Ouvrez une issue (bug, question, idée).
- Rejoignez le Discord FRVtubers : [discord.gg/meyHQYWvjU](https://discord.gg/meyHQYWvjU).

Merci pour votre contribution ! 🙌
