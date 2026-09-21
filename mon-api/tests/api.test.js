import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../app.js'

const validReview = { author: 'Camille', rating: 4, comment: 'Un avis publié pour vérifier le fonctionnement.' }
const reviewPath = '/api/beers/original/reviews'
const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), '86-api-test-'))
  const dataFile = join(directory, 'reviews.json')
  const app = await createApp({ dataFile, ...options })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  t.after(async () => {
    await closeServer(server)
    await rm(directory, { recursive: true, force: true })
  })
  return { base, dataFile, server }
}

async function closeServer(server) {
  if (!server.listening) return
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}

test('catalogue, fiche, filtres et erreurs conservent leur contrat JSON', async t => {
  const { base } = await fixture(t)
  const response = await fetch(`${base}/api/beers`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /application\/json/)
  const { data } = await response.json()
  assert.deepEqual(data.map(beer => beer.id), ['original', 'gold', 'red'])
  for (const beer of data) {
    for (const field of ['name', 'tagline', 'style', 'description', 'volume', 'sourceUrl', 'color']) assert.equal(typeof beer[field], 'string')
    assert.equal(typeof beer.abv, 'number')
    assert.ok(Array.isArray(beer.notes))
    const detail = await fetch(`${base}/api/beers/${beer.id}`).then(res => res.json())
    assert.deepEqual(detail.data, beer)
  }
  assert.deepEqual((await fetch(`${base}/api/beers?search=GOLD`).then(res => res.json())).data.map(beer => beer.id), ['gold'])
  assert.deepEqual((await fetch(`${base}/api/beers?type=ambree`).then(res => res.json())).data.map(beer => beer.id), ['red'])
  assert.deepEqual((await fetch(`${base}/api/beers?search=introuvable`).then(res => res.json())).data, [])
  assert.equal((await fetch(`${base}/api/beers?search=a&search=b`)).status, 400)
  for (const path of ['/api/beers/missing', '/api/beers/missing/reviews', '/unknown']) {
    const missing = await fetch(`${base}${path}`)
    assert.equal(missing.status, 404)
    assert.equal(typeof (await missing.json()).error, 'string')
  }
  const health = await fetch(`${base}/api/health`).then(res => res.json())
  assert.equal(health.data.status, 'ok')
  assert.equal(health.data.storage.type, 'json-file')
})

