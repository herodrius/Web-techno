// Assortiment et tarifs fictifs pour la boutique du projet, pas une offre commerciale.
export const initialCatalogue = [
  ['Original · 50 cl', 2.4, 'Original', true],
  ['Original · duo 50 cl', 4.6, 'Original', true],
  ['Original · coffret 4 canettes', 8.9, 'Original', true],
  ['Original · coffret 6 canettes', 12.9, 'Original', false],
  ['Gold · 50 cl', 2.6, 'Gold', true],
  ['Gold · duo 50 cl', 4.9, 'Gold', true],
  ['Gold · coffret 4 canettes', 9.5, 'Gold', false],
  ['Red · 50 cl', 2.7, 'Red', true],
  ['Red · duo 50 cl', 5.1, 'Red', true],
  ['Red · coffret 4 canettes', 9.9, 'Red', true],
].map(([nom, prix, categorie, disponible], index) => ({
  id: `86000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  nom, prix, categorie, disponible,
  image_url: `/products/${categorie.toLowerCase()}.png`,
}))
