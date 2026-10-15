import test from 'node:test'
import assert from 'node:assert/strict'
import { creatures, encounterIndex } from '../src/lib/discoveries.ts'

test('each saved session has a stable encounter and duplicate species remain possible', () => {
  const ids = [0, 1, 2, 3, 0xffffffff].map(value => `00000000-0000-4000-8000-${value.toString(16).padStart(12, '0')}`)
  assert.deepEqual(ids.map(encounterIndex), [0, 1, 2, 0, 0])
  assert.deepEqual(creatures.map(creature => creature.name), ['Fern Hare', 'Dawn Finch', 'Amber Squirrel'])
})
