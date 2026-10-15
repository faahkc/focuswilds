import test from 'node:test'
import assert from 'node:assert/strict'
import { OWNER_UID, dayKey, userPath } from '../src/lib/account.ts'
import { parseProfile, parseSession } from '../src/lib/focus-data.ts'
import { loadOverview, loadSessionPage, loadHistoryDays, saveFocus, saveSelectedCompanion } from '../src/lib/focus-sessions.ts'
import { fakeStore } from './fake-focus-store.mjs'

const base = userPath(OWNER_UID)
const progress = `${base}/state/progress`
const row = (number = 1, completedAt = '2026-10-15T08:00:00.000Z') => ({
  id: `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`,
  title: 'Focus session', startedAt: new Date(Date.parse(completedAt) - 1500000).toISOString(), completedAt, seconds: 1500,
})
const completed = value => ({ id: value.id, title: value.title, startedAt: value.startedAt, completedAt: value.completedAt })
const emptyProfile = () => ({ version: 1, revision: 0, ready: false, sessions: 0, seconds: 0, encounters: [0, 0, 0], latest: null, selected: 'moss', migration: null })
const readyStore = () => fakeStore([[progress, { ...emptyProfile(), ready: true }]])

test('existing migrated progress stays readable and new saves preserve its totals and metadata', async () => {
  const existing = { ...emptyProfile(), ready: true, revision: 4, sessions: 1, seconds: 600,
    encounters: [0, 1, 0], latest: { id: row().id, finishedAt: row().completedAt }, selected: 'bird',
    migration: { fingerprint: 'a'.repeat(64), processed: 1, total: 1 } }
  const store = fakeStore([[progress, existing], [`${base}/days/2026-10-15`, { day: '2026-10-15', sessions: 1, seconds: 600 }]])
  assert.deepEqual((await loadOverview(store, OWNER_UID, '2026-10-15')).profile, existing)
  assert.equal(store.calls.writes.length, 0)
  const saved = await saveFocus(store, OWNER_UID, completed(row(2)))
  assert.equal(saved.profile.sessions, 2)
  assert.equal(saved.profile.seconds, 2100)
  assert.equal(saved.profile.selected, 'bird')
  assert.deepEqual(saved.profile.migration, existing.migration)
  assert.equal(saved.day.seconds, 2100)
  assert.equal(store.calls.writes.length, 3)
})

test('missing or incomplete progress is never initialized or overwritten automatically', async () => {
  const missing = fakeStore()
  assert.equal((await loadOverview(missing, OWNER_UID, '2026-10-15')).profile, null)
  assert.equal(missing.calls.writes.length, 0)
  const incomplete = fakeStore([[progress, emptyProfile()]])
  assert.equal((await loadOverview(incomplete, OWNER_UID, '2026-10-15')).profile.ready, false)
  await assert.rejects(saveFocus(incomplete, OWNER_UID, completed(row())), /not ready/)
  await assert.rejects(saveSelectedCompanion(incomplete, OWNER_UID, 'moss'), /not ready/)
  assert.equal(incomplete.calls.writes.length, 0)
})

test('overview costs two document reads and never scans history', async () => {
  const store = readyStore()
  const result = await loadOverview(store, OWNER_UID, '2026-10-15')
  assert.equal(result.profile.sessions, 0)
  assert.deepEqual(result.day, { day: '2026-10-15', sessions: 0, seconds: 0 })
  assert.equal(store.calls.get.length, 2)
  assert.equal(store.calls.list.length, 0)
  assert.equal(store.calls.writes.length, 0)
})

test('a save atomically writes session, day and summary; duplicate retries do not award twice', async () => {
  const store = readyStore()
  const first = await saveFocus(store, OWNER_UID, completed(row()))
  assert.equal(first.profile.sessions, 1)
  assert.equal(first.profile.seconds, 1500)
  assert.equal(first.profile.revision, 1)
  assert.equal(first.day.sessions, 1)
  assert.deepEqual(first.profile.encounters, [0, 1, 0])
  assert.equal(store.calls.get.length, 3)
  assert.equal(store.calls.writes.length, 3)
  store.calls.writes.length = 0
  const second = await saveFocus(store, OWNER_UID, completed(row()))
  assert.deepEqual(second, first)
  assert.equal(store.calls.writes.length, 0)
  assert.equal(store.calls.list.length, 0)
})

test('an uncertain commit and simultaneous duplicate callers preserve exactly one reward', async () => {
  const store = readyStore()
  store.loseResponse = true
  await assert.rejects(saveFocus(store, OWNER_UID, completed(row())), /Response lost/)
  const [a, b] = await Promise.all([saveFocus(store, OWNER_UID, completed(row())), saveFocus(store, OWNER_UID, completed(row()))])
  assert.equal(a.profile.sessions, 1)
  assert.deepEqual(a, b)
  assert.equal(store.calls.transactions, 2)
})

