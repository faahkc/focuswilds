import test from 'node:test'
import assert from 'node:assert/strict'
import { companionProgress } from '../src/lib/companion.ts'

test('a new companion starts at Level 1 and gains 25 EXP per saved focus session', () => {
  assert.deepEqual(companionProgress(0), { totalXp: 0, level: 1, levelXp: 0 })
  assert.deepEqual(companionProgress(1), { totalXp: 25, level: 1, levelXp: 25 })
})

test('level boundaries reset the EXP bar without losing total experience', () => {
  assert.deepEqual(companionProgress(3), { totalXp: 75, level: 1, levelXp: 75 })
  assert.deepEqual(companionProgress(4), { totalXp: 100, level: 2, levelXp: 0 })
  assert.deepEqual(companionProgress(5), { totalXp: 125, level: 2, levelXp: 25 })
  assert.deepEqual(companionProgress(8), { totalXp: 200, level: 3, levelXp: 0 })
})
