import * as THREE from 'three'
import { createLabel, createMicroSurface, createBrushedSurface, randomSequence } from './canMaterials'
import { createCanLid } from './canLid'

function ring(group, radius, tube, y, material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 128), material)
  mesh.rotation.x = Math.PI / 2
  mesh.position.y = y
  group.add(mesh)
  return mesh
}

function createCondensation(group, count, detail) {
  // Water is transmissive, not alpha-blended paint. Its curved surface refracts
  // the actual printed can behind it, while Fresnel catches the studio lights.
  const water = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: .025, transmission: 1,
    thickness: .022, ior: 1.333, envMapIntensity: 1.15,
    attenuationColor: '#ffffff', attenuationDistance: Infinity,
    clearcoat: .85, clearcoatRoughness: .018, specularIntensity: 1,
  })
  // Tiny beads do not need the same tessellation as a full-screen can.
  const geometry = new THREE.SphereGeometry(1, detail ? 20 : 12, detail ? 14 : 8)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    const pinch = 1 - Math.max(y, 0) * .22
    positions.setXYZ(i, positions.getX(i) * pinch, y, positions.getZ(i) * pinch)
  }
  geometry.computeVertexNormals()
  const drops = new THREE.InstancedMesh(geometry, water, count)
  const random = randomSequence(86)
  const dummy = new THREE.Object3D()
  const occupied = []
  for (let i = 0; i < count; i++) {
    const large = i % 21 === 0
    const radius = large ? .022 + random() * .016 : .003 + Math.pow(random(), 2) * .017
    let angle, y
    // Reject close neighbours for distinct beads instead of obvious regular rows.
    for (let attempt = 0; attempt < 12; attempt++) {
      angle = random() * Math.PI * 2
      y = random() * 2.65 - 1.4
      if (!occupied.some((drop) => Math.hypot(Math.sin((angle - drop.angle) / 2) * 1.36, y - drop.y) < (radius + drop.radius) * 1.6)) break
    }
    occupied.push({ angle, y, radius })
    dummy.position.set(Math.sin(angle) * .68, y, Math.cos(angle) * .68)
    dummy.rotation.set(0, angle, 0)
    dummy.scale.set(radius, radius * (large ? 1.25 + random() * .65 : .85 + random() * .5), radius * .78)
    dummy.updateMatrix()
    drops.setMatrixAt(i, dummy.matrix)
  }
  group.add(drops)

  // Separate moving beads: their paths stay on the surface of the cylinder.
  const runners = new THREE.InstancedMesh(geometry, water, detail ? 7 : 0)
  group.add(runners)
  const falling = Array.from({ length: 7 }, (_, index) => ({ angle: Math.PI - .78 + index * .255, start: .9 - random() * 1.1, radius: .018 + random() * .009 }))
  return {
    setCount(value) { drops.count = Math.min(count, value) },
    update(progress) {
      if (!detail) return
      falling.forEach((drop, index) => {
        const travel = THREE.MathUtils.smoothstep(progress, .01 + index * .012, .3 + index * .03)
        dummy.position.set(Math.sin(drop.angle) * .681, drop.start - travel * .6, Math.cos(drop.angle) * .681)
        dummy.rotation.set(0, drop.angle, 0)
        dummy.scale.set(drop.radius, drop.radius * (1.65 - travel * .3), drop.radius * .8)
        dummy.updateMatrix()
        runners.setMatrixAt(index, dummy.matrix)
      })
      runners.instanceMatrix.needsUpdate = true
    },
  }
}

export function createCan(variant, onTextureLoad, onError, detail = true, surfaces, compact = false) {
  const group = new THREE.Group()
  const microSurface = surfaces?.micro || createMicroSurface()
  const brushedSurface = surfaces?.brushed || createBrushedSurface()
  const labelAsset = createLabel(variant, onTextureLoad, onError, compact)
  const texture = labelAsset.texture
  const paint = new THREE.MeshPhysicalMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0, metalness: .44, roughness: .27, clearcoat: .68, clearcoatRoughness: .12, bumpMap: microSurface, bumpScale: .001, envMapIntensity: .82, specularIntensity: 1 })
  const silver = new THREE.MeshStandardMaterial({ color: '#c2c8cc', metalness: .8, roughness: .29, bumpMap: brushedSurface, bumpScale: .0018 })
  const darkSilver = new THREE.MeshStandardMaterial({ color: '#67717c', metalness: 1, roughness: .33 })
  const profile = [[.613,-1.59],[.654,-1.56],[.675,-1.51],[.68,-1.44],[.68,1.23],[.676,1.29],[.665,1.34],[.64,1.39],[.602,1.46],[.576,1.52],[.565,1.58],[.565,1.61]]
  const geometry = new THREE.LatheGeometry(profile.map(([x,y]) => new THREE.Vector2(x,y)), 160)
  // Lathe defaults distribute UVs by vertex index, which stretches a long body.
  for (let i = 0; i < geometry.attributes.uv.count; i++) geometry.attributes.uv.setY(i, (geometry.attributes.position.getY(i) + 1.59) / 3.2)
  const label = new THREE.Mesh(geometry, paint)
  label.castShadow = label.receiveShadow = true
  group.add(label)

  const base = new THREE.Mesh(new THREE.LatheGeometry([[0,-1.60],[.48,-1.61],[.55,-1.66],[.596,-1.68],[.625,-1.65],[.636,-1.61],[.626,-1.57]].map(([x,y])=>new THREE.Vector2(x,y)),128), silver)
  group.add(base)
  ring(group, .602, .019, -1.663, silver)
  ring(group, .51, .007, -1.618, darkSilver)

  const lid = createCanLid(brushedSurface)
  const cap = lid.group
  const tab = lid.tab
  group.add(cap)
  const condensation = createCondensation(group, detail ? 780 : 180, detail)
  let lastProgress = -1
  return {
    group, cap, tab, label, texture,
    setDropCount(count) { condensation.setCount(count) },
    update(progress, open) {
      if (progress !== lastProgress) { condensation.update(progress); lid.update(open); lastProgress = progress }
    },
    disposeTextures() { labelAsset.dispose(); if (!surfaces) { microSurface.dispose(); brushedSurface.dispose() } },
  }
}
