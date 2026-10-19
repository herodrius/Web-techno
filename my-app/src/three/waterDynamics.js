import * as THREE from 'three'
import { randomSequence } from './canMaterials'

const UP = new THREE.Vector3(0, 1, 0)

export function createWaterDynamics(scene) {
  const count = 144
  let limit = count
  const random = randomSequence(806)
  const geometry = new THREE.SphereGeometry(1, 14, 10)
  const water = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: .018, transmission: 1,
    thickness: .09, ior: 1.333, envMapIntensity: 1.8,
    attenuationColor: '#e6f9ff', attenuationDistance: 3,
  })
  const mesh = new THREE.InstancedMesh(geometry, water, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  scene.add(mesh)
  const dummy = new THREE.Object3D()
  const direction = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const particles = Array.from({ length: count }, () => ({
    position: new THREE.Vector3(), velocity: new THREE.Vector3(),
    life: 0, age: 10, radius: 0, wobble: random() * Math.PI * 2,
  }))
  let next = 0
  let previousProgress = 0
  let lastEmission = -5
  let hasStarted = false

  function emit(can, elapsed, opening = false) {
    can.updateWorldMatrix(true, false)
    can.getWorldQuaternion(rotation)
    const scale = Math.min(can.scale.x, 2.3)
    const amount = Math.round(limit * (opening ? .7 : .45))
    for (let i = 0; i < amount; i++) {
      const drop = particles[next++ % limit]
      const angle = Math.PI + (random() - .5) * 3.3
      const y = opening ? 1.6 : (random() - .5) * 2.3
      normal.set(Math.sin(angle), 0, Math.cos(angle)).applyQuaternion(rotation)
      drop.position.set(Math.sin(angle) * .69, y, Math.cos(angle) * .69)
      if (opening) drop.position.set((random() - .5) * .2, 1.66, .16)
      can.localToWorld(drop.position)
      // Initial impulse + gravity; droplets leave the can in world space.
      drop.velocity.copy(normal).multiplyScalar((.25 + random() * .65) * scale)
      drop.velocity.y += (opening ? 1 : .15) + random() * .75
      drop.velocity.z += .35 + random() * .9
      drop.age = 0
      drop.life = 2.3 + random() * 1.9
      drop.radius = (.018 + Math.pow(random(), 2) * .060) * Math.sqrt(scale)
    }
    lastEmission = elapsed
  }

  return {
    setLimit(value) {
      limit = Math.min(count, value)
      particles.slice(limit).forEach((drop) => { drop.age = drop.life })
    },
    update(delta, elapsed, progress, can, reduced, active = true) {
      if (reduced || !active) { mesh.visible = false; return false }
      mesh.visible = true
      if (!hasStarted && delta > 0) {
        emit(can, elapsed)
        hasStarted = true
      }
      const crossedOpening = previousProgress < .39 && progress >= .39
      const crossedReveal = previousProgress < .09 && progress >= .09
      const crossedRed = previousProgress < .77 && progress >= .77
      const crossedGold = previousProgress < .56 && progress >= .56
      // Scroll beats create large splashes; smaller cold-water bursts keep the shot alive.
      if (delta > 0 && ((crossedOpening || crossedReveal || crossedGold || crossedRed) || (progress < .92 && elapsed - lastEmission > 2.4))) emit(can, elapsed, crossedOpening)
      previousProgress = progress
      let alive = 0
      particles.forEach((drop) => {
        drop.age += delta * .72 // Slow motion keeps the water readable.
        if (drop.age < drop.life) {
          const step = delta * .72
          drop.velocity.y -= step * .9
          drop.velocity.multiplyScalar(1 - step * .08)
          drop.position.addScaledVector(drop.velocity, step)
          dummy.position.copy(drop.position)
          const fade = 1 - THREE.MathUtils.smoothstep(drop.age / drop.life, .72, 1)
          const ripple = Math.sin(drop.age * 13 + drop.wobble) * .12 * Math.exp(-drop.age)
          const elongation = 1 + Math.min(.8, drop.velocity.length() * .22) + ripple
          const radius = drop.radius * Math.sqrt(fade)
          dummy.scale.set(radius / Math.sqrt(elongation), radius * elongation, radius / Math.sqrt(elongation))
          direction.copy(drop.velocity).normalize()
          dummy.quaternion.setFromUnitVectors(UP, direction)
          dummy.updateMatrix()
          mesh.setMatrixAt(alive++, dummy.matrix)
        }
      })
      mesh.count = alive
      mesh.visible = alive > 0
      mesh.instanceMatrix.needsUpdate = true
      return alive > 0
    },
  }
}
