import test from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom, camp, fireFrame, stepHeight, sceneRenderSize, survivorFrame, survivorPose, titleFraming } from '../src/lib/fort-layout.ts'

test('the stair starts at the courtyard and descends in consistent bounded risers', () => {
  assert.equal(stepHeight(0), camp.floor)
  assert.equal(stepHeight(-1), camp.floor)
  assert.equal(stepHeight(100), stepHeight(8))
  for (let i = 1; i <= 8; i++) assert.ok(Math.abs(stepHeight(i - 1) - stepHeight(i) - .22) < 1e-10)
})

test('portrait framing preserves a finite camera and render resolution stays bounded on every screen', () => {
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1440, 900], [3840, 2160]]) {
    const framing = titleFraming(width, height)
    assert.equal(framing.aspect, width / height)
    assert.ok(framing.height > 0 && Number.isFinite(framing.centerX))
    const normal = sceneRenderSize(width, height), low = sceneRenderSize(width, height, true)
    assert.ok(normal.width <= width && normal.height <= height)
    assert.ok(normal.width <= 1920 && normal.height <= 1200)
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
  assert.ok(phone.height * phone.aspect >= 10.8)
  assert.ok(phone.centerY > titleFraming(1440, 900).centerY)
  assert.equal(phone.compact, 1)
  assert.ok(phone.height >= 24)
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
