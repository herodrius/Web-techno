import * as THREE from 'three'
import originalUrl from '../assets/cans/original.webp'
import goldUrl from '../assets/cans/gold.webp'
import redUrl from '../assets/cans/red.webp'
import originalCompact from '../assets/cans/original-compact.webp'
import goldCompact from '../assets/cans/gold-compact.webp'
import redCompact from '../assets/cans/red-compact.webp'

const labels = {
  original: [originalUrl, originalCompact],
  gold: [goldUrl, goldCompact],
  red: [redUrl, redCompact],
}

export function randomSequence(seed = 86) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

// Photo projection is baked by scripts/bake-can-textures.py, never on a visitor's CPU.
export function createLabel(variant, onLoad, onError, compact = false) {
  let disposed = false
  const texture = new THREE.TextureLoader().load(labels[variant][compact ? 1 : 0],
    () => { if (disposed) texture.dispose(); else onLoad() },
    undefined, (error) => { if (!disposed) onError(error) })
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = compact ? 2 : 4
  return { texture, dispose: () => { disposed = true; texture.dispose() } }
}

export function createMicroSurface() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 512, 512)
  const random = randomSequence(258)
  for (let i = 0; i < 4000; i++) {
    const x = random() * 512
    const y = random() * 512
    const radius = .35 + random() * 1.7
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, '#bbbbbb')
    gradient.addColorStop(1, '#80808000')
    ctx.fillStyle = gradient
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

export function createBrushedSurface() {
  const size = 256
  const data = new Uint8Array(size * size * 4)
  const random = randomSequence(661)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot(x - size / 2, y - size / 2)
      const grain = 128 + Math.sin(radius * 5.6) * 9 + (random() - .5) * 13
      const index = (y * size + x) * 4
      data[index] = data[index + 1] = data[index + 2] = grain
      data[index + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

export function createStudioEnvironment(renderer) {
  const studio = new THREE.Scene()
  studio.background = new THREE.Color('#161d25')
  const panels = [
    { position: [-4, 2, 4], size: [1.3, 7], color: '#eef5ff', power: 7 },
    { position: [4, 1, 2], size: [.55, 6], color: '#c6deee', power: 5 },
    { position: [0, 5, 1], size: [5, 4], color: '#ffffff', power: 4 },
    { position: [-2, -1, -5], size: [2, 5], color: '#d8e3ec', power: 3 },
    { position: [1, 1, 6], size: [4, 4], color: '#edf1f7', power: .5 },
  ]
  for (const panel of panels) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(...panel.size), new THREE.MeshBasicMaterial({ color: new THREE.Color(panel.color).multiplyScalar(panel.power), side: THREE.DoubleSide }))
    plane.position.set(...panel.position)
    plane.lookAt(0, 0, 0)
    studio.add(plane)
  }
  const generator = new THREE.PMREMGenerator(renderer)
  const environment = generator.fromScene(studio, .025, .1, 50)
  generator.dispose()
  studio.traverse((object) => { object.geometry?.dispose(); object.material?.dispose() })
  return environment
}
