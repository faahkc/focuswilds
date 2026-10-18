import * as THREE from 'three'
import { camp, courtyardDebris, courtyardHeight, courtyardPavers, courtyardRightEdge, courtyardTerrain, fireFrame, fortCamera, fortStairs, seededRandom, sceneRenderSize, stairPosition, survivorFrame, survivorPose, titleFraming } from './fort-layout'
import shelterUrl from '@/assets/title-shelter.webp'
import archUrl from '@/assets/title-arch.webp'
import suppliesUrl from '@/assets/title-supplies.webp'
import valleyUrl from '@/assets/title-valley.webp'
import peopleUrl from '@/assets/title-survivors.webp'
import stoneUrl from '@/assets/title-stone.webp'
import masonryUrl from '@/assets/title-masonry.webp'
import bannerUrl from '@/assets/title-banner.webp'
import fireUrl from '@/assets/title-fire.webp'
import backWallUrl from '@/assets/title-back-wall.webp'
import backWallPhoneUrl from '@/assets/title-back-wall-phone.webp'
import shelterPhoneUrl from '@/assets/title-shelter-phone.webp'
import archPhoneUrl from '@/assets/title-arch-phone.webp'
import valleyPhoneUrl from '@/assets/title-valley-phone.webp'

type Status = (status: 'loading' | 'ready' | 'fallback') => void

