import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import ProductImage from './ProductImage'
import { categories, euro } from './outils'

const formulaireVide = {
  nom: '',
  prix: '',
  categorie: 'Original',
  image_url: '',
  disponible: true,
}

export default function Gerant({ items, meta, loading, error, onReload, setItems }) {
  // États du formulaire et des retours affichés au gérant.
  const [formulaire, setFormulaire] = useState(formulaireVide)
  const [idModifie, setIdModifie] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [message, setMessage] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)
  const champNom = useRef(null)

  function changer(champ, valeur) {
    setFormulaire((ancien) => ({ ...ancien, [champ]: valeur }))
  }

  function annulerModification() {
    setFormulaire(formulaireVide)
    setIdModifie(null)
  }

  async function enregistrer(event) {
    event.preventDefault()
    setChargement(true)
    setMessage(null)

    const biere = {
      ...formulaire,
      prix: Number(formulaire.prix),
      image_url: formulaire.image_url.trim() || `/products/${formulaire.categorie.toLowerCase()}.webp`,
    }

    try {
      // Le même formulaire sert à ajouter ou modifier une bière.
      const route = idModifie ? `/bieres/${idModifie}` : '/bieres'
      const methode = idModifie ? 'PUT' : 'POST'
      const { data } = await api(route, { method: methode, body: JSON.stringify(biere) })

      // Mise à jour directe de l'écran après la réponse de l'API.
      setItems((liste) => idModifie
        ? liste.map((item) => item.id === idModifie ? data : item)
        : [...liste, data])

      setMessage({ ok: true, text: idModifie ? 'La fiche a été modifiée.' : 'La bière a été ajoutée.' })
      annulerModification()
    } catch (cause) {
      setMessage({ ok: false, text: cause.message })
    } finally {
      setChargement(false)
    }
  }

  async function changerDisponibilite(item) {
    setChargement(true)
    setMessage(null)
    try {
      // On envoie la fiche avec le booléen disponible inversé.
      const { data } = await api(`/bieres/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, disponible: !item.disponible }),
      })
      setItems((liste) => liste.map((biere) => biere.id === item.id ? data : biere))
      setMessage({ ok: true, text: `Disponibilité de ${item.nom} mise à jour.` })
    } catch (cause) {
      setMessage({ ok: false, text: cause.message })
    } finally {
      setChargement(false)
    }
  }

  async function supprimer(item) {
    setChargement(true)
    setMessage(null)
    try {
      // L'API supprime d'abord, puis React retire la ligne de l'écran.
      await api(`/bieres/${item.id}`, { method: 'DELETE' })
      setItems((liste) => liste.filter((biere) => biere.id !== item.id))
      if (idModifie === item.id) annulerModification()
      setASupprimer(null)
      setMessage({ ok: true, text: `${item.nom} a été supprimée.` })
    } catch (cause) {
      setMessage({ ok: false, text: cause.message })
    } finally {
      setChargement(false)
    }
  }

  function modifier(item) {
    setIdModifie(item.id)
    setFormulaire({
      nom: item.nom,
      prix: String(item.prix),
      categorie: item.categorie,
      image_url: item.image_url,
      disponible: item.disponible,
    })
    champNom.current?.focus()
    champNom.current?.scrollIntoView({ block: 'center' })
  }

  return (
    <main className="manager wrap" id="contenu" tabIndex={-1}>
      <div className="manager-title">
        <div><p className="overline">LES COULISSES DU COLLECTIF</p><h1>LA CAVE,<br /><span>CÔTÉ GÉRANT.</span></h1></div>
        <a className="pill-link" href="#collection">Voir la page client ↗</a>
      </div>

      {meta?.storage === 'supabase' && <p className="database-status"><i /> Catalogue connecté à Supabase via Express.</p>}
      <div className="manager-stats">
        <span><strong>{items.length}</strong>références</span>
        <span><strong>{items.filter((item) => item.disponible).length}</strong>disponibles</span>
        <span><strong>{items.filter((item) => !item.disponible).length}</strong>indisponibles</span>
      </div>

      <div className="manager-layout">
        <section className="editor">
          <span className="overline">01 / LA FICHE PRODUIT</span>
          <h2>{idModifie ? 'Modifier la fiche.' : 'Une nouvelle référence.'}</h2>
          <form onSubmit={enregistrer}>
            <label>Nom de la bière
              <input ref={champNom} required maxLength={100} value={formulaire.nom} onChange={(event) => changer('nom', event.target.value)} />
            </label>
            <div className="form-columns">
              <label>Prix (€)
                <input type="number" required min="0" max="9999.99" step="0.01" value={formulaire.prix} onChange={(event) => changer('prix', event.target.value)} />
              </label>
              <label>Catégorie
                <select value={formulaire.categorie} onChange={(event) => { changer('categorie', event.target.value); changer('image_url', '') }}>
                  {categories.map((categorie) => <option key={categorie}>{categorie}</option>)}
                </select>
              </label>
            </div>
            <label>Image personnalisée <small>facultatif</small>
              <input value={formulaire.image_url} onChange={(event) => changer('image_url', event.target.value)} placeholder="https://… ou illustration automatique" />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={formulaire.disponible} onChange={(event) => changer('disponible', event.target.checked)} />
              Disponible dans la collection
            </label>
            <button className="solid-button" disabled={chargement || loading} type="submit">
              {chargement ? 'Enregistrement…' : idModifie ? 'Enregistrer les modifications' : 'Ajouter la bière'} <span>↗</span>
            </button>
            {idModifie && <button type="button" className="underlined-button" onClick={annulerModification}>Annuler la modification</button>}
          </form>
        </section>

        <section className="inventory">
          <div className="inventory-heading">
            <div><span className="overline">02 / LA COLLECTION</span><h2>Les références.</h2></div>
            <button className="round-button" onClick={onReload} disabled={chargement || loading}>↻</button>
          </div>
          {loading && <p>Chargement de la cave…</p>}
          {error && <p className="notice error">{error}</p>}
          <div className="inventory-list">
            {items.map((item) => (
              <article className="inventory-row" key={item.id}>
                <div className={`inventory-image tone-${item.categorie.toLowerCase()}`}><ProductImage item={item} /></div>
                <div className="inventory-name"><h3>{item.nom}</h3><span>{item.categorie} · {euro(item.prix)}</span></div>
                <div className="inventory-actions">
                  <button className={`availability-switch ${item.disponible ? 'on' : ''}`} onClick={() => changerDisponibilite(item)} disabled={chargement}><i />{item.disponible ? 'Dispo' : 'Indispo'}</button>
                  <button className="row-action" onClick={() => modifier(item)} disabled={chargement}>✎</button>
                  <button className="delete-button" onClick={() => setASupprimer(item)} disabled={chargement}><span>×</span> Supprimer</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {message && <p className={`manager-feedback ${message.ok ? '' : 'error'}`}>{message.text}<button onClick={() => setMessage(null)}>×</button></p>}
      {aSupprimer && <ConfirmationSuppression item={aSupprimer} busy={chargement} onCancel={() => setASupprimer(null)} onConfirm={() => supprimer(aSupprimer)} />}
    </main>
  )
}

function ConfirmationSuppression({ item, busy, onCancel, onConfirm }) {
  const dialog = useRef(null)
  useEffect(() => {
    const current = dialog.current
    current.showModal()
    return () => current.close()
  }, [])

  return (
    <dialog className="delete-dialog" ref={dialog} onCancel={onCancel}>
      <span className="overline">GESTION DE LA CAVE</span>
      <h2>Supprimer cette référence ?</h2>
      <p>{item.nom} sera retirée du catalogue.</p>
      <div>
        <button className="outline-button" disabled={busy} onClick={onCancel}>Annuler</button>
        <button className="solid-button danger" disabled={busy} onClick={onConfirm}>{busy ? 'Suppression…' : 'Supprimer'}</button>
      </div>
    </dialog>
  )
}
