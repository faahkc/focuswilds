import test from 'node:test'
import assert from 'node:assert/strict'
import { companionProgress, mossForm, MOSS_EVOLUTION_LEVEL } from '../src/lib/companion.ts'

test('companion rewards stay at 25 EXP per completed session and reset level progress every 100 EXP', () => {
  assert.deepEqual(companionProgress(0), { totalXp: 0, level: 1, levelXp: 0 })
  assert.deepEqual(companionProgress(1), { totalXp: 25, level: 1, levelXp: 25 })
  assert.deepEqual(companionProgress(3), { totalXp: 75, level: 1, levelXp: 75 })
  assert.deepEqual(companionProgress(4), { totalXp: 100, level: 2, levelXp: 0 })
})

test('Moss evolves at Level 5 from sixteen saved sessions and retains its identity', () => {
  assert.equal(MOSS_EVOLUTION_LEVEL, 5)
  assert.equal(mossForm(companionProgress(15).level).name, 'Moss')
  assert.equal(mossForm(companionProgress(16).level).name, 'Mossgrove')
  assert.equal(mossForm(companionProgress(100).level).evolved, true)
})
