const serverUrl = 'https://mon-api-weld.vercel.app'

export async function api(path, options = {}) {
  // Toutes les requêtes passent par notre API Vercel.
  const timeout = AbortSignal.timeout(20_000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response
  try {
    response = await fetch(`${serverUrl}${path}`, {
      ...options, signal,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    })
  } catch (cause) {
    if (options.signal?.aborted) throw cause
    throw new Error('Le serveur ne répond pas. Réessaie dans un instant.', { cause })
  }
  if (response.status === 204) return null
  let payload
  try { payload = await response.json() }
  catch { throw new Error("L’API Vercel n’est pas disponible pour le moment.") }
  if (!response.ok) throw new Error(payload.error || 'La demande a échoué.')
  return payload
}