test('CORS autorise Vercel et le développement, traite le preflight, refuse une autre origine', async t => {
  const { base } = await fixture(t, { corsOrigins: 'https://preview.example.com' })
  for (const origin of ['https://web-techno-ten.vercel.app', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'https://preview.example.com']) {
    const response = await fetch(`${base}/api/beers`, { headers: { Origin: origin } })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('access-control-allow-origin'), origin)
    assert.match(response.headers.get('vary'), /Origin/)
  }
  const preflight = await fetch(`${base}${reviewPath}`, { method: 'OPTIONS', headers: { Origin: 'https://web-techno-ten.vercel.app', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } })
  assert.equal(preflight.status, 204)
  assert.match(preflight.headers.get('access-control-allow-methods'), /POST/)
  assert.match(preflight.headers.get('access-control-allow-headers'), /Content-Type/)
  const blocked = await fetch(`${base}${reviewPath}`, { ...json(validReview), headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' } })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.headers.get('access-control-allow-origin'), null)
  assert.deepEqual((await fetch(`${base}${reviewPath}`).then(res => res.json())).data, [])
})

test('les avis sont validés côté serveur avant enregistrement', async t => {
  const { base } = await fixture(t)
  const invalidBodies = [
    {}, null, [],
    { ...validReview, author: ' ' },
    { ...validReview, author: 4 },
    { ...validReview, author: 'a'.repeat(41) },
    { ...validReview, rating: '4' },
    { ...validReview, rating: 4.5 },
    { ...validReview, rating: 0 },
    { ...validReview, rating: 6 },
    { ...validReview, comment: 'court' },
    { ...validReview, comment: 'x'.repeat(1001) },
  ]
  for (const body of invalidBodies) {
    const response = await fetch(`${base}${reviewPath}`, json(body))
    assert.equal(response.status, 400, JSON.stringify(body))
    assert.equal(typeof (await response.json()).error, 'string')
  }
  const malformed = await fetch(`${base}${reviewPath}`, { ...json({}), body: '{' })
  assert.equal(malformed.status, 400)
  const tooLarge = await fetch(`${base}${reviewPath}`, json({ ...validReview, comment: 'x'.repeat(20000) }))
  assert.equal(tooLarge.status, 413)
  const wrongType = await fetch(`${base}${reviewPath}`, { method: 'POST', body: 'hello' })
  assert.equal(wrongType.status, 415)
  assert.equal((await fetch(`${base}/api/beers/absente/reviews`, json(validReview))).status, 404)
  assert.deepEqual((await fetch(`${base}${reviewPath}`).then(res => res.json())).data, [])
})

test('POST crée un vrai avis puis GET et un nouveau serveur retrouvent les avis concurrents', async t => {
  const { base, dataFile, server } = await fixture(t)
  assert.deepEqual((await fetch(`${base}${reviewPath}`).then(res => res.json())).data, [])
  const response = await fetch(`${base}${reviewPath}`, json({ ...validReview, author: '  Camille  ', comment: `  ${validReview.comment}  `, id: 'forged', beerId: 'gold' }))
  assert.equal(response.status, 201)
  const { data: review } = await response.json()
  assert.equal(review.author, 'Camille')
  assert.equal(review.comment, validReview.comment)
  assert.equal(review.beerId, 'original')
  assert.notEqual(review.id, 'forged')
  assert.ok(Number.isFinite(Date.parse(review.createdAt)))

  const concurrent = await Promise.all(Array.from({ length: 12 }, (_, index) => fetch(`${base}${reviewPath}`, json({ ...validReview, author: `Visiteur ${index}` }))))
  for (const result of concurrent) assert.equal(result.status, 201)
  const saved = JSON.parse(await readFile(dataFile, 'utf8'))
  assert.equal(saved.length, 13)
  assert.equal(new Set(saved.map(item => item.id)).size, 13)
  assert.deepEqual((await fetch(`${base}/api/beers/gold/reviews`).then(res => res.json())).data, [])
  await closeServer(server)

  const restarted = (await createApp({ dataFile })).listen(0, '127.0.0.1')
  await once(restarted, 'listening')
  try {
    const persisted = await fetch(`http://127.0.0.1:${restarted.address().port}${reviewPath}`).then(res => res.json())
    assert.equal(persisted.data.length, 13)
    assert.deepEqual(persisted.data.at(-1), review)
  } finally {
    await closeServer(restarted)
  }
})

test('une écriture disque échouée ne crée aucun avis et la requête suivante peut réussir', async t => {
  const { base, dataFile } = await fixture(t)
  await mkdir(dataFile)
  const response = await fetch(`${base}${reviewPath}`, json(validReview))
  assert.equal(response.status, 500)
  assert.equal(typeof (await response.json()).error, 'string')
  assert.deepEqual((await fetch(`${base}${reviewPath}`).then(res => res.json())).data, [])
  await rm(dataFile, { recursive: true })
  assert.equal((await fetch(`${base}${reviewPath}`, json(validReview))).status, 201)
})

test('un fichier corrompu n’est pas effacé au démarrage', async t => {
  const { dataFile } = await fixture(t)
  await writeFile(dataFile, '{invalid')
  await assert.rejects(createApp({ dataFile }))
  assert.equal(await readFile(dataFile, 'utf8'), '{invalid')
})

test('le CRUD /users du cours reste utilisable', async t => {
  const { base } = await fixture(t)
  assert.deepEqual(await fetch(`${base}/users`).then(res => res.json()), [{ id: 1, nom: 'Ada' }, { id: 2, nom: 'Linus' }])
  const created = await fetch(`${base}/users`, json({ nom: 'Camille' }))
  assert.equal(created.status, 201)
  const user = await created.json()
  const updated = await fetch(`${base}/users/${user.id}`, { ...json({ nom: 'Héro' }), method: 'PUT' }).then(res => res.json())
  assert.equal(updated.nom, 'Héro')
  assert.equal((await fetch(`${base}/users/${user.id}`, { method: 'DELETE' })).status, 204)
  assert.equal((await fetch(`${base}/users/${user.id}`)).status, 404)
})
