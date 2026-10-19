# 8.6 — Le Collectif

Projet étudiant réalisé pour le sujet **« Ta petite entreprise »**.

Le projet contient exactement le socle demandé :

- une table Supabase `bieres` avec 6 colonnes ;
- une API Express avec 4 routes CRUD ;
- une page client React avec des cartes et des filtres ;
- une page gérant avec ajout, modification, disponibilité et suppression.

La grande expérience 3D, les animations et l'identité visuelle ont été réalisées avec l'aide d'outils d'IA. Elles constituent la partie créative du projet. Le CRUD React, Express et Supabase reste séparé et peut être expliqué simplement à l'oral.

## Le fonctionnement

```text
React sur Vercel
       │ fetch('/bieres')
       ▼
Express sur Render
       │ client Supabase + clé secrète
       ▼
Table bieres sur Supabase
```

React ne connaît jamais la clé Supabase. La clé reste dans `mon-api/.env` en local et dans les variables privées de Render en ligne.

## Les fichiers importants

| Fichier | Rôle |
| --- | --- |
| `mon-api/index.js` | charge le `.env`, crée le client Supabase et démarre Express |
| `mon-api/app.js` | contient les 4 routes et la validation |
| `mon-api/supabase/schema.sql` | crée la table et les 10 données de départ |
| `my-app/src/api.js` | fait les appels `fetch` vers Express |
| `my-app/src/App.jsx` | contient les pages client et gérant |

## 1. Créer la base Supabase

1. Crée un projet sur Supabase.
2. Ouvre **SQL Editor**.
3. Copie et exécute tout le fichier `mon-api/supabase/schema.sql`.
4. Dans **Project Settings → API**, récupère l'URL du projet et la clé serveur `secret` ou `service_role`.

La table possède seulement ces colonnes :

| Colonne | Type | Utilité |
| --- | --- | --- |
| `id` | uuid | identifiant créé automatiquement |
| `nom` | text | nom affiché |
| `prix` | numeric | prix fictif |
| `categorie` | text | Original, Gold ou Red |
| `image_url` | text | chemin de l'image |
| `disponible` | boolean | permet de griser une carte |

## 2. Configurer l'API

Dans `mon-api`, copie `.env.example` vers `.env` :

```env
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_KEY=ta-cle-secret-ou-service-role
PORT=3000
```

Le fichier `.env` est ignoré par Git. Il ne faut jamais mettre cette clé dans `my-app` ni dans une variable qui commence par `VITE_`.

## 3. Lancer le projet

Terminal 1 :

```powershell
cd mon-api
npm install
npm run dev
```

Terminal 2 :

```powershell
cd my-app
npm install
npm run dev
```

Ouvre `http://localhost:5173`. La page gérant se trouve sur `http://localhost:5173/#/gerant`.

## Les quatre routes du sujet

| Méthode | Route | Résultat |
| --- | --- | --- |
| `GET` | `/bieres` | liste les bières, code `200` |
| `POST` | `/bieres` | ajoute une bière, code `201` ou `400` |
| `PUT` | `/bieres/:id` | modifie une bière, code `200` ou `404` |
| `DELETE` | `/bieres/:id` | supprime une bière, code `204` |

Le détail des requêtes se trouve dans `docs/API.md`.

## Déploiement

Sur Render, choisis le dossier `mon-api` :

- Build Command : `npm install`
- Start Command : `npm start`
- variables privées : `SUPABASE_URL` et `SUPABASE_KEY`

Sur Vercel, choisis le dossier `my-app` :

- Framework Preset : Vite
- Build Command : `npm run build`
- Output Directory : `dist`
- variable : `VITE_API_URL=https://web-techno.onrender.com`

## Présentation orale

1. Montrer la table `bieres` dans Supabase.
2. Montrer `index.js` : la clé sert à créer le client Supabase côté serveur.
3. Montrer une route dans `app.js`.
4. Ajouter une bière depuis la page gérant.
5. Expliquer que `201` signifie « créé » et que `204` signifie « supprimé sans contenu à renvoyer ».
6. Montrer qu'un nom vide ou un prix négatif produit une erreur `400`.

Projet indépendant, sans vente et sans affiliation à la marque 8.6.
