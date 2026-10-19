import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('login scene preserves eight discrete Aseprite poses and the approved 3590ms loop at responsive sizes', () => {
  const png = readFileSync(new URL('../src/assets/login-window.png', import.meta.url))
  assert.equal(png.readUInt32BE(16), 128 * 8)
  assert.equal(png.readUInt32BE(20), 112)
  const css = readFileSync(new URL('../src/screens/login-scene.css', import.meta.url), 'utf8')
  assert.match(css, /800% 100%/)
  assert.match(css, /3590ms step-end infinite/)
  assert.match(css, /animation-play-state: var\(--loading-animation-state, running\)/)
  assert.doesNotMatch(css, /prefers-reduced-motion/)
  const frames = [...css.matchAll(/([\d.]+)% \{ background-position: ([\d.]+)% 0; \}/g)]
  const timings = [900, 600, 450, 450, 100, 140, 100, 850]
  assert.equal(frames.length, 9)
  for (let i = 0; i < 8; i++) {
    assert.ok(Math.abs(Number(frames[i][2]) - i / 7 * 100) < 0.000001)
    assert.ok(Math.abs((Number(frames[i + 1][1]) - Number(frames[i][1])) * 35.9 - timings[i]) < 0.001)
  }
  assert.equal(Number(frames[8][2]), 0)
})
