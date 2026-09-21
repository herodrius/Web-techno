# Comprendre ton site et ton API, depuis le début

Ton projet contient deux programmes qui se parlent. `my-app` contient l'interface React : ce que le visiteur voit et clique. `mon-api` contient un serveur Express : il reçoit des demandes et renvoie des données. En ligne, Vercel héberge l'interface et Render héberge l'API.

```text
Navigateur : site React sur Vercel
     │
     ├─ GET /api/beers ────────────────► API Express sur Render
     │ ◄──────── JSON { data: [...] } ─┘
     │
     └─ POST /api/beers/original/reviews ─► validation → fichier des avis
       ◄──────── JSON { data: avis } ────┘
```

L'API ne renvoie pas la page HTML du site : elle renvoie les informations que React affiche. Le catalogue vient réellement du serveur. Les avis commencent vides : aucun faux commentaire ou score n'est prérempli.

## 1. Ce qui a été codé

| Fichier | Son rôle |
| --- | --- |
| `mon-api/index.js` | Démarre le serveur, sur le port donné par Render ou 3000 en local. |
| `mon-api/app.js` | Déclare les routes, les autorisations CORS et la validation des demandes. |
| `mon-api/data/beers.js` | Contient les trois fiches du catalogue et leurs sources. |
| `mon-api/review-store.js` | Lit et enregistre les avis dans un fichier JSON. |
| `mon-api/tests/api.test.js` | Vérifie les routes et la sauvegarde avec de vraies requêtes HTTP locales. |

Tu connaissais déjà les routes `/users`. Elles fonctionnent toujours avec leurs réponses d'origine. Les nouvelles routes sont regroupées sous `/api`.

## 2. Une route, GET et JSON

Une **route** associe une méthode HTTP à un chemin. `GET /api/beers` signifie : « lis la liste des bières ». Dans Express, le principe est :

```js
app.get('/api/beers', (req, res) => {
  res.json({ data: beers })
})
```

`req` contient la demande du client ; `res` sert à lui répondre. `res.json(...)` transforme l'objet JavaScript en JSON. JSON est un format texte permettant à deux programmes d'échanger des objets, nombres et listes. Exemple de réponse abrégée :

```json
{
  "data": [
    { "id": "original", "name": "Original", "abv": 8.6 }
  ]
}
```

Ici `data` est une propriété que nous avons choisie pour garder un format régulier ; ce n'est pas un mot magique de React.

### Les routes de ton projet

| Méthode | Chemin | Résultat |
| --- | --- | --- |
| `GET` | `/` | Message d'accueil et liens utiles. |
| `GET` | `/api/health` | État du serveur et information sur le stockage. |
| `GET` | `/api/beers` | Les trois bières dans `{ "data": [...] }`. |
| `GET` | `/api/beers?search=gold` | Recherche dans les noms, descriptions et notes aromatiques. |
| `GET` | `/api/beers?type=Ambrée` | Filtre par style exact, sans distinguer majuscules ou accents. |
| `GET` | `/api/beers/original` | Une bière dans `{ "data": {...} }`. |
| `GET` | `/api/beers/original/reviews` | Ses avis, du plus récemment enregistré au plus ancien. |
| `POST` | `/api/beers/original/reviews` | Valide et ajoute un avis. |

Les identifiants sont `original`, `gold` et `red`. Remplace `original` dans le chemin pour choisir une autre fiche.

Une fiche contient `id`, `name`, `tagline`, `style`, `abv`, `volume`, `description`, `notes`, `color` et `sourceUrl`. `abv` est un nombre : par exemple `8.6` signifie 8,6 % vol. Un avis contient `id`, `beerId`, `author`, `rating`, `comment` et `createdAt`.

## 3. Comment React récupère la liste

Voici un exemple minimal avec l'API locale :

```js
async function chargerBieres() {
  const response = await fetch('http://localhost:3000/api/beers')
  const resultat = await response.json()

  if (!response.ok) {
    throw new Error(resultat.error || 'Impossible de charger les bières')
  }

  return resultat.data
}
```

