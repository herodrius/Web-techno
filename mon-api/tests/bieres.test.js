import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp, validateBiere } from '../app.js'

const firstId = '86000000-0000-4000-8000-000000000001'
const missingId = '86000000-0000-4000-8000-999999999999'
const exemple = { nom: 'Original · 50 cl', prix: 2.4, categorie: 'Original', image_url: '/products/original.png', disponible: true }

function fakeSupabase() {
  let rows = [{ id: firstId, ...exemple }]
  return {
    from() {
      let operation = 'select'
      let value
      let id
      const query = {
        select() { return query },
        order() { return Promise.resolve({ data: [...rows], error: null }) },
        insert(item) { operation = 'insert'; value = item; return query },
        update(item) { operation = 'update'; value = item; return query },
        delete() { operation = 'delete'; return query },
        eq(column, selectedId) {
          id = selectedId
          if (operation === 'delete') {
            rows = rows.filter((row) => row.id !== id)
            return Promise.resolve({ data: null, error: null })
          }
          return query
        },
        single() {
          const created = { id: '86000000-0000-4000-8000-000000000002', ...value }
          rows.push(created)
          return Promise.resolve({ data: created, error: null })
        },
        maybeSingle() {
          const index = rows.findIndex((row) => row.id === id)
          if (index < 0) return Promise.resolve({ data: null, error: null })
          rows[index] = { id, ...value }
          return Promise.resolve({ data: rows[index], error: null })
        },
      }
      return query
    },
  }
}

async function start(t) {
  const server = createApp(fakeSupabase()).listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  return `http://127.0.0.1:${server.address().port}`
}

const request = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
})

test('les quatre routes du sujet fonctionnent', async (t) => {
  const base = await start(t)

  assert.equal((await fetch(`${base}/bieres`)).status, 200)

  const createdResponse = await fetch(`${base}/bieres`, request('POST', exemple))
  assert.equal(createdResponse.status, 201)
  const created = (await createdResponse.json()).data

  const updatedResponse = await fetch(`${base}/bieres/${created.id}`, request('PUT', { ...exemple, disponible: false }))
  assert.equal(updatedResponse.status, 200)
  assert.equal((await updatedResponse.json()).data.disponible, false)

  assert.equal((await fetch(`${base}/bieres/${created.id}`, { method: 'DELETE' })).status, 204)
  assert.equal((await fetch(`${base}/bieres/${missingId}`, request('PUT', exemple))).status, 404)
})

test('un nom vide et un prix négatif sont refusés', async () => {
  assert.equal(validateBiere({ ...exemple, nom: ' ' }).error, 'Le nom est obligatoire.')
  assert.equal(validateBiere({ ...exemple, prix: -1 }).error, 'Le prix doit être un nombre positif.')
})
