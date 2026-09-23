import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { initialCatalogue } from './data/catalogue.js'

// L'objet retourné expose les mêmes opérations en démo et avec Supabase.
export function createBieresStore(env = process.env) {
  if (env.SUPABASE_URL && env.SUPABASE_KEY) {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const columns = 'id,nom,prix,categorie,image_url,disponible'
    async function result(query) {
      const { data, error } = await query
      if (error) {
        const failure = new Error('La base de données est indisponible. Vérifie sa configuration.', { cause: error })
        failure.status = 503
        throw failure
      }
      return data
    }
    return {
      mode: 'supabase',
      list: () => result(supabase.from('bieres').select(columns).order('nom')),
      add: (item) => result(supabase.from('bieres').insert(item).select(columns).single()),
      update: (id, item) => result(supabase.from('bieres').update(item).eq('id', id).select(columns).maybeSingle()),
      async remove(id) { await result(supabase.from('bieres').delete().eq('id', id)) },
    }
  }

  // Opt-in explicite, jamais activé automatiquement en production.
  if (env.DEMO_MODE === 'true') {
    let items = structuredClone(initialCatalogue)
    return {
      mode: 'demo',
      async list() { return structuredClone(items) },
      async add(item) {
        const created = { id: randomUUID(), ...item }
        items.push(created)
        return structuredClone(created)
      },
      async update(id, item) {
        const current = items.find((entry) => entry.id === id)
        if (!current) return null
        Object.assign(current, item)
        return structuredClone(current)
      },
      async remove(id) { items = items.filter((entry) => entry.id !== id) },
    }
  }

  const unavailable = async () => {
    const error = new Error('Supabase n’est pas configuré. Renseigne SUPABASE_URL et SUPABASE_KEY côté serveur.')
    error.status = 503
    throw error
  }
  return { mode: 'unconfigured', list: unavailable, add: unavailable, update: unavailable, remove: unavailable }
}
