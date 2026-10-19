# Comprendre l'API simplement

Le navigateur appelle Express avec `fetch`. Express vérifie les données, appelle Supabase, puis renvoie du JSON.

## GET /bieres

Cette route lit toutes les lignes :

```js
const { data, error } = await supabase
  .from('bieres')
  .select('*')
  .order('nom')
```

La réponse ressemble à ceci :

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
  ]
}
```

## POST /bieres

Le formulaire gérant envoie une nouvelle bière :

```js
fetch('http://localhost:3000/bieres', {
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

Express lit le JSON dans `req.body`, le valide puis utilise `insert`. Une création réussie renvoie `201`.

## PUT /bieres/:id

Le bouton modifier et le bouton de disponibilité envoient la fiche complète :

```js
fetch(`http://localhost:3000/bieres/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...biere, disponible: false })
})
```

`req.params.id` contient l'identifiant placé dans l'URL. Si Supabase ne trouve aucune ligne, Express renvoie `404`.

## DELETE /bieres/:id

```js
fetch(`http://localhost:3000/bieres/${id}`, { method: 'DELETE' })
```

Après la suppression, Express renvoie `204`, donc aucune donnée JSON.

## Les codes à connaître

| Code | Signification |
| --- | --- |
| `200` | lecture ou modification réussie |
| `201` | nouvelle ligne créée |
| `204` | suppression réussie |
| `400` | formulaire invalide |
| `404` | bière introuvable |
| `500` | erreur de communication avec Supabase |

La fonction `validateBiere` refuse notamment un nom vide, un prix négatif ou une disponibilité qui n'est pas un booléen.
