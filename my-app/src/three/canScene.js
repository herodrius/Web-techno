import * as THREE from 'three'
import { createCan } from './canModel'
import { createStudioEnvironment } from './canMaterials'
import { createWaterDynamics } from './waterDynamics'

const clamp = THREE.MathUtils.clamp
const mix = THREE.MathUtils.lerp
const smooth = (start, end, value) => THREE.MathUtils.smoothstep(value, start, end)

export function createCanScene(host, story, onReady, onError) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  // Transmission must sample an opaque scene background. An alpha-cleared
  // framebuffer turns free-flying water into white silhouettes off the can.
  scene.background = new THREE.Color('#020609')
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50)
  camera.position.set(0, 0, 8.3)
  const environment = createStudioEnvironment(renderer)
  scene.environment = environment.texture
  scene.environmentIntensity = .85
  scene.add(new THREE.HemisphereLight('#d8e8f5', '#1e2630', .6))
  const key = new THREE.DirectionalLight('#edf3ff', 2)
  key.position.set(-6, 10, 8)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 28 })
  key.shadow.bias = -.00015
  key.shadow.normalBias = .006
  scene.add(key)
  const fill = new THREE.DirectionalLight('#c3d9e5', .45)
  fill.position.set(0, 0, 7)
  scene.add(fill)
  const rim = new THREE.DirectionalLight('#aecbdf', .9)
  rim.position.set(4, 1, -2)
  scene.add(rim)

  const starGeometry = new THREE.BufferGeometry()
  const starPositions = new Float32Array(420 * 3)
  for (let index = 0; index < 420; index++) {
    starPositions[index * 3] = (Math.random() - .5) * 22
    starPositions[index * 3 + 1] = (Math.random() - .5) * 13
    starPositions[index * 3 + 2] = -1 - Math.random() * 8
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMaterial = new THREE.PointsMaterial({ color: '#cbd9d1', size: .018, transparent: true, opacity: .42, sizeAttenuation: true })
  const stars = new THREE.Points(starGeometry, starMaterial)
  scene.add(stars)

  let texturesLoaded = 0
  const textureLoaded = () => {
    if (disposed) return
    texturesLoaded++
    readScroll()
    if (texturesLoaded === 3) onReady()
  }
  const original = createCan('original', textureLoaded, onError)
  const gold = createCan('gold', textureLoaded, onError, false)
  const red = createCan('red', textureLoaded, onError, false)
  const actors = [original, gold, red]
  actors.forEach(({ group }) => scene.add(group))
  const water = createWaterDynamics(scene)

  let disposed = false
  let frame = 0
  let progress = 0
  let target = 0
  let pointerX = 0
  let pointerY = 0
  let width = 1
  let height = 1
  let active = true
  let previousTime = 0
  let elapsed = 0
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const background = new THREE.Color()
  const palettes = ['#020609', '#071016', '#271c10', '#220810', '#050b10'].map((value) => new THREE.Color(value))
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  const intersection = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active) requestFrame() })
  intersection.observe(story)

  function resize() {
    width = host.clientWidth
    height = host.clientHeight
    renderer.setSize(width, height)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    readScroll()
  }
  function readScroll() {
    const rect = story.getBoundingClientRect()
    target = reduced.matches ? .18 : clamp(-rect.top / Math.max(1, story.offsetHeight - height), 0, 1)
    if (reduced.matches) progress = target
    requestFrame()
  }
  function requestFrame() {
    if (!disposed && !frame && !document.hidden && active) frame = requestAnimationFrame(render)
  }
  function pointer(event) {
    pointerX = (event.clientX / width - .5) * .1
    pointerY = (event.clientY / height - .5) * .08
    requestFrame()
  }
  function render(time) {
    frame = 0
    if (disposed) return
    const paused = story.dataset.paused === 'true' || reduced.matches
    const delta = paused ? 0 : Math.min(.04, Math.max(0, (time - previousTime) / 1000))
    previousTime = time
    elapsed += delta
    progress = reduced.matches ? target : mix(progress, target, .085)
    const p = progress
    const mobile = width < 720
    const span = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect
    const reveal = smooth(.025, .19, p)
    const first = smooth(.235, .43, p)
    const second = smooth(.44, .64, p)
    const third = smooth(.695, .80, p)
    const fourth = smooth(.875, .98, p)
    const macroOpacity = 1 - smooth(.035, .135, p)
    const introOpacity = smooth(.105, .165, p) * (1 - smooth(.275, .34, p))
    const detailOpacity = smooth(.31, .38, p) * (1 - smooth(.49, .55, p))
    const goldOpacity = smooth(.55, .60, p) * (1 - smooth(.69, .735, p))
    const redOpacity = smooth(.745, .79, p) * (1 - smooth(.865, .91, p))
    const finalOpacity = smooth(.92, .97, p)
    story.style.setProperty('--macro-opacity', macroOpacity)
    story.style.setProperty('--intro-opacity', introOpacity)
    story.style.setProperty('--detail-opacity', detailOpacity)
    story.style.setProperty('--gold-opacity', goldOpacity)
    story.style.setProperty('--red-opacity', redOpacity)
    story.style.setProperty('--final-opacity', finalOpacity)
    story.style.setProperty('--intro-y', `${-first * 100}px`)
    story.style.setProperty('--progress', p)
    story.dataset.scene = p < .105 ? 'macro' : p < .34 ? 'intro' : p < .55 ? 'detail' : p < .735 ? 'gold' : p < .91 ? 'red' : 'final'
    if (p < .51) background.copy(palettes[0]).lerp(palettes[1], smooth(.17, .42, p))
    else if (p < .71) background.copy(palettes[1]).lerp(palettes[2], smooth(.52, .62, p))
    else if (p < .89) background.copy(palettes[2]).lerp(palettes[3], smooth(.71, .79, p))
    else background.copy(palettes[3]).lerp(palettes[4], smooth(.89, .97, p))
    story.style.setProperty('--scene-bg', `#${background.getHexString()}`)
    scene.background.copy(background)

    // Une trajectoire continue en espace 3D, pilotée par la progression de la page.
    original.group.position.set(
      mobile ? mix(.20, -.1, reveal) : mix(-span * .02, span * .23, reveal) - first * span * .44 + second * span * .37 - third * span * .38 + fourth * span * .22,
      mobile ? mix(-.2, -1.03, reveal) : mix(-.42, -.1, reveal) + first * .22 - fourth * .87,
      mix(.55, 0, reveal) + first * .3 - second * .3 + third * .2 - fourth * .2,
    )
    original.group.rotation.set(
      mix(.04, -.05, reveal) + first * .68 - second * .72 + third * .12 - fourth * .03 + (reduced.matches ? 0 : pointerY),
      mix(Math.PI + .20, Math.PI, reveal) + (first + second + third + fourth) * Math.PI * 2 + (reduced.matches ? 0 : pointerX),
      mix(.22, -.20, reveal) + first * .5 - second * .7 + third * .57 - fourth * .15,
    )
    const settledScale = mobile ? .65 + first * .03 - fourth * .10 : 1.08 + first * .10 - second * .12 + third * .04 - fourth * .35
    const scale = mix(mobile ? 2.1 : 3, settledScale, reveal)
    original.group.scale.setScalar(scale)
    original.cap.position.y = 1.6
    const open = smooth(.365, .43, p)
    original.update(p, open)
    // Change the wrap halfway through each full turn, while its front faces away.
    const isGold = p >= .54 && p < .7475
    const isRed = p >= .7475 && p < .9275
    original.label.material.map = isGold ? gold.texture : isRed ? red.texture : original.texture
    original.label.material.metalness = isGold ? .55 : .38
    renderer.toneMappingExposure = mix(1, .9, smooth(.52, .6, p) * (1 - smooth(.71, .79, p)))

    const collectionReveal = smooth(.91, .99, p)
    gold.group.visible = collectionReveal > .001
    red.group.visible = collectionReveal > .001
    for (const [index, actor] of [gold, red].entries()) {
      const direction = index === 0 ? -1 : 1
      actor.group.position.set(direction * mix(span * .65, mobile ? .73 : 1.80, collectionReveal), -.85, -.55)
      actor.group.scale.setScalar(mobile ? .40 : .68)
      actor.group.rotation.set(.10, Math.PI + direction * (1 - collectionReveal) * 3, direction * .25)
    }
    stars.rotation.y = p * .18 + pointerX * .5
    stars.rotation.x = pointerY * .25
    starMaterial.opacity = mix(.52, 0, smooth(.62, .86, p))
    const movingWater = water.update(delta, elapsed, p, original.group, reduced.matches)
    try { renderer.render(scene, camera) }
    catch (error) { onError(error); return }
    if (Math.abs(progress - target) > .0001 || (!paused && (movingWater || p < .27))) requestFrame()
  }
  const visibility = () => { if (!document.hidden) readScroll() }
  const contextLost = (event) => { event.preventDefault(); onError(new Error('WebGL context lost')) }
  window.addEventListener('scroll', readScroll, { passive: true })
  window.addEventListener('pointermove', pointer, { passive: true })
  story.addEventListener('scene-pause', readScroll)
  document.addEventListener('visibilitychange', visibility)
  reduced.addEventListener('change', readScroll)
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  resize()

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    observer.disconnect()
    intersection.disconnect()
    window.removeEventListener('scroll', readScroll)
    window.removeEventListener('pointermove', pointer)
    story.removeEventListener('scene-pause', readScroll)
    document.removeEventListener('visibilitychange', visibility)
    reduced.removeEventListener('change', readScroll)
    renderer.domElement.removeEventListener('webglcontextlost', contextLost)
    const geometries = new Set()
    const materials = new Set()
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
      if (object.material) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
      }
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    actors.forEach((actor) => actor.disposeTextures())
    environment.dispose()
    key.shadow.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