`fetch()` envoie la demande. `await` attend la réponse. `response.json()` lit le texte JSON et produit un objet JavaScript. React peut alors conserver la liste dans un `useState` et afficher une carte par bière avec `map()`.

On contrôle `response.ok`, car une réponse HTTP 404 ou 500 n'entraîne pas automatiquement le rejet de `fetch()`. Une panne réseau doit également être interceptée par `try/catch` pour afficher une erreur dans l'interface. [Documentation MDN de fetch](https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch).

## 4. Ajouter un avis avec POST

`GET` lit des données ; `POST` envoie de nouvelles données. Exemple pédagogique :

```js
async function envoyerAvis() {
  const response = await fetch('http://localhost:3000/api/beers/original/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author: 'Camille',
      rating: 4,
      comment: 'Un exemple pour tester le formulaire.',
    }),
  })

  const resultat = await response.json()
  if (!response.ok) throw new Error(resultat.error)
  return resultat.data
}
```

`JSON.stringify()` convertit l'objet en texte. L'en-tête `Content-Type` indique à Express que le contenu est du JSON. `express.json()` le transforme en objet accessible dans `req.body`.

Le serveur vérifie le pseudo (2 à 40 caractères), la note (un entier de 1 à 5) et le commentaire (10 à 1000 caractères). Il enlève les espaces superflus au début et à la fin. La requête entière est limitée à 16 Ko. Il choisit lui-même un identifiant unique et une date, puis enregistre l'avis **avant** de renvoyer le succès. Si l'enregistrement échoue, le site reçoit une erreur et l'avis n'est pas ajouté en mémoire.

### Les codes de réponse

| Code | Sens dans ce projet |
| --- | --- |
| `200` | Lecture réussie. |
| `201` | Avis ou utilisateur créé. |
| `204` | Réponse réussie sans contenu, par exemple un preflight CORS. |
| `400` | Formulaire, filtre ou JSON invalide. |
| `403` | Origine du site absente de la liste CORS autorisée. |
| `404` | Bière ou route introuvable. |
| `413` | Corps de requête trop volumineux. |
| `415` | Format autre que JSON pour un avis. |
| `500` | Erreur interne, par exemple une écriture disque impossible. |

Les erreurs ont la forme `{ "error": "Message lisible" }`.

## 5. Lancer les deux programmes sur ton ordinateur

Utilise Node.js 22 ou plus récent. Ouvre un terminal dans `mon-api` :

```sh
npm ci
npm start
```

L'API écoute sur [localhost:3000](http://localhost:3000). Ouvre [le catalogue JSON](http://localhost:3000/api/beers) pour voir les données sans React. `npm run dev` redémarre automatiquement l'API quand tu modifies ses fichiers. `npm test` vérifie les routes sans modifier les vrais avis.

Dans un deuxième terminal, depuis `my-app` :

```sh
npm ci
npm run dev
```

En développement, aucun fichier d'environnement n'est nécessaire : Vite transmet les demandes `/api` à `http://127.0.0.1:3000` grâce à son proxy. Pour choisir explicitement une autre API, utilise `VITE_API_URL=http://localhost:3000` dans `my-app/.env.local`, puis redémarre Vite. Le fichier `.env.example` du frontend fournit un exemple.

## 6. Mettre en ligne sur Render et Vercel

Ces nouveaux fichiers doivent d'abord être présents sur la branche GitHub liée aux deux hébergeurs. Modifier les fichiers sur ton ordinateur ne modifie pas immédiatement tes sites en ligne.

Pour ton service Render existant :

