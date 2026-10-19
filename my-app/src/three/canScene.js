import * as THREE from 'three'
import { createCan } from './canModel'
import { createStudioEnvironment, createMicroSurface, createBrushedSurface } from './canMaterials'
import { createWaterDynamics } from './waterDynamics'
import { createCinematicEffects, pulse } from './cinematicEffects'
import { QUALITY, createQualityMonitor, renderPixelRatio } from './sceneQuality'

const clamp = THREE.MathUtils.clamp
const mix = THREE.MathUtils.lerp
const smooth = (start, end, value) => THREE.MathUtils.smoothstep(value, start, end)

export function createCanScene(host, story, onReady, onError) {
  const compact = host.clientWidth < 760 || (navigator.deviceMemory && navigator.deviceMemory <= 4)
  let qualityLevel = compact ? 1 : 0
  const qualityMonitor = createQualityMonitor(qualityLevel)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
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
  key.shadow.mapSize.set(1024, 1024)
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
  const surfaces = { micro: createMicroSurface(), brushed: createBrushedSurface() }
  const original = createCan('original', textureLoaded, failScene, true, surfaces, compact)
  const gold = createCan('gold', textureLoaded, failScene, false, surfaces, compact)
  const red = createCan('red', textureLoaded, failScene, false, surfaces, compact)
  const actors = [original, gold, red]
  const textureAnisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  actors.forEach((actor) => {
    actor.texture.anisotropy = textureAnisotropy
    actor.texture.minFilter = THREE.LinearMipmapLinearFilter
    actor.texture.magFilter = THREE.LinearFilter
    actor.texture.needsUpdate = true
  })
  actors.forEach(({ group }) => scene.add(group))
  const water = createWaterDynamics(scene)
  const effects = createCinematicEffects(scene)

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
  let hasRendered = false
  let styledProgress = -1
  let shadowProgress = -1
  let shadowPointer = ''
  let statsAt = 0
  let frameTotal = 0
  let frameCount = 0
  const panels = [...story.querySelectorAll('.cinema-panel')]
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const background = new THREE.Color()
  const palettes = ['#020609', '#071016', '#271c10', '#220810', '#050b10'].map((value) => new THREE.Color(value))
  const lightTint = new THREE.Color()
  const coldTint = new THREE.Color('#b9eaff')
  const goldTint = new THREE.Color('#ffd17a')
  const redTint = new THREE.Color('#ff7187')
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  const intersection = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting
    if (active) readScroll()
    else { cancelAnimationFrame(frame); frame = 0; previousTime = 0 }
  })
  intersection.observe(story)

  function resize() {
    width = host.clientWidth
    height = host.clientHeight
    applyQuality()
    renderer.setSize(width, height)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    readScroll()
  }
  function applyQuality() {
    const quality = QUALITY[qualityLevel]
    renderer.setPixelRatio(renderPixelRatio(window.devicePixelRatio, width, height, quality))
    renderer.transmissionResolutionScale = quality.transmission
    original.setDropCount(quality.drops)
    gold.setDropCount(quality.sideDrops)
    red.setDropCount(quality.sideDrops)
    water.setLimit(quality.flyingDrops)
    renderer.domElement.dataset.quality = quality.name
    renderer.shadowMap.needsUpdate = true
  }
  function readScroll() {
    const rect = story.getBoundingClientRect()
    target = reduced.matches ? .18 : clamp(-rect.top / Math.max(1, story.offsetHeight - height), 0, 1)
    if (reduced.matches || !hasRendered) progress = target
    requestFrame()
  }
  function requestFrame() {
    if (!disposed && !frame && !document.hidden && active) frame = requestAnimationFrame(render)
  }
  function pointer(event) {
    if (!active || reduced.matches || event.pointerType === 'touch') return
    pointerX = (event.clientX / width - .5) * .1
    pointerY = (event.clientY / height - .5) * .08
    requestFrame()
  }
  function render(time) {
    frame = 0
    if (disposed || !active || document.hidden) return
    const paused = story.dataset.paused === 'true' || reduced.matches
    const frameMs = previousTime ? time - previousTime : 16.7
    const nextQuality = qualityMonitor.sample(frameMs)
    if (nextQuality !== null) { qualityLevel = nextQuality; applyQuality() }
    const step = Math.min(.1, Math.max(.001, frameMs / 1000))
    const delta = paused ? 0 : Math.min(.04, step)
    previousTime = time
    elapsed += delta
    progress = reduced.matches ? target : mix(progress, target, 1 - Math.exp(-step * 10))
    if (Math.abs(progress - target) < .0001) progress = target
    hasRendered = true
    const p = progress
    const mobile = width < 720
    const span = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect
    const reveal = smooth(.025, .19, p)
    const first = smooth(.235, .43, p)
    const second = smooth(.44, .64, p)
    const third = smooth(.695, .80, p)
    const fourth = smooth(.875, .98, p)
    const goldFlight = pulse(.44, .64, p)
    const redFlight = pulse(.695, .80, p)
    const collectionFlight = pulse(.875, .98, p)
    const openingKick = pulse(.37, .425, p)
    const motion = reduced.matches ? 0 : Math.max(goldFlight, redFlight, collectionFlight)
    const impact = reduced.matches ? 0 : Math.max(openingKick, pulse(.09, .15, p), pulse(.535, .59, p), pulse(.74, .79, p), pulse(.91, .96, p))
    const transitionPulse = reduced.matches ? 0 : Math.max(pulse(.09, .17, p), pulse(.34, .43, p), pulse(.51, .61, p), pulse(.71, .81, p), pulse(.89, .98, p))
    if (p !== styledProgress) {
      styledProgress = p
      story.style.setProperty('--flight', motion.toFixed(3))
      story.style.setProperty('--impact', impact.toFixed(3))
      story.style.setProperty('--transition-pulse', transitionPulse.toFixed(3))
      story.style.setProperty('--film-progress', p.toFixed(4))
      story.style.setProperty('--scan-y', `${mix(-12, 112, p).toFixed(2)}%`)
      story.style.setProperty('--ring-turn', `${p.toFixed(4)}turn`)
      story.style.setProperty('--drop-y', `${mix(0, 28, p).toFixed(2)}vh`)
      story.style.setProperty('--drop-rot', `${mix(0, 110, p).toFixed(1)}deg`)
      story.style.setProperty('--particle-lift', `${mix(16, -34, p).toFixed(2)}vh`)
      story.style.setProperty('--aurora-turn', `${mix(-18, 34, p).toFixed(2)}deg`)
      story.style.setProperty('--orbit-scale', `${mix(.72, 1.18, transitionPulse).toFixed(3)}`)
      story.style.setProperty('--scene-accent', p < .52 ? '#86dcff' : p < .72 ? '#ffd170' : p < .90 ? '#ff647d' : '#a8eaff')
      story.style.setProperty('--sweep-x', `${mix(-130, 130, second + third - Math.floor(second + third))}%`)
      story.style.setProperty('--chapter-shift', `${(1 - reveal) * 42}px`)
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
      const opacities = [introOpacity, detailOpacity, goldOpacity, redOpacity, finalOpacity]
      panels.forEach((panel, index) => {
        const offset = (1 - opacities[index]) * 38
        panel.style.transform = `translate3d(0,${offset}px,0)`
      })
      if (p < .51) background.copy(palettes[0]).lerp(palettes[1], smooth(.17, .42, p))
      else if (p < .71) background.copy(palettes[1]).lerp(palettes[2], smooth(.52, .62, p))
      else if (p < .89) background.copy(palettes[2]).lerp(palettes[3], smooth(.71, .79, p))
      else background.copy(palettes[3]).lerp(palettes[4], smooth(.89, .97, p))
      story.style.setProperty('--scene-bg', `#${background.getHexString()}`)
      scene.background.copy(background)
    }

    camera.position.z = 8.3 - openingKick * .75 - motion * .52 - impact * .18
    camera.position.x = (Math.sin(p * Math.PI * 24) * impact + pointerX * 1.6) * .065
    camera.position.y = Math.cos(p * Math.PI * 20) * impact * .04
    camera.rotation.x = 0
    camera.rotation.z = Math.sin(p * Math.PI * 8) * motion * .018 + Math.sin(p * Math.PI * 20) * impact * .006
    camera.fov = 35 - openingKick * 2.5 + motion * 1.4
    camera.updateProjectionMatrix()

    lightTint.copy(coldTint)
    if (p >= .52 && p < .735) lightTint.lerp(goldTint, smooth(.52, .61, p))
    else if (p >= .735 && p < .91) lightTint.lerp(redTint, smooth(.735, .81, p))
    key.intensity = 2 + transitionPulse * .42 + openingKick * .35
    fill.intensity = .45
    rim.intensity = .9 + motion * .85 + transitionPulse * .28
    scene.environmentIntensity = .85 + transitionPulse * .08
    rim.color.copy(lightTint)
    rim.position.x = Math.cos(p * Math.PI * 6) * 4.8
    rim.position.y = 1 + Math.sin(p * Math.PI * 5) * 2.1

    // Une trajectoire continue en espace 3D, pilotée par la progression de la page.
    const normalX = mobile ? mix(.20, -.1, reveal) : mix(-span * .02, span * .23, reveal) - first * span * .44 + second * span * .37 - third * span * .38 + fourth * span * .22
    const normalY = (mobile ? mix(-.2, -1.03, reveal) : mix(-.42, -.1, reveal) + first * .22 - fourth * .87) + motion * (mobile ? .15 : .7) + openingKick * .12
    const normalZ = mix(.55, 0, reveal) + first * .3 - second * .3 + third * .2 - fourth * .2 + motion * (mobile ? .25 : .75)
    original.group.position.set(normalX, normalY, normalZ)
    const normalRotX = mix(.04, -.05, reveal) + first * .68 - second * .72 + third * .12 - fourth * .03 + motion * .32 - openingKick * .12 + (reduced.matches ? 0 : pointerY)
    const normalRotY = mix(Math.PI + .20, Math.PI, reveal) + (first + second + third + fourth) * Math.PI * 2 + (reduced.matches ? 0 : pointerX)
    const normalRotZ = mix(.22, -.20, reveal) + first * .5 - second * .7 + third * .57 - fourth * .15 + Math.sin(second * Math.PI * 2) * .38 + Math.sin(third * Math.PI * 2) * .48
    original.group.rotation.set(normalRotX, normalRotY, normalRotZ)
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
    stars.position.z = Math.sin(p * Math.PI * 5) * .24
    stars.scale.setScalar(1 + transitionPulse * .055)
    starMaterial.opacity = mix(.52, 0, smooth(.62, .86, p))
    const movingWater = water.update(delta, elapsed, p, original.group, reduced.matches)
    effects.update(p, elapsed, original.group, mobile, reduced.matches, renderer.getPixelRatio())
    // Water moves independently; its frames do not need to redraw the can's shadow.
    const currentPointer = `${pointerX.toFixed(3)},${pointerY.toFixed(3)}`
    if (Math.abs(p - shadowProgress) > .0002 || currentPointer !== shadowPointer) {
      renderer.shadowMap.needsUpdate = true
      shadowProgress = p
      shadowPointer = currentPointer
    }
    try { renderer.render(scene, camera) }
    catch (error) { failScene(error); return }
    if (frameMs < 180) { frameTotal += frameMs; frameCount++ }
    if (time - statsAt > 750) {
      Object.assign(renderer.domElement.dataset, { fps: String(Math.round(1000 * frameCount / Math.max(1, frameTotal))), triangles: String(renderer.info.render.triangles), calls: String(renderer.info.render.calls) })
      frameTotal = frameCount = 0
      statsAt = time
    }
    if (progress !== target || (!paused && (movingWater || p < .92))) requestFrame()
  }
  function failScene(error) { if (!disposed) { dispose(); onError(error) } }
  const visibility = () => {
    if (!document.hidden) readScroll()
    else { cancelAnimationFrame(frame); frame = 0; previousTime = 0 }
  }
  const contextLost = (event) => { event.preventDefault(); failScene(new Error('WebGL context lost')) }
  window.addEventListener('scroll', readScroll, { passive: true })
  window.addEventListener('pointermove', pointer, { passive: true })
  story.addEventListener('scene-pause', readScroll)
  document.addEventListener('visibilitychange', visibility)
  reduced.addEventListener('change', readScroll)
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  resize()

  function dispose() {
    if (disposed) return
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
    surfaces.micro.dispose()
    surfaces.brushed.dispose()
    environment.dispose()
    key.shadow.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
  return dispose
}
