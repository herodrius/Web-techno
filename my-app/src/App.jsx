import { useEffect, useState } from 'react'
import Catalogue from './obligatoire/Catalogue'
import Gerant from './obligatoire/Gerant'
import { api } from './api'
import './App.css'

export default function App() {
  const [pageGerant, setPageGerant] = useState(() => window.location.hash === '#/gerant')
  const [bieres, setBieres] = useState([])
  const [meta, setMeta] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [rechargement, setRechargement] = useState(0)

  useEffect(() => {
    function changerDePage() {
      const gerant = window.location.hash === '#/gerant'
      setPageGerant(gerant)
      if (gerant) window.scrollTo(0, 0)
      else {
        const cible = window.location.hash === '#collection' ? '#collection' : '#accueil'
        document.querySelector(cible)?.scrollIntoView()
      }
    }

    window.addEventListener('hashchange', changerDePage)
    return () => window.removeEventListener('hashchange', changerDePage)
  }, [])

  // La même liste sert au catalogue et à l'espace gérant.
  useEffect(() => {
    const controller = new AbortController()

    async function chargerLesBieres() {
      try {
        const resultat = await api('/bieres', { signal: controller.signal })
        setBieres(resultat.data)
        setMeta(resultat.meta)
      } catch (cause) {
        if (!controller.signal.aborted) setErreur(cause.message)
      } finally {
        if (!controller.signal.aborted) setChargement(false)
      }
    }

    chargerLesBieres()
    return () => controller.abort()
  }, [rechargement])

  function recharger() {
    setErreur('')
    setChargement(true)
    setRechargement((valeur) => valeur + 1)
  }

  return (
    <div className={pageGerant ? 'app app-manager' : 'app'}>
      <Navigation pageGerant={pageGerant} />

      {pageGerant ? (
        <Gerant
          items={bieres}
          setItems={setBieres}
          meta={meta}
          loading={chargement}
          error={erreur}
          onReload={recharger}
        />
      ) : (
        <main>
          <Accueil />
          <Catalogue items={bieres} loading={chargement} error={erreur} onReload={recharger} />
        </main>
      )}

      <PiedDePage />
    </div>
  )
}

function Accueil() {
  return (
    <section className="hero" id="accueil">
      <div className="hero-content wrap">
        <div className="hero-copy">
          <p className="overline">LA COLLECTION · LE COLLECTIF</p>
          <h1>LA GAMME<br />8.6<span>.</span></h1>
          <p>Trois caractères, une même intensité. Découvre la sélection et ses différentes nuances.</p>
          <a className="pill-link" href="#collection">Voir la collection <span>↓</span></a>
        </div>
        <div className="hero-product tone-original">
          <span className="hero-product-word" aria-hidden="true">ORIGINAL</span>
          <div className="hero-product-label"><small>8.6</small><strong>ORIGINAL</strong></div>
          <img src="/products/original.webp" alt="Canette 8.6 Original" fetchPriority="high" />
          <b className="hero-product-size">50 CL</b>
        </div>
      </div>
    </section>
  )
}

function Navigation({ pageGerant }) {
  return (
    <header className={`navigation ${pageGerant ? 'navigation-manager' : ''}`}>
      <a className="wordmark" href="#accueil">8.6<span>LE COLLECTIF</span></a>
      <nav>
        <a href="#accueil" className={!pageGerant ? 'current' : ''}>Accueil</a>
        <a href="#collection">La collection</a>
        <a href="#/gerant" className={pageGerant ? 'current' : ''}>Espace gérant <span>↗</span></a>
      </nav>
    </header>
  )
}

function PiedDePage() {
  return (
    <footer className="footer-brand">
      <div className="footer-brand-bg" aria-hidden="true"><span>8.6</span></div>
      <div className="footer-brand-content wrap">
        <p className="footer-warning">L’abus d’alcool est dangereux pour la santé, à consommer avec modération.</p>
        <div className="footer-compact-row">
          <a className="footer-logo" href="#accueil">8.6</a>
          <p>La collection 8.6, propulsée par React, Express et Supabase.</p>
          <nav aria-label="Liens du pied de page"><a href="#collection">Collection</a><a href="#/gerant">Espace gérant</a></nav>
          <b className="footer-age">18+</b>
        </div>
        <div className="footer-fine"><span>SITE INDÉPENDANT · NON AFFILIÉ À LA MARQUE · AUCUNE VENTE</span><span>© 2026 LE COLLECTIF 8.6</span></div>
      </div>
    </footer>
  )
}
