import { useEffect, useMemo, useRef, useState } from 'react'
import Cinema from './components/Cinema'
import { api } from './api'
import './App.css'

const euro = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
const emptyForm = { nom: '', prix: '', categorie: 'Original', image_url: '', disponible: true }
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function ProductImage({ item, ...props }) {
  const fallback = `/products/${item.categorie.toLowerCase()}.png`
  return <img src={item.image_url} alt={`Illustration ${item.nom}`} loading="lazy" onError={(event) => {
    if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback
  }} {...props} />
}

function ProductDialog({ item, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const modal = ref.current
    modal.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { modal.close(); document.body.style.overflow = previous }
  }, [])
  const descriptions = {
    Original: 'La signature de la gamme. Une blonde au profil malté, avec des notes fruitées et houblonnées.',
    Gold: 'La nuance dorée de la collection. Un profil floral et fruité, dans une canette aux reflets chauds.',
    Red: 'La variation cuivrée. Une robe ambrée, accompagnée de notes de malt et de caramel.',
  }
  return <dialog className="product-dialog" ref={ref} onCancel={onClose} onClick={(event) => { if (event.target === ref.current) onClose() }} aria-labelledby="product-title">
    <button className="close-button" onClick={onClose} aria-label="Fermer la fiche">×</button>
    <div className={`dialog-visual tone-${item.categorie.toLowerCase()}`}><ProductImage item={item} /></div>
    <div className="dialog-copy"><span className="overline">LA COLLECTION / {item.categorie}</span><h2 id="product-title">{item.nom}</h2><p>{descriptions[item.categorie]}</p><strong className="dialog-price">{euro(item.prix)}</strong><span className={`stock-label ${item.disponible ? '' : 'stock-off'}`}><i />{item.disponible ? 'Disponible dans la sélection' : 'Momentanément indisponible'}</span><p className="small-note">Assortiment et prix fictifs pour ce projet étudiant. Aucune vente en ligne.</p><button className="solid-button" onClick={onClose}>Continuer la découverte <span>↗</span></button></div>
  </dialog>
}

function Catalogue({ items, loading, error, onReload }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Toutes')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [selected, setSelected] = useState(null)
  const filtered = useMemo(() => items.filter((item) =>
    (category === 'Toutes' || item.categorie === category) &&
    (!availableOnly || item.disponible) &&
    normalize(`${item.nom} ${item.categorie}`).includes(normalize(query)),
  ), [items, category, query, availableOnly])

  return <section className="catalogue" id="collection">
    <div className="section-top wrap"><div><p className="overline">LA SÉLECTION DU COLLECTIF</p><h2>DU CARACTÈRE.<br /><span>À LA CARTE.</span></h2></div><p>Les classiques. Les nuances. Les formats.<br />Une cave qui ne ressemble qu’à nous.</p></div>
    <div className="catalogue-controls wrap"><div className="category-tabs" role="group" aria-label="Catégories">{['Toutes', 'Original', 'Gold', 'Red'].map((value) => <button key={value} className={category === value ? 'selected' : ''} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}<span>{value === 'Toutes' ? items.length : items.filter((item) => item.categorie === value).length}</span></button>)}</div><label className="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Trouver ton caractère…" aria-label="Rechercher une bière" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
    <div className="catalogue-meta wrap"><span aria-live="polite">{filtered.length} référence{filtered.length > 1 ? 's' : ''}</span><label><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /> Disponibles uniquement</label></div>
    {loading ? <div className="collection-status wrap" role="status"><span className="loading-orbit" /><h3>La cave ouvre ses portes.</h3><p>Le serveur peut prendre un instant à se réveiller.</p></div>
      : error ? <div className="collection-status wrap" role="alert"><h3>Un petit contretemps.</h3><p>{error}</p><button className="solid-button" onClick={onReload}>Réessayer ↗</button></div>
        : <div className="product-grid wrap">{filtered.map((item, index) => <article className={`product-card ${item.disponible ? '' : 'unavailable'}`} key={item.id}>
          <button className={`product-art tone-${item.categorie.toLowerCase()}`} onClick={() => setSelected(item)} aria-label={`Découvrir ${item.nom}`}>
            <span className="card-index">{String(index + 1).padStart(2, '0')} / 8.6</span><span className="card-watermark" aria-hidden="true">{item.categorie}</span><ProductImage item={item} /><span className="card-open" aria-hidden="true">↗</span>{!item.disponible && <span className="unavailable-badge">INDISPONIBLE</span>}
          </button><div className="product-info"><span className="overline">8.6 / {item.categorie}</span><div><h3>{item.nom}</h3><span>{euro(item.prix)}</span></div><span className={`stock-label ${item.disponible ? '' : 'stock-off'}`}><i />{item.disponible ? 'Disponible' : 'De retour prochainement'}</span></div>
        </article>)}{filtered.length === 0 && <div className="collection-status"><h3>Rien dans cette sélection.</h3><p>Essaie un autre nom ou une autre catégorie.</p><button className="solid-button" onClick={() => { setQuery(''); setCategory('Toutes'); setAvailableOnly(false) }}>Retirer les filtres ↗</button></div>}</div>}
    <div className="catalogue-end wrap"><span>ASSORTIMENT ET TARIFS FICTIFS · PROJET ÉTUDIANT</span><a href="#experience">Revivre l’expérience ↑</a></div>
    {selected && <ProductDialog item={selected} onClose={() => setSelected(null)} />}
  </section>
}