| Réglage | Valeur |
| --- | --- |
| Root Directory | `mon-api` (le premier dossier, pas `mon-api/mon-api`) |
| Runtime | Node |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Render fournit la variable `PORT`. Le serveur écoute sur `0.0.0.0` pour être accessible depuis l'extérieur. Après le déploiement, ouvre [l'état de l'API](https://web-techno.onrender.com/api/health), puis [le catalogue](https://web-techno.onrender.com/api/beers). Si ces chemins répondent encore 404, le service utilise probablement l'ancienne version du code. [Guide officiel Render pour Express](https://render.com/docs/deploy-node-express-app).

Pour le site Vercel :

| Réglage | Valeur |
| --- | --- |
| Root Directory | `my-app` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variable d'environnement | `VITE_API_URL=https://web-techno.onrender.com` |

Ne termine pas cette URL par `/api` : les appels du frontend ajoutent déjà `/api/beers`. Redéploie le frontend après un changement de variable Vite, car elle est intégrée pendant la compilation. Cette URL est publique ; aucune clé secrète ne doit être placée dans une variable commençant par `VITE_`.

## 7. Pourquoi il y a du CORS

Le navigateur voit deux origines différentes : `web-techno-ten.vercel.app` pour le site et `web-techno.onrender.com` pour les données. L'API autorise donc explicitement le domaine Vercel et les adresses locales sur les ports 5173 et 4173.

Avant un POST JSON, le navigateur peut envoyer une demande `OPTIONS`, appelée **preflight**. L'API répond avec les méthodes et en-têtes autorisés. Pour ajouter un autre domaine, définis dans Render `CORS_ORIGINS=https://autre-site.vercel.app,https://mon-domaine.fr`, sans slash final et sans chemin. Redémarre ou redéploie le service après ce changement.

CORS n'est pas un système de connexion : ces routes restent publiques, notamment depuis Postman. Le projet est une démonstration sans comptes, modération ni protection anti-spam. Il ne collecte aucun e-mail ; les pseudos et commentaires publiés sont visibles par tous.

## 8. Où les avis sont stockés

Par défaut, les avis sont enregistrés dans `mon-api/storage/reviews.json`, un fichier exclu de Git. Ils restent présents après un arrêt et un redémarrage **sur le même disque local**. Les écritures passent une par une et remplacent le fichier complet par renommage d'un fichier temporaire, pour éviter que deux envois simultanés se perdent.

**Sur Render sans disque persistant, les fichiers écrits peuvent disparaître au redémarrage ou au redéploiement.** Pour conserver les avis, monte un disque persistant et définis `DATA_FILE=/var/data/reviews.json` si son chemin de montage est `/var/data`. Seuls les fichiers sous ce chemin sont conservés. Les disques persistants Render nécessitent un service compatible payant ; aucune offre ni dépense n'est activée par le code. [Documentation Render des disques](https://render.com/docs/disks).

Une autre évolution consiste à remplacer le fichier JSON par une base de données, telle que PostgreSQL. Le fichier actuel convient à une seule instance de l'API, pas à plusieurs serveurs écrivant en même temps. Les anciens `/users` restent volontairement en mémoire, comme dans ton cours.

## Sources du catalogue

Ce site est un projet pédagogique indépendant, sans affiliation à la marque. Les descriptions sont reformulées et le catalogue est une sélection de trois références, pas une promesse de disponibilité commerciale. Les recettes et degrés peuvent varier selon le marché.

- [Royal Swinkels : présentation officielle de la marque](https://royalswinkels.com/fr/portefeuille/bi%C3%A8res-et-boissons/86). Le catalogue actuel du producteur distingue notamment Original, Gold et Amber.
- [Original 8,6 %, 50 cl sur la boutique reliée par le producteur](https://daretodrinkdifferent.nl/speciaalbier/8-6-original-blik-50cl/).
- [Gold 6,5 %, 50 cl : fiche Promocash Réunion](https://ecommerce.promocash.re/product/biere-blonde-special-gold-65percent-86).
- [Red 7,9 %, 50 cl : fiche du distributeur italien Spesa Sicura](https://spesasicura.com/product/bavaria-birra-86-red-latt79-ml500-id-21848). La fiche du projet concerne cette version internationale, et ne l'assimile pas à Amber.

Les pages françaises `86beer.com` redirigeaient vers un contrôle d'âge pendant la vérification. Les valeurs précises non accessibles sur ces pages ont donc été recoupées avec les fiches ci-dessus. Il n'y a ni panier ni vente sur ce site.
