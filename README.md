# 8.6 — Le Collectif

Un site React/Vite et une API Express pour découvrir trois références 8.6, filtrer le catalogue, garder des favoris et publier des avis. Projet pédagogique indépendant, sans vente et sans affiliation à la marque. Les canettes sont des illustrations CSS ; les sources des caractéristiques sont dans `mon-api/data/beers.js`.

## Commencer par comprendre

Le navigateur affiche **React** (`my-app`). React envoie une requête HTTP avec `fetch` au serveur **Express** (`mon-api`). Express renvoie du **JSON**, c’est-à-dire des objets JavaScript sérialisés en texte. React met son état à jour avec `setBeers` ou `setReviews`, puis l’affichage change.

```text
Page React → GET /api/beers → Express → catalogue JSON → cartes de bières
Formulaire → POST /api/beers/original/reviews → validation → fichier JSON → avis affiché
```

Le catalogue vient réellement de l’API, sans copie cachée côté React. Si l’API ne répond pas, le site affiche un message et propose de réessayer. Les favoris sont stockés dans le navigateur avec `localStorage`. Les avis sont publics et stockés sur le serveur : ce sont deux mécanismes différents.

Lis [le guide API pas à pas](docs/API.md) : requêtes, réponses, CORS, validation, persistance et exemples.

## Lancer sur ton ordinateur

Dans un premier terminal depuis la racine du dépôt :

```powershell
cd mon-api
npm ci
npm start
```

Dans un deuxième terminal depuis la racine du dépôt :

```powershell
cd my-app
npm ci
npm run dev
```

Ouvre l’adresse donnée par Vite, généralement `http://localhost:5173`. Garde les deux terminaux actifs. Node.js 22 ou plus est requis pour l’API. Aucun fichier `.env` n’est nécessaire pour le développement : Vite transmet `/api` à `http://127.0.0.1:3000`.

## Où lire le code

| Fichier | Rôle |
| --- | --- |
| `my-app/src/main.jsx` | Monte le composant `App` dans la page HTML. |
| `my-app/src/App.jsx` | Catalogue, filtres, favoris, fiche et formulaire d’avis. |
| `my-app/src/api.js` | Envoie les requêtes `fetch` et gère les erreurs. |
| `my-app/src/components/BeerExperience.jsx` | Canettes illustrées et animations au scroll. |
| `my-app/vite.config.js` | Proxy entre Vite et l’API locale. |
| `mon-api/app.js` | Routes HTTP, CORS, validation et réponses JSON. |
| `mon-api/review-store.js` | Lecture/écriture du fichier d’avis. |
| `mon-api/index.js` | Lance le serveur au port demandé par Render. |

Les anciens exercices `button.jsx` et `/users` sont conservés.

## Déployer avec tes hébergements existants

Il faut envoyer ces fichiers sur GitHub et redéployer **les deux projets**. Le code local n’est pas automatiquement le code en ligne.

### Render — API

- Root Directory : `mon-api`
- Build Command : `npm ci`
- Start Command : `npm start`
- `CORS_ORIGINS` : `https://web-techno-ten.vercel.app` (ajouter les autres domaines exacts, séparés par des virgules si nécessaire)
- Le serveur utilise `process.env.PORT`, fourni par Render.

Après déploiement, vérifier `https://web-techno.onrender.com/api/health` et `https://web-techno.onrender.com/api/beers`.

### Vercel — site React

- Root Directory : `my-app`
- Framework Preset : **Vite**
- Build Command : `npm run build`
- Output Directory : `dist`
- Variable d’environnement `VITE_API_URL` : `https://web-techno.onrender.com`, sans `/api` final.

Cette adresse Render est également la valeur de production par défaut. Après modification d’une variable Vite, redéployer le frontend : la valeur est intégrée au moment du build. `my-app/vercel.json` fixe les réglages Vite. Pour un domaine Vercel différent, l’ajouter à `CORS_ORIGINS` sur Render.

### Conservation des avis

Le fichier JSON conserve les avis entre deux lancements **si le disque est conservé**. Les fichiers des services Render sans disque persistant sont éphémères : avis perdus au redéploiement, redémarrage ou mise en veille selon l’offre. Le site est donc une démonstration tant que ce stockage n’est pas configuré.

Pour conserver les avis sur Render, monter un disque persistant puis définir `DATA_FILE` vers un fichier de ce disque (par exemple `/var/data/reviews.json` si le disque est monté à `/var/data`), ou remplacer le stockage par une base de données. Ne pas mettre le fichier d’avis dans Git. Les avis publics ne constituent pas un système de comptes utilisateurs ni un service avec modération.

Référence : [stockage et limites de Render](https://render.com/docs/free).

## Vérifier

```powershell
cd mon-api
npm test
```

```powershell
cd my-app
npm run lint
npm run build
```

Les tests API utilisent un dossier temporaire, sans modifier les avis du serveur.
