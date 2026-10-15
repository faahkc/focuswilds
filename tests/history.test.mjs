import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { historyRange, summarizeHistory } from '../src/lib/history.ts'
import { loadFocusHistory } from '../src/lib/focus-sessions.ts'

const userId = '00000000-0000-4000-8000-000000000001'
const now = Date.parse('2026-10-15T08:00:00Z')
const client = fetch => createClient('https://example.supabase.co', 'test-public-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch },
})

function inTimezone(timezone, check) {
  const previous = process.env.TZ
  process.env.TZ = timezone
  try { check() } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
}

test('7-day and 30-day ranges include today, while all time has no lower cutoff', () => {
  inTimezone('Asia/Bangkok', () => {
    assert.deepEqual(historyRange(7, now), { start: '2026-10-08T17:00:00.000Z', end: '2026-10-15T17:00:00.000Z' })
    assert.deepEqual(historyRange(30, now), { start: '2026-09-15T17:00:00.000Z', end: '2026-10-15T17:00:00.000Z' })
    assert.deepEqual(historyRange('all', now), { start: null, end: '2026-10-15T17:00:00.000Z' })
  })
})

test('history follows calendar days over daylight-saving and year boundaries', () => {
  inTimezone('America/New_York', () => {
    const range = historyRange(7, Date.parse('2026-03-10T12:00:00Z'))
    assert.equal(Date.parse(range.end) - Date.parse(range.start), 167 * 60 * 60_000)
  })
  inTimezone('Asia/Bangkok', () => {
    assert.equal(historyRange(7, Date.parse('2026-01-03T08:00:00Z')).start, '2025-12-27T17:00:00.000Z')
  })
})

test('history groups by local completion date, sums recorded durations, and sorts newest first', () => {
  inTimezone('Asia/Bangkok', () => {
    const rows = [
      { finished_at: '2026-10-14T16:59:59Z', duration_seconds: 60 },
      { finished_at: '2026-10-14T17:00:00Z', duration_seconds: 1500 },
      { finished_at: '2026-10-15T08:00:00Z', duration_seconds: 600 },
    ]
    assert.deepEqual(summarizeHistory(rows), { sessions: 3, minutes: 36, entries: rows.map(row => ({ ...row, title: 'Focus session' })), days: [
      { date: '2026-10-15', sessions: 2, minutes: 35 },
      { date: '2026-10-14', sessions: 1, minutes: 1 },
    ] })
    assert.deepEqual(summarizeHistory([]), { sessions: 0, minutes: 0, days: [], entries: [] })
  })
})

test('history requests only saved focus sessions for this account and the selected period', async () => {
  for (const period of [7, 30, 'all']) {
    const expected = historyRange(period, now)
    const api = client(async (input, options) => {
      assert.equal(options.method, 'GET')
      const params = new URL(input).searchParams
      assert.equal(params.get('user_id'), `eq.${userId}`)
      assert.equal(params.get('status'), 'eq.completed')
      assert.equal(params.get('session_type'), 'eq.focus')
      assert.equal(params.get('select'), 'id,title,finished_at,duration_seconds')
      assert.deepEqual(params.getAll('finished_at'), [`lt.${expected.end}`, ...(expected.start ? [`gte.${expected.start}`] : [])])
      return Response.json([])
    })
    assert.deepEqual(await loadFocusHistory(api, userId, period, now), { sessions: 0, minutes: 0, days: [], entries: [] })
  }
})

test('all-time history includes old records and every page beyond the API limit', async () => {
  let calls = 0
  const api = client(async input => {
    assert.equal(new URL(input).searchParams.get('offset'), String(calls * 1000))
    return Response.json(calls++ === 0
      ? Array.from({ length: 1000 }, () => ({ finished_at: '2026-10-15T08:00:00Z', duration_seconds: 1500 }))
      : [{ finished_at: '2020-01-01T08:00:00Z', duration_seconds: 600 }])
  })
  const history = await loadFocusHistory(api, userId, 'all', now)
  assert.equal(calls, 2)
  assert.equal(history.sessions, 1001)
  assert.equal(history.minutes, 25010)
  assert.equal(history.days.length, 2)
})

test('a failed later history page rejects the result instead of showing partial totals', async () => {
  let calls = 0
  const api = client(async () => calls++ === 0
    ? Response.json(Array.from({ length: 1000 }, () => ({ finished_at: '2026-10-15T08:00:00Z', duration_seconds: 1500 })))
    : Response.json({ code: '42501', message: 'Permission denied' }, { status: 403 }))
  await assert.rejects(loadFocusHistory(api, userId, 'all', now), { code: '42501' })
})

test('individual history entries preserve named sessions and default old or blank names', () => {
  const rows = [
    { id: 'first', title: '  อ่านหนังสือ  ', finished_at: '2026-10-15T08:00:00Z', duration_seconds: 1500 },
    { id: 'second', title: ' ', finished_at: '2026-10-15T07:00:00Z', duration_seconds: 1500 },
  ]
  const history = summarizeHistory(rows)
  assert.deepEqual(history.entries.map(row => [row.id, row.title]), [['first', 'อ่านหนังสือ'], ['second', 'Focus session']])
  assert.equal(history.sessions, 2)
  assert.equal(history.minutes, 50)
})
