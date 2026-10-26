import { useEffect, useMemo, useRef, useState } from 'react'
import ProductImage from './ProductImage'
import { categories, euro, normaliser } from './outils'

function FicheBiere({ item, onClose }) {
  const dialog = useRef(null)

  useEffect(() => {
    const modal = dialog.current
    modal.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      modal.close()
      document.body.style.overflow = previous
    }
  }, [])

  const descriptions = {
    Original: 'La signature de la gamme. Une blonde au profil malté, avec des notes fruitées et houblonnées.',
    Gold: 'La nuance dorée de la collection. Un profil floral et fruité, dans une canette aux reflets chauds.',
    Red: 'La variation cuivrée. Une robe ambrée, accompagnée de notes de malt et de caramel.',
  }

  return (
    <dialog
      className="product-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-labelledby="product-title"
    >
      <button className="close-button" onClick={onClose} aria-label="Fermer la fiche">×</button>
      <div className={`dialog-visual tone-${item.categorie.toLowerCase()}`}>
        <ProductImage item={item} />
      </div>
      <div className="dialog-copy">
        <span className="overline">LA COLLECTION / {item.categorie}</span>
        <h2 id="product-title">{item.nom}</h2>
        <p>{descriptions[item.categorie]}</p>
        <strong className="dialog-price">{euro(item.prix)}</strong>
        <span className={`stock-label ${item.disponible ? '' : 'stock-off'}`}>
          <i />{item.disponible ? 'Disponible dans la sélection' : 'Momentanément indisponible'}
        </span>
        <p className="small-note">Présentation de la référence. Aucune vente en ligne.</p>
        <button className="solid-button" onClick={onClose}>Continuer la découverte <span>↗</span></button>
      </div>
    </dialog>
  )
}

export default function Catalogue({ items, loading, error, onReload }) {
  const [recherche, setRecherche] = useState('')
  const [categorie, setCategorie] = useState('Toutes')
  const [disponiblesSeulement, setDisponiblesSeulement] = useState(false)
  const [selection, setSelection] = useState(null)

  // Les filtres ne modifient jamais la liste d'origine.
  const bieresAffichees = useMemo(() => items.filter((item) => {
    const bonneCategorie = categorie === 'Toutes' || item.categorie === categorie
    const bonneDisponibilite = !disponiblesSeulement || item.disponible
    const bonNom = normaliser(`${item.nom} ${item.categorie}`).includes(normaliser(recherche))
    return bonneCategorie && bonneDisponibilite && bonNom
  }), [items, categorie, recherche, disponiblesSeulement])

  return (
    <section className="catalogue" id="collection">
      <div className="section-top wrap">
        <div><p className="overline">LA SÉLECTION DU COLLECTIF</p><h2>DU CARACTÈRE.<br /><span>À LA CARTE.</span></h2></div>
        <p>Les classiques. Les nuances. Les formats.<br />Une cave qui ne ressemble qu’à nous.</p>
      </div>

      <div className="catalogue-controls wrap">
        <div className="category-tabs" role="group" aria-label="Catégories">
          {['Toutes', ...categories].map((value) => (
            <button key={value} className={categorie === value ? 'selected' : ''} onClick={() => setCategorie(value)}>
              {value}<span>{value === 'Toutes' ? items.length : items.filter((item) => item.categorie === value).length}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Trouver ton caractère…" value={recherche} onChange={(event) => setRecherche(event.target.value)} />
        </label>
      </div>

      <div className="catalogue-meta wrap">
        <span>{bieresAffichees.length} référence{bieresAffichees.length > 1 ? 's' : ''}</span>
        <label><input type="checkbox" checked={disponiblesSeulement} onChange={(event) => setDisponiblesSeulement(event.target.checked)} /> Disponibles uniquement</label>
      </div>

      {loading && <div className="collection-status wrap"><h3>Chargement de la collection…</h3></div>}
      {error && <div className="collection-status wrap"><h3>Un petit contretemps.</h3><p>{error}</p><button className="solid-button" onClick={onReload}>Réessayer ↗</button></div>}

      {!loading && !error && (
        <div className="product-grid wrap">
          {bieresAffichees.map((item, index) => (
            <article className={`product-card ${item.disponible ? '' : 'unavailable'}`} key={item.id}>
              <button className={`product-art tone-${item.categorie.toLowerCase()}`} onClick={() => setSelection(item)}>
                <span className="card-index">{String(index + 1).padStart(2, '0')} / 8.6</span>
                <span className="card-watermark">{item.categorie}</span>
                <ProductImage item={item} />
                <span className="card-open">↗</span>
                {!item.disponible && <span className="unavailable-badge">INDISPONIBLE</span>}
              </button>
              <div className="product-info">
                <span className="overline">8.6 / {item.categorie}</span>
                <div><h3>{item.nom}</h3><span>{euro(item.prix)}</span></div>
                <span className={`stock-label ${item.disponible ? '' : 'stock-off'}`}><i />{item.disponible ? 'Disponible' : 'De retour prochainement'}</span>
              </div>
            </article>
          ))}
          {!bieresAffichees.length && <div className="collection-status"><h3>Rien dans cette sélection.</h3></div>}
        </div>
      )}

      <div className="catalogue-end wrap">
        <span>LA COLLECTION 8.6 · LE COLLECTIF</span>
        <a href="#accueil">Retour en haut ↑</a>
      </div>
      {selection && <FicheBiere item={selection} onClose={() => setSelection(null)} />}
    </section>
  )
}
