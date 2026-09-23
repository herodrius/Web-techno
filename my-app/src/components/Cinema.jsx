import { useEffect, useRef, useState } from 'react'

export default function Cinema() {
  const section = useRef(null)
  const canvas = useRef(null)
  const [state, setState] = useState('loading')
  const [paused, setPaused] = useState(false)

  function toggleMotion() {
    const next = !paused
    setPaused(next)
    section.current.dataset.paused = String(next)
    section.current.dispatchEvent(new Event('scene-pause'))
  }

  useEffect(() => {
    let cancelled = false
    let dispose
    import('../three/canScene').then(({ createCanScene }) => {
      if (cancelled) return
      try {
        dispose = createCanScene(canvas.current, section.current,
          () => setState('ready'), () => setState('fallback'))
      } catch { setState('fallback') }
    }).catch(() => { if (!cancelled) setState('fallback') })
    return () => { cancelled = true; dispose?.() }
  }, [])

  return (
    <section id="experience" className={`cinema cinema--${state}`} ref={section} data-scene="intro" aria-label="Découverte de la gamme 8.6 en 3D">
      <div className="cinema-sticky">
        <div className="cinema-atmosphere" aria-hidden="true" />
        <div className="cinema-grain" aria-hidden="true" />
        <div className="cinema-watermark" aria-hidden="true">8.6</div>
        <div className="cinema-canvas" ref={canvas} aria-hidden="true" />
        {state !== 'ready' && <img className="cinema-fallback" src="/products/original.png" alt="Canette 8.6 Original" />}
        <div className="cinema-macro" aria-hidden="true">
          <span><i /> EXPÉRIENCE 8.6 — 001</span>
          <strong>LE FROID.<br /><em>EN MOUVEMENT.</em></strong>
          <small>MATIÈRE. LUMIÈRE. CARACTÈRE.<br />APPROCHE D’UN PEU PLUS PRÈS.</small>
        </div>
        <div className="cinema-panel cinema-intro">
          <p className="overline"><i /> LA CAVE DES CARACTÈRES</p>
          <h1>LE FROID.<br />À L’ÉTAT<br />BRUT<span>.</span></h1>
          <p className="cinema-description">Une signature. Une présence.<br />Découvre la 8.6 sous toutes ses facettes.</p>
          <a className="pill-link" href="#collection">Explorer la collection <span>↗</span></a>
        </div>
        <div className="cinema-panel cinema-detail">
          <p className="overline">01 / SOUS TOUS LES ANGLES</p>
          <h2>LE DÉTAIL<br />FAIT TOUT<span>.</span></h2>
          <p className="cinema-description">L’eau prend son envol.<br />La matière révèle son caractère.</p>
          <div className="micro-facts"><span>50<small>CENTILITRES</small></span><span>360°<small>DE CARACTÈRE</small></span></div>
        </div>
        <div className="cinema-panel cinema-gold">
          <p className="overline">02 / CHANGER DE TON</p>
          <h2>L’OR A<br />DU FOND<span>.</span></h2>
          <p className="cinema-description">Des reflets dorés.<br />Un caractère qui se distingue.</p>
          <span className="outline-label">UNE QUESTION DE NUANCES</span>
        </div>
        <div className="cinema-panel cinema-red">
          <p className="overline">03 / PASSER AU ROUGE</p>
          <h2>VOIR<br />ROUGE<span>.</span></h2>
          <p className="cinema-description">Une teinte intense.<br />Un caractère à part.</p>
          <span className="outline-label">8.6 / RED</span>
        </div>
        <div className="cinema-panel cinema-final">
          <p className="overline">04 / LA COLLECTION S’OUVRE</p>
          <h2>À CHACUN<br />SON CARACTÈRE<span>.</span></h2>
          <a className="pill-link" href="#collection">Trouver le tien <span>↓</span></a>
        </div>
        <div className="cinema-bottom"><span className="scroll-cue"><span>↓</span> FAIS DÉFILER POUR EXPLORER</span><button className="cinema-pause" type="button" onClick={toggleMotion} aria-pressed={paused} aria-label={paused ? 'Reprendre les animations de l’eau' : 'Mettre les animations de l’eau en pause'}>{paused ? '▶ REPRENDRE' : 'Ⅱ PAUSE'}</button><div className="cinema-progress"><i /></div></div>
        <p className="sr-only">Une vue macro révèle la condensation sur la canette. L’Original pivote, montre son dos et son couvercle qui s’ouvre. La Gold, puis la Red prennent le relais avant de réunir les trois canettes.</p>
      </div>
    </section>
  )
}