export function createFortRenderer(host: HTMLDivElement, status: Status) {
  const canvas = document.createElement('canvas')
  canvas.className = 'title-canvas'
  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' }) }
  catch { status('fallback'); return () => {} }
  host.append(canvas)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#16171b')
  const camera = new THREE.PerspectiveCamera(22, 1, .1, 150)
  const random = seededRandom(1826)
  const textures = new Set<THREE.Texture>()
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const geometry = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value }
  const material = <T extends THREE.Material>(value: T) => { materials.add(value); return value }
  let disposed = false, lost = false, assetsReady = false, frame = 0, elapsed = 0, lastTime = 0, accumulator = 0
  let lowQuality = false, slowFrames = 0, samples = 0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.debug.onShaderError = () => { throw new Error('The courtyard shader could not compile.') }
  const manager = new THREE.LoadingManager()
  const assetTimeout = window.setTimeout(() => { if (!disposed && !assetsReady) fail() }, 20000)
  manager.onLoad = () => {
    if (disposed || failedAsset) return
    window.clearTimeout(assetTimeout)
    assetsReady = true
    if (lost) return
    try { render(0); status('ready'); resume() } catch { fail() }
  }
  manager.onError = () => { if (!disposed) { failedAsset = true; fail() } }
  let failedAsset = false
  const loader = new THREE.TextureLoader(manager)
  function texture(url: string, pixel = false) {
    const value = loader.load(url)
    value.colorSpace = THREE.SRGBColorSpace
    value.magFilter = pixel ? THREE.NearestFilter : THREE.LinearFilter
    value.minFilter = pixel ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter
    textures.add(value)
    return value
  }
  const phone = Math.min(host.clientWidth, host.clientHeight) < 600
  const shelterMap = texture(phone ? shelterPhoneUrl : shelterUrl), archMap = texture(phone ? archPhoneUrl : archUrl)
  const valleyMap = texture(phone ? valleyPhoneUrl : valleyUrl)
  const suppliesMap = texture(suppliesUrl)
  const peopleMap = texture(peopleUrl, true), stoneMap = texture(stoneUrl)
  const masonryMap = texture(masonryUrl)
  masonryMap.wrapS = masonryMap.wrapT = THREE.RepeatWrapping
  const bannerMap = texture(bannerUrl), fireMap = texture(fireUrl, true)
  const backWallMap = texture(phone ? backWallPhoneUrl : backWallUrl)
  fireMap.repeat.set(1 / 3, .5)
  stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping
  stoneMap.repeat.set(8, 3.2)
  const ground = material(new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap, bumpScale: .04, color: '#bcbcc0', roughness: .72, emissiveMap: stoneMap, emissive: '#ffffff', emissiveIntensity: .38 }))
  const sideStoneMap = masonryMap.clone()
  sideStoneMap.repeat.set(5, .4); textures.add(sideStoneMap)
  const masonry = material(new THREE.MeshStandardMaterial({ map: sideStoneMap, color: '#a0a0a4', roughness: 1, emissiveMap: sideStoneMap, emissive: '#ffffff', emissiveIntensity: .1 }))
  const box = geometry(new THREE.BoxGeometry(1, 1, 1))
  function solid(name: string, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, w: number, h: number, d: number) {
    const mesh = new THREE.Mesh(box, mat)
    mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(w, h, d)
    mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh)
    return mesh
  }
  // The terrace, stair treads and parapets are actual geometry, independent of the detailed object cards.
  const stairTopMap = stoneMap.clone(), stairSideMap = masonryMap.clone()
  stairTopMap.repeat.set(1, 1); stairSideMap.repeat.set(1, 1)
  textures.add(stairTopMap); textures.add(stairSideMap)
  const stairTop = material(ground.clone()), stairSide = material(masonry.clone())
  stairTop.map = stairTop.emissiveMap = stairTopMap
  stairTop.bumpMap = stairTopMap
  stairSide.map = stairSide.emissiveMap = stairSideMap
  stairTop.emissiveIntensity = .4; stairSide.emissiveIntensity = .2
  const stairMaterials = [stairSide, stairSide, stairTop, stairSide, stairSide, stairSide]
  function stoneUV(mesh: THREE.Mesh, width: number, height: number, depth: number) {
    mesh.geometry = geometry(box.clone())
    const uv = mesh.geometry.getAttribute('uv')
    for (let vertex = 0; vertex < uv.count; vertex++) {
      const face = Math.floor(vertex / 4)
      uv.setXY(vertex, uv.getX(vertex) * (face < 2 ? depth : width) / 2.5, uv.getY(vertex) * (face === 2 || face === 3 ? depth : height) / 2.5)
    }
  }
  const foundationMap = sideStoneMap.clone(); foundationMap.repeat.set(5, 8); textures.add(foundationMap)
  const foundationStone = material(masonry.clone()); foundationStone.map = foundationStone.emissiveMap = foundationMap
  const terrain = courtyardTerrain(), terrainGeometry = geometry(new THREE.BufferGeometry())
  terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrain.positions, 3))
  terrainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(terrain.uvs, 2)); terrainGeometry.setIndex(terrain.indices)
  terrainGeometry.addGroup(0, terrain.topIndexCount, 0)
  terrainGeometry.addGroup(terrain.topIndexCount, terrain.indices.length - terrain.topIndexCount, 1)
  terrainGeometry.computeVertexNormals()
  const hillside = new THREE.Mesh(terrainGeometry, [ground, foundationStone])
  hillside.name = 'continuous-fort-hillside'; hillside.receiveShadow = true; scene.add(hillside)
  for (let i = 0; i < fortStairs.count; i++) {
    const { x, y: top, z } = stairPosition(i), tread = fortStairs.run + .08
    const step = solid(`stair-${i}`, stairMaterials, x, (top - 1.8) / 2, z, fortStairs.width, top + 1.8, tread)
    step.rotation.y = fortStairs.yaw
    // Keep stone size constant across risers of different total heights.
    stoneUV(step, fortStairs.width, top + 1.8, tread)
  }
  const landing = stairPosition(fortStairs.count + 1)
  const lowerWalk = solid('lower-stone-walk', stairMaterials, landing.x, landing.y - .5, landing.z, 9, 1, 3.6)
  stoneUV(lowerWalk, 9, 1, 3.6)
  lowerWalk.rotation.y = fortStairs.yaw
  const upperLanding = stairPosition(-2)
  const stairLanding = solid('upper-stair-landing', stairMaterials, upperLanding.x, (camp.floor - 1.8) / 2, upperLanding.z, fortStairs.width, camp.floor + 1.8, .8)
  stoneUV(stairLanding, fortStairs.width, camp.floor + 1.8, .8)
  stairLanding.rotation.y = fortStairs.yaw
  const parapetMap = stoneMap.clone(); parapetMap.repeat.set(.2, .25); textures.add(parapetMap)
  const parapetStone = material(masonry.clone()); parapetStone.map = parapetStone.emissiveMap = parapetMap
  const pavingOutline = new THREE.Shape()
  pavingOutline.moveTo(-.45, -.3); pavingOutline.lineTo(.35, -.34); pavingOutline.lineTo(.47, -.2)
  pavingOutline.lineTo(.44, .25); pavingOutline.lineTo(.3, .33); pavingOutline.lineTo(-.4, .3); pavingOutline.lineTo(-.49, .1); pavingOutline.closePath()
  const pavingShape = geometry(new THREE.ExtrudeGeometry(pavingOutline, { depth: .04, steps: 1, bevelEnabled: true, bevelSize: .025, bevelThickness: .01, bevelSegments: 1 }))
  pavingShape.rotateX(-Math.PI / 2)
  const pavingStone = material(parapetStone.clone()); pavingStone.color.set('#ccccd0'); pavingStone.emissiveIntensity = .26
  pavingStone.bumpMap = parapetMap; pavingStone.bumpScale = .03; pavingStone.roughness = .75
  const pavers = new THREE.InstancedMesh(pavingShape, pavingStone, 1596)
  pavers.name = 'worn-courtyard-paving'; pavers.receiveShadow = pavers.castShadow = true; scene.add(pavers)
  const pavingTransform = new THREE.Object3D()
  const paving = courtyardPavers()
  pavers.count = paving.length
  paving.forEach(({ x, y, z, turn }, i) => {
    pavingTransform.position.set(x, y - .02, z); pavingTransform.rotation.set(0, turn, 0); pavingTransform.scale.set(.58, .85 + random() * .3, .72)
    pavingTransform.updateMatrix(); pavers.setMatrixAt(i, pavingTransform.matrix)
  })
  pavers.instanceMatrix.needsUpdate = true; pavers.computeBoundingSphere()
  const treadStone = material(pavingStone.clone()); treadStone.emissiveIntensity = .45
  treadStone.map = treadStone.emissiveMap = treadStone.bumpMap = stairTopMap
  const treadStones = new THREE.InstancedMesh(pavingShape, treadStone, fortStairs.count * 8)
  treadStones.name = 'chipped-stair-treads'; treadStones.castShadow = treadStones.receiveShadow = true
  scene.add(treadStones)
  for (let row = 0; row < fortStairs.count; row++) {
    const point = stairPosition(row)
    for (let column = 0; column < 8; column++) {
      const across = (column - 3.5) * .59
      pavingTransform.position.set(point.x + Math.cos(fortStairs.yaw) * across, point.y - .02, point.z - Math.sin(fortStairs.yaw) * across)
      pavingTransform.rotation.set(0, fortStairs.yaw + (random() - .5) * .08, 0)
      pavingTransform.scale.set(.59, 2, .38)
      pavingTransform.updateMatrix(); treadStones.setMatrixAt(row * 8 + column, pavingTransform.matrix)
    }
  }
  const wallMap = masonryMap.clone(); wallMap.repeat.set(1, 1); textures.add(wallMap)
  const wallStone = material(masonry.clone()); wallStone.map = wallStone.emissiveMap = wallMap
  wallStone.bumpMap = wallMap; wallStone.bumpScale = .12; wallStone.emissiveIntensity = .2
  const blockMap = masonryMap.clone(); blockMap.repeat.set(.14, .14); blockMap.offset.set(.2, .38); textures.add(blockMap)
  const blockStone = material(new THREE.MeshStandardMaterial({ map: blockMap, bumpMap: blockMap, bumpScale: .035, color: '#b8b8bf', roughness: .85, emissiveMap: blockMap, emissive: '#ffffff', emissiveIntensity: .14 }))
  const blockShape = geometry(new THREE.ExtrudeGeometry(pavingOutline, { depth: .45, steps: 1, bevelEnabled: true, bevelSize: .055, bevelThickness: .035, bevelSegments: 1 }))
  blockShape.rotateX(-Math.PI / 2); blockShape.center()
  const wallBlocks = new THREE.InstancedMesh(blockShape, blockStone, 2048)
  wallBlocks.name = 'chipped-fort-masonry'; wallBlocks.castShadow = wallBlocks.receiveShadow = true; scene.add(wallBlocks)
  // Render physical occluders after the seated cards, preserving their actual depth test.
  wallBlocks.renderOrder = 6
  let wallBlockCount = 0
  function masonryRun(a: THREE.Vector3, b: THREE.Vector3, thickness: number) {
    const length = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(-(b.z - a.z), b.x - a.x)
    const base = Math.min(courtyardHeight(a.x, a.z), courtyardHeight(b.x, b.z)) - .8
    const bodyTop = Math.min(a.y, b.y) - 1.5
    if (bodyTop > base) {
      const body = solid('continuous-masonry-body', wallStone, (a.x + b.x) / 2, (base + bodyTop) / 2, (a.z + b.z) / 2, length, bodyTop - base, thickness)
      body.rotation.y = yaw; body.renderOrder = 6
      stoneUV(body, length, bodyTop - base, thickness)
    }
    const columns = Math.ceil(length / .6)
    for (let column = 0; column < columns; column++) {
      const fraction = (column + .5) / columns, top = THREE.MathUtils.lerp(a.y, b.y, fraction) + random() * .15
      for (let y = base + .18; y < top; y += .33) {
        if (wallBlockCount >= wallBlocks.instanceMatrix.count) throw new Error('Fort masonry capacity exceeded.')
        pavingTransform.position.lerpVectors(a, b, fraction); pavingTransform.position.y = y
        pavingTransform.rotation.set((random() - .5) * .06, yaw + (random() - .5) * .1, (random() - .5) * .04)
        pavingTransform.scale.set(length / columns * .96, .62 + random() * .07, thickness / .75 * (.85 + random() * .3))
        pavingTransform.updateMatrix(); wallBlocks.setMatrixAt(wallBlockCount, pavingTransform.matrix)
        wallBlocks.setColorAt(wallBlockCount++, new THREE.Color().setScalar(.72 + random() * .25))
      }
    }
  }
  const leftWall = [[-6, 10.5, 16], [-2.02, 9.16, 15.18], [-.86, 8.08, 14.86], [.76, 7.48, 15.57], [2, 6.88, 15.44]].map(([x, y, z]) => new THREE.Vector3(x, y, z))
  for (let i = 1; i < leftWall.length; i++) masonryRun(leftWall[i - 1], leftWall[i], 1.15)
  masonryRun(new THREE.Vector3(-18, 10, -5), new THREE.Vector3(-18, 8.5, 4), 1.4)
  masonryRun(new THREE.Vector3(8.2, 6.2, 14), new THREE.Vector3(11.2, 6.5, 14), 1.5)
  masonryRun(new THREE.Vector3(11.2, 6.5, 14), new THREE.Vector3(11.2, 6, 16), 1.5)
  const terraceEdge = (across: number) => new THREE.Vector3(camp.stairX + Math.cos(fortStairs.yaw) * across, camp.floor, fortStairs.z - Math.sin(fortStairs.yaw) * across)
  masonryRun(terraceEdge(-8), terraceEdge(-fortStairs.width / 2 - .35), .65)
  for (const side of [-1, 1]) {
    for (let i = 0; i < fortStairs.count; i++) {
      const point = stairPosition(i), across = side * (fortStairs.width / 2 + .3)
      pavingTransform.position.set(point.x + Math.cos(fortStairs.yaw) * across, point.y + .1, point.z - Math.sin(fortStairs.yaw) * across)
      pavingTransform.rotation.set((random() - .5) * .15, fortStairs.yaw + (random() - .5) * .4, (random() - .5) * .12)
      pavingTransform.scale.set(.9 + random() * .15, 1.1 + random() * .3, .9 + random() * .15)
      pavingTransform.updateMatrix(); wallBlocks.setMatrixAt(wallBlockCount, pavingTransform.matrix)
      wallBlocks.setColorAt(wallBlockCount++, new THREE.Color().setScalar(.8 + random() * .15))
    }
  }
  for (const { x, y, z, turn, width, height, depth } of courtyardDebris()) {
    pavingTransform.position.set(x, y + height / 2 - .03, z); pavingTransform.rotation.set(.08, turn, -.1)
    pavingTransform.scale.set(width, height / .45, depth / .65); pavingTransform.updateMatrix()
    wallBlocks.setMatrixAt(wallBlockCount, pavingTransform.matrix)
    wallBlocks.setColorAt(wallBlockCount++, new THREE.Color('#bdbbc0'))
  }
  const timberMap = suppliesMap.clone(); timberMap.repeat.set(.16, .38); timberMap.offset.set(.69, .16); textures.add(timberMap)
  const timber = material(new THREE.MeshStandardMaterial({ map: timberMap, color: '#8b7d75', roughness: .95 }))
  const railShape = geometry(new THREE.CylinderGeometry(.035, .05, 1, 5))
  const postShape = geometry(new THREE.CylinderGeometry(.025, .07, 1, 5))
  function timberSpan(name: string, a: THREE.Vector3, b: THREE.Vector3, shape = railShape) {
    const delta = b.clone().sub(a), length = delta.length()
    if (!(length > 0 && Number.isFinite(length))) throw new Error('Invalid perimeter timber.')
    const mesh = new THREE.Mesh(shape, timber); mesh.name = name
    mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.scale.y = length
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.divideScalar(length))
    mesh.castShadow = true; scene.add(mesh)
    return mesh
  }
  const table = new THREE.Group()
  table.name = 'hearth-side-table'; table.position.set(-3.35, courtyardHeight(-3.35, 4.6), 4.6); table.rotation.y = fortStairs.yaw
  scene.add(table)
  const tableMaterial = material(timber.clone()); tableMaterial.emissiveMap = timberMap; tableMaterial.emissive.set('#c2b9b5'); tableMaterial.emissiveIntensity = .4
  const tableParts = [
    [0, .65, 0, 1.3, .1, .65],
    [-.53, .31, -.23, .1, .62, .1], [.53, .31, -.23, .1, .62, .1],
    [-.53, .31, .23, .1, .62, .1], [.53, .31, .23, .1, .62, .1],
    [0, .2, .23, 1.1, .1, .08], [0, .43, .23, 1.1, .1, .08], [0, .2, -.23, 1.1, .1, .08],
  ]
  const tableWood = new THREE.InstancedMesh(box, tableMaterial, tableParts.length)
  tableWood.name = 'weathered-table-boards'; tableWood.castShadow = tableWood.receiveShadow = true; tableWood.renderOrder = 6
  tableParts.forEach(([x, y, z, width, height, depth], i) => {
    pavingTransform.position.set(x, y, z); pavingTransform.rotation.set(0, 0, 0); pavingTransform.scale.set(width, height, depth)
    pavingTransform.updateMatrix(); tableWood.setMatrixAt(i, pavingTransform.matrix)
  })
  tableWood.computeBoundingSphere(); table.add(tableWood)
  const stake = timberSpan('near-terrace-stake', new THREE.Vector3(-3.868, courtyardHeight(-3.868, 5.155) - .05, 5.155), new THREE.Vector3(-4.01, 2.1, 5.055), postShape)
  stake.scale.x = stake.scale.z = 1.5; stake.renderOrder = 6; stake.material = tableMaterial
  const tableBrace = timberSpan('table-leaning-brace', new THREE.Vector3(-3.75, courtyardHeight(-3.75, 5.2), 5.2), new THREE.Vector3(-3.55, table.position.y + .65, 4.65))
  tableBrace.renderOrder = 6; tableBrace.material = tableMaterial
  const cupMaterial = material(new THREE.MeshStandardMaterial({ color: '#484044', roughness: .8, metalness: .15 }))
  const cupShape = geometry(new THREE.CylinderGeometry(.12, .1, .26, 10, 1, true))
  const cupHandle = geometry(new THREE.TorusGeometry(.075, .018, 5, 10))
  const cupRim = geometry(new THREE.TorusGeometry(.12, .013, 5, 10))
  const cupInside = geometry(new THREE.CircleGeometry(.105, 10))
  const cupDark = material(new THREE.MeshBasicMaterial({ color: '#0e0d10', side: THREE.DoubleSide }))
  for (const [x, z, scale] of [[-.28, -.08, 1], [.35, .04, .75]]) {
    const cup = new THREE.Mesh(cupShape, cupMaterial); cup.name = 'table-cup'; cup.position.set(x, .7 + .13 * scale, z); cup.scale.setScalar(scale)
    const rim = new THREE.Mesh(cupRim, cupMaterial); rim.position.y = .13; rim.rotation.x = -Math.PI / 2
    const handle = new THREE.Mesh(cupHandle, cupMaterial); handle.position.x = .145
    const inside = new THREE.Mesh(cupInside, cupDark); inside.position.y = .11; inside.rotation.x = -Math.PI / 2
    cup.add(rim, handle, inside)
    for (const part of [cup, rim, handle, inside]) { part.castShadow = part.receiveShadow = true; part.renderOrder = 6 }
    table.add(cup)
  }
  let previousPost: THREE.Vector3 | undefined
  for (let i = 0; i < 11; i++) {
    const z = -4 + i * 1.7, x = courtyardRightEdge(z) - .25, floor = courtyardHeight(x, z)
    const post = new THREE.Vector3(x, floor + .4, z)
    if (previousPost) {
      masonryRun(previousPost, post, .55)
      for (const height of [.75, 1.55]) {
        timberSpan('perimeter-timber-rail', previousPost.clone().add(new THREE.Vector3(0, height, 0)), post.clone().add(new THREE.Vector3(0, height + Math.sin(i * 2) * .08, 0)))
      }
    }
    const tip = new THREE.Vector3(x + Math.sin(i * 3) * .07, post.y + 1.85 + Math.sin(i * 7) * .15, z)
    timberSpan('perimeter-timber-post', new THREE.Vector3(x, floor - .1, z), tip, postShape)
    timberSpan('perimeter-timber-fork', tip.clone().add(new THREE.Vector3(0, -.42, 0)), tip.clone().add(new THREE.Vector3(.15, -.12, .08)))
    previousPost = post
  }
  const pennantEnds = [new THREE.Vector3(.55, courtyardHeight(.55, -2.5) + 3.05, -2.5), new THREE.Vector3(2, courtyardHeight(2, -1.8) + 2.1, -1.8)]
  const archTimber = material(timber.clone()); archTimber.depthTest = false
  archTimber.emissiveMap = timberMap; archTimber.emissive.set('#a49d9a'); archTimber.emissiveIntensity = .65
  const archTie = (mesh: THREE.Mesh) => { mesh.material = archTimber; mesh.renderOrder = 5 }
  pennantEnds.forEach((tip, i) => {
    archTie(timberSpan('arch-pennant-post', new THREE.Vector3(tip.x, courtyardHeight(tip.x, tip.z) - .1, tip.z), tip.clone().add(new THREE.Vector3(0, .25, 0)), postShape))
    archTie(timberSpan('arch-pennant-fork', tip.clone().add(new THREE.Vector3(0, -.15, 0)), tip.clone().add(new THREE.Vector3(i ? -.16 : .16, .18, .04))))
  })
  archTie(timberSpan('arch-pennant-cord', pennantEnds[0], pennantEnds[1]))
  const pennantOutline = [[0, 0], [.18, -.14], [.46, -.2], [.76, -.15], [1, 0], [.95, -.3], [.88, -.25], [.81, -.75], [.75, -.33], [.68, -.87], [.6, -.9], [.57, -.3], [.5, -.63], [.42, -.42], [.35, -.81], [.3, -.65], [.25, -.3], [.18, -.55], [.12, -.35], [.09, -.26]]
  const pennantShape = geometry(new THREE.ShapeGeometry(new THREE.Shape(pennantOutline.map(([x, y]) => new THREE.Vector2(x, y)))))
  const pennantPositions = pennantShape.getAttribute('position'), pennantRest = Float32Array.from(pennantPositions.array)
  const pennantDelta = pennantEnds[1].clone().sub(pennantEnds[0])
  const pennantNormal = new THREE.Vector3(-pennantDelta.z, 0, pennantDelta.x).normalize()
  // Rear arch artwork includes opaque stone; foreground ties share the actors' layer, below physical masonry.
  const pennant = new THREE.Mesh(pennantShape, material(new THREE.MeshStandardMaterial({ map: bannerMap, alphaTest: .35, color: '#afa0a0', emissiveMap: bannerMap, emissive: '#ffffff', emissiveIntensity: .7, roughness: 1, side: THREE.DoubleSide, depthTest: false })))
  pennant.renderOrder = 5
  pennant.name = 'arch-tattered-pennants'; pennant.castShadow = true; pennant.receiveShadow = true; scene.add(pennant)
  // World-space vertices keep both ties attached while the torn lower edge moves.
  for (let i = 0; i < pennantPositions.count; i++) {
    const x = pennantRest[i * 3], y = pennantRest[i * 3 + 1]
    const point = pennantEnds[0].clone().addScaledVector(pennantDelta, x); point.y += y
    if (!point.toArray().every(Number.isFinite)) throw new Error('Invalid perimeter cloth.')
    pennantPositions.setXYZ(i, point.x, point.y, point.z)
    pennantShape.getAttribute('uv').setXY(i, .2 + x * .6, .92 + y * .25)
  }
  pennantShape.computeVertexNormals(); pennantShape.computeBoundingSphere()
  pennantShape.boundingSphere!.radius += .1
  if (wallBlockCount > wallBlocks.instanceMatrix.count) throw new Error('Fort masonry capacity exceeded.')
  wallBlocks.count = wallBlockCount; wallBlocks.computeBoundingSphere()
  const cardPitch = -Math.atan2(fortCamera.y, Math.hypot(fortCamera.x, fortCamera.z)), cardYaw = Math.atan2(fortCamera.x, fortCamera.z)
  const cardRotation = new THREE.Euler(cardPitch, cardYaw, 0, 'YXZ')
  const cardUp = new THREE.Vector3(0, 1, 0).applyEuler(cardRotation)
  const cardRight = new THREE.Vector3(1, 0, 0).applyEuler(cardRotation)
  const branchChains = [
    [[-180, 1900, 25], [-160, 1100, 22], [-120, 760, 18], [-45, 375, 15], [20, 245, 13], [75, 160, 10], [130, 62, 8], [155, -45, 4]],
    [[65, 175, 9], [145, 130, 6], [204, 36, 4], [225, -35, 2]],
    [[117, 90, 6], [35, 50, 4], [-20, -20, 2]],
    [[1700, 1030, 7], [1630, 890, 6], [1580, 790, 4], [1535, 675, 2]],
    [[1600, 830, 4], [1665, 745, 2], [1680, 680, 1]],
    [[1570, 765, 3], [1510, 730, 2], [1480, 655, 1]],
  ]
  const branches = new THREE.InstancedMesh(geometry(new THREE.CylinderGeometry(.85, 1, 1, 5)), material(new THREE.MeshBasicMaterial({ color: '#030405' })), branchChains.reduce((count, chain) => count + chain.length - 1, 0))
  branches.name = 'near-bare-branches'; branches.renderOrder = 6; scene.add(branches)
  const forward = new THREE.Vector3(-fortCamera.x, -fortCamera.y, -fortCamera.z).normalize()
  const cameraOrigin = new THREE.Vector3(fortCamera.x - .8, fortCamera.y + 1.7, fortCamera.z)
  const branchDepth = 18, focusDepth = new THREE.Vector3(camp.fireX, camp.floor + 1, camp.fireZ).sub(cameraOrigin).dot(forward)
  const branchPixel = 14.5 * branchDepth / focusDepth / 941
  const branchPoint = ([x, y]: number[]) => cameraOrigin.clone().addScaledVector(forward, branchDepth).addScaledVector(cardRight, (x - 836) * branchPixel).addScaledVector(cardUp, (470.5 - y) * branchPixel)
  let branchIndex = 0
  for (const [chainIndex, chain] of branchChains.entries()) {
    for (let i = 1; i < chain.length; i++) {
      const a = branchPoint(chain[i - 1]), b = branchPoint(chain[i])
      if (chainIndex === 0 && i === 1) a.y = courtyardHeight(a.x, a.z) - .4
      const delta = b.clone().sub(a), length = delta.length()
      if (!(length > 0 && Number.isFinite(length))) throw new Error('Invalid foreground branch.')
      const radius = (chain[i - 1][2] + chain[i][2]) / 2 * branchPixel
      pavingTransform.position.copy(a).add(b).multiplyScalar(.5)
      pavingTransform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.divideScalar(length))
      pavingTransform.scale.set(radius, length, radius); pavingTransform.updateMatrix()
      branches.setMatrixAt(branchIndex++, pavingTransform.matrix)
    }
  }
  function placeCard(mesh: THREE.Mesh, x: number, y: number, z: number, h: number, scale = 1) {
    mesh.scale.setScalar(scale)
    mesh.position.set(x, y, z).addScaledVector(cardUp, h * scale / 2)
  }
  function card(name: string, map: THREE.Texture, x: number, y: number, z: number, w: number, h: number, lit = true) {
    const mat = lit
      ? material(new THREE.MeshStandardMaterial({ map, transparent: false, alphaTest: .35, side: THREE.DoubleSide, roughness: 1, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .3 }))
      : material(new THREE.MeshBasicMaterial({ map, alphaTest: .35, side: THREE.DoubleSide, toneMapped: false }))
    const mesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(w, h)), mat)
    mesh.name = name; mesh.rotation.copy(cardRotation)
    placeCard(mesh, x, y, z, h)
    mesh.castShadow = lit; mesh.receiveShadow = lit
    // Custom depth preserves the transparent silhouette in the moon shadow map.
    if (lit) mesh.customDepthMaterial = material(new THREE.MeshDepthMaterial({ map, alphaTest: .35, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }))
    scene.add(mesh)
    return mesh
  }
  const landscape = card('distant-valley', valleyMap, 4, -15, -42, 39.1, 22, false)
  const glintGeometry = geometry(new THREE.BufferGeometry())
  glintGeometry.setAttribute('position', new THREE.Float32BufferAttribute([17.05, 2.7, .02, 17.23, 2.7, .02, 18.35, 2.7, .02, 18.53, 2.7, .02], 3))
  const glints = new THREE.Points(glintGeometry, material(new THREE.PointsMaterial({ color: '#ad3936', size: 2.2, sizeAttenuation: false, transparent: true, opacity: .7, depthWrite: false, toneMapped: false })))
  glints.name = 'distant-forest-glints'; landscape.add(glints)
  landscape.position.set(0, -19, -46)
  landscape.renderOrder = -1
  const shelter = card('occupied-shelter', shelterMap, -8.4, camp.floor, -3, 20, 11.25)
  const backWall = card('shelter-rear-masonry', backWallMap, -11, camp.floor, -3.5, 15, 10)
  if ('emissiveIntensity' in backWall.material) backWall.material.emissiveIntensity = 2.3
  const archRearWall: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial> = card('arch-rear-masonry', backWallMap, -2.1, -1.44, -5.54, 4.14, 11.5)
  const backingOutline = [[-2.07, -5.75], [2.07, -5.75], [2.07, 5.75], [-.25, 5.75], [-.25, 3.7], [-.6, 3.7], [-.6, 2.6], [-1, 2.6], [-1, 1.4], [-1.35, 1.4], [-1.35, .4], [-1.7, .4], [-1.7, -.75], [-2.07, -.75]]
  archRearWall.geometry = geometry(new THREE.ShapeGeometry(new THREE.Shape(backingOutline.map(([x, y]) => new THREE.Vector2(x, y)))))
  const backingPositions = archRearWall.geometry.getAttribute('position')
  const wallUV = archRearWall.geometry.getAttribute('uv')
  for (let i = 0; i < wallUV.count; i++) {
    wallUV.setXY(i, .3 + (backingPositions.getX(i) / 4.14 + .5) * .3, backingPositions.getY(i) / 11.5 + .5)
  }
  if ('emissiveIntensity' in archRearWall.material) archRearWall.material.emissiveIntensity = 2.3
  const arch = card('broken-arch', archMap, 4.8, camp.floor, 3.8, 10.12, 12.8)
  const supplies = card('foreground-supplies', suppliesMap, 0, -1, 6, 3, 1.94)
  const rearCrate = card('rear-supply-crate', suppliesMap, 1.75, courtyardHeight(1.75, 6.8) + .03, 6.8, 1.65, 1.94 * 253 / 262)
  const crateUV = rearCrate.geometry.getAttribute('uv')
  for (let i = 0; i < crateUV.count; i++) crateUV.setXY(i, .45 + crateUV.getX(i) * .55, 9 / 262 + crateUV.getY(i) * 253 / 262)

  const moon = new THREE.DirectionalLight('#e0e2eb', 1.5)
  moon.position.set(15, 22, 14); moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  Object.assign(moon.shadow.camera, { left: -21, right: 18, top: 18, bottom: -15, far: 65 })
  moon.shadow.normalBias = .06
  scene.add(moon, new THREE.HemisphereLight('#b3b5bf', '#262025', .8))
  const hearth = new THREE.PointLight('#d78d7c', 22, 10, 2)
  hearth.position.set(camp.fireX, 1.7, camp.fireZ); scene.add(hearth)
  const people: { mesh: THREE.Mesh; map: THREE.Texture; column: number }[] = []
  const places = [[-2.15, 1.21], [-1.58, -.77], [.86, -1.68], [2.94, -.56]].map(([x, z]) => [camp.fireX + x, camp.fireZ + z])
  places.forEach(([x, z], column) => {
    const map = peopleMap.clone(); textures.add(map)
    map.repeat.set(.25, .25); map.offset.set(column / 4, .75)
    const survivor = card(`seated-survivor-${column}`, map, x, camp.floor + .01, z, 2.05, 2.05)
    // Seated actors belong in front of the rear cutouts' baked shelves and broken wall faces.
    survivor.renderOrder = 5; survivor.material.depthTest = false
    if ('emissiveIntensity' in survivor.material) survivor.material.emissiveIntensity = .28
    people.push({ mesh: survivor, map, column })
    const shadow = new THREE.Mesh(geometry(new THREE.CircleGeometry(.58, 20)), material(new THREE.MeshBasicMaterial({ color: '#08070a', transparent: true, opacity: .45, depthWrite: false })))
    shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .55; shadow.position.set(x, camp.floor + .009, z)
    scene.add(shadow)
  })
  const ring = geometry(new THREE.DodecahedronGeometry(.24, 0))
  for (let i = 0; i < 65; i++) {
    const rock = new THREE.Mesh(ring, parapetStone)
    const z = -5.8 + random() * 9.2, x = -14 + random() * (courtyardRightEdge(z) + 13.5)
    if (Math.abs(x - camp.fireX) < 4 && Math.abs(z - camp.fireZ) < 2.5) continue
    rock.position.set(x, courtyardHeight(x, z) + .08, z); rock.scale.set(.5 + random(), .3 + random() * .4, .5 + random())
    rock.rotation.set(random(), random() * Math.PI, random()); rock.castShadow = rock.receiveShadow = true; scene.add(rock)
  }
  for (let i = 0; i < 9; i++) {
    const angle = i / 9 * Math.PI * 2 + random() * .1
    const rock = new THREE.Mesh(ring, parapetStone)
    const x = camp.fireX + Math.cos(angle) * .55, z = camp.fireZ + Math.sin(angle) * .55
    rock.position.set(x, courtyardHeight(x, z) + .05, z)
    rock.scale.set(.65 + random() * .2, .3 + random() * .15, .6 + random() * .2)
    rock.rotation.y = random() * Math.PI
    rock.castShadow = rock.receiveShadow = true; scene.add(rock)
  }
  const charcoal = material(new THREE.MeshStandardMaterial({ color: '#241c1c', roughness: 1 }))
  const logShape = geometry(new THREE.CylinderGeometry(.09, .12, 1.1, 7))
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(logShape, charcoal)
    log.name = 'fixed-charred-log'; log.position.set(camp.fireX, camp.floor + .12 + i * .025, camp.fireZ + (i - 1) * .1)
    log.rotation.set(Math.PI / 2, 0, i * Math.PI / 3)
    log.castShadow = log.receiveShadow = true; scene.add(log)
  }
  const fire = card('animated-hearth', fireMap, camp.fireX, .86, camp.fireZ, 1.95, 1.95, false)
  fire.material.transparent = true
  fire.material.depthWrite = false
  const iron = material(new THREE.MeshStandardMaterial({ color: '#333035', roughness: .8, metalness: .5 }))
  const rod = geometry(new THREE.CylinderGeometry(.025, .035, 1, 6))
  const fireStand = new THREE.Vector3(camp.fireX - .15, camp.floor, camp.fireZ - .32)
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(rod, iron)
    post.name = 'hearth-iron-post'; post.position.copy(fireStand).addScaledVector(cardRight, side * .68)
    post.position.y += .78; post.scale.y = 1.56; post.castShadow = true; scene.add(post)
  }
  const crossbar = new THREE.Mesh(rod, iron)
  crossbar.name = 'hearth-iron-crossbar'; crossbar.position.copy(fireStand); crossbar.position.y += 1.56
  crossbar.scale.y = 1.55; crossbar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cardRight)
  crossbar.castShadow = true; scene.add(crossbar)
  const glow = new THREE.PointLight('#9d271f', 2, 6, 2)
  glow.position.set(camp.fireX, 1, camp.fireZ + .2); scene.add(glow)

  const clothShape = new THREE.PlaneGeometry(2, 6, 12, 40)
  const clothPositions = clothShape.getAttribute('position')
  const banner = new THREE.Mesh(geometry(clothShape), material(new THREE.MeshStandardMaterial({ map: bannerMap, alphaTest: .35, color: '#c0b7b7', emissiveMap: bannerMap, emissive: '#ffffff', emissiveIntensity: .2, roughness: 1, side: THREE.DoubleSide })))
  banner.position.set(1.1, 9.5, .1); banner.rotation.copy(cardRotation); banner.castShadow = true
  banner.customDepthMaterial = material(new THREE.MeshDepthMaterial({ map: bannerMap, alphaTest: .35, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }))
  scene.add(banner)
  const clothRest = Float32Array.from(clothPositions.array)
  placeCard(shelter, -5.9, camp.floor - .95, 1.8, 11.25, .75)
  placeCard(backWall, -10.4, camp.floor - .4, -2, 10, .98)
  const archX = 1.8, archZ = 1.5, archScale = .82
  placeCard(arch, archX, camp.floor - 1.3, archZ, 12.8, archScale)
  // Keep the outer arch edge registered while clearing the storage bay.
  arch.position.addScaledVector(cardRight, .566)
  banner.scale.set(archScale * .9, archScale, archScale)
  banner.position.set(archX, camp.floor - 1.3, archZ).addScaledVector(cardRight, -archScale).addScaledVector(cardUp, 8.8 * archScale)
  placeCard(supplies, 1.8, courtyardHeight(1.8, 7.56) + .03, 7.56, 1.94, 1.15)
  const puffCanvas = document.createElement('canvas'); puffCanvas.width = puffCanvas.height = 64
  const ctx = puffCanvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32,32,0,32,32,32)
  gradient.addColorStop(0, 'rgba(220,220,225,.3)'); gradient.addColorStop(.5,'rgba(200,200,210,.12)'); gradient.addColorStop(1,'rgba(180,180,190,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64)
  const puffMap = new THREE.CanvasTexture(puffCanvas); textures.add(puffMap)
  const fogMat = material(new THREE.SpriteMaterial({ map: puffMap, color: '#a3a5b0', transparent: true, depthWrite: false, opacity: .55 }))
  const fog = Array.from({ length: 16 }, (_, i) => {
    const puff = new THREE.Sprite(fogMat)
    puff.name = 'valley-mist'; puff.position.set(-25 + random() * 65, -3 + random() * 6, -12 - random() * 25)
    puff.scale.set(14 + random() * 15, 2 + random() * 4, 1); puff.renderOrder = i % 2
    scene.add(puff); return puff
  })
  const smokeMat = material(new THREE.SpriteMaterial({ map: puffMap, color: '#aaa1a0', transparent: true, depthWrite: false, opacity: .65 }))
  const smoke = Array.from({ length: 8 }, () => { const puff = new THREE.Sprite(material(smokeMat.clone())); puff.name = 'hearth-smoke'; scene.add(puff); return puff })
  const sparkCount = 28, sparkPositions = new Float32Array(sparkCount * 3)
  const sparkGeometry = geometry(new THREE.BufferGeometry())
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3))
  const sparks = new THREE.Points(sparkGeometry, material(new THREE.PointsMaterial({ color: '#e7805c', size: 1.5, sizeAttenuation: false, transparent: true, opacity: .8, depthWrite: false })))
  sparks.name = 'rising-embers'; scene.add(sparks)

  const depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType)
  const target = new THREE.WebGLRenderTarget(1, 1, { depthTexture: depth })
  target.texture.generateMipmaps = true; target.texture.minFilter = THREE.LinearMipmapLinearFilter
  const postScene = new THREE.Scene(), postCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1)
  const postMaterial = material(new THREE.ShaderMaterial({
    uniforms: { colorMap: { value: target.texture }, depthMap: { value: depth }, focus: { value: 35 }, near: { value: camera.near }, far: { value: camera.far } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D colorMap,depthMap; uniform float focus,near,far; varying vec2 vUv;
      void main(){float distance=near*far/(far-texture2D(depthMap,vUv).x*(far-near));
      float blur=clamp((focus-distance-5.)/10.,0.,1.)*6.+clamp((distance-focus-8.)/20.,0.,1.)*2.;
      vec4 col=texture2D(colorMap,vUv,log2(max(1.,blur)));
      gl_FragColor=col;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`, depthTest: false, depthWrite: false,
  }))
  postScene.add(new THREE.Mesh(geometry(new THREE.PlaneGeometry(2,2)), postMaterial))
  renderer.info.autoReset = false
  function resize() {
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height || disposed || lost) return
    const framing = titleFraming(width, height)
    camera.position.set(framing.centerX + fortCamera.x, framing.centerY + fortCamera.y, fortCamera.z)
    camera.lookAt(framing.centerX, framing.centerY, 0); camera.updateMatrixWorld()
    const focusDistance = -new THREE.Vector3(camp.fireX, camp.floor + 1, camp.fireZ).applyMatrix4(camera.matrixWorldInverse).z
    camera.aspect = framing.aspect; camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(framing.height / (2 * focusDistance)))
    camera.setViewOffset(width, height, framing.panX / (framing.height * framing.aspect) * width, 0, width, height)
    const landscapeHeight = Math.max(framing.height, framing.height * framing.aspect / (39.1 / 22))
    landscape.scale.setScalar(landscapeHeight / 22 * (Math.hypot(fortCamera.x, fortCamera.y, fortCamera.z) + 65) / focusDistance)
    landscape.position.set(framing.centerX, framing.centerY, 0).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 65)
    landscape.position.addScaledVector(cardRight, framing.panX * (Math.hypot(fortCamera.x, fortCamera.y, fortCamera.z) + 65) / focusDistance)
    const size = sceneRenderSize(width,height,lowQuality)
    renderer.setPixelRatio(1); renderer.setSize(size.width,size.height,false); target.setSize(size.width,size.height)
    postMaterial.uniforms.focus.value = focusDistance
    if (assetsReady) render(0)
  }
  function render(delta: number) {
    if (disposed || lost || failedAsset) return
    elapsed += delta
    const time = elapsed
    hearth.intensity = 22 + Math.sin(time*5)*.65 + Math.sin(time*9)*.25
    glow.intensity = 2 + Math.sin(time*4)*.18
    const flame = fireFrame(time), firePose = flame.pose
    fireMap.offset.set(flame.left / 384, 1 - flame.bottom / 256)
    fireMap.repeat.y = flame.height / 256
    fire.scale.y = flame.height / 128
    const flameHeight = 1.95 * flame.height / 128
    fire.position.set(camp.fireX, camp.floor + .16, camp.fireZ).addScaledVector(cardUp, flameHeight / 2)
    people.forEach(({ mesh, map, column }) => {
      const { top, bottom } = survivorFrame(time, column), height = 2.05 * (bottom - top) / 128
      map.repeat.y = (bottom - top) / 512
      map.offset.y = 1 - bottom / 512
      mesh.scale.y = (bottom - top) / 128
      mesh.position.set(places[column][0], camp.floor + .01, places[column][1]).addScaledVector(cardUp, height / 2)
    })
    for (let i=0;i<clothPositions.count;i++) {
      const freedom = (3-clothRest[i*3+1])/6
      const wave = Math.sin(time*1.4+clothRest[i*3+1]*2)*freedom
      clothPositions.setZ(i, .25 + wave*.15)
      clothPositions.setX(i, clothRest[i*3]+wave*.13)
    }
    clothPositions.needsUpdate = true
    clothShape.computeVertexNormals()
    for (let i = 0; i < pennantPositions.count; i++) {
      const x = pennantRest[i * 3], y = pennantRest[i * 3 + 1]
      const wave = Math.sin(time * 1.4 + x * 5) * -y * .09
      pennantPositions.setXYZ(i, pennantEnds[0].x + pennantDelta.x * x + pennantNormal.x * wave, pennantEnds[0].y + pennantDelta.y * x + y, pennantEnds[0].z + pennantDelta.z * x + pennantNormal.z * wave)
    }
    pennantPositions.needsUpdate = true; pennantShape.computeVertexNormals()
    fog.forEach((puff,i) => { puff.position.x += delta*(.08+i%3*.02); if(puff.position.x>45)puff.position.x=-35 })
    smoke.forEach((puff,i) => {
      const phase=(time*.18+i/smoke.length)%1
      puff.position.set(camp.fireX+Math.sin(phase*4)*.45,1.3+phase*5,camp.fireZ-.15-phase*.3)
      puff.scale.set(1+phase*1.8,1+phase*2.5,1)
      puff.material.opacity = Math.sin(phase*Math.PI)**2*.65
    })
    for(let i=0;i<sparkCount;i++) {
      const phase=(time*(.15+i%4*.02)+i/sparkCount)%1
      sparkPositions[i*3]=camp.fireX+Math.sin(i*21+phase*4)*phase*.7
      sparkPositions[i*3+1]=1.1+phase*3.4
      sparkPositions[i*3+2]=camp.fireZ+Math.cos(i*13)*phase*.6
    }
    sparkGeometry.getAttribute('position').needsUpdate=true
    renderer.info.reset()
    if(lowQuality)renderer.render(scene,camera)
    else { renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera) }
    Object.assign(canvas.dataset,{drawCalls:String(renderer.info.render.calls),triangles:String(renderer.info.render.triangles),quality:lowQuality?'low':'standard',textures:String(renderer.info.memory.textures),geometries:String(renderer.info.memory.geometries),frames:String(Number(canvas.dataset.frames||0)+1),firePose:String(firePose),survivorPose:String(survivorPose(time,0))})
  }
  function fail() { lost=true;window.clearTimeout(assetTimeout);cancelAnimationFrame(frame);status('fallback') }
  function tick(now:number) {
    if(disposed||lost||document.hidden||!assetsReady)return
    const delta=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now
    if(delta>.027)slowFrames++
    if(++samples===150&&slowFrames>50&&!lowQuality) {
      lowQuality=true;moon.shadow.mapSize.set(512,512);moon.shadow.map?.dispose();moon.shadow.map=null
      fog.forEach((puff,i)=>{puff.visible=i%2===0});resize()
    }
    accumulator+=delta
    const interval=lowQuality?1/30:1/60
    if(accumulator>=interval) { try { render(Math.floor(accumulator/interval)*interval) } catch { fail();return };accumulator%=interval }
    frame=requestAnimationFrame(tick)
  }
  function resume() {
    cancelAnimationFrame(frame);lastTime=0;accumulator=0
    if(disposed||lost||!assetsReady)return
    canvas.dataset.motion=document.hidden?'paused':'running'
    if(document.hidden) { try { render(0) } catch { fail() } }
    else frame=requestAnimationFrame(tick)
  }
  function contextLost(event:Event){event.preventDefault();fail()}
  function contextRestored(){if(disposed||failedAsset)return;lost=false;try{resize();if(assetsReady)status('ready');resume()}catch{fail()}}
  const observer=new ResizeObserver(() => { try { resize() } catch { fail() } });observer.observe(host)
  document.addEventListener('visibilitychange',resume)
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored)
  function dispose() {
    if(disposed)return;disposed=true;window.clearTimeout(assetTimeout);cancelAnimationFrame(frame);observer.disconnect()
    manager.onLoad=()=>{};manager.onError=()=>{}
    document.removeEventListener('visibilitychange',resume)
    canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored)
    pavers.dispose(); treadStones.dispose(); wallBlocks.dispose(); branches.dispose(); tableWood.dispose()
    textures.forEach(value=>value.dispose());geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose())
    target.dispose();moon.shadow.dispose();renderer.dispose();canvas.remove()
  }
  try{resize()}catch{dispose();status('fallback')}
  return dispose
}
