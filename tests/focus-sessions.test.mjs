import test from 'node:test'
import assert from 'node:assert/strict'
import { OWNER_UID, SOURCE_OWNER_ID, dayKey, userPath } from '../src/lib/account.ts'
import { emptyProfile, parseBackup, parseProfile, parseSession } from '../src/lib/focus-data.ts'
import { importBackup, loadOverview, loadSessionPage, loadHistoryDays, saveFocus, saveSelectedCompanion } from '../src/lib/focus-sessions.ts'
import { fakeStore } from './fake-focus-store.mjs'

const base = userPath(OWNER_UID)
const progress = `${base}/state/progress`
const row = (number = 1, completedAt = '2026-10-15T08:00:00.000Z') => ({
  id: `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`,
  title: 'Focus session', startedAt: new Date(Date.parse(completedAt) - 1500000).toISOString(), completedAt, seconds: 1500,
})
const completed = value => ({ id: value.id, title: value.title, startedAt: value.startedAt, completedAt: value.completedAt })
const rawBackup = (rows, selected = 'moss') => JSON.stringify({
  focus_sessions: rows.map(value => ({ user_id: SOURCE_OWNER_ID, id: value.id, title: value.title, started_at: value.startedAt, finished_at: value.completedAt, duration_seconds: value.seconds, session_type: 'focus', status: 'completed' })),
  companion_preferences: [{ user_id: SOURCE_OWNER_ID, selected_companion: selected }],
})
const readyStore = () => fakeStore([[progress, { ...emptyProfile(), ready: true }]])

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

test('backup preview validates ownership, preserves titles/durations and detects conflicting IDs', async () => {
  const text = rawBackup([{ ...row(), title: 'อ่านหนังสือ 🐦', seconds: 600 }, row(2)])
  const backup = await parseBackup(text)
  assert.equal(backup.summary.seconds, 2100)
  assert.equal(backup.sessions[0].title, 'อ่านหนังสือ 🐦')
  assert.equal(backup.fingerprint, (await parseBackup(text)).fingerprint)
  assert.equal((await parseBackup(rawBackup([row(), row()]))).sessions.length, 1)
  await assert.rejects(parseBackup(rawBackup([row(), { ...row(), title: 'different' }])), /Conflicting duplicate/)
  await assert.rejects(parseBackup(text.replaceAll(SOURCE_OWNER_ID, 'another-account')), /another account/)
  await assert.rejects(parseBackup(rawBackup([row()], 'rabbit')), /undiscovered/)
  await assert.rejects(parseBackup('{}'), /original JSON/)
})

test('imports are bounded, resumable, idempotent and verify the final summary before enabling the timer', async () => {
  const store = fakeStore()
  const backup = await parseBackup(rawBackup(Array.from({ length: 26 }, (_, index) => row(index + 1))))
  store.failTransaction = 2
  await assert.rejects(importBackup(store, OWNER_UID, backup, () => {}), /Disconnected/)
  assert.equal(store.data.get(progress).sessions, 25)
  assert.equal(store.data.get(progress).ready, false)
  await assert.rejects(saveFocus(store, OWNER_UID, completed(row(100))), /Import saved/)
  store.failTransaction = 0
  const restored = await importBackup(store, OWNER_UID, backup, () => {})
  assert.equal(restored.sessions, 26)
  assert.equal(restored.seconds, 26 * 1500)
  assert.equal(restored.ready, true)
  assert.equal(store.data.get(`${base}/days/2026-10-15`).sessions, 26)
  store.calls.writes.length = 0
  await importBackup(store, OWNER_UID, backup, () => {})
  assert.equal(store.calls.writes.length, 0)
  await assert.rejects(importBackup(store, OWNER_UID, await parseBackup(rawBackup([row(100)])), () => {}), /different import/)
})

test('lost import responses resume safely and empty backups initialize once', async () => {
  const store = fakeStore()
  const backup = await parseBackup(rawBackup([row()], 'bird'))
  store.loseResponse = true
  await assert.rejects(importBackup(store, OWNER_UID, backup, () => {}), /Response lost/)
  const result = await importBackup(store, OWNER_UID, backup, () => {})
  assert.equal(result.sessions, 1)
  assert.equal(result.selected, 'bird')
  const empty = await importBackup(fakeStore(), OWNER_UID, await parseBackup(rawBackup([])), () => {})
  assert.equal(empty.ready, true)
  assert.equal(empty.sessions, 0)
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

test('import chunks have a predictable maximum document budget even across distinct days', async () => {
  const store = fakeStore()
  const rows = Array.from({ length: 26 }, (_, index) => row(index + 1, new Date(Date.parse('2026-09-01T08:00:00Z') + index * 86400000).toISOString()))
  await importBackup(store, OWNER_UID, await parseBackup(rawBackup(rows)), () => {})
  assert.deepEqual(store.calls.batches, [{ reads: 51, writes: 51 }, { reads: 3, writes: 3 }])
  assert.equal(store.calls.get.length, 55)
})

test('local validation rejects bad backup titles and incomplete rows before importing', async () => {
  await assert.rejects(parseBackup(rawBackup([{ ...row(), title: 'x'.repeat(121) }])), /Invalid backup title/)
  const backup = JSON.parse(rawBackup([row()]))
  backup.focus_sessions[0].started_at = 'not-a-date'
  await assert.rejects(parseBackup(JSON.stringify(backup)), /Invalid focus session/)
  const ignored = JSON.parse(rawBackup([row()]))
  ignored.focus_sessions[0].status = 'paused'
  assert.equal((await parseBackup(JSON.stringify(ignored))).skipped, 1)
})

test('orphaned/conflicting data cannot enable an import with incorrect totals', async () => {
  const value = row()
  const store = fakeStore([[`${base}/sessions/${value.id}`, value]])
  await assert.rejects(importBackup(store, OWNER_UID, await parseBackup(rawBackup([value])), () => {}), /summary does not match/)
  assert.equal(store.data.has(progress), false)
  assert.equal(store.calls.writes.length, 0)
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

test('Windows UTF-8 BOM backups and variable-duration records round-trip without extra rewards', async () => {
  const backup = await parseBackup('\uFEFF' + rawBackup([{ ...row(), seconds: 600, title: 'อ่านหนังสือ 🐦' }], 'bird'))
  const store = fakeStore()
  const profile = await importBackup(store, OWNER_UID, backup, () => {})
  assert.equal(profile.sessions, 1)
  assert.equal(profile.seconds, 600)
  assert.equal(profile.selected, 'bird')
  assert.equal(store.data.get(`${base}/sessions/${row().id}`).title, 'อ่านหนังสือ 🐦')
})
