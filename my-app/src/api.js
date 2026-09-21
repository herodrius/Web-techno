// Local : proxy Vite vers Express. Production : ton serveur Render.
const serverUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://web-techno.onrender.com')).replace(/\/$/, '')

export async function api(path, options = {}) {
  const timeout = AbortSignal.timeout(90_000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response
  try {
    response = await fetch(`${serverUrl}/api${path}`, { ...options, signal,
      headers: { ...options.headers, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error('Le serveur ne répond pas pour le moment. Réessaie dans quelques instants.', { cause: error })
  }
  let payload
  try { payload = await response.json() }
  catch { throw new Error('Le service est indisponible pour le moment. Réessaie dans quelques instants.') }
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'La demande n’a pas pu être traitée.')
  if (!payload || !('data' in payload)) throw new Error('La réponse du serveur est incomplète.')
  return payload
}
