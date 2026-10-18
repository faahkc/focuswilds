import * as THREE from 'three'
import { camp, courtyardHeight, courtyardPavers, courtyardRightEdge, courtyardTerrain, fireFrame, fortCamera, seededRandom, sceneRenderSize, stepHeight, survivorFrame, survivorPose, titleFraming } from './fort-layout'
import shelterUrl from '@/assets/title-shelter.webp'
import archUrl from '@/assets/title-arch.webp'
import foregroundUrl from '@/assets/title-foreground.webp'
import valleyUrl from '@/assets/title-valley.webp'
import peopleUrl from '@/assets/title-survivors.webp'
import stoneUrl from '@/assets/title-stone.webp'
import bannerUrl from '@/assets/title-banner.webp'
import fireUrl from '@/assets/title-fire.webp'
import nearWallUrl from '@/assets/title-near-wall.webp'
import backWallUrl from '@/assets/title-back-wall.webp'
import backWallPhoneUrl from '@/assets/title-back-wall-phone.webp'
import shelterPhoneUrl from '@/assets/title-shelter-phone.webp'
import archPhoneUrl from '@/assets/title-arch-phone.webp'
import foregroundPhoneUrl from '@/assets/title-foreground-phone.webp'
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
  const phone = host.getBoundingClientRect().width < 768
  const shelterMap = texture(phone ? shelterPhoneUrl : shelterUrl), archMap = texture(phone ? archPhoneUrl : archUrl)
  const foregroundMap = texture(phone ? foregroundPhoneUrl : foregroundUrl), valleyMap = texture(phone ? valleyPhoneUrl : valleyUrl)
  const peopleMap = texture(peopleUrl, true), stoneMap = texture(stoneUrl)
  const bannerMap = texture(bannerUrl), fireMap = texture(fireUrl, true)
  const nearWallMap = texture(nearWallUrl)
  const backWallMap = texture(phone ? backWallPhoneUrl : backWallUrl)
  fireMap.repeat.set(1 / 3, .5)
  stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping
  stoneMap.repeat.set(8, 3.2)
  const ground = material(new THREE.MeshStandardMaterial({ map: stoneMap, color: '#bcbcc0', roughness: .93, emissiveMap: stoneMap, emissive: '#ffffff', emissiveIntensity: .08 }))
  const sideStoneMap = stoneMap.clone()
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
  const pavedStone = [masonry, masonry, ground, masonry, masonry, masonry]
  const stairTopMap = stoneMap.clone(), stairSideMap = stoneMap.clone()
  stairTopMap.repeat.set(1, 1); stairSideMap.repeat.set(1, 1)
  textures.add(stairTopMap); textures.add(stairSideMap)
  const stairTop = material(ground.clone()), stairSide = material(masonry.clone())
  stairTop.map = stairTop.emissiveMap = stairTopMap
  stairSide.map = stairSide.emissiveMap = stairSideMap
  stairTop.emissiveIntensity = .24; stairSide.emissiveIntensity = .2
  const stairMaterials = [stairSide, stairSide, stairTop, stairSide, stairSide, stairSide]
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
  const stairs: THREE.Mesh[] = []
  for (let i = 0; i < 9; i++) {
    const top = stepHeight(i)
    const step = solid(`stair-${i}`, stairMaterials, camp.stairX, (top - 1.8) / 2, 4.1 + i * .53, 5.4, top + 1.8, .6)
    step.geometry = geometry(box.clone())
    const uv = step.geometry.getAttribute('uv')
    // Keep stone size constant across risers of different total heights.
    for (let vertex = 0; vertex < uv.count; vertex++) {
      const face = Math.floor(vertex / 4)
      const width = face < 2 ? .6 : 5.4, height = face < 2 || face > 3 ? top + 1.8 : .6
      uv.setXY(vertex, uv.getX(vertex) * width / 2.5, uv.getY(vertex) * height / 2.5)
    }
    stairs.push(step)
  }
  const lowerWalk = solid('lower-stone-walk', pavedStone, -1.5, -1.65, 10, 9, 1.3, 4)
  const parapetMap = stoneMap.clone(); parapetMap.repeat.set(.2, .25); textures.add(parapetMap)
  const parapetStone = material(masonry.clone()); parapetStone.map = parapetStone.emissiveMap = parapetMap
  const pavingOutline = new THREE.Shape()
  pavingOutline.moveTo(-.45, -.3); pavingOutline.lineTo(.35, -.34); pavingOutline.lineTo(.47, -.2)
  pavingOutline.lineTo(.44, .25); pavingOutline.lineTo(.3, .33); pavingOutline.lineTo(-.4, .3); pavingOutline.lineTo(-.49, .1); pavingOutline.closePath()
  const pavingShape = geometry(new THREE.ExtrudeGeometry(pavingOutline, { depth: .09, steps: 1, bevelEnabled: true, bevelSize: .04, bevelThickness: .02, bevelSegments: 1 }))
  pavingShape.rotateX(-Math.PI / 2)
  const pavingStone = material(parapetStone.clone()); pavingStone.color.set('#ccccd0'); pavingStone.emissiveIntensity = .18
  const pavers = new THREE.InstancedMesh(pavingShape, pavingStone, 528)
  pavers.name = 'worn-courtyard-paving'; pavers.receiveShadow = pavers.castShadow = true; scene.add(pavers)
  const pavingTransform = new THREE.Object3D()
  for (let i = 0; i < 12; i++) {
    const z = -5 + i * .8
    solid('broken-side-parapet', parapetStone, courtyardRightEdge(z) - .35, camp.floor + .25 + random() * .22, z, .5, .5 + random() * .5, .65)
  }
  const cardPitch = -Math.atan2(fortCamera.y, Math.hypot(fortCamera.x, fortCamera.z)), cardYaw = Math.atan2(fortCamera.x, fortCamera.z)
  const cardRotation = new THREE.Euler(cardPitch, cardYaw, 0, 'YXZ')
  const cardUp = new THREE.Vector3(0, 1, 0).applyEuler(cardRotation)
  const cardRight = new THREE.Vector3(1, 0, 0).applyEuler(cardRotation)
  function placeCard(mesh: THREE.Mesh, x: number, y: number, z: number, h: number, scale = 1) {
    mesh.scale.setScalar(scale)
    mesh.position.set(x, y, z).addScaledVector(cardUp, h * scale / 2)
  }
  function card(name: string, map: THREE.Texture, x: number, y: number, z: number, w: number, h: number, lit = true) {
    const mat = lit
      ? material(new THREE.MeshStandardMaterial({ map, transparent: false, alphaTest: .35, side: THREE.DoubleSide, roughness: 1, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .14 }))
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
  landscape.position.set(0, -19, -46)
  landscape.renderOrder = -1
  const shelter = card('occupied-shelter', shelterMap, -8.4, camp.floor, -3, 20, 11.25)
  const backWall = card('shelter-rear-masonry', backWallMap, -11, camp.floor, -3.5, 15, 10)
  const arch = card('broken-arch', archMap, 4.8, camp.floor, 3.8, 11.5, 12.8)
  const rightRuins = card('right-terrace-ruins', foregroundMap, 7.5, -1.4, 5.3, 10, 4)
  const nearWall = card('near-left-masonry', nearWallMap, -12.7, -3.5, 9, 8.8, 9.4)
  // This close occluder continues below the viewport, across the hillside silhouette.
  nearWall.material.depthTest = false
  nearWall.material.depthWrite = false
  nearWall.renderOrder = 20

  const moon = new THREE.DirectionalLight('#e0e2eb', 1.5)
  moon.position.set(15, 22, 14); moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  Object.assign(moon.shadow.camera, { left: -21, right: 18, top: 18, bottom: -15, far: 65 })
  moon.shadow.normalBias = .06
  scene.add(moon, new THREE.HemisphereLight('#b3b5bf', '#262025', .8))
  const hearth = new THREE.PointLight('#d78d7c', 12, 10, 2)
  hearth.position.set(camp.fireX, 1.7, camp.fireZ); scene.add(hearth)
  const people: { mesh: THREE.Mesh; map: THREE.Texture; column: number }[] = []
  const places = [[-2.35, .7], [-1.1, -.7], [1, -.6], [1.8, 1.4]].map(([x, z]) => [camp.fireX + x, camp.fireZ + z])
  places.forEach(([x, z], column) => {
    const map = peopleMap.clone(); textures.add(map)
    map.repeat.set(.25, .25); map.offset.set(column / 4, .75)
    const survivor = card(`seated-survivor-${column}`, map, x, camp.floor + .01, z, 2.05, 2.05)
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
    rock.position.set(x, camp.floor + .08, z); rock.scale.set(.5 + random(), .3 + random() * .4, .5 + random())
    rock.rotation.set(random(), random() * Math.PI, random()); rock.castShadow = rock.receiveShadow = true; scene.add(rock)
  }
  for (let i = 0; i < 9; i++) {
    const angle = i / 9 * Math.PI * 2 + random() * .1
    const rock = new THREE.Mesh(ring, parapetStone)
    rock.position.set(camp.fireX + Math.cos(angle) * .55, camp.floor + .05, camp.fireZ + Math.sin(angle) * .55)
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
  const fire = card('animated-hearth', fireMap, camp.fireX, .86, camp.fireZ, 1.55, 1.55, false)
  fire.material.transparent = true
  fire.material.depthWrite = false
  const iron = material(new THREE.MeshStandardMaterial({ color: '#333035', roughness: .8, metalness: .5 }))
  const rod = geometry(new THREE.CylinderGeometry(.025, .035, 1, 6))
  const apex = new THREE.Vector3(camp.fireX, 2.65, camp.fireZ)
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3
    const foot = new THREE.Vector3(camp.fireX + Math.cos(angle) * .66, camp.floor, camp.fireZ + Math.sin(angle) * .66)
    const leg = new THREE.Mesh(rod, iron)
    leg.name = 'cooking-tripod'; leg.position.copy(foot).add(apex).multiplyScalar(.5)
    leg.scale.y = foot.distanceTo(apex)
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), apex.clone().sub(foot).normalize())
    leg.castShadow = true; scene.add(leg)
  }
  const pot = new THREE.Mesh(geometry(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(.18, 0), new THREE.Vector2(.3, .1), new THREE.Vector2(.34, .35),
  ], 16)), iron)
  pot.name = 'suspended-cooking-pot'; pot.position.set(camp.fireX, 1.8, camp.fireZ); pot.castShadow = true; scene.add(pot)
  const hanger = new THREE.Mesh(rod, iron)
  hanger.position.set(camp.fireX, 2.4, camp.fireZ); hanger.scale.y = .5; scene.add(hanger)
  const glow = new THREE.PointLight('#9d271f', 2, 6, 2)
  glow.position.set(camp.fireX, 1, camp.fireZ + .2); scene.add(glow)

  const clothShape = new THREE.PlaneGeometry(2, 6, 12, 40)
  const clothPositions = clothShape.getAttribute('position')
  const banner = new THREE.Mesh(geometry(clothShape), material(new THREE.MeshStandardMaterial({ map: bannerMap, alphaTest: .35, color: '#c0b7b7', emissiveMap: bannerMap, emissive: '#ffffff', emissiveIntensity: .2, roughness: 1, side: THREE.DoubleSide })))
  banner.position.set(1.1, 9.5, .1); banner.rotation.copy(cardRotation); banner.castShadow = true
  banner.customDepthMaterial = material(new THREE.MeshDepthMaterial({ map: bannerMap, alphaTest: .35, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide }))
  scene.add(banner)
  const clothRest = Float32Array.from(clothPositions.array)
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
      float blur=clamp((focus-distance-5.)/5.,0.,1.)*8.+clamp((distance-focus-8.)/20.,0.,1.)*2.;
      vec4 col=texture2D(colorMap,vUv,log2(max(1.,blur)));
      gl_FragColor=col;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`, depthTest: false, depthWrite: false,
  }))
  postScene.add(new THREE.Mesh(geometry(new THREE.PlaneGeometry(2,2)), postMaterial))
  renderer.info.autoReset = false
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    if (!width || !height || disposed || lost) return
    const framing = titleFraming(width, height)
    camera.position.set(framing.centerX + fortCamera.x, framing.centerY + fortCamera.y, fortCamera.z)
    camera.lookAt(framing.centerX, framing.centerY, 0); camera.updateMatrixWorld()
    const focusDistance = -new THREE.Vector3(camp.fireX, camp.floor + 1, camp.fireZ).applyMatrix4(camera.matrixWorldInverse).z
    camera.aspect = framing.aspect; camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(framing.height / (2 * focusDistance)))
    camera.updateProjectionMatrix()
    const compact = framing.compact
    const stairX = camp.stairX - compact * (camp.stairX + 5.1)
    const paving = courtyardPavers(stairX)
    pavers.count = paving.length
    paving.forEach(({ x, y, z, turn }, i) => {
      pavingTransform.position.set(x, y - .02, z); pavingTransform.rotation.set(0, turn, 0)
      pavingTransform.updateMatrix(); pavers.setMatrixAt(i, pavingTransform.matrix)
    })
    pavers.instanceMatrix.needsUpdate = true; pavers.computeBoundingSphere()
    terrainGeometry.getAttribute('position').array.set(courtyardTerrain(stairX).positions)
    terrainGeometry.getAttribute('position').needsUpdate = true; terrainGeometry.computeVertexNormals(); terrainGeometry.computeBoundingSphere()
    placeCard(shelter, -6.4 - compact * 2.4, camp.floor - 1.3, 2.2 - compact * 5.2, 11.25, .75 - compact * .05)
    placeCard(backWall, -10.4 + compact * 1.6, camp.floor - .4, -2 - compact * 2.5, 10, .98 - compact * .25)
    const archX = 3 - compact * 7.3, archZ = 1.5 - compact * 3, archScale = .82 - compact * .17
    placeCard(arch, archX, camp.floor - 1.3, archZ, 12.8, archScale)
    banner.scale.set(archScale * .7, archScale, archScale)
    banner.position.set(archX, camp.floor - 1.3, archZ).addScaledVector(cardRight, -1.4 * archScale).addScaledVector(cardUp, 9.1 * archScale)
    const foregroundZ = 8 + compact * 4
    const ruinsX = 6.2 - compact * 3.7
    placeCard(rightRuins, ruinsX, courtyardHeight(ruinsX, foregroundZ) - .2, foregroundZ, 4, 1 - compact * .55)
    const nearX = -3.5 - compact * 7.8
    placeCard(nearWall, nearX, courtyardHeight(nearX, 10) - 3.8, 10, 9.4, framing.foregroundScale * 1.25)
    stairs.forEach(step => { step.position.x = stairX })
    lowerWalk.position.x = stairX
    const landscapeHeight = Math.max(framing.height + 2, (framing.height * framing.aspect + 2) / (39.1 / 22))
    landscape.scale.setScalar(landscapeHeight / 22 * (Math.hypot(fortCamera.x, fortCamera.y, fortCamera.z) + 65) / focusDistance)
    landscape.position.set(framing.centerX, framing.centerY, 0).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 65)
    landscape.position.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), -.75)
    const size = sceneRenderSize(width,height,lowQuality)
    renderer.setPixelRatio(1); renderer.setSize(size.width,size.height,false); target.setSize(size.width,size.height)
    postMaterial.uniforms.focus.value = focusDistance
    if (assetsReady) render(0)
  }
  function render(delta: number) {
    if (disposed || lost || failedAsset) return
    elapsed += delta
    const time = elapsed
    hearth.intensity = 12 + Math.sin(time*5)*.65 + Math.sin(time*9)*.25
    glow.intensity = 2 + Math.sin(time*4)*.18
    const flame = fireFrame(time), firePose = flame.pose
    fireMap.offset.set(flame.left / 384, 1 - flame.bottom / 256)
    fireMap.repeat.y = flame.height / 256
    fire.scale.y = flame.height / 128
    const flameHeight = 1.55 * flame.height / 128
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
    pavers.dispose()
    textures.forEach(value=>value.dispose());geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose())
    target.dispose();moon.shadow.dispose();renderer.dispose();canvas.remove()
  }
  try{resize()}catch{dispose();status('fallback')}
  return dispose
}
