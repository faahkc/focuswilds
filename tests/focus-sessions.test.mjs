import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { saveFocus, loadProgress, loadCompletedFocusCount, loadDiscoveryJournal } from '../src/lib/focus-sessions.ts'

const userId = '00000000-0000-4000-8000-000000000001'
const session = {
  id: '00000000-0000-4000-8000-000000000002',
  startedAt: '2026-10-15T08:00:00.000Z',
  completedAt: '2026-10-15T08:25:00.000Z',
  title: 'อ่านหนังสือ',
}
const client = fetch => createClient('https://example.supabase.co', 'test-public-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch },
})

test('a lost save response can be retried with the same ID and without updating old data', async () => {
  const rows = new Map()
  let attempts = 0
  const api = client(async (input, options) => {
    const url = new URL(input)
    if (options.method === 'HEAD') return new Response(null, { headers: { 'Content-Range': `*/${rows.size}` } })
    if (options.method === 'GET') return Response.json([...rows.values()].map(row => ({ id: row.id, finished_at: row.finished_at })))
    assert.equal(url.searchParams.get('on_conflict'), 'id')
    assert.match(new Headers(options.headers).get('prefer'), /resolution=ignore-duplicates/)
    const row = JSON.parse(options.body)
    assert.equal(row.user_id, userId)
    assert.equal(row.status, 'completed')
    assert.equal(row.session_type, 'focus')
    assert.equal(row.remaining_seconds, 0)
    assert.equal(row.duration_seconds, 1500)
    assert.equal(row.started_at, session.startedAt)
    assert.equal(row.finished_at, session.completedAt)
    assert.equal(row.title, session.title)
    if (!rows.has(row.id)) rows.set(row.id, row)
    if (++attempts === 1) throw new Error('Response lost after database commit')
    return new Response(null, { status: 201 })
  })
  assert.equal(await loadCompletedFocusCount(api, userId), 0)
  assert.deepEqual(await loadDiscoveryJournal(api, userId), { encounters: [0, 0, 0], latest: null })
  await assert.rejects(saveFocus(api, userId, session))
  await saveFocus(api, userId, session)
  assert.equal(attempts, 2)
  assert.equal(rows.size, 1)
  assert.equal(await loadCompletedFocusCount(api, userId), 1)
  assert.equal(await loadCompletedFocusCount(api, userId), 1)
  const journal = await loadDiscoveryJournal(api, userId)
  assert.deepEqual(journal.encounters, [0, 0, 1])
  assert.deepEqual(journal.latest, { id: session.id, finishedAt: session.completedAt })
  assert.deepEqual(await loadDiscoveryJournal(api, userId), journal)
})

test('daily totals include existing variable-duration focus sessions across API pages', async () => {
  let calls = 0
  const api = client(async input => {
    const url = new URL(input)
    assert.equal(url.searchParams.get('user_id'), `eq.${userId}`)
    assert.equal(url.searchParams.get('status'), 'eq.completed')
    assert.equal(url.searchParams.get('session_type'), 'eq.focus')
    assert.deepEqual(url.searchParams.getAll('finished_at'), ['gte.2026-10-15T00:00:00Z', 'lt.2026-10-16T00:00:00Z'])
    assert.equal(url.searchParams.get('offset'), String(calls * 1000))
    const rows = calls++ === 0 ? Array.from({ length: 1000 }, () => ({ duration_seconds: 600 }))
      : [{ duration_seconds: 60 }, { duration_seconds: 120 }]
    return Response.json(rows)
  })
  assert.deepEqual(await loadProgress(api, userId, '2026-10-15T00:00:00Z', '2026-10-16T00:00:00Z'), {
    sessions: 1002, minutes: 10003,
  })
  assert.equal(calls, 2)
})

test('permission and network failures stay errors rather than appearing saved or empty', async () => {
  const denied = client(async () => Response.json({ message: 'RLS denied', code: '42501' }, { status: 403 }))
  await assert.rejects(saveFocus(denied, userId, session), { code: '42501' })
  await assert.rejects(loadProgress(denied, userId, session.startedAt, session.completedAt), { code: '42501' })
  await assert.rejects(loadCompletedFocusCount(denied, userId), { code: '42501' })
  await assert.rejects(loadDiscoveryJournal(denied, userId), { code: '42501' })
  const offline = client(async () => { throw new Error('Offline') })
  await assert.rejects(loadProgress(offline, userId, session.startedAt, session.completedAt))
})

test('the journal reads saved focus history for the account across API pages', async () => {
  let calls = 0
  const api = client(async input => {
    const params = new URL(input).searchParams
    assert.equal(params.get('user_id'), `eq.${userId}`)
    assert.equal(params.get('status'), 'eq.completed')
    assert.equal(params.get('session_type'), 'eq.focus')
    assert.equal(params.has('finished_at'), false)
    assert.equal(params.get('order'), 'finished_at.desc,id.asc')
    assert.equal(params.get('offset'), String(calls * 1000))
    const offset = calls++ * 1000
    return Response.json(Array.from({ length: offset === 0 ? 1000 : 2 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${(offset + index).toString(16).padStart(12, '0')}`,
      finished_at: session.completedAt,
    })))
  })
  const journal = await loadDiscoveryJournal(api, userId)
  assert.deepEqual(journal.encounters, [334, 334, 334])
  assert.deepEqual(journal.latest, { id: '00000000-0000-4000-8000-000000000000', finishedAt: session.completedAt })
  assert.equal(calls, 2)
})

test('a failed later journal page does not return a partial collection', async () => {
  let calls = 0
  const api = client(async () => calls++ === 0
    ? Response.json(Array.from({ length: 1000 }, () => ({ id: session.id, finished_at: session.completedAt })))
    : Response.json({ message: 'Load failed', code: '42501' }, { status: 403 }))
  await assert.rejects(loadDiscoveryJournal(api, userId), { code: '42501' })
})

test('companion EXP counts only this account’s completed focus sessions across all dates', async () => {
  const rows = [
    { user_id: userId, session_type: 'focus', status: 'completed', finished_at: '2026-01-01T00:00:00Z' },
    { user_id: userId, session_type: 'focus', status: 'completed', finished_at: session.completedAt },
    { user_id: userId, session_type: 'short_break', status: 'completed' },
    { user_id: userId, session_type: 'long_break', status: 'completed' },
    { user_id: userId, session_type: 'focus', status: 'cancelled' },
    { user_id: userId, session_type: 'focus', status: 'running' },
    { user_id: userId, session_type: 'focus', status: 'paused' },
    { user_id: session.id, session_type: 'focus', status: 'completed' },
  ]
  const api = client(async (input, options) => {
    assert.equal(options.method, 'HEAD')
    const params = new URL(input).searchParams
    assert.equal(params.has('finished_at'), false)
    const matching = rows.filter(row => ['user_id', 'session_type', 'status']
      .every(key => params.get(key) === `eq.${row[key]}`))
    return new Response(null, { headers: { 'Content-Range': `*/${matching.length}` } })
  })
  assert.equal(await loadCompletedFocusCount(api, userId), 2)
})

test('the companion uses an exact count beyond the row limit and rejects missing counts', async () => {
  const api = client(async () => new Response(null, { headers: { 'Content-Range': '*/1501' } }))
  assert.equal(await loadCompletedFocusCount(api, userId), 1501)
  const missing = client(async () => new Response(null))
  await assert.rejects(loadCompletedFocusCount(missing, userId), /count was not returned/)
})
