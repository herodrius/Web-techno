# 8.6 — Le Collectif

Projet React + Express + Supabase réalisé pour le sujet **« Ta petite entreprise »**. Le visiteur découvre un catalogue 8.6 dans une expérience plein écran : une vraie canette texturée tourne en 3D, se déplace avec le scroll, révèle son couvercle et rejoint les variantes Gold et Red. Une seconde page permet au gérant d’ajouter, modifier, rendre indisponible ou supprimer une référence.

Projet étudiant indépendant, sans vente et sans affiliation à 8.6 ou Royal Swinkels. Les produits et tarifs du catalogue sont fictifs.

## Comment le projet fonctionne

```text
React (Vercel) ── fetch /bieres ──► Express (Render) ──► table bieres (Supabase)
       ▲                                  │
       └──────── réponse JSON ◄───────────┘
```

React n’accède jamais directement à Supabase. La clé secrète reste uniquement dans `mon-api/.env` en local et dans les variables privées de Render en production.

La base contient une seule table `bieres` avec six colonnes : `id`, `nom`, `prix`, `categorie`, `image_url` et `disponible`. `disponible` est le booléen demandé dans le sujet.

## Lancer le site maintenant

Un mode démo est déjà préparé : il permet de tester les dix références et tout le CRUD avant de créer Supabase. Les changements restent en mémoire jusqu’au redémarrage de l’API.

Dans un premier terminal :

```powershell
cd mon-api
npm ci
npm run dev
```

Dans un second terminal :

```powershell
cd my-app
npm ci
npm run dev
```

Ouvre `http://localhost:5173`. La page client est à `/` et l’espace gérant à `/#/gerant`.

## Brancher Supabase

1. Crée un projet sur Supabase.
2. Dans **SQL Editor**, exécute tout le fichier [schema.sql](mon-api/supabase/schema.sql). Il crée la table, ses contrôles et les dix lignes de démonstration.
3. Dans `mon-api/.env`, renseigne l’URL du projet et la clé serveur `service_role` ou `secret`, puis désactive la démo :

```env
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_KEY=ta-cle-serveur
DEMO_MODE=false
PORT=3000
```

Redémarre ensuite l’API. `GET http://localhost:3000/health` doit répondre avec `"storage":"supabase"`. Ne place jamais `SUPABASE_KEY` dans `my-app` ni dans une variable commençant par `VITE_`.

## Les quatre routes du sujet

| Méthode | Route | Résultat attendu |
| --- | --- | --- |
| `GET` | `/bieres` | `200`, liste des références |
| `POST` | `/bieres` | `201`, ajoute une référence ; `400` si le formulaire est invalide |
| `PUT` | `/bieres/:id` | `200`, remplace la fiche ; `404` si l’ID n’existe pas |
| `DELETE` | `/bieres/:id` | `204`, supprime la référence |

Les mêmes routes existent sous `/api/bieres` pour faciliter les tests. Le prix négatif, le nom vide, une catégorie inconnue, un booléen incorrect et une image non valide sont refusés côté serveur.

Le guide [API.md](docs/API.md) explique les requêtes depuis le début avec des exemples JSON.

## Ce qui répond au sujet

- page client avec au moins dix produits, cartes en `flex`, recherche, catégories et filtre de disponibilité ;
- produits indisponibles visuellement grisés ;
- page gérant React avec formulaire contrôlé par `useState` ;
- ajout, modification, bouton de disponibilité et suppression ;
- une table Supabase à six colonnes dont un booléen ;
- validation côté Express et codes HTTP demandés ;
- frontend relié uniquement à Express ;
- expérience 3D Three.js au scroll, avec version allégée si les animations sont réduites ;
- vraies faces de canettes Original, Gold et Red intégrées localement pour la démonstration.

## Déploiement

### Render — dossier `mon-api`

| Réglage | Valeur |
| --- | --- |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_KEY` | clé serveur Supabase |
| `DEMO_MODE` | `false` |
| `ADMIN_TOKEN` | code privé choisi pour les mutations du gérant |
| `CORS_ORIGINS` | `https://web-techno-ten.vercel.app` |

### Vercel — dossier `my-app`

| Réglage | Valeur |
| --- | --- |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| `VITE_API_URL` | `https://web-techno.onrender.com` |

Après une modification de variable, redéploie le service concerné.

## Vérifier avant de rendre

```powershell
cd mon-api
npm test
```

```powershell
cd my-app
npm run lint
npm run build
```

Les visuels des canettes sont préparés avec [process-real-packshots.py](scripts/process-real-packshots.py). Le détail des sources se trouve dans [CREDITS.md](my-app/public/products/CREDITS.md).
