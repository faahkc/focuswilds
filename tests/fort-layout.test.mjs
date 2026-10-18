import test from 'node:test'
import assert from 'node:assert/strict'
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import { seededRandom, camp, courtyardHeight, courtyardPavers, courtyardRightEdge, courtyardTerrain, fireFrame, fortCamera, fortStairs, stairPosition, stepHeight, sceneRenderSize, survivorFrame, survivorPose, titleFraming } from '../src/lib/fort-layout.ts'

test('the stair starts at the courtyard and descends in consistent bounded risers', () => {
  assert.equal(stepHeight(0), camp.floor)
  assert.equal(stepHeight(-1), camp.floor)
  assert.equal(stepHeight(100), stepHeight(fortStairs.count - 1))
  for (let i = 1; i < fortStairs.count; i++) {
    assert.ok(Math.abs(stepHeight(i - 1) - stepHeight(i) - fortStairs.rise) < 1e-10)
    const a = stairPosition(i - 1), b = stairPosition(i)
    assert.ok(b.x > a.x && b.z > a.z)
    assert.ok(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - fortStairs.run) < 1e-10)
  }
})

test('the stair treads rise toward screen right while the flight descends toward the foreground', () => {
  const framing = titleFraming(1672, 941), camera = new PerspectiveCamera(22, framing.aspect, .1, 150)
  camera.position.set(framing.centerX + fortCamera.x, framing.centerY + fortCamera.y, fortCamera.z)
  camera.lookAt(framing.centerX, framing.centerY, 0); camera.updateMatrixWorld()
  const focus = -new Vector3(camp.fireX, camp.floor + 1, camp.fireZ).applyMatrix4(camera.matrixWorldInverse).z
  camera.fov = 2 * Math.atan(framing.height / (2 * focus)) * 180 / Math.PI; camera.updateProjectionMatrix()
  const screen = ({ x, y, z }) => {
    const p = new Vector3(x, y, z).project(camera)
    return { x: (p.x + 1) * 836, y: (1 - p.y) * 470.5 }
  }
  const top = stairPosition(0), bottom = screen(stairPosition(fortStairs.count - 1)), start = screen(top)
  const right = screen({ x: top.x + Math.cos(fortStairs.yaw) * 2, y: top.y, z: top.z - Math.sin(fortStairs.yaw) * 2 })
  assert.ok(right.x > start.x + 100 && right.y < start.y - 10)
  assert.ok(start.x > 740 && start.x < 820 && start.y > 580 && start.y < 630)
  assert.ok(bottom.x > start.x && bottom.x < start.x + 70 && bottom.y > 675 && bottom.y < 730)
})

test('portrait framing preserves a finite camera and render resolution stays bounded on every screen', () => {
  for (const [width, height] of [[320, 568], [390, 844], [320, 1800], [844, 390], [1440, 900], [3840, 2160], [5120, 1440], [7680, 2160]]) {
    const framing = titleFraming(width, height)
    assert.equal(framing.aspect, width / height)
    assert.ok(framing.height > 0 && Number.isFinite(framing.centerX))
    const normal = sceneRenderSize(width, height), low = sceneRenderSize(width, height, true)
    assert.ok(normal.width <= width && normal.height <= height)
    assert.ok(normal.width <= 3200 && normal.height <= 1800)
    assert.ok(low.width <= normal.width && low.height <= normal.height)
    assert.ok(Math.abs(normal.width / normal.height - width / height) < .01)
  }
  assert.equal(sceneRenderSize(0, 0).width, 1)
  assert.ok(titleFraming(390, 844).panX < titleFraming(1440, 900).panX)
})

test('idle animation switches drawn poses discretely with an independent phase per survivor', () => {
  assert.equal(survivorPose(0, 0), 0)
  assert.equal(survivorPose(1.19, 0), 0)
  assert.equal(survivorPose(1.2, 0), 1)
  assert.equal(survivorPose(4.8, 0), 0)
  assert.equal(survivorPose(0, 1), 1)
  for (let t = 0; t < 20; t += .1) assert.ok([0, 1, 2, 3].includes(survivorPose(t, 2)))
})

