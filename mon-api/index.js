import { createApp } from './app.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)), quiet: true })

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_TOKEN) {
  throw new Error('Définis ADMIN_TOKEN côté serveur pour protéger la page gérant en production.')
}

// Render fournit PORT. En local, l'API écoute sur le port 3000.
const port = Number(process.env.PORT || 3000)
const app = await createApp()

app.listen(port, '0.0.0.0', () => {
  console.log(`API 8.6 démarrée sur le port ${port}`)
})
