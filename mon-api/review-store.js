import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

// Un petit fichier JSON suffit pour ce projet pédagogique, avec un seul serveur.
// Pour plusieurs instances de l'API, utiliser une vraie base de données.
export async function createReviewStore(filePath) {
  let reviews = []
  try {
    reviews = JSON.parse(await readFile(filePath, 'utf8'))
    if (!Array.isArray(reviews) || !reviews.every(isStoredReview)) {
      throw new Error('Le fichier des avis contient des données invalides.')
    }
  } catch (error) {
    // Un fichier corrompu doit être réparé, jamais écrasé silencieusement.
    if (error.code !== 'ENOENT') throw error
  }

  await mkdir(dirname(filePath), { recursive: true })
  let pendingWrite = Promise.resolve()

  return {
    list(beerId) {
      return reviews.filter(review => review.beerId === beerId).toReversed()
    },
    add(review) {
      // Deux POST simultanés passent l'un après l'autre : aucun avis perdu.
      const write = pendingWrite.then(async () => {
        const updatedReviews = [...reviews, review]
        const temporaryFile = `${filePath}.${randomUUID()}.tmp`
        try {
          await writeFile(temporaryFile, JSON.stringify(updatedReviews, null, 2), { flag: 'wx' })
          await rename(temporaryFile, filePath)
          reviews = updatedReviews
          return review
        } finally {
          await rm(temporaryFile, { force: true })
        }
      })
      // Une écriture échouée n'empêche pas les suivantes de réessayer.
      pendingWrite = write.catch(() => {})
      return write
    },
  }
}

function isStoredReview(review) {
  return review && typeof review.id === 'string'
    && typeof review.beerId === 'string'
    && typeof review.author === 'string'
    && typeof review.comment === 'string'
    && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5
    && typeof review.createdAt === 'string' && Number.isFinite(Date.parse(review.createdAt))
}
