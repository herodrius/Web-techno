export const QUALITY = [
  { name: 'high', pixelRatio: 1.4, transmission: .65, drops: 780, sideDrops: 180, flyingDrops: 144 },
  { name: 'balanced', pixelRatio: 1.1, transmission: .5, drops: 480, sideDrops: 120, flyingDrops: 96 },
  { name: 'economy', pixelRatio: .85, transmission: .35, drops: 280, sideDrops: 70, flyingDrops: 60 },
]

export function renderPixelRatio(deviceRatio, width, height, quality) {
  // Bound the backing buffer on large/Retina screens as well as small phones.
  return Math.min(deviceRatio, quality.pixelRatio, Math.sqrt(2_000_000 / Math.max(1, width * height)))
}

export function createQualityMonitor(initial = 0) {
  let level = initial
  let samples = 0
  let total = 0
  let cooldown = 1000
  return {
    sample(milliseconds) {
      // A frame after sleep, tab switching or on-demand rendering is not a slow GPU frame.
      if (milliseconds <= 0 || milliseconds > 180) { samples = 0; total = 0; return null }
      if (cooldown > 0) { cooldown -= milliseconds; return null }
      samples++
      total += milliseconds
      if (samples < 45) return null
      const average = total / samples
      samples = 0
      total = 0
      if (average > 27 && level < QUALITY.length - 1) {
        cooldown = 3000
        return ++level
      }
      return null
    },
  }
}
