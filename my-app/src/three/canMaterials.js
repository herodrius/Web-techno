import * as THREE from 'three'

const sources = {
  original: { file: 'real-original.jpg', center: 600, radius: 183, top: 148, bottom: 1040, base: '#082c40' },
  gold: { file: 'real-gold.jpg', center: 586, radius: 207, top: 68, bottom: 1114, base: '#af863e' },
  red: { file: 'real-red.png', center: 500, radius: 170, top: 55, bottom: 925, base: '#a81d31' },
}

export function randomSequence(seed = 86) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function surfaceTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export function createLabel(variant, onLoad, onError) {
  const config = sources[variant]
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 2048
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = config.base
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const texture = surfaceTexture(canvas)
  let disposed = false
  const loader = new THREE.ImageLoader()
  Promise.all([
    loader.loadAsync(`/products/${config.file}`),
    loader.loadAsync(`/products/label-${variant}.jpg`),
  ]).then(([photo, back]) => {
    if (disposed) return
    // Re-use the reconstructed demo back. The original photo supplies the front,
    // with its white printing intact (white ink must never be keyed out).
    ctx.drawImage(back, 0, 0, 350, back.height, 0, 0, 350, canvas.height)
    ctx.drawImage(back, 1698, 0, 350, back.height, 1698, 0, 350, canvas.height)

    const source = document.createElement('canvas')
    source.width = photo.width
    source.height = photo.height
    const sourceCtx = source.getContext('2d', { willReadFrequently: true })
    sourceCtx.drawImage(photo, 0, 0)
    const pixels = sourceCtx.getImageData(0, 0, photo.width, photo.height).data
    const output = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // Inverse cylindrical projection: the photographed front covers a half turn,
    // rather than looking like a small photo pasted onto a larger cylinder.
    for (let y = 0; y < canvas.height; y++) {
      const v = y / (canvas.height - 1)
      const sourceY = config.top + v * (config.bottom - config.top)
      const sy = Math.floor(sourceY)
      const fy = sourceY - sy
      const shoulder = THREE.MathUtils.smoothstep(v, 0, .10)
      const radius = config.radius * THREE.MathUtils.lerp(.81, 1, shoulder)
      for (let x = 500; x < 1548; x++) {
        const angle = (x / canvas.width - .5) * Math.PI * 2
        const sourceX = config.center + Math.sin(angle) * radius
        const sx = Math.floor(sourceX)
        const fx = sourceX - sx
        const i = (sy * photo.width + sx) * 4
        const o = (y * canvas.width + x) * 4
        const blend = 1 - THREE.MathUtils.smoothstep(Math.abs(angle), 1.38, 1.61)
        for (let channel = 0; channel < 3; channel++) {
          const upper = THREE.MathUtils.lerp(pixels[i + channel], pixels[i + 4 + channel], fx)
          const lower = THREE.MathUtils.lerp(pixels[i + photo.width * 4 + channel], pixels[i + photo.width * 4 + 4 + channel], fx)
          output.data[o + channel] = THREE.MathUtils.lerp(output.data[o + channel], THREE.MathUtils.lerp(upper, lower, fy), blend)
        }
        output.data[o + 3] = 255
      }
    }
    ctx.putImageData(output, 0, 0)
    texture.needsUpdate = true
    onLoad()
  }).catch((error) => { if (!disposed) onError(error) })
  return { texture, dispose: () => { disposed = true; texture.dispose() } }
}

export function createMicroSurface() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1024
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 1024, 1024)
  const random = randomSequence(258)
  for (let i = 0; i < 16000; i++) {
    const x = random() * 1024
    const y = random() * 1024
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
  const size = 512
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