test('failed transactions, wrong accounts and invalid data never turn into empty or saved progress', async () => {
  const store = readyStore()
  store.failTransaction = 1
  await assert.rejects(saveFocus(store, OWNER_UID, completed(row())), /Disconnected/)
  assert.equal(store.calls.writes.length, 0)
  assert.throws(() => loadOverview(store, 'another-account', '2026-10-15'), /not allowed/)
  assert.throws(() => saveFocus(store, OWNER_UID, { ...completed(row()), id: '../other' }), /Invalid/)
  assert.throws(() => parseSession({ ...row(), seconds: -1 }), /Invalid/)
  assert.throws(() => parseProfile({ ...emptyProfile(), encounters: [1, 0, 0] }), /Invalid/)
  await assert.rejects(saveFocus(fakeStore(), OWNER_UID, completed(row())), /Invalid/)
})

test('companion selection validates discoveries and unchanged choices write nothing', async () => {
  const store = readyStore()
  await assert.rejects(saveSelectedCompanion(store, OWNER_UID, 'rabbit'), /not been discovered/)
  await saveFocus(store, OWNER_UID, completed(row()))
  store.calls.writes.length = 0
  const selected = await saveSelectedCompanion(store, OWNER_UID, 'bird')
  assert.equal(selected.selected, 'bird')
  assert.equal(selected.sessions, 1)
  assert.equal(selected.revision, 2)
  assert.deepEqual(store.calls.writes, [progress])
  store.calls.writes.length = 0
  assert.deepEqual(await saveSelectedCompanion(store, OWNER_UID, 'bird'), selected)
  assert.equal(store.calls.writes.length, 0)
  await assert.rejects(saveSelectedCompanion(store, OWNER_UID, 'unknown'), /Unknown companion/)
})

test('history requests bounded cursor pages and does not scan beyond the requested page', async () => {
  const rows = Array.from({ length: 51 }, (_, index) => row(index + 1))
  const store = fakeStore(rows.map(value => [`${base}/sessions/${value.id}`, value]))
  const first = await loadSessionPage(store, OWNER_UID, 'all', Date.parse('2026-10-15T08:00:00Z'))
  const second = await loadSessionPage(store, OWNER_UID, 'all', Date.parse('2026-10-15T08:00:00Z'), first.cursor)
  const third = await loadSessionPage(store, OWNER_UID, 'all', Date.parse('2026-10-15T08:00:00Z'), second.cursor)
  assert.equal(first.entries.length, 25)
  assert.equal(second.entries.length, 25)
  assert.equal(third.entries.length, 1)
  assert.equal(third.cursor, null)
  assert.equal(new Set([...first.entries, ...second.entries, ...third.entries].map(value => value.id)).size, 51)
  assert.equal(store.calls.list.length, 3)
  assert.ok(store.calls.list.every(call => call.options.limit === 25))
  assert.equal(store.calls.get.length, 0)
})

test('period totals query only bounded day summaries, while all-time days are paginated', async () => {
  const store = readyStore()
  for (const period of [7, 30, 'all']) {
    await loadHistoryDays(store, OWNER_UID, period, Date.parse('2026-10-15T08:00:00Z'))
    const { path, options } = store.calls.list.at(-1)
    assert.equal(path, `${base}/days`)
    assert.equal(options.limit, period === 'all' ? 25 : period)
    assert.equal(options.end, '2026-10-16')
  }
  assert.equal(store.calls.list[0].options.start, '2026-10-09')
})

test('late saves retain their original completion day and do not reset current-day progress', async () => {
  const store = readyStore()
  await saveFocus(store, OWNER_UID, completed(row(1, '2026-10-14T16:59:59Z')))
  await saveFocus(store, OWNER_UID, completed(row(2, '2026-10-14T17:00:00Z')))
  assert.equal((await loadOverview(store, OWNER_UID, '2026-10-14')).day.sessions, 1)
  assert.equal((await loadOverview(store, OWNER_UID, '2026-10-15')).day.sessions, 1)
  assert.equal(dayKey('2026-10-14T17:00:00Z'), '2026-10-15')
})

test('conflicting payloads cannot silently reuse a pending or committed UUID', async () => {
  const store = readyStore()
  const first = saveFocus(store, OWNER_UID, completed(row()))
  assert.throws(() => saveFocus(store, OWNER_UID, { ...completed(row()), title: 'different' }), /Conflicting pending/)
  await first
  await assert.rejects(saveFocus(store, OWNER_UID, { ...completed(row()), title: 'different' }), /conflicts/)
  assert.equal(store.data.get(progress).sessions, 1)
})

test('overview caching coalesces repeated mounts and refresh remains explicit', async () => {
  const store = readyStore()
  const [first, second] = await Promise.all([loadOverview(store, OWNER_UID, '2026-10-15'), loadOverview(store, OWNER_UID, '2026-10-15')])
  assert.deepEqual(first, second)
  assert.equal(store.calls.get.length, 2)
  await loadOverview(store, OWNER_UID, '2026-10-15')
  assert.equal(store.calls.get.length, 2)
  await loadOverview(store, OWNER_UID, '2026-10-15', true)
  assert.equal(store.calls.get.length, 4)
  await saveFocus(store, OWNER_UID, completed(row()))
  assert.equal((await loadOverview(store, OWNER_UID, '2026-10-15')).profile.sessions, 1)
  assert.equal(store.calls.get.length, 9)
})
