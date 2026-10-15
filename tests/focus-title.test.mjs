import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeFocusTitle } from '../src/lib/focus-title.ts'

test('missing and whitespace-only names use the default, while named sessions trim edges', () => {
  for (const value of [undefined, null, '', ' \t\n ', 42]) assert.equal(normalizeFocusTitle(value), 'Focus session')
  assert.equal(normalizeFocusTitle('  อ่านหนังสือ  '), 'อ่านหนังสือ')
})

test('title limits preserve full Unicode characters', () => {
  const title = normalizeFocusTitle('🌱'.repeat(121))
  assert.equal([...title].length, 120)
  assert.equal(title, '🌱'.repeat(120))
})
