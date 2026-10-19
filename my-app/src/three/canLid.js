import * as THREE from 'three'

// Coordinates are drawn in XY, then laid onto the XZ plane of the lid.
// Negative drawing Y is the drinking side (positive Z) of the can.
function aperture(Path = THREE.Path) {
  const path = new Path()
  path.moveTo(0, -.080)
  path.bezierCurveTo(-.105, -.080, -.187, -.16, -.18, -.27)
  path.bezierCurveTo(-.178, -.38, -.085, -.421, 0, -.421)
  path.bezierCurveTo(.085, -.421, .178, -.38, .18, -.27)
  path.bezierCurveTo(.187, -.16, .105, -.080, 0, -.080)
  path.closePath()
  return path
}

function torus(parent, radius, tube, height, material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 96), material)
  mesh.rotation.x = Math.PI / 2
  mesh.position.y = height
  parent.add(mesh)
}

function layFlat(mesh, height) {
  // ExtrudeGeometry uses raw XY coordinates as UVs. Centre the brushed finish
  // on the lid instead of clamping its negative half to a texture edge.
  if (mesh.geometry.type === 'ExtrudeGeometry') {
    const { position, uv } = mesh.geometry.attributes
    for (let index = 0; index < position.count; index++) {
      uv.setXY(index, position.getX(index) / 1.15 + .5, position.getY(index) / 1.15 + .5)
    }
  }
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = height
  mesh.receiveShadow = true
  return mesh
}

