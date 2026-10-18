import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fireFrame, survivorFrame } from '../src/lib/fort-layout.ts'

// Read only the three WebP canvas headers used by bundled assets; no image decoder is needed.
function webpSize(data) {
  assert.equal(data.toString('ascii', 0, 4), 'RIFF')
  assert.equal(data.toString('ascii', 8, 12), 'WEBP')
  switch (data.toString('ascii', 12, 16)) {
    case 'VP8X': return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1]
    case 'VP8L': {
      assert.equal(data[20], 0x2f)
      const bits = data.readUInt32LE(21)
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]
    }
    case 'VP8 ': {
      assert.equal(data.toString('hex', 23, 26), '9d012a')
      return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff]
    }
    default: assert.fail('Unsupported WebP header; update this check when changing the asset format.')
  }
}

test('bundled sprite dimensions and sampled frames match the current renderer contract', t => {
  const assets = Object.fromEntries([
    ['title-survivors.webp', 512, 512],
    ['title-fire.webp', 384, 256],
    ['shelter-survivors.webp', 384, 256],
    ['shelter-courtyard.webp', 1672, 941],
  ].map(([name, width, height]) => {
    const data = readFileSync(new URL(`../src/assets/${name}`, import.meta.url))
    assert.deepEqual(webpSize(data), [width, height], `${name}: update frame sampling before changing canvas dimensions`)
    return [name, { width, height, bytes: data.length }]
  }))
  const people = assets['title-survivors.webp'], fire = assets['title-fire.webp']
  for (let column = 0; column < 4; column++) {
    for (let pose = 0; pose < 4; pose++) {
      const { top, bottom } = survivorFrame(pose * 1.2 + .01, column)
      assert.ok(Number.isInteger(top) && Number.isInteger(bottom))
      assert.ok(top >= 0 && bottom > top && bottom <= people.height)
      assert.ok(bottom - top <= 128)
      assert.ok((column + 1) * 128 <= people.width)
    }
  }
  for (let pose = 0; pose < 6; pose++) {
    const frame = fireFrame(pose / 8)
    assert.ok([frame.left, frame.bottom, frame.height].every(Number.isInteger))
    assert.ok(frame.left >= 0 && frame.left + 128 <= fire.width)
    assert.ok(frame.height > 0 && frame.bottom - frame.height >= 0 && frame.bottom <= fire.height)
  }
  t.diagnostic(`Shelter image transfer: ${assets['shelter-courtyard.webp'].bytes + assets['shelter-survivors.webp'].bytes} bytes; review measured budgets in docs/DEVELOPMENT.md when replacing assets.`)
})