function Manager({ items, meta, loading, error, onReload, onItemsChange }) {
  // Le formulaire du gérant est contrôlé avec useState, comme demandé dans le sujet.
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [token, setToken] = useState('')
  const [deleting, setDeleting] = useState(null)
  const nameInput = useRef(null)
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    const item = { ...form, prix: Number(form.prix), image_url: form.image_url.trim() || `/products/${form.categorie.toLowerCase()}.png` }
    try {
      const { data } = await api(editingId ? `/bieres/${editingId}` : '/bieres', { method: editingId ? 'PUT' : 'POST', headers, body: JSON.stringify(item) })
      onItemsChange((current) => editingId ? current.map((entry) => entry.id === editingId ? data : entry) : [...current, data])
      setMessage({ ok: true, text: editingId ? 'La fiche a été modifiée.' : 'La bière a été ajoutée à la collection.' })
      setForm(emptyForm)
      setEditingId(null)
    } catch (cause) { setMessage({ ok: false, text: cause.message }) }
    finally { setBusy(false) }
  }

  async function toggle(item) {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      const { data } = await api(`/bieres/${item.id}`, { method: 'PUT', headers, body: JSON.stringify({ ...item, disponible: !item.disponible }) })
      onItemsChange((current) => current.map((entry) => entry.id === item.id ? data : entry))
      setMessage({ ok: true, text: `Disponibilité de ${item.nom} mise à jour.` })
    } catch (cause) { setMessage({ ok: false, text: cause.message }) }
    finally { setBusy(false) }
  }

  async function remove(item) {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      await api(`/bieres/${item.id}`, { method: 'DELETE', headers })
      onItemsChange((current) => current.filter((entry) => entry.id !== item.id))
      if (editingId === item.id) { setEditingId(null); setForm(emptyForm) }
      setDeleting(null)
      setMessage({ ok: true, text: `${item.nom} a été supprimée.` })
    } catch (cause) { setMessage({ ok: false, text: cause.message }) }
    finally { setBusy(false) }
  }

  function edit(item) {
    setEditingId(item.id)
    setForm({ nom: item.nom, prix: String(item.prix), categorie: item.categorie, image_url: item.image_url, disponible: item.disponible })
    nameInput.current?.focus()
    nameInput.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return <main className="manager wrap" id="contenu" tabIndex={-1}>
    <div className="manager-title"><div><p className="overline">LES COULISSES DU COLLECTIF</p><h1>LA CAVE,<br /><span>CÔTÉ GÉRANT.</span></h1></div><a className="pill-link" href="#collection">Voir la page client ↗</a></div>
    {meta?.storage === 'demo' && <p className="notice">Mode démo local : les changements sont en mémoire et seront réinitialisés au redémarrage. Supabase reste à configurer avec le fichier SQL fourni.</p>}
    {meta?.storage === 'supabase' && <p className="database-status"><i /> Catalogue connecté à Supabase via Express.</p>}
    <div className="manager-stats"><span><strong>{items.length}</strong>références</span><span><strong>{items.filter((item) => item.disponible).length}</strong>disponibles</span><span><strong>{items.filter((item) => !item.disponible).length}</strong>indisponibles</span></div>
    {meta?.protected && <label className="manager-access">Code gérant<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Code privé défini sur le serveur" autoComplete="off" /><small>Le code de gestion est différent de la clé Supabase. Il reste en mémoire le temps de cette page.</small></label>}
    <div className="manager-layout"><section className="editor"><span className="overline">01 / LA FICHE PRODUIT</span><h2>{editingId ? 'Modifier la fiche.' : 'Une nouvelle référence.'}</h2><form onSubmit={submit}>
      <label>Nom de la bière<input ref={nameInput} name="nom" required maxLength={100} value={form.nom} onChange={(event) => change('nom', event.target.value)} placeholder="Ex. Original · 50 cl" /></label>
      <div className="form-columns"><label>Prix (€)<input name="prix" type="number" required min="0" max="9999.99" step="0.01" value={form.prix} onChange={(event) => change('prix', event.target.value)} placeholder="2,40" /></label><label>Catégorie<select name="categorie" value={form.categorie} onChange={(event) => { change('categorie', event.target.value); change('image_url', '') }}>{['Original', 'Gold', 'Red'].map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <label>Image personnalisée <small>facultatif</small><input name="image_url" value={form.image_url} onChange={(event) => change('image_url', event.target.value)} placeholder="https://… ou illustration automatique" maxLength={2000} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={form.disponible} onChange={(event) => change('disponible', event.target.checked)} /> Disponible dans la collection</label>
      <button className="solid-button" disabled={busy || loading} type="submit">{busy ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter la bière'}<span>↗</span></button>
      {editingId && <button type="button" className="underlined-button" disabled={busy} onClick={() => { setForm(emptyForm); setEditingId(null) }}>Annuler la modification</button>}
    </form></section>
    <section className="inventory"><div className="inventory-heading"><div><span className="overline">02 / LA COLLECTION</span><h2>Les références.</h2></div><button className="round-button" onClick={onReload} disabled={busy || loading} aria-label="Actualiser le catalogue">↻</button></div>
      {loading && <p role="status">Chargement de la cave…</p>}{error && <p className="notice error" role="alert">{error}</p>}
      <div className="inventory-list">{items.map((item) => <article className="inventory-row" key={item.id}><div className={`inventory-image tone-${item.categorie.toLowerCase()}`}><ProductImage item={item} /></div><div className="inventory-name"><h3>{item.nom}</h3><span>{item.categorie} · {euro(item.prix)}</span></div><div className="inventory-actions"><button className={`availability-switch ${item.disponible ? 'on' : ''}`} aria-label={`Disponibilité de ${item.nom}`} aria-pressed={item.disponible} onClick={() => toggle(item)} disabled={busy}><i />{item.disponible ? 'Dispo' : 'Indispo'}</button><button className="row-action" onClick={() => edit(item)} disabled={busy} aria-label={`Modifier ${item.nom}`}>✎</button><button className="row-action delete-action" onClick={() => setDeleting(item)} disabled={busy} aria-label={`Supprimer ${item.nom}`}>×</button></div></article>)}</div>
      {!items.length && !loading && !error && <p>La cave est vide. Ajoute ta première référence.</p>}
    </section></div>
    {message && <p className={`manager-feedback ${message.ok ? '' : 'error'}`} role={message.ok ? 'status' : 'alert'}>{message.text}<button aria-label="Fermer le message" onClick={() => setMessage(null)}>×</button></p>}
    {deleting && <DeleteDialog item={deleting} busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => remove(deleting)} />}
  </main>
}

function DeleteDialog({ item, busy, onCancel, onConfirm }) {
  const dialog = useRef(null)
  useEffect(() => { const current = dialog.current; current.showModal(); return () => current.close() }, [])
  return <dialog className="delete-dialog" ref={dialog} onCancel={(event) => { if (busy) event.preventDefault(); else onCancel() }} aria-labelledby="delete-title"><span className="overline">GESTION DE LA CAVE</span><h2 id="delete-title">Supprimer cette référence ?</h2><p>{item.nom} sera retirée du catalogue.</p><div><button className="outline-button" disabled={busy} onClick={onCancel}>Annuler</button><button className="solid-button danger" disabled={busy} onClick={onConfirm}>{busy ? 'Suppression…' : 'Supprimer'}</button></div></dialog>
}

export default function App() {
  const [manager, setManager] = useState(() => window.location.hash === '#/gerant')
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    function navigate() {
      const isManager = window.location.hash === '#/gerant'
      setManager(isManager)
      if (isManager) window.scrollTo({ top: 0, behavior: 'instant' })
      else requestAnimationFrame(() => document.querySelector(window.location.hash === '#collection' ? '#collection' : '#experience')?.scrollIntoView())
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    api('/bieres', { signal: controller.signal }).then((result) => {
      setItems(result.data); setMeta(result.meta); setLoading(false)
    }).catch((cause) => { if (!controller.signal.aborted) { setError(cause.message); setLoading(false) } })
    return () => controller.abort()
  }, [attempt])
  function reload() { setError(''); setLoading(true); setAttempt((value) => value + 1) }

  return <div className={manager ? 'app app-manager' : 'app'}>
    <a className="skip-link" href={manager ? '#/gerant' : '#collection'} onClick={manager ? (event) => { event.preventDefault(); document.querySelector('#contenu')?.focus(); document.querySelector('#contenu')?.scrollIntoView() } : undefined}>Aller au contenu</a>
    <header className={`navigation ${manager ? 'navigation-manager' : ''}`}><a className="wordmark" href="#experience" aria-label="Le Collectif 8.6, accueil">8.6<span>LE COLLECTIF</span></a><nav aria-label="Navigation principale"><a href="#experience" className={!manager ? 'current' : ''}>L’expérience</a><a href="#collection">La collection</a><a href="#/gerant" className={manager ? 'current' : ''}>Espace gérant <span>↗</span></a></nav></header>
    {manager ? <Manager items={items} meta={meta} loading={loading} error={error} onReload={reload} onItemsChange={setItems} /> : <main><Cinema /><Catalogue items={items} loading={loading} error={error} onReload={reload} /><section className="manifesto"><div className="wrap"><span className="overline">L’ESPRIT DU COLLECTIF</span><h2>LES NUANCES<br />FONT LA<br /><em>DIFFÉRENCE.</em></h2><div><span className="manifesto-star" aria-hidden="true">✳</span><p>Trois caractères. Une même curiosité.<br />Le Collectif est une cave fictive, pensée pour explorer la gamme 8.6 avec un autre regard.</p><a className="pill-link" href="#collection">Revenir à la sélection ↗</a></div></div></section></main>}
    <footer className="footer wrap"><div><a className="footer-logo" href="#experience">8.6</a><p>LE COLLECTIF<br /><span>Un projet. Du caractère.</span></p><a href="#/gerant">Les coulisses ↗</a></div><div className="footer-fine"><span>PROJET ÉTUDIANT · NON AFFILIÉ À LA MARQUE · AUCUNE VENTE</span><span>L’abus d’alcool est dangereux pour la santé. À consommer avec modération.</span><b>18+</b></div></footer>
  </div>
}