export function createCanLid(brushedSurface) {
  const group = new THREE.Group()
  group.position.y = 1.6
  const aluminium = new THREE.MeshPhysicalMaterial({
    color: '#abb5bf', metalness: .9, roughness: .36, envMapIntensity: .58,
    bumpMap: brushedSurface, bumpScale: .0012,
  })
  const edgeMetal = new THREE.MeshStandardMaterial({ color: '#768491', metalness: .92, roughness: .24 })
  const cutMetal = new THREE.MeshStandardMaterial({ color: '#45505b', metalness: .85, roughness: .38 })
  const rimMetal = new THREE.MeshStandardMaterial({ color: '#c2a469', metalness: .95, roughness: .23 })
  const tabMetal = new THREE.MeshPhysicalMaterial({ color: '#a9b6c2', metalness: .96, roughness: .29, envMapIntensity: .65, bumpMap: brushedSurface, bumpScale: .0006 })

  // Rolled double seam and recessed countersink, with an actual sloping wall.
  const profile = [[.566,.025],[.553,.017],[.542,.003],[.531,-.021],[.521,-.036],[.511,-.040],[.501,-.031],[.492,-.022],[.479,-.020],[.471,-.026]]
  const rimGeometry = new THREE.LatheGeometry(profile.map(([x,y]) => new THREE.Vector2(x,y)), 96)
  const rim = new THREE.Mesh(rimGeometry, aluminium)
  rim.receiveShadow = true
  group.add(rim)
  torus(group, .566, .016, .024, rimMetal)
  torus(group, .550, .004, .012, edgeMetal)
  torus(group, .511, .0035, -.035, cutMetal)
  torus(group, .478, .003, -.023, aluminium)

  // The aperture is a real hole in the metal, with bevelled cut edges.
  const panelShape = new THREE.Shape()
  panelShape.absarc(0, 0, .474, 0, Math.PI * 2, false)
  panelShape.holes.push(aperture())
  const panel = layFlat(new THREE.Mesh(new THREE.ExtrudeGeometry(panelShape, {
    depth: .008, bevelEnabled: true, bevelSize: .0018,
    bevelThickness: .0015, bevelSegments: 2, curveSegments: 24,
  }), [aluminium, edgeMetal]), -.034)
  panel.name = 'perforated-lid'
  group.add(panel)

  // Dark interior sits below the plate. The scored flap remains attached and
  // folds inside the can instead of abruptly vanishing when the tab is lifted.
  const interior = layFlat(new THREE.Mesh(new THREE.CircleGeometry(.465, 96), new THREE.MeshStandardMaterial({ color: '#030506', roughness: .95 })), -.17)
  group.add(interior)
  const flapPivot = new THREE.Group()
  flapPivot.position.set(0, -.027, .083)
  const flapGeometry = new THREE.ExtrudeGeometry(aperture(THREE.Shape), { depth: .006, bevelEnabled: false, curveSegments: 24 })
  flapGeometry.translate(0, .083, 0)
  flapGeometry.scale(.975, .975, 1)
  const flap = layFlat(new THREE.Mesh(flapGeometry, [aluminium, cutMetal]), 0)
  flap.name = 'attached-opening-flap'
  flap.castShadow = true
  flapPivot.add(flap)
  group.add(flapPivot)

  const tab = new THREE.Group()
  tab.position.set(0, -.004, -.016)
  group.add(tab)
  const outline = new THREE.Shape()
  outline.moveTo(-.064, -.137)
  outline.quadraticCurveTo(-.116, -.14, -.121, -.070)
  outline.lineTo(-.132, .10)
  outline.bezierCurveTo(-.168, .19, -.157, .30, -.082, .332)
  outline.quadraticCurveTo(0, .367, .082, .332)
  outline.bezierCurveTo(.157, .30, .168, .19, .132, .10)
  outline.lineTo(.121, -.070)
  outline.quadraticCurveTo(.116, -.14, .064, -.137)
  outline.closePath()
  const fingerHole = new THREE.Path()
  fingerHole.absellipse(0, .223, .087, .094, 0, Math.PI * 2, true)
  const rivetHole = new THREE.Path()
  rivetHole.absellipse(0, 0, .033, .038, 0, Math.PI * 2, true)
  outline.holes.push(fingerHole, rivetHole)
  const pull = layFlat(new THREE.Mesh(new THREE.ExtrudeGeometry(outline, {
    depth: .011, bevelEnabled: true, bevelSize: .0035,
    bevelThickness: .003, bevelSegments: 2, curveSegments: 24,
  }), [tabMetal, edgeMetal]), 0)
  pull.castShadow = true
  pull.name = 'pull-tab'
  tab.add(pull)
  // The rolled inner lip catches a thin highlight around the finger opening.
  const lipCurve = new THREE.EllipseCurve(0, .223, .089, .096, 0, Math.PI * 2)
  const lipPath = new THREE.CatmullRomCurve3(lipCurve.getPoints(80).map(({x,y}) => new THREE.Vector3(x, .012, -y)), true)
  tab.add(new THREE.Mesh(new THREE.TubeGeometry(lipPath, 80, .0025, 6, true), aluminium))

  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(.029, .034, .018, 48), tabMetal)
  rivet.position.set(0, .005, -.016)
  rivet.castShadow = true
  group.add(rivet)
  const rivetCrown = new THREE.Mesh(new THREE.SphereGeometry(.030, 32, 16), aluminium)
  rivetCrown.scale.y = .18
  rivetCrown.position.set(0, .015, -.016)
  group.add(rivetCrown)

  // Shallow pressed arc behind the handle, rather than another decorative ring.
  const embossCurve = new THREE.EllipseCurve(0, -.15, .26, .26, .2, Math.PI - .2)
  const embossPath = new THREE.CatmullRomCurve3(embossCurve.getPoints(64).map(({x,y}) => new THREE.Vector3(x, -.022, -y)))
  group.add(new THREE.Mesh(new THREE.TubeGeometry(embossPath, 64, .002, 6, false), edgeMetal))

  return {
    group, tab,
    update(open) {
      // The handle lifts first; its nose then presses the scored flap down.
      const lift = THREE.MathUtils.smoothstep(open, 0, .65)
      const settle = THREE.MathUtils.smoothstep(open, .7, 1)
      tab.rotation.x = lift * .95 - settle * .89
      flapPivot.rotation.x = THREE.MathUtils.smoothstep(open, .15, .85) * 1.3
    },
  }
}
