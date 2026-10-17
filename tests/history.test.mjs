import test from 'node:test'
import assert from 'node:assert/strict'
import { historyRange } from '../src/lib/history.ts'

test('history uses Thailand calendar days even on devices in other timezones', () => {
  const previous = process.env.TZ
  try {
    for (const timezone of ['Asia/Bangkok', 'America/New_York', 'UTC']) {
      process.env.TZ = timezone
      const now = Date.parse('2026-10-15T08:00:00Z')
      assert.deepEqual(historyRange(7, now), { start: '2026-10-08T17:00:00.000Z', end: '2026-10-15T17:00:00.000Z' })
      assert.equal(historyRange(30, now).start, '2026-09-15T17:00:00.000Z')
      assert.equal(historyRange('all', now).start, null)
      assert.equal(historyRange(7, Date.parse('2026-01-03T08:00:00Z')).start, '2025-12-27T17:00:00.000Z')
    }
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})
