import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { BeerCan, HeroScene, ScrollExperience } from './components/BeerExperience'
import './App.css'

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem('86-favorites') || '[]')
    return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
  } catch { return [] }
}

function BeerCard({ beer, favorite, onFavorite, onOpen, index }) {
  return <article className={`beer-card beer-card--${beer.id}`}>
    <div className="beer-art">
      <span className="product-number">0{index + 1} / LA COLLECTION</span>
      <button className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={() => onFavorite(beer.id)} aria-label={`${favorite ? 'Retirer' : 'Ajouter'} ${beer.name} ${favorite ? 'des' : 'aux'} favoris`} aria-pressed={favorite}><Icon name="heart" /></button>
      <span className="art-word" aria-hidden="true">{beer.id.toUpperCase()}</span>
      <button className="can-link" onClick={() => onOpen(beer)} aria-label={`Découvrir ${beer.name}`}><BeerCan variant={beer.id} /></button>
      <span className="abv-badge">{beer.abv.toLocaleString('fr-FR')}<small>% VOL.</small></span>
    </div>
    <div className="beer-copy">
      <div className="beer-heading"><h3>{beer.name}</h3><span>{beer.volume}</span></div>
      <p className="beer-style">{beer.style}</p><p className="beer-description">{beer.tagline}</p>
      <div className="beer-notes">{beer.notes.slice(0, 3).map((note) => <span key={note}>{note}</span>)}</div>
      <button className="text-button" onClick={() => onOpen(beer)}>Découvrir cette bière <Icon name="arrow" /></button>
    </div>
  </article>
}

