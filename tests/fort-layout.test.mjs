import test from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, camp, courtyardHeight, courtyardPavers, courtyardRightEdge, courtyardTerrain, fireFrame, stepHeight, sceneRenderSize, survivorFrame, survivorPose, titleFraming } from '../src/lib/fort-layout.ts'

test('the stair starts at the courtyard and descends in consistent bounded risers', () => {
  assert.equal(stepHeight(0), camp.floor)
  assert.equal(stepHeight(-1), camp.floor)
  assert.equal(stepHeight(100), stepHeight(8))
  for (let i = 1; i <= 8; i++) assert.ok(Math.abs(stepHeight(i - 1) - stepHeight(i) - .22) < 1e-10)
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
  assert.ok(titleFraming(390, 844).centerX < titleFraming(1440, 900).centerX)
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
  const phone = titleFraming(390, 844)
  assert.ok(phone.height * phone.aspect >= 7.8)
  assert.ok(phone.centerY > titleFraming(1440, 900).centerY)
  assert.equal(phone.compact, 1)
  assert.ok(phone.height >= 14.5)
  assert.ok(phone.foregroundScale < titleFraming(1440, 900).foregroundScale)
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

test('terrain keeps the occupied camp level and provides a recessed stair bed at both layouts', () => {
  for (const x of [-10, -6, -2, 4]) assert.equal(courtyardHeight(x, 0), camp.floor)
  for (const stairX of [camp.stairX, -5.1]) {
    for (let i = 0; i < 9; i++) {
      const z = 4.1 + i * .53
      assert.ok(courtyardHeight(stairX, z, stairX) <= stepHeight(i) - .25)
    }
  }
  assert.ok(courtyardHeight(0, 24) < courtyardHeight(0, 12))
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
  assert.ok(courtyardRightEdge(0) > courtyardRightEdge(-6) + 5)
})

test('paving follows the hillside, remains inside the edge and clears both stair layouts', () => {
  for (const stairX of [camp.stairX, -5.1]) {
    const stones = courtyardPavers(stairX)
    assert.ok(stones.length > 300 && stones.length <= 528)
    assert.deepEqual(stones, courtyardPavers(stairX))
    for (const { x, y, z, turn } of stones) {
      assert.ok([x, y, z, turn].every(Number.isFinite))
      assert.equal(y, courtyardHeight(x, z, stairX))
      assert.ok(x < courtyardRightEdge(z))
      if (z > 3.6 && z < 9.2) assert.ok(Math.abs(x - stairX) > 2.8)
    }
  }
})
