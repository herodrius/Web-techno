import { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'

export function bieresRouter(store, adminToken = '') {
  const router = Router()
  router.get('/', async (req, res) => {
    res.json({ data: await store.list(), meta: { storage: store.mode, protected: Boolean(adminToken) } })
  })

  // Optionnel en démo, requis dans notre configuration de production.
  router.use((req, res, next) => {
    if (!adminToken) return next()
    const supplied = Buffer.from(req.get('Authorization')?.replace(/^Bearer /, '') || '')
    const expected = Buffer.from(adminToken)
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ error: 'Code gérant manquant ou incorrect.' })
    }
    next()
  })

  router.post('/', validateItem, async (req, res) => {
    const item = await store.add(req.validatedItem)
    res.status(201).json({ data: item })
  })
  router.put('/:id', validateId, validateItem, async (req, res) => {
    const item = await store.update(req.params.id, req.validatedItem)
    if (!item) return res.status(404).json({ error: 'Bière introuvable.' })
    res.json({ data: item })
  })
  router.delete('/:id', validateId, async (req, res) => {
    await store.remove(req.params.id)
    res.status(204).end()
  })
  return router
}

function validateId(req, res, next) {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(req.params.id)) {
    return res.status(404).json({ error: 'Bière introuvable.' })
  }
  next()
}

function validateItem(req, res, next) {
  const item = req.body
  if (!item || Array.isArray(item) || typeof item !== 'object') return res.status(400).json({ error: 'Un objet JSON est attendu.' })
  const nom = typeof item.nom === 'string' ? item.nom.trim() : ''
  const categorie = typeof item.categorie === 'string' ? item.categorie.trim() : ''
  const image = typeof item.image_url === 'string' ? item.image_url.trim() : ''
  if (!nom || nom.length > 100) return res.status(400).json({ error: 'Le nom est obligatoire (100 caractères maximum).' })
  if (typeof item.prix !== 'number' || !Number.isFinite(item.prix) || item.prix < 0 || item.prix > 9999.99) {
    return res.status(400).json({ error: 'Le prix doit être un nombre entre 0 et 9 999,99 €.' })
  }
  if (!['Original', 'Gold', 'Red'].includes(categorie)) return res.status(400).json({ error: 'Choisis une catégorie : Original, Gold ou Red.' })
  if (typeof item.disponible !== 'boolean') return res.status(400).json({ error: 'La disponibilité doit être un booléen.' })
  if (!/^\/products\/(original|gold|red)\.(svg|png)$/.test(image) && !validImageUrl(image)) {
    return res.status(400).json({ error: 'Utilise une image de la collection ou une URL HTTPS valide.' })
  }
  req.validatedItem = { nom, prix: Math.round((item.prix + Number.EPSILON) * 100) / 100, categorie, image_url: image, disponible: item.disponible }
  next()
}

function validImageUrl(value) {
  try {
    const url = new URL(value)
    return value.length <= 2000 && url.protocol === 'https:' && !url.username && !url.password
  } catch { return false }
}