function BeerDialog({ beer, favorite, onFavorite, onClose }) {
  const dialog = useRef(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [rating, setRating] = useState(5)

  useEffect(() => {
    const modal = dialog.current
    modal.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow; modal.close() }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    api(`/beers/${beer.id}/reviews`, { signal: controller.signal })
      .then(({ data }) => { setReviews(data); setLoading(false); setLoadError('') })
      .catch((error) => { if (!controller.signal.aborted) { setLoadError(error.message); setLoading(false) } })
    return () => controller.abort()
  }, [beer.id, reload])

  async function submitReview(event) {
    event.preventDefault()
    if (loading || saving) return
    const form = event.currentTarget
    const values = new FormData(form)
    setSaving(true)
    setFeedback(null)
    try {
      const { data } = await api(`/beers/${beer.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ author: values.get('author'), comment: values.get('comment'), rating }),
      })
      setReviews((current) => [data, ...current])
      setFeedback({ success: true, message: 'Merci ! Ton avis a bien été enregistré.' })
      form.reset()
      setRating(5)
    } catch (error) { setFeedback({ success: false, message: error.message }) }
    finally { setSaving(false) }
  }

  return <dialog ref={dialog} className="beer-dialog" aria-labelledby="beer-dialog-title" onCancel={onClose} onClick={(event) => { if (event.target === dialog.current) onClose() }}>
    <button className="icon-button dialog-close" onClick={onClose} aria-label="Fermer la fiche"><Icon name="close" /></button>
    <div className="dialog-content">
      <div className={`dialog-art beer-card--${beer.id}`}><BeerCan variant={beer.id} /><span>ILLUSTRATION DE LA GAMME</span></div>
      <div className="dialog-info"><span className="eyebrow">LA COLLECTION / {beer.style}</span><h2 id="beer-dialog-title">{beer.name}</h2><p>{beer.description}</p>
        <div className="beer-facts"><span><strong>{beer.abv.toLocaleString('fr-FR')} %</strong>Alcool / vol.</span><span><strong>{beer.volume}</strong>Format présenté</span></div>
        <div className="beer-notes">{beer.notes.map((note) => <span key={note}>{note}</span>)}</div>
        <button className="button button-dark" onClick={() => onFavorite(beer.id)}><Icon name={favorite ? 'check' : 'heart'} />{favorite ? 'Dans mes favoris' : 'Garder en favori'}</button>
        {beer.sourceUrl && <a className="source-link" href={beer.sourceUrl} target="_blank" rel="noreferrer">Source des informations ↗</a>}
      </div>
      <section className="reviews-section" aria-labelledby="reviews-title">
        <div className="section-heading compact"><div><span className="eyebrow">À VOUS LA PAROLE</span><h3 id="reviews-title">Les avis du collectif<span>.</span></h3></div><span className="review-count">{reviews.length} avis</span></div>
        {loading && <p role="status">Chargement des avis…</p>}
        {loadError && <div role="alert" className="inline-error">{loadError} <button disabled={saving} onClick={() => { setLoading(true); setLoadError(''); setReload((value) => value + 1) }}>Réessayer</button></div>}
        {!loading && !loadError && reviews.length === 0 && <p className="empty-reviews">Cette page n’a pas encore d’avis. Partage ton ressenti sur cette bière.</p>}
        <div className="reviews-list">{reviews.map((review) => <article className="review" key={review.id}><div><strong>{review.author}</strong><span aria-label={`${review.rating} sur 5`}>{'★'.repeat(review.rating)}<span className="muted-stars">{'★'.repeat(5 - review.rating)}</span></span></div><p>{review.comment}</p><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('fr-FR')}</time></article>)}</div>
        <form className="review-form" onSubmit={submitReview}>
          <h4>Ton avis compte.</h4>
          <div className="form-row"><label>Ton pseudo<input name="author" required minLength={2} maxLength={40} placeholder="Ex. Camille" autoComplete="nickname" /></label><fieldset><legend>Ta note</legend><div className="rating-picker">{[1, 2, 3, 4, 5].map((value) => <label className={value <= rating ? 'selected' : ''} key={value}><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} /><span aria-hidden="true">★</span><span className="sr-only">{value} sur 5</span></label>)}</div></fieldset></div>
          <label>Ton commentaire<textarea name="comment" required minLength={10} maxLength={1000} rows={3} placeholder="Arômes, amertume, texture… Qu’en as-tu pensé ?" /></label>
          <div className="form-submit"><span>Avis publics · espace de démonstration</span><button className="button button-orange" disabled={saving || loading} type="submit">{saving ? 'Envoi en cours…' : 'Publier mon avis'}<Icon name="arrow" /></button></div>
          {feedback && <p role={feedback.success ? 'status' : 'alert'} className={feedback.success ? 'form-success' : 'inline-error'}>{feedback.message}</p>}
        </form>
      </section>
    </div>
  </dialog>
}

function App() {
  const [beers, setBeers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [favorites, setFavorites] = useState(readFavorites)
  const [selectedBeer, setSelectedBeer] = useState(null)
  const [storageNotice, setStorageNotice] = useState('')

  // Au chargement, React demande le catalogue au serveur Express.
  useEffect(() => {
    const controller = new AbortController()
    api('/beers', { signal: controller.signal })
      .then(({ data }) => { setBeers(data); setLoading(false) })
      .catch((cause) => { if (!controller.signal.aborted) { setError(cause.message); setLoading(false) } })
    return () => controller.abort()
  }, [attempt])

  const visibleBeers = useMemo(() => {
    const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    return beers.filter((beer) => {
      const matchesSearch = normalize([beer.name, beer.style, ...beer.notes].join(' ')).includes(normalize(search))
      const matchesFilter = filter === 'all' || (filter === 'favorites' ? favorites.includes(beer.id) : normalize(beer.style).includes(filter))
      return matchesSearch && matchesFilter
    })
  }, [beers, search, filter, favorites])

  function toggleFavorite(id) {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id]
    setFavorites(next)
    try { localStorage.setItem('86-favorites', JSON.stringify(next)); setStorageNotice('') }
    catch { setStorageNotice('Les favoris sont disponibles pour cette visite, mais ton navigateur ne peut pas les conserver.') }
  }
  function showFavorites() { setFilter('favorites'); document.getElementById('collection').scrollIntoView({ behavior: 'smooth' }) }

  return <>
    <a className="skip-link" href="#collection">Aller au catalogue</a>
    <div className="dark-shell">
      <header className="site-header wrapper"><a className="brand" href="#" aria-label="8.6 Le collectif, accueil"><strong>8.6</strong><span>LE<br />COLLECTIF</span></a><nav aria-label="Navigation principale"><a href="#collection">La collection</a><a href="#experience">L’expérience</a><a href="#esprit">L’esprit 8.6</a></nav><button className="header-favorites" onClick={showFavorites} aria-label={`Mes favoris (${favorites.length})`}><Icon name="heart" size={18} /><span>Mes favoris</span><b>{favorites.length}</b></button></header>
      <main>
        <section className="hero wrapper" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow"><span className="small-star">✳</span> UN COLLECTIF. TROIS CARACTÈRES.</p><h1 id="hero-title">LE GOÛT DU<br /><span>CARACTÈRE.</span></h1><p className="hero-description">Une même signature. Des personnalités bien à elles.<br className="desktop-break" /> Explore la gamme 8.6 et trouve ce qui la distingue.</p><a className="button button-orange" href="#collection">Explorer la collection<Icon name="arrow" /></a><div className="hero-bottom"><span className="hero-line" /><span>FAIS DÉFILER. LE CARACTÈRE PREND VIE.<br /><b>UNE EXPÉRIENCE À DÉCOUVRIR ↓</b></span></div></div><HeroScene /></section>
        <div className="ticker" aria-hidden="true"><div>UNE HISTOIRE DE CARACTÈRE <span>✳</span> BLONDE, DORÉE, AMBRÉE <span>✳</span> LA COLLECTION 8.6 <span>✳</span> UNE HISTOIRE DE CARACTÈRE <span>✳</span></div></div>
        <ScrollExperience />
        <section id="collection" className="collection-section"><div className="wrapper">
          <div className="section-heading"><div><span className="eyebrow">01 / À CHACUNE SA SIGNATURE</span><h2>La collection<span>.</span></h2></div><p>Trois interprétations du caractère 8.6.<br />Prends le temps de les découvrir.</p></div>
          <div className="collection-toolbar"><div className="filter-tabs" role="group" aria-label="Filtrer les bières">{[['all', 'Toutes les bières'], ['blonde', 'Blondes'], ['ambree', 'Ambrées'], ['favorites', 'Mes favoris']].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}{value === 'favorites' && <span>{favorites.length}</span>}</button>)}</div><label className="search-box"><Icon name="search" size={18} /><span className="sr-only">Rechercher une bière</span><input type="search" placeholder="Un nom, un arôme…" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          {storageNotice && <p role="status" className="inline-error">{storageNotice}</p>}
          {loading ? <div className="catalog-loading" role="status"><span className="loader" /><h3>La collection arrive.</h3><p>Le premier chargement peut prendre un peu de temps.</p></div> : error ? <div className="catalog-error" role="alert"><span className="eyebrow">PETIT CONTRETEMPS</span><h3>La collection est momentanément indisponible.</h3><p>{error}</p><button className="button button-dark" onClick={() => { setError(''); setLoading(true); setAttempt((value) => value + 1) }}>Réessayer<Icon name="arrow" /></button></div> : visibleBeers.length ? <div className="beer-grid">{visibleBeers.map((beer) => <BeerCard key={beer.id} beer={beer} index={beers.indexOf(beer)} favorite={favorites.includes(beer.id)} onFavorite={toggleFavorite} onOpen={setSelectedBeer} />)}</div> : <div className="empty-catalog"><Icon name={filter === 'favorites' ? 'heart' : 'search'} size={32} /><h3>{filter === 'favorites' ? 'Ta collection commence ici.' : 'Aucune bière ne correspond.'}</h3><p>{filter === 'favorites' ? 'Appuie sur le cœur d’une bière pour la retrouver ici.' : 'Essaie un autre nom ou enlève les filtres.'}</p><button className="text-button" onClick={() => { setSearch(''); setFilter('all') }}>Voir toute la collection<Icon name="arrow" /></button></div>}
          {!loading && !error && <p className="catalog-count" aria-live="polite">{visibleBeers.length} bière{visibleBeers.length > 1 ? 's' : ''} dans cette sélection <span>ILLUSTRATIONS DE LA GAMME · FORMATS 50 CL</span></p>}
        </div></section>
        <section className="spirit-section wrapper" id="esprit"><div className="spirit-symbol" aria-hidden="true">✳</div><div className="spirit-copy"><span className="eyebrow">02 / L’ESPRIT DU COLLECTIF</span><h2>Une signature.<br />Plusieurs façons<br /><em>de l’explorer.</em></h2></div><div className="spirit-details"><p>La couleur, le malt, les notes aromatiques : chaque bière raconte quelque chose de différent.</p><p>Ce carnet indépendant rassemble la gamme 8.6, tes favoris et les avis de ceux qui prennent le temps de la découvrir.</p><a href="#collection" className="text-button">Trouver ton caractère<Icon name="arrow" /></a><span className="independent-label">PROJET ÉTUDIANT · NON AFFILIÉ À LA MARQUE</span></div></section>
      </main>
      <footer className="site-footer wrapper"><div className="footer-top"><a className="brand" href="#"><strong>8.6</strong><span>LE<br />COLLECTIF</span></a><p>Un carnet de bières, une histoire de nuances.</p><a href="#collection">Retour à la collection ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Le Collectif · Projet pédagogique</span><span>L’abus d’alcool est dangereux pour la santé. À consommer avec modération.</span><span className="adult-mark">18+</span></div></footer>
    </div>
    {selectedBeer && <BeerDialog key={selectedBeer.id} beer={selectedBeer} favorite={favorites.includes(selectedBeer.id)} onFavorite={toggleFavorite} onClose={() => setSelectedBeer(null)} />}
  </>
}
export default App
