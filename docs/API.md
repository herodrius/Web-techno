# Comprendre l’API du projet

Une API est une porte entre deux programmes. Ici, React affiche l’interface mais ne connaît pas le mot de passe de la base. Il demande les données à Express, Express vérifie la demande, puis utilise la clé secrète pour parler à Supabase.

```text
clic ou chargement
      ↓
composant React
      ↓ fetch()
route Express
      ↓ validation
table Supabase
      ↓
réponse JSON → setState() → nouvel affichage
```

## Lire la liste avec GET

React appelle :

```js
const response = await fetch('http://localhost:3000/bieres')
const resultat = await response.json()
console.log(resultat.data)
```

Express répond avec un objet JSON :

```json
{
  "data": [
    {
      "id": "86000000-0000-4000-8000-000000000001",
      "nom": "Original · 50 cl",
      "prix": 2.4,
      "categorie": "Original",
      "image_url": "/products/original.png",
      "disponible": true
    }
  ],
  "meta": {
    "storage": "supabase",
    "protected": true
  }
}
```

`data` contient les lignes de la table. `meta.storage` indique si l’API utilise Supabase ou la démo locale.

## Ajouter avec POST

```js
await fetch('http://localhost:3000/bieres', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nom: 'Original · édition test',
    prix: 2.9,
    categorie: 'Original',
    image_url: '/products/original.png',
    disponible: true
  })
})
```

Le navigateur transforme l’objet en texte avec `JSON.stringify`. `express.json()` le relit dans `req.body`. Le serveur valide les six valeurs avant l’insertion. Une création réussie renvoie `201` et la ligne créée.

## Modifier avec PUT

`PUT /bieres/:id` reçoit la fiche complète. `:id` est remplacé par l’identifiant réel :

```js
await fetch(`http://localhost:3000/bieres/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...biere, disponible: false })
})
```

Le bouton de disponibilité utilise exactement cette route. S’il ne trouve aucune ligne avec cet ID, Express renvoie `404`.

## Supprimer avec DELETE

```js
await fetch(`http://localhost:3000/bieres/${id}`, {
  method: 'DELETE'
})
```

Une suppression réussie renvoie `204`. Ce code signifie que l’action a réussi et que la réponse n’a pas de corps JSON.

## Validation et erreurs

| Code | Signification dans le projet |
| --- | --- |
| `200` | lecture ou modification réussie |
| `201` | création réussie |
| `204` | suppression réussie, sans contenu |
| `400` | données invalides, par exemple prix négatif ou nom vide |
| `401` | code gérant absent ou incorrect en production |
| `403` | domaine frontend non autorisé par CORS |
| `404` | identifiant ou route introuvable |
| `503` | Supabase absent ou indisponible |

Les erreurs utilisent toujours cette forme :

```json
{ "error": "Le prix doit être un nombre entre 0 et 9 999,99 €." }
```

## Où se trouve chaque partie

| Fichier | Rôle |
| --- | --- |
| `my-app/src/api.js` | fonction `fetch` commune et gestion des erreurs |
| `my-app/src/App.jsx` | pages client et gérant, formulaires et `useState` |
| `mon-api/bieres-routes.js` | routes, validation et codes HTTP |
| `mon-api/bieres-store.js` | même interface de stockage pour Supabase et la démo |
| `mon-api/supabase/schema.sql` | table, contraintes et données de départ |

## Protection en production

Sur Render, `ADMIN_TOKEN` protège `POST`, `PUT` et `DELETE`. Le frontend envoie alors `Authorization: Bearer ...` depuis le champ « Code gérant ». Le catalogue `GET /bieres` reste public. Ce code de gestion est différent de la clé Supabase : le visiteur ne reçoit jamais la clé Supabase.

## Démo orale courte

1. Montrer les six colonnes de `bieres` dans Supabase.
2. Ouvrir la page client et filtrer les références.
3. Ouvrir `/#/gerant`, ajouter une bière et montrer son apparition.
4. Basculer sa disponibilité, puis la modifier et la supprimer.
5. Expliquer que chaque bouton déclenche `fetch`, qu’Express valide, puis que Supabase conserve la ligne.

Pour illustrer une erreur, saisir un prix négatif : le navigateur le bloque déjà, et l’API le refuserait aussi avec un `400`. Cette double validation évite de faire confiance uniquement à l’interface.
