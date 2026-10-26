import express from 'express'
import { createClient } from '@supabase/supabase-js'

// Connexion Supabase utilisée par l'API sur Vercel.
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null

export function createApp(supabase) {
  const app = express()

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  app.use(express.json())

  app.get('/', (req, res) => {
    res.json({ message: 'API 8.6 connectée à Supabase', route: '/bieres' })
  })

  // Lecture de toutes les références dans Supabase.
  app.get('/bieres', async (req, res) => {
    const { data, error } = await supabase.from('bieres').select('*').order('nom')
    if (error) return databaseError(res, error)
    res.json({ data, meta: { storage: 'supabase' } })
  })

  // Ajout après validation du formulaire reçu.
  app.post('/bieres', async (req, res) => {
    const validation = validateBiere(req.body)
    if (validation.error) return res.status(400).json({ error: validation.error })

    const { data, error } = await supabase
      .from('bieres')
      .insert(validation.biere)
      .select('*')
      .single()

    if (error) return databaseError(res, error)
    res.status(201).json({ data })
  })

  // Modification de la ligne qui possède l'identifiant de l'URL.
  app.put('/bieres/:id', async (req, res) => {
    const validation = validateBiere(req.body)
    if (validation.error) return res.status(400).json({ error: validation.error })

    const { data, error } = await supabase
      .from('bieres')
      .update(validation.biere)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle()

    if (error) return databaseError(res, error)
    if (!data) return res.status(404).json({ error: 'Bière introuvable.' })
    res.json({ data })
  })

  // Suppression de la ligne demandée.
  app.delete('/bieres/:id', async (req, res) => {
    const { error } = await supabase.from('bieres').delete().eq('id', req.params.id)
    if (error) return databaseError(res, error)
    res.status(204).end()
  })

  app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }))

  return app
}

export function validateBiere(body) {
  // On vérifie les données avant de toucher à Supabase.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Un objet JSON est attendu.' }
  }

  const nom = typeof body.nom === 'string' ? body.nom.trim() : ''
  const categorie = typeof body.categorie === 'string' ? body.categorie.trim() : ''
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''

  if (!nom) return { error: 'Le nom est obligatoire.' }
  if (typeof body.prix !== 'number' || body.prix < 0) return { error: 'Le prix doit être un nombre positif.' }
  if (!categorie) return { error: 'La catégorie est obligatoire.' }
  if (!imageUrl) return { error: "L'image est obligatoire." }
  if (typeof body.disponible !== 'boolean') return { error: 'La disponibilité doit être vraie ou fausse.' }

  return {
    biere: {
      nom,
      prix: body.prix,
      categorie,
      image_url: imageUrl,
      disponible: body.disponible,
    },
  }
}

// Vercel utilise cet export comme point d'entrée de l'API.
export default supabase ? createApp(supabase) : null

function databaseError(res, error) {
  console.error('Erreur Supabase :', error.message)
  return res.status(500).json({ error: 'Erreur de connexion à Supabase.' })
}
