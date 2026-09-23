import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../app.js'
import { createBieresStore } from '../bieres-store.js'

const item = { nom: 'Test Original', prix: 2.4, categorie: 'Original', image_url: '/products/original.svg', disponible: true }
const request = (method, body, token) => ({ method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'collectif-crud-'))
  const app = await createApp({ dataFile: join(directory, 'reviews.json'), bieresStore: createBieresStore({ DEMO_MODE: 'true' }), ...options })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  })
  return `http://127.0.0.1:${server.address().port}`
}

test('socle du sujet : GET 200, POST 201, PUT 200/404, DELETE 204', async (t) => {
  const base = await fixture(t)
  const listed = await fetch(`${base}/bieres`)
  assert.equal(listed.status, 200)
  const catalogue = await listed.json()
  assert.equal(catalogue.data.length, 10)
  assert.equal(catalogue.meta.storage, 'demo')
  for (const entry of catalogue.data) {
    assert.equal(Object.keys(entry).length, 6)
    assert.equal(typeof entry.disponible, 'boolean')
    assert.match(entry.image_url, /\.(svg|png)$/)
  }
  const created = await fetch(`${base}/bieres`, request('POST', item))
  assert.equal(created.status, 201)
  const { data } = await created.json()
  const updated = await fetch(`${base}/bieres/${data.id}`, request('PUT', { ...item, disponible: false, prix: 3.5 }))
  assert.equal(updated.status, 200)
  assert.equal((await updated.json()).data.disponible, false)
  const deleted = await fetch(`${base}/bieres/${data.id}`, request('DELETE'))
  assert.equal(deleted.status, 204)
  assert.equal(await deleted.text(), '')
  assert.equal((await fetch(`${base}/bieres/${data.id}`, request('PUT', item))).status, 404)
  assert.equal((await fetch(`${base}/bieres/missing`, request('PUT', item))).status, 404)
  assert.equal((await fetch(`${base}/bieres`).then((res) => res.json())).data.length, 10)
})

test('validation serveur : nom vide, prix négatif, types et image invalides refusés', async (t) => {
  const base = await fixture(t)
  for (const bad of [{}, { ...item, nom: '  ' }, { ...item, prix: -1 }, { ...item, prix: '2' }, { ...item, disponible: 'false' }, { ...item, categorie: 'inconnue' }, { ...item, image_url: 'javascript:alert(1)' }]) {
    assert.equal((await fetch(`${base}/bieres`, request('POST', bad))).status, 400)
  }
})

test('la gestion protégée demande un code, le catalogue reste public', async (t) => {
  const base = await fixture(t, { adminToken: 'code-de-test' })
  assert.equal((await fetch(`${base}/bieres`)).status, 200)
  assert.equal((await fetch(`${base}/bieres`, request('POST', item))).status, 401)
  assert.equal((await fetch(`${base}/bieres`, request('POST', item, 'incorrect'))).status, 401)
  assert.equal((await fetch(`${base}/bieres`, request('POST', item, 'code-de-test'))).status, 201)
  const preflight = await fetch(`${base}/bieres`, { method: 'OPTIONS', headers: { Origin: 'https://web-techno-ten.vercel.app', 'Access-Control-Request-Headers': 'authorization,content-type' } })
  assert.equal(preflight.status, 204)
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/)
})

test('sans configuration Supabase, aucun succès fictif ni démo implicite', async (t) => {
  const base = await fixture(t, { bieresStore: createBieresStore({}) })
  assert.equal((await fetch(`${base}/bieres`)).status, 503)
  assert.equal((await fetch(`${base}/bieres`, request('POST', item))).status, 503)
})
