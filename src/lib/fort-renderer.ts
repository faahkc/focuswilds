import * as THREE from 'three'
import { camp, fireFrame, seededRandom, sceneRenderSize, stepHeight, survivorFrame, survivorPose, titleFraming } from './fort-layout'
import shelterUrl from '@/assets/title-shelter.webp'
import archUrl from '@/assets/title-arch.webp'
import foregroundUrl from '@/assets/title-foreground.webp'
import valleyUrl from '@/assets/title-valley.webp'
import peopleUrl from '@/assets/title-survivors.webp'
import stoneUrl from '@/assets/title-stone.webp'
import bannerUrl from '@/assets/title-banner.webp'
import fireUrl from '@/assets/title-fire.webp'
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
  const camera = new THREE.OrthographicCamera(-20, 20, 10, -10, .1, 150)
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
  renderer.toneMappingExposure = 1.1
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
  fireMap.repeat.set(1 / 3, .5)
  stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping
  stoneMap.repeat.set(8, 3.2)
  const ground = material(new THREE.MeshStandardMaterial({ map: stoneMap, color: '#bcbcc0', roughness: .93, emissiveMap: stoneMap, emissive: '#ffffff', emissiveIntensity: .18 }))
  const sideStoneMap = stoneMap.clone()
  sideStoneMap.repeat.set(5, .4); textures.add(sideStoneMap)
  const masonry = material(new THREE.MeshStandardMaterial({ map: sideStoneMap, color: '#a0a0a4', roughness: 1, emissiveMap: sideStoneMap, emissive: '#ffffff', emissiveIntensity: .22 }))
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
  stairTopMap.repeat.set(1, .12); stairSideMap.repeat.set(1, .06)
  textures.add(stairTopMap); textures.add(stairSideMap)
  const stairTop = material(ground.clone()), stairSide = material(masonry.clone())
  stairTop.map = stairTop.emissiveMap = stairTopMap
  stairSide.map = stairSide.emissiveMap = stairSideMap
  const stairMaterials = [stairSide, stairSide, stairTop, stairSide, stairSide, stairSide]
  solid('raised-courtyard', pavedStone, -3.2, -.2, -1, 25, 2, 10)
  solid('terrace-foundation', masonry, -3.2, -1.6, -1, 25.3, .8, 10.3)
  const stairs: THREE.Mesh[] = []
  for (let i = 0; i < 9; i++) {
    const top = stepHeight(i)
    stairs.push(solid(`stair-${i}`, stairMaterials, -1.5, top - .14, 4.1 + i * .53, 5.4, .28, .6))
  }
  const lowerWalk = solid('lower-stone-walk', ground, -1.5, -1.15, 10, 9, .3, 4)
  for (let i = 0; i < 12; i++) {
    solid('broken-side-parapet', masonry, 9.1, camp.floor + .25 + random() * .22, -5 + i * .8, .5, .5 + random() * .5, .65)
  }
  const cardPitch = -Math.atan2(14, 30)
  function placeCard(mesh: THREE.Mesh, x: number, y: number, z: number, h: number, scale = 1) {
    mesh.scale.setScalar(scale)
    mesh.position.set(x, y + Math.cos(cardPitch) * h * scale / 2, z + Math.sin(cardPitch) * h * scale / 2)
  }
  function card(name: string, map: THREE.Texture, x: number, y: number, z: number, w: number, h: number, lit = true) {
    const mat = lit
      ? material(new THREE.MeshStandardMaterial({ map, transparent: false, alphaTest: .35, side: THREE.DoubleSide, roughness: 1, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .3 }))
      : material(new THREE.MeshBasicMaterial({ map, alphaTest: .35, side: THREE.DoubleSide, toneMapped: false }))
    const mesh = new THREE.Mesh(geometry(new THREE.PlaneGeometry(w, h)), mat)
    mesh.name = name; mesh.rotation.x = cardPitch
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
  const shelter = card('occupied-shelter', shelterMap, -8.4, camp.floor, -3, 20, 13.33)
  const arch = card('broken-arch', archMap, 4.8, camp.floor, 3.8, 11.5, 17.25)
  const foreground = card('foreground-parapet', foregroundMap, -5, -2.3, 12, 27, 9.4)
  const rightRuins = card('right-terrace-ruins', foregroundMap, 7.5, -1.4, 5.3, 10, 4)

  const moon = new THREE.DirectionalLight('#e0e2eb', 1.4)
  moon.position.set(15, 22, -10); moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  Object.assign(moon.shadow.camera, { left: -21, right: 18, top: 18, bottom: -15, far: 65 })
  moon.shadow.normalBias = .06
  scene.add(moon, new THREE.HemisphereLight('#b3b5bf', '#262025', 1.6))
  const hearth = new THREE.PointLight('#d78d7c', 12, 10, 2)
  hearth.position.set(camp.fireX, 1.7, camp.fireZ); scene.add(hearth)
  const people: { mesh: THREE.Mesh; map: THREE.Texture; column: number }[] = []
  const places = [[-8.35, .7], [-7.1, -.7], [-4.6, -.6], [-3.9, 1.4]]
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
    const rock = new THREE.Mesh(ring, masonry)
    const x = -14 + random() * 23, z = -5.8 + random() * 9.2
    if (x > -10 && x < 0 && z > -2 && z < 2.5) continue
    rock.position.set(x, camp.floor + .08, z); rock.scale.set(.5 + random(), .3 + random() * .4, .5 + random())
    rock.rotation.set(random(), random() * Math.PI, random()); rock.castShadow = rock.receiveShadow = true; scene.add(rock)
  }
  for (let i = 0; i < 9; i++) {
    const angle = i / 9 * Math.PI * 2 + random() * .1
    const rock = new THREE.Mesh(ring, masonry)
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
  banner.position.set(1.1, 9.5, .1); banner.rotation.x = cardPitch; banner.castShadow = true
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
  const postScene = new THREE.Scene(), postCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1)
  const postMaterial = material(new THREE.ShaderMaterial({
    uniforms: { colorMap: { value: target.texture }, depthMap: { value: depth }, texel: { value: new THREE.Vector2(1,1) }, focus: { value: 35 }, near: { value: camera.near }, far: { value: camera.far } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D colorMap,depthMap; uniform vec2 texel; uniform float focus,near,far; varying vec2 vUv;
      void main(){float distance=mix(near,far,texture2D(depthMap,vUv).x);
      float blur=clamp((abs(distance-focus)-5.)/8.,0.,1.)*2.0;
      vec4 col=texture2D(colorMap,vUv)*.28;
      col+=texture2D(colorMap,vUv+texel*vec2(blur,0.))*.12;
      col+=texture2D(colorMap,vUv-texel*vec2(blur,0.))*.12;
      col+=texture2D(colorMap,vUv+texel*vec2(0.,blur))*.12;
      col+=texture2D(colorMap,vUv-texel*vec2(0.,blur))*.12;
      col+=texture2D(colorMap,vUv+texel*vec2(blur,blur))*.06;
      col+=texture2D(colorMap,vUv-texel*vec2(blur,blur))*.06;
      col+=texture2D(colorMap,vUv+texel*vec2(blur,-blur))*.06;
      col+=texture2D(colorMap,vUv+texel*vec2(-blur,blur))*.06;
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
    const framing = titleFraming(width, height), half = framing.height / 2
    camera.left = -half * framing.aspect; camera.right = half * framing.aspect
    camera.top = half; camera.bottom = -half
    camera.position.set(framing.centerX, framing.centerY + 14, 30)
    camera.lookAt(framing.centerX, framing.centerY, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    const compact = framing.compact
    placeCard(shelter, -8.4 - compact * .4, camp.floor, -3, 13.33, .85 - compact * .15)
    const archX = 4.8 - compact * 6.4, archZ = 3.8 - compact * 4.4, archScale = .88 - compact * .18
    placeCard(arch, archX, camp.floor, archZ, 17.25, archScale)
    banner.scale.setScalar(archScale)
    banner.position.set(archX - 3.7 * archScale, camp.floor + 8.7 * archScale, archZ - 3.7 * archScale)
    placeCard(foreground, -5, -2.3, 12, 9.4, framing.foregroundScale)
    placeCard(rightRuins, 7.5 - compact * 5, -1.4, 5.3, 4, .75 - compact * .3)
    stairs.forEach(step => { step.position.x = -1.5 - compact * 3.6 })
    lowerWalk.position.x = -1.5 - compact * 3.6
    const landscapeHeight = Math.max(framing.height + 2, (framing.height * framing.aspect + 2) / (39.1 / 22))
    landscape.scale.setScalar(landscapeHeight / 22)
    landscape.position.set(framing.centerX, framing.centerY, 0).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 65)
    landscape.position.addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), -.75)
    const size = sceneRenderSize(width,height,lowQuality)
    renderer.setPixelRatio(1); renderer.setSize(size.width,size.height,false); target.setSize(size.width,size.height)
    postMaterial.uniforms.texel.value.set(1/size.width,1/size.height)
    postMaterial.uniforms.focus.value = new THREE.Vector3(camp.fireX, camp.floor + 1, camp.fireZ).applyMatrix4(camera.matrixWorldInverse).z * -1
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
    fire.position.y = camp.floor + .16 + Math.cos(cardPitch) * flameHeight / 2
    fire.position.z = camp.fireZ + Math.sin(cardPitch) * flameHeight / 2
    people.forEach(({ mesh, map, column }) => {
      const { top, bottom } = survivorFrame(time, column), height = 2.05 * (bottom - top) / 128
      map.repeat.y = (bottom - top) / 512
      map.offset.y = 1 - bottom / 512
      mesh.scale.y = (bottom - top) / 128
      mesh.position.y = camp.floor + .01 + Math.cos(cardPitch) * height / 2
      mesh.position.z = places[column][1] + Math.sin(cardPitch) * height / 2
    })
    for (let i=0;i<clothPositions.count;i++) {
      const freedom = (3-clothRest[i*3+1])/6
      const wave = Math.sin(time*1.4+clothRest[i*3+1]*2)*freedom
      clothPositions.setZ(i, wave*.3)
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
    textures.forEach(value=>value.dispose());geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose())
    target.dispose();moon.shadow.dispose();renderer.dispose();canvas.remove()
  }
  try{resize()}catch{dispose();status('fallback')}
  return dispose
}
