// Aucune clé Supabase dans ce fichier : React ne parle qu'à notre API Express.
const serverUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://web-techno.onrender.com')).replace(/\/$/, '')

export async function api(path, options = {}) {
  const timeout = AbortSignal.timeout(90_000)
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
  catch { throw new Error("L’API n’est pas disponible. Configure Supabase puis démarre le serveur dans le dossier mon-api.") }
  if (!response.ok) throw new Error(payload.error || 'La demande a échoué.')
  return payload
}
