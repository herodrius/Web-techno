import { useEffect } from 'react'

export function useScrollReveal(root) {
  useEffect(() => {
    const host = root.current
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) { target.classList.add('is-revealed'); observer.unobserve(target) }
      })
    }, { threshold: .08 })
    const observe = () => {
      host.querySelectorAll('.product-card:not([data-reveal]), .section-top:not([data-reveal]), .manifesto h2:not([data-reveal])').forEach((element, index) => {
        element.dataset.reveal = 'true'
        element.style.setProperty('--reveal-delay', `${index % 3 * 65}ms`)
        observer.observe(element)
      })
    }
    observe()
    const changes = new MutationObserver(observe)
    changes.observe(host, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      changes.disconnect()
      host.querySelectorAll('[data-reveal]').forEach((element) => { delete element.dataset.reveal; element.classList.remove('is-revealed') })
    }
  }, [root])
}
