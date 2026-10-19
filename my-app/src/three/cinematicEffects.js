import * as THREE from 'three'
import { randomSequence } from './canMaterials'

const smooth = (a, b, p) => THREE.MathUtils.smoothstep(p, a, b)
export const pulse = (start, end, p) => {
  const t = THREE.MathUtils.clamp((p - start) / (end - start), 0, 1)
  return Math.sin(t * Math.PI) ** 2
}

// Light ribbons and airborne highlights: a few draw calls, no bloom render pass.
export function createCinematicEffects(scene) {
  const group = new THREE.Group()
  scene.add(group)
  const blue = new THREE.Color('#7bc9eb')
  const amber = new THREE.Color('#ffcc70')
  const crimson = new THREE.Color('#ff4969')
  const color = blue.clone()
  const trails = []
  for (let index = 0; index < 5; index++) {
    const points = Array.from({ length: 90 }, (_, i) => {
      const a = i / 89 * Math.PI * 1.65
      return new THREE.Vector3(Math.cos(a) * 1.35, Math.sin(a * 1.25) * .47, Math.sin(a) * 1.15)
    })
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 100, index ? .005 : .009, 5, false)
    const material = new THREE.MeshBasicMaterial({ color: blue, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    const trail = new THREE.Mesh(geometry, material)
    trail.rotation.z = -.72 + index * .36
    trail.rotation.y = index * Math.PI * .43
    group.add(trail)
    trails.push(trail)
  }
  const random = randomSequence(864)
  const positions = new Float32Array(180 * 3)
  for (let i = 0; i < positions.length; i += 3) {
    const angle = random() * Math.PI * 2
    const radius = .85 + random() * 2.2
    positions[i] = Math.cos(angle) * radius
    positions[i + 1] = (random() - .5) * 3.5
    positions[i + 2] = Math.sin(angle) * radius
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: color }, opacity: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: `uniform float pixelRatio;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p;
      gl_PointSize = clamp(24.0 / -p.z, 1.0, 7.0) * pixelRatio; }`,
    fragmentShader: `uniform vec3 tint; uniform float opacity;
      void main() { float d = length(gl_PointCoord - .5) * 2.0;
      gl_FragColor = vec4(tint, pow(max(0.0, 1.0-d), 2.5) * opacity); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  const dust = new THREE.Points(geometry, material)
  group.add(dust)
  const shockMaterial = new THREE.MeshBasicMaterial({ color: blue, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  const shockwaves = Array.from({ length: 3 }, (_, index) => {
    const wave = new THREE.Mesh(new THREE.RingGeometry(.5, .515, 128), shockMaterial.clone())
    wave.rotation.x = Math.PI / 2
    wave.rotation.z = index * .7
    group.add(wave)
    return wave
  })
  const shardsGeometry = new THREE.ConeGeometry(.018, .22, 5)
  const shardsMaterial = new THREE.MeshPhysicalMaterial({ color: '#d9f6ff', transparent: true, opacity: .72, transmission: .45, roughness: .08, metalness: 0 })
  const shards = new THREE.InstancedMesh(shardsGeometry, shardsMaterial, 70)
  const shardDummy = new THREE.Object3D()
  for (let index = 0; index < 70; index++) {
    const angle = random() * Math.PI * 2
    const radius = .85 + random() * 1.7
    shardDummy.position.set(Math.cos(angle) * radius, (random() - .5) * 3.7, Math.sin(angle) * radius)
    shardDummy.rotation.set(random() * Math.PI, angle, random() * Math.PI)
    shardDummy.scale.setScalar(.45 + random() * 1.5)
    shardDummy.updateMatrix()
    shards.setMatrixAt(index, shardDummy.matrix)
  }
  group.add(shards)
  // Large, soft particles form a living cold mist around the can. The motion
  // happens in the shader so the effect stays cheap even while it drifts.
  const mistCount = 46
  const mistPositions = new Float32Array(mistCount * 3)
  const mistSeeds = new Float32Array(mistCount)
  for (let index = 0; index < mistCount; index++) {
    const angle = random() * Math.PI * 2
    const radius = .75 + random() * 2.5
    mistPositions[index * 3] = Math.cos(angle) * radius
    mistPositions[index * 3 + 1] = -2.2 + random() * 4.4
    mistPositions[index * 3 + 2] = Math.sin(angle) * radius - .3
    mistSeeds[index] = random()
  }
  const mistGeometry = new THREE.BufferGeometry()
  mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3))
  mistGeometry.setAttribute('seed', new THREE.BufferAttribute(mistSeeds, 1))
  const mistMaterial = new THREE.ShaderMaterial({
    uniforms: { tint: { value: blue.clone() }, opacity: { value: .12 }, time: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: `attribute float seed; uniform float time; uniform float pixelRatio; varying float vSeed;
      void main() { vSeed = seed; vec3 drift = position;
        drift.x += sin(time * (.17 + seed * .12) + seed * 18.0) * (.18 + seed * .18);
        drift.y += cos(time * (.11 + seed * .08) + seed * 11.0) * .16;
        vec4 p = modelViewMatrix * vec4(drift, 1.0); gl_Position = projectionMatrix * p;
        gl_PointSize = clamp((86.0 + seed * 125.0) / max(.8, -p.z), 12.0, 92.0) * pixelRatio; }`,
    fragmentShader: `uniform vec3 tint; uniform float opacity; uniform float time; varying float vSeed;
      void main() { vec2 uv = gl_PointCoord - .5; float d = length(uv) * 2.0;
        float cloud = (1.0 - smoothstep(.12, 1.0, d)) * (.58 + .42 * sin((uv.x + uv.y + vSeed) * 12.0 + time * .2));
        gl_FragColor = vec4(mix(tint, vec3(1.0), .24), max(0.0, cloud) * opacity * (1.0 - d)); }`,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  })
  const mist = new THREE.Points(mistGeometry, mistMaterial)
  group.add(mist)

  const foamGeometry = new THREE.IcosahedronGeometry(.035, 1)
  const foamMaterial = new THREE.MeshPhysicalMaterial({ color: '#e5f8ff', transparent: true, opacity: 0, transmission: .55, roughness: .08, depthWrite: false })
  const foam = new THREE.InstancedMesh(foamGeometry, foamMaterial, 34)
  const foamDummy = new THREE.Object3D()
  for (let index = 0; index < 34; index++) {
    const angle = random() * Math.PI * 2
    const radius = .07 + random() * .58
    foamDummy.position.set(Math.cos(angle) * radius, random() * 1.05, Math.sin(angle) * radius)
    foamDummy.scale.setScalar(.35 + random() * 1.7)
    foamDummy.updateMatrix()
    foam.setMatrixAt(index, foamDummy.matrix)
  }
  foam.visible = false
  scene.add(foam)
  return {
    update(p, time, can, mobile, reduced, pixelRatio) {
      group.visible = !reduced && p < .97
      foam.visible = !reduced && p > .35 && p < .48
      if (!group.visible && !foam.visible) return
      const turn = pulse(.235, .43, p) + pulse(.44, .64, p) + pulse(.695, .80, p) + pulse(.875, .98, p)
      const opening = pulse(.36, .47, p)
      color.copy(blue).lerp(amber, smooth(.50, .61, p)).lerp(crimson, smooth(.71, .80, p)).lerp(blue, smooth(.91, .98, p))
      group.position.copy(can.position)
      group.scale.setScalar((mobile ? .7 : 1) * (1 + opening * .8 + turn * .25))
      group.rotation.y = p * Math.PI * 10
      group.rotation.z = Math.sin(p * Math.PI * 6) * .22
      trails.forEach((trail, i) => {
        trail.material.color.copy(color)
        trail.material.opacity = Math.min(.86, turn * .72 + opening * .75 + .11) * (1 - i * .11)
        trail.position.y = Math.sin(i * 2.1) * (.22 + opening * .7)
      })
      dust.rotation.y = -p * Math.PI * 14
      dust.scale.setScalar(1 + opening * .5)
      material.uniforms.opacity.value = .25 + turn * .45 + opening * .25
      material.uniforms.pixelRatio.value = pixelRatio
      shockwaves.forEach((wave, index) => {
        const phase = (p * 7 + index / 3) % 1
        wave.scale.setScalar(.8 + phase * 4.4 + opening * 1.2)
        wave.material.color.copy(color)
        wave.material.opacity = (1 - phase) ** 2 * (.12 + turn * .32 + opening * .42)
      })
      shards.rotation.y = p * Math.PI * 16
      shards.rotation.z = Math.sin(p * Math.PI * 8) * .5
      shardsMaterial.opacity = .24 + turn * .5 + opening * .3
      mistMaterial.uniforms.time.value = time
      mistMaterial.uniforms.pixelRatio.value = pixelRatio
      mistMaterial.uniforms.tint.value.copy(color)
      mistMaterial.uniforms.opacity.value = .055 + turn * .07 + opening * .16
      mist.rotation.y = -p * Math.PI * 3
      foam.position.copy(can.position)
      foam.position.y += mobile ? .72 : 1.34
      foam.rotation.y = time * 1.7
      foam.scale.setScalar(.3 + opening * (mobile ? 1.1 : 1.65))
      foamMaterial.opacity = opening * .82
    },
  }
}
