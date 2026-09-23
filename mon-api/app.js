import express from 'express'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { beers } from './data/beers.js'
import { createReviewStore } from './review-store.js'
import { createBieresStore } from './bieres-store.js'
import { bieresRouter } from './bieres-routes.js'

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'https://web-techno-ten.vercel.app',
]

export async function createApp({
  dataFile = process.env.DATA_FILE || fileURLToPath(new URL('./storage/reviews.json', import.meta.url)),
  corsOrigins = process.env.CORS_ORIGINS || '',
  bieresStore = createBieresStore(),
  adminToken = process.env.ADMIN_TOKEN || '',
} = {}) {
  const app = express()
  const reviews = await createReviewStore(dataFile)
  const allowedOrigins = new Set([...defaultOrigins, ...corsOrigins.split(',').map(origin => origin.trim()).filter(Boolean)])

  app.disable('x-powered-by')
  app.use((req, res, next) => {
    // Le navigateur exige cette autorisation car Vercel et Render sont deux domaines.
    res.vary('Origin')
    const origin = req.get('Origin')
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'Cette origine ne peut pas accéder à cette API.' })
    }
    if (origin) res.set('Access-Control-Allow-Origin', origin)
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  app.use(express.json({ limit: '16kb' }))
  app.use(['/bieres', '/api/bieres'], bieresRouter(bieresStore, adminToken))
  app.get('/health', (req, res) => res.json({ data: { status: 'ok', storage: bieresStore.mode } }))

  app.get('/', (req, res) => {
    res.json({
      message: 'Bienvenue sur ton API 8.6 !',
      catalogue: '/bieres',
      health: '/api/health',
      example: '/api/beers/original/reviews',
    })
  })

  app.get('/api/health', (req, res) => {
    res.json({ data: {
      status: 'ok',
      service: '8.6 API',
      storage: {
        type: 'json-file',
        note: 'Les avis sont conservés sur le disque du serveur. Sur Render sans disque persistant, ils peuvent disparaître au redéploiement.',
      },
    } })
  })

  app.get('/api/beers', (req, res) => {
    const { search = '', type = '' } = req.query
    if (typeof search !== 'string' || typeof type !== 'string' || search.length > 100 || type.length > 50) {
      return res.status(400).json({ error: 'Les filtres search et type doivent être de courts textes.' })
    }
    const query = normalize(search)
    const style = normalize(type)
    const data = beers.filter(beer => {
      const matchesSearch = normalize([beer.name, beer.description, ...beer.notes].join(' ')).includes(query)
      const matchesStyle = !style || normalize(beer.style) === style
      return matchesSearch && matchesStyle
    })
    res.json({ data })
  })

  // Ce contrôle sert à toutes les routes contenant :beerId.
  app.param('beerId', (req, res, next, id) => {
    const beer = beers.find(item => item.id === id)
    if (!beer) return res.status(404).json({ error: 'Bière introuvable.' })
    req.beer = beer
    next()
  })

  app.get('/api/beers/:beerId', (req, res) => {
    res.json({ data: req.beer })
  })

  app.get('/api/beers/:beerId/reviews', (req, res) => {
    res.json({ data: reviews.list(req.beer.id) })
  })

  app.post('/api/beers/:beerId/reviews', async (req, res) => {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Envoie un corps JSON avec Content-Type: application/json.' })
    }
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Un objet JSON est attendu.' })
    }
    const author = typeof body.author === 'string' ? body.author.trim() : ''
    const comment = typeof body.comment === 'string' ? body.comment.trim() : ''
    const rating = body.rating

    if (author.length < 2 || author.length > 40) {
      return res.status(400).json({ error: 'Le pseudo doit contenir entre 2 et 40 caractères.' })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La note doit être un entier entre 1 et 5.' })
    }
    if (comment.length < 10 || comment.length > 1000) {
      return res.status(400).json({ error: 'Le commentaire doit contenir entre 10 et 1000 caractères.' })
    }

    // Le serveur choisit l'identifiant et la date, jamais le visiteur.
    const review = { id: randomUUID(), beerId: req.beer.id, author, rating, comment, createdAt: new Date().toISOString() }
    await reviews.add(review)
    res.status(201).json({ data: review })
  })

  // Les routes du cours restent disponibles, avec leur format d'origine.
  let users = [{ id: 1, nom: 'Ada' }, { id: 2, nom: 'Linus' }]
  let nextUserId = 3
  app.get('/users', (req, res) => res.json(users))
  app.get('/users/:id', (req, res) => {
    const user = users.find(item => item.id === Number(req.params.id))
    if (!user) return res.status(404).json({ error: 'introuvable' })
    res.json(user)
  })
  app.post('/users', validateUser, (req, res) => {
    const user = { id: nextUserId++, nom: req.body.nom.trim() }
    users.push(user)
    res.status(201).json(user)
  })
  app.put('/users/:id', validateUser, (req, res) => {
    const user = users.find(item => item.id === Number(req.params.id))
    if (!user) return res.status(404).json({ error: 'introuvable' })
    user.nom = req.body.nom.trim()
    res.json(user)
  })
  app.delete('/users/:id', (req, res) => {
    users = users.filter(item => item.id !== Number(req.params.id))
    res.status(204).end()
  })

  app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }))
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Le corps de la requête dépasse 16 Ko.' })
    }
    if (error.type === 'entity.parse.failed' || error instanceof URIError) {
      return res.status(400).json({ error: 'La requête contient un JSON ou une URL invalide.' })
    }
    if (error.status === 415) return res.status(415).json({ error: 'Format du corps non pris en charge.' })
    if (error.status === 503) return res.status(503).json({ error: error.message })
    console.error('Erreur API :', error.message)
    res.status(500).json({ error: 'Le serveur n’a pas pu traiter la demande. Réessaie dans un instant.' })
  })

  return app
}

function normalize(value) {
  return value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function validateUser(req, res, next) {
  if (typeof req.body?.nom !== 'string' || !req.body.nom.trim() || req.body.nom.trim().length > 100) {
    return res.status(400).json({ error: 'nom doit être un texte de 1 à 100 caractères.' })
  }
  next()
}
