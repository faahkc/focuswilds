import * as THREE from 'three'

// Separate planes give the pixel artwork real perspective and parallax without a large model download.
export function createWoodland(canvas: HTMLCanvasElement, artwork: string, frames: string[], moving: boolean, resting: boolean) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0x080b10, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 80)
  camera.position.set(0, 2, 14)
  const textures: THREE.Texture[] = []
  const loader = new THREE.TextureLoader()
  let disposed = false
  let animation = 0
  let last = 0
  let time = 0
  let ready = 0
  let enabled = moving
  let camp = resting

  function texture(url: string, pixelated = false) {
    const map = loader.load(url, () => {
      if (disposed) { map.dispose(); return }
      ready++
      if (ready === frames.length + 1) { canvas.dataset.ready = 'true'; redraw() }
    })
    map.colorSpace = THREE.SRGBColorSpace
    if (pixelated) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter }
    textures.push(map)
    return map
  }
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(34, 22.67), new THREE.MeshBasicMaterial({ map: texture(artwork) }))
  backdrop.position.set(0, 2, -10)
  scene.add(backdrop)
  scene.add(new THREE.AmbientLight(0x879aaa, 2.2))
  const lantern = new THREE.PointLight(0xffb459, 12, 12, 1.5)
  lantern.position.set(2, 1, 3)
  scene.add(lantern)
  const spriteFrames = frames.map(url => texture(url, true))
  const traveler = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.46), new THREE.MeshLambertMaterial({ map: spriteFrames[0], transparent: true, alphaTest: .1 }))
  traveler.position.set(.3, -.45, 2)
  scene.add(traveler)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.65, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .55, depthWrite: false }))
  shadow.scale.y = .16
  shadow.position.set(.3, -1.15, 1.9)
  scene.add(shadow)

  const fogCanvas = document.createElement('canvas')
  fogCanvas.width = 128; fogCanvas.height = 64
  const context = fogCanvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 32, 0, 64, 32, 64)
  gradient.addColorStop(0, '#8495a522'); gradient.addColorStop(1, '#8495a500')
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 64)
  const fogTexture = new THREE.CanvasTexture(fogCanvas)
  textures.push(fogTexture)
  const fog = [-4, 0, 5].map((z, index) => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(24, 4), new THREE.MeshBasicMaterial({ map: fogTexture, transparent: true, opacity: .45, depthWrite: false }))
    plane.position.set(index - 1, -.3, z)
    scene.add(plane)
    return plane
  })
  const particles = new Float32Array(28 * 3)
  for (let i = 0; i < 28; i++) {
    particles[i * 3] = Math.sin(i * 17.3) * 7
    particles[i * 3 + 1] = (i % 7) * .7 - 1
    particles[i * 3 + 2] = Math.cos(i * 9.1) * 4
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(particles, 3))
  const embers = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffbc68, size: .045, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }))
  scene.add(embers)
  const rainPositions = new Float32Array(48 * 6)
  const rainGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0x9babbc, transparent: true, opacity: .16, depthWrite: false }))
  scene.add(rain)

  function draw(timestamp: number) {
    if (disposed) return
    if (timestamp && last) time += Math.min((timestamp - last) / 1000, .1)
    last = timestamp
    camera.position.x = enabled ? Math.sin(time * .16) * .24 : 0
    camera.lookAt(0, 1.7, -3)
    traveler.position.x = camp ? .9 : .3 + Math.sin(time * .5) * .35
    traveler.position.y = -.45 + (enabled ? Math.abs(Math.sin(time * (camp ? 1.2 : 5))) * (camp ? .018 : .07) : 0)
    traveler.material.map = spriteFrames[enabled && !camp ? Math.floor(time * 6) % frames.length : 0]
    shadow.position.x = traveler.position.x
    lantern.intensity = camp ? 17 : 12
    if (enabled) lantern.intensity += Math.sin(time * 11) * 1.3 + Math.sin(time * 17) * .6
    fog.forEach((plane, index) => { plane.position.x = enabled ? Math.sin(time * .12 + index) * (index + 1) : index - 1 })
    embers.rotation.z = enabled ? Math.sin(time * .1) * .12 : 0
    embers.position.y = enabled ? (time * .12) % 1.5 : 0
    embers.material.opacity = camp ? .95 : .55
    rain.visible = !camp
    for (let i = 0; i < 48; i++) {
      const x = Math.sin(i * 32.1) * 9
      const y = 7 - ((time * 3 + i * .71) % 9)
      const z = Math.cos(i * 13.7) * 4
      rainPositions.set([x, y, z, x - .04, y + .22, z], i * 6)
    }
    rainGeometry.attributes.position.needsUpdate = true
    renderer.render(scene, camera)
    animation = enabled && !document.hidden && ready === frames.length + 1 ? requestAnimationFrame(draw) : 0
  }
  function redraw() { cancelAnimationFrame(animation); last = 0; draw(0) }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    // Keep the artwork covering both portrait and landscape viewports.
    backdrop.scale.setScalar(Math.max(1, camera.aspect / 1.5))
    redraw()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  document.addEventListener('visibilitychange', redraw)
  resize()
  return {
    update(motion: boolean, rest: boolean) { enabled = motion; camp = rest; redraw() },
    dispose() {
      disposed = true
      cancelAnimationFrame(animation)
      observer.disconnect()
      document.removeEventListener('visibilitychange', redraw)
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach(material => material.dispose())
        }
      })
      textures.forEach(map => map.dispose())
      // StrictMode and companion changes reuse this canvas; clear upload flags before the next renderer.
      renderer.resetState()
      renderer.dispose()
      delete canvas.dataset.ready
    },
  }
}