test('seeded rubble and atmosphere placement stay stable across mounts without remote assets', () => {
  const first = seededRandom(1826), second = seededRandom(1826)
  for (let i = 0; i < 1000; i++) {
    const value = first()
    assert.equal(value, second())
    assert.ok(value >= 0 && value < 1)
  }
})

test('framing changes continuously at square sizes and keeps the portrait camp visible', () => {
  const before = titleFraming(990, 1000), after = titleFraming(1010, 1000)
  assert.ok(Math.abs(before.centerX - after.centerX) < .2)
  assert.ok(Math.abs(before.panX - after.panX) < .2)
  const phone = titleFraming(390, 844)
  assert.ok(phone.height * phone.aspect >= 9)
  assert.equal(phone.centerY, titleFraming(1440, 900).centerY)
  assert.equal(phone.centerX, titleFraming(1440, 900).centerX)
  assert.ok(phone.panX < 0)
  assert.ok(phone.height >= 14.5)
})

test('trimmed idle frames stay inside the atlas without sampling the neighboring pose', () => {
  for (let column = 0; column < 4; column++) {
    const frames = Array.from({ length: 4 }, (_, pose) => survivorFrame(pose * 1.2 + .01, column)).sort((a, b) => a.top - b.top)
    let previousBottom = 0
    for (const { top, bottom } of frames) {
      assert.ok(top >= previousBottom && bottom <= 512 && bottom > top)
      assert.ok(bottom - top <= 128)
      previousBottom = bottom
    }
  }
})

test('fire frames loop at eight poses per second and keep all sampled pixels inside the atlas', () => {
  assert.equal(fireFrame(0).pose, 0)
  assert.equal(fireFrame(.125).pose, 1)
  assert.equal(fireFrame(.75).pose, 0)
  for (let pose = 0; pose < 6; pose++) {
    const frame = fireFrame(pose / 8)
    assert.equal(frame.pose, pose)
    assert.ok(frame.left >= 0 && frame.left + 128 <= 384)
    assert.ok(frame.bottom <= 256 && frame.bottom - frame.height >= 0)
  }
})

test('wide and ultrawide views retain survivor scale instead of fitting the fort into the width', () => {
  const normal = titleFraming(1920, 1080), wide = titleFraming(5120, 1440)
  assert.equal(normal.height, wide.height)
  assert.ok(1.7 / wide.height >= .11 && 1.7 / wide.height <= .13)
  assert.equal(titleFraming(320, 1800).aspect, 320 / 1800)
  assert.ok(sceneRenderSize(5120, 1440).height >= 900)
})

test('terrain keeps the hearth level and follows the diagonal stair grade at both layouts', () => {
  assert.equal(courtyardHeight(camp.fireX, camp.fireZ), camp.floor)
  for (const x of [-10, -6, -2, 0]) assert.equal(courtyardHeight(x, 0), camp.floor)
  for (const stairX of [camp.stairX, -5.1]) {
    for (let i = 0; i < fortStairs.count; i++) {
      const { x, y, z } = stairPosition(i, stairX)
      assert.ok(Math.abs(courtyardHeight(x, z, stairX) - y) < 1e-10)
    }
  }
  assert.ok(courtyardHeight(0, 24) < courtyardHeight(0, 12))
})

test('terrain beside the diagonal flight grades down with the steps instead of forming a high terrace', () => {
  for (let i = 0; i < fortStairs.count; i++) {
    const point = stairPosition(i)
    for (const across of [-3.05, 3.05]) {
      const x = point.x + Math.cos(fortStairs.yaw) * across, z = point.z - Math.sin(fortStairs.yaw) * across
      assert.ok(courtyardHeight(x, z) <= point.y + .6)
    }
  }
})

