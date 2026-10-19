import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { createApp } from './app.js'

dotenv.config()

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Ajoute SUPABASE_URL et SUPABASE_KEY dans mon-api/.env')
}

// La clé Supabase existe uniquement dans ce serveur Node.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
const app = createApp(supabase)
const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`API démarrée sur http://localhost:${port}`)
})
