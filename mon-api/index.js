import { createApp } from './app.js'

// Render fournit PORT. En local, l'API écoute sur le port 3000.
const port = Number(process.env.PORT || 3000)
const app = await createApp()

app.listen(port, '0.0.0.0', () => {
  console.log(`API 8.6 démarrée sur le port ${port}`)
})