test('the occupied terrace stays level behind the stair edge instead of sloping toward the foreground', () => {
  for (const across of [-7, -4, -3, 0, 3]) {
    const along = -.4, c = Math.cos(fortStairs.yaw), s = Math.sin(fortStairs.yaw)
    const x = camp.stairX + c * across + s * along, z = fortStairs.z - s * across + c * along
    assert.equal(courtyardHeight(x, z), camp.floor)
  }
})

test('terrain has valid upward-facing top triangles and continuous deep skirts instead of a box deck', () => {
  const mesh = courtyardTerrain()
  assert.equal(mesh.positions.length % 3, 0)
  assert.equal(mesh.uvs.length / 2, mesh.positions.length / 3)
  assert.equal(mesh.indices.length % 3, 0)
  assert.ok(mesh.positions.every(Number.isFinite))
  for (const i of mesh.indices) assert.ok(i >= 0 && i < mesh.positions.length / 3)
  for (let i = 0; i < mesh.topIndexCount; i += 3) {
    const [a, b, c] = mesh.indices.slice(i, i + 3).map(n => n * 3)
    const up = (mesh.positions[b + 2] - mesh.positions[a + 2]) * (mesh.positions[c] - mesh.positions[a]) - (mesh.positions[b] - mesh.positions[a]) * (mesh.positions[c + 2] - mesh.positions[a + 2])
    assert.ok(up > 0)
  }
  assert.ok(mesh.positions.some((v, i) => i % 3 === 1 && v === -60))
  assert.ok(courtyardRightEdge(0) > courtyardRightEdge(-6) + 2)
  assert.ok(courtyardRightEdge(7) > courtyardRightEdge(0) + 4)
  for (let z = -8; z < 20; z += .1) assert.ok(Math.abs(courtyardRightEdge(z + .1) - courtyardRightEdge(z)) < .11)
})

test('paving follows the hillside, remains inside the edge and clears both stair layouts', () => {
  for (const stairX of [camp.stairX, -5.1]) {
    const stones = courtyardPavers(stairX)
    assert.ok(stones.length > 800 && stones.length <= 1596)
    assert.deepEqual(stones, courtyardPavers(stairX))
    for (const { x, y, z, turn } of stones) {
      assert.ok([x, y, z, turn].every(Number.isFinite))
      assert.equal(y, courtyardHeight(x, z, stairX))
      assert.ok(x < courtyardRightEdge(z))
      const dx = x - stairX, dz = z - fortStairs.z
      const across = dx * Math.cos(fortStairs.yaw) - dz * Math.sin(fortStairs.yaw), along = dx * Math.sin(fortStairs.yaw) + dz * Math.cos(fortStairs.yaw)
      if (along > -.35 && along < fortStairs.run * (fortStairs.count - 1) + .7) assert.ok(Math.abs(across) > fortStairs.width / 2 + .25)
    }
  }
})

test('the hillside leaves the stair flight open instead of drawing a ramp over its treads', () => {
  const terrain = courtyardTerrain(), geometry = new BufferGeometry(), material = new MeshBasicMaterial()
  geometry.setAttribute('position', new Float32BufferAttribute(terrain.positions, 3))
  geometry.setIndex(terrain.indices.slice(0, terrain.topIndexCount))
  const ground = new Mesh(geometry, material)
  try {
    for (let i = 0; i < fortStairs.count; i++) {
      const point = stairPosition(i)
      for (const across of [-1.5, 0, 1.5]) {
        const ray = new Raycaster(new Vector3(point.x + Math.cos(fortStairs.yaw) * across, 10, point.z - Math.sin(fortStairs.yaw) * across), new Vector3(0, -1, 0))
        assert.equal(ray.intersectObject(ground).length, 0, `terrain obstructs stair ${i} at ${across}`)
      }
    }
  } finally { geometry.dispose(); material.dispose() }
})
