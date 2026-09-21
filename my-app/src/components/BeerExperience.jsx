import { useEffect, useRef } from 'react'
import './BeerExperience.css'

const canVariants = {
  original: { name: 'ORIGINAL', strength: '8.6%', tone: 'original' },
  gold: { name: 'GOLD', strength: '6.5%', tone: 'gold' },
  red: { name: 'RED', strength: '7.9%', tone: 'red' },
}

// Natural size: 156 × 306 px. A parent can set --can-scale to resize the artwork.
export function BeerCan({ variant = 'original', className = '' }) {
  const can = canVariants[variant] || canVariants.original

  return (
    <div className={`bc-can bc-${can.tone} ${className}`} aria-hidden="true">
      <div className="bc-body">
        <div className="bc-neck" />
        <div className="bc-label">
          <span className="bc-brewery">BAVARIA · HOLLAND</span>
          <svg className="bc-crest" width="34" height="31" viewBox="0 0 34 31" fill="none">
            <path d="M17 28V3M17 8C9 8 8 3 8 3c7-1 9 5 9 5Zm0 8C7 16 5 10 5 10c9-1 12 6 12 6Zm0 9C7 25 4 19 4 19c10-1 13 6 13 6Zm0-17c8 0 9-5 9-5-7-1-9 5-9 5Zm0 8c10 0 12-6 12-6-9-1-12 6-12 6Zm0 9c10 0 13-6 13-6-10-1-13 6-13 6Z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="bc-logo">8.6</span>
          <span className="bc-name">{can.name}</span>
          <span className="bc-divider" />
          <span className="bc-character">INTENSE<br />BY NATURE.</span>
          <span className="bc-strength">{can.strength} <small>ALC. / VOL.</small></span>
          <span className="bc-volume">500 ml</span>
        </div>
        <div className="bc-reflection" />
        <div className="bc-condensation"><i /><i /><i /><i /><i /><i /><i /></div>
      </div>
      <div className="bc-base" />
      <div className="bc-top">
        <span className="bc-top-ridge" />
        <span className="bc-opening" />
        <span className="bc-tab"><i /></span>
      </div>
    </div>
  )
}

export function HeroScene() {
  const sceneRef = useRef(null)

  useEffect(() => {
    const scene = sceneRef.current
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const update = () => {
      frame = 0
      const progress = media.matches ? 0 : Math.min(window.scrollY / 900, 1)
      scene.style.setProperty('--hero-drift', `${progress * 42}px`)
      scene.style.setProperty('--hero-turn', `${progress * 14}deg`)
    }
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    media.addEventListener('change', requestUpdate)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', requestUpdate)
      media.removeEventListener('change', requestUpdate)
    }
  }, [])

  return (
    <div className="xp-hero" ref={sceneRef} aria-hidden="true">
      <div className="xp-hero-halo" />
      <div className="xp-hero-orbit xp-hero-orbit-one" />
      <div className="xp-hero-orbit xp-hero-orbit-two" />
      <span className="xp-hero-plus xp-hero-plus-one">+</span>
      <span className="xp-hero-plus xp-hero-plus-two">+</span>
      <div className="xp-hero-can xp-hero-can-gold"><BeerCan variant="gold" /></div>
      <div className="xp-hero-can xp-hero-can-red"><BeerCan variant="red" /></div>
      <div className="xp-hero-can xp-hero-can-original"><BeerCan /></div>
      <div className="xp-hero-seal"><span>UNE GAMME</span><strong>DU CARACTÈRE</strong><span>TROIS NUANCES</span></div>
      <span className="xp-hero-note">DU CARACTÈRE. POINT.</span>
    </div>
  )
}

const clamp = (value) => Math.min(1, Math.max(0, value))

export function ScrollExperience() {
  const sectionRef = useRef(null)
  const replayRef = useRef(null)
  const scheduleRef = useRef(() => {})

  useEffect(() => {
    const section = sectionRef.current
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0

    const paint = (now) => {
      frame = 0
      const bounds = section.getBoundingClientRect()
      const distance = Math.max(1, section.offsetHeight - window.innerHeight)
      const replaying = replayRef.current !== null
      const progress = media.matches ? 1 : replaying
        ? clamp((now - replayRef.current) / 3300)
        : clamp(-bounds.top / distance)
      const spin = clamp(progress / 0.43)
      const easedSpin = spin * spin * (3 - 2 * spin)
      const jump = Math.sin(clamp((progress - 0.43) / 0.3) * Math.PI)
      const opening = clamp((progress - 0.75) / 0.22)

      section.style.setProperty('--xp-turn', `${-14 + easedSpin * 374 - jump * 13}deg`)
      section.style.setProperty('--xp-lift', `${jump * -105}px`)
      section.style.setProperty('--xp-shadow-scale', `${1 - jump * 0.42}`)
      section.style.setProperty('--xp-shadow-opacity', `${0.35 - jump * 0.18}`)
      section.style.setProperty('--xp-tab-angle', `${opening * -72}deg`)
      section.style.setProperty('--xp-open', opening)
      section.style.setProperty('--xp-foam-scale', `${0.2 + opening * 0.8}`)
      section.style.setProperty('--xp-progress', progress)
      section.dataset.stage = progress < 0.43 ? 'turn' : progress < 0.75 ? 'jump' : 'open'
      if (replaying && progress < 1 && !media.matches) frame = window.requestAnimationFrame(paint)
    }

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(paint)
    }
    const onScroll = () => {
      replayRef.current = null
      schedule()
    }
    scheduleRef.current = schedule
    schedule()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', schedule)
    media.addEventListener('change', schedule)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', schedule)
      media.removeEventListener('change', schedule)
      scheduleRef.current = () => {}
    }
  }, [])

  const replay = () => {
    replayRef.current = window.performance.now()
    scheduleRef.current()
  }

  return (
    <section id="experience" className="xp-experience" ref={sectionRef} data-stage="turn" aria-labelledby="xp-title">
      <div className="xp-sticky">
        <div className="xp-copy">
          <p className="xp-eyebrow"><span /> L’EXPÉRIENCE 8.6</p>
          <h2 id="xp-title">UN PEU DE<br /><em>PRESSION.</em><br />BEAUCOUP DE<br />CARACTÈRE.</h2>
          <p className="xp-description">Une icône qui ne tient pas en place.<br />Fais défiler. On s’occupe du spectacle.</p>
          <button className="xp-replay" type="button" onClick={replay}><span aria-hidden="true">↻</span> Rejouer l’ouverture</button>
        </div>
        <div className="xp-stage" aria-hidden="true">
          <div className="xp-stage-ring xp-stage-ring-one" />
          <div className="xp-stage-ring xp-stage-ring-two" />
          <span className="xp-stage-word">PSSHT.</span>
          <div className="xp-can-shadow" />
          <div className="xp-moving-can">
            <BeerCan />
            <div className="xp-foam"><i /><i /><i /><i /><i /><i /></div>
            <div className="xp-splash xp-splash-left" />
            <div className="xp-splash xp-splash-right" />
            <div className="xp-bubbles">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--bubble-index': index }} />)}</div>
          </div>
          <span className="xp-open-note">LE SON DU CARACTÈRE.</span>
        </div>
        <div className="xp-steps" aria-hidden="true">
          <span className="xp-step xp-step-turn"><b>01</b> ÇA TOURNE.</span>
          <span className="xp-step xp-step-jump"><b>02</b> ÇA DÉCOLLE.</span>
          <span className="xp-step xp-step-open"><b>03</b> ÇA S’OUVRE.</span>
          <div className="xp-progress"><i /></div>
        </div>
      </div>
    </section>
  )

}
