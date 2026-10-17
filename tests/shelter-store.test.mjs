import test from 'node:test'
import assert from 'node:assert/strict'
import { OWNER_UID } from '../src/lib/account.ts'
import { createShelter } from '../src/lib/shelter.ts'
import { loadShelter, initializeShelter, saveShelterOperation, shelterPath, loadShelterSessions, loadShelterDays } from '../src/lib/shelter-store.ts'
import { fakeStore } from './fake-focus-store.mjs'

const path = shelterPath(OWNER_UID)
const base = `users/${OWNER_UID}`
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`
const operation = (number = 1, revision = 0) => ({
  id: id(number), revision, command: { type: 'focus', seconds: 900, targetSeconds: 900, completed: true },
  focus: { title: 'Keep the fire', startedAt: '2026-10-16T16:50:00.000Z', completedAt: '2026-10-16T17:05:00.000Z' },
})
function serialStore(seed = [[path, createShelter()]]) {
  const store = fakeStore(seed), transaction = store.transaction
  let previous = Promise.resolve()
  store.transaction = work => {
    const result = previous.then(() => transaction(work))
    previous = result.catch(() => {})
    return result
  }
  return store
}

test('load coalesces reads, returns independent snapshots and refresh is explicit', async () => {
  const store = serialStore()
  const [a, b] = await Promise.all([loadShelter(store, OWNER_UID), loadShelter(store, OWNER_UID)])
  assert.equal(store.calls.get.length, 1)
  a.inventory.wood = 0
  assert.equal(b.inventory.wood, 6)
  assert.equal((await loadShelter(store, OWNER_UID)).inventory.wood, 6)
  await Promise.all([loadShelter(store, OWNER_UID, true), loadShelter(store, OWNER_UID, true)])
  assert.equal(store.calls.get.length, 2)
  assert.equal(store.calls.list.length, 0)
})

test('missing state requires explicit initialization and corrupt state is never overwritten', async () => {
  const store = serialStore([])
  assert.equal(await loadShelter(store, OWNER_UID), null)
  assert.equal(store.calls.writes.length, 0)
  const [a, b] = await Promise.all([initializeShelter(store, OWNER_UID), initializeShelter(store, OWNER_UID)])
  assert.deepEqual(a, b)
  assert.equal(store.calls.writes.length, 1)
  assert.deepEqual(store.calls.batches, [{ reads: 1, writes: 1 }])
  const corrupt = serialStore([[path, { schema: 1, language: 'fr' }]])
  await assert.rejects(loadShelter(corrupt, OWNER_UID))
  await assert.rejects(initializeShelter(corrupt, OWNER_UID))
  assert.equal(corrupt.calls.writes.length, 0)
  corrupt.data.set(path, createShelter())
  assert.equal((await loadShelter(corrupt, OWNER_UID)).language, 'en', 'failed loads do not poison the cache')
})

test('focus atomically saves state, receipt, session and Bangkok daily summary with documented budget', async () => {
  const store = serialStore()
  const result = await saveShelterOperation(store, OWNER_UID, operation())
  assert.equal(result.focusSeconds, 900)
  assert.equal(result.completedSessions, 1)
  assert.deepEqual(store.calls.batches, [{ reads: 3, writes: 4 }])
  assert.deepEqual(store.data.get(`${base}/shelterDays/2026-10-17`), { day: '2026-10-17', sessions: 1, seconds: 900 })
  assert.equal(store.data.has(`${base}/shelterDays/2026-10-16`), false)
  const reads = store.calls.get.length
  assert.deepEqual(await loadShelter(store, OWNER_UID), result)
  assert.equal(store.calls.get.length, reads, 'reuse transaction result without rereading')
})

test('partial focus persists work without counting completion and late saves keep their own day', async () => {
  const store = serialStore()
  await saveShelterOperation(store, OWNER_UID, operation())
  const partial = operation(2, 1)
  partial.command.seconds = 200; partial.command.completed = false
  partial.focus.startedAt = '2026-10-15T12:00:00Z'; partial.focus.completedAt = '2026-10-15T12:03:20Z'
  const state = await saveShelterOperation(store, OWNER_UID, partial)
  assert.equal(state.completedSessions, 1)
  assert.equal(state.focusSeconds, 1100)
  assert.deepEqual(store.data.get(`${base}/shelterDays/2026-10-15`), { day: '2026-10-15', sessions: 0, seconds: 200 })
  assert.equal(store.data.get(`${base}/shelterSessions/${partial.id}`).completed, false)
})

test('lost responses and simultaneous duplicate saves reuse one receipt and award once', async () => {
  const store = serialStore()
  store.loseResponse = true
  await assert.rejects(saveShelterOperation(store, OWNER_UID, operation()), /Response lost/)
  const [a, b] = await Promise.all([saveShelterOperation(store, OWNER_UID, operation()), saveShelterOperation(store, OWNER_UID, operation())])
  assert.deepEqual(a, b)
  a.inventory.wood = 0
  assert.equal(b.inventory.wood, 6)
  assert.equal(b.focusSeconds, 900)
  assert.equal(store.calls.transactions, 2)
  assert.equal(store.calls.writes.length, 4)
  assert.deepEqual(store.calls.batches[1], { reads: 2, writes: 0 })
  const retry = await saveShelterOperation(store, OWNER_UID, operation())
  assert.equal(retry.completedSessions, 1)
  assert.equal(store.calls.writes.length, 4)
})

test('stale tabs and conflicting UUID payloads cannot overwrite progress', async () => {
  const store = serialStore()
  const first = saveShelterOperation(store, OWNER_UID, operation())
  const changed = operation(); changed.command.seconds = 800; changed.command.completed = false
  assert.throws(() => saveShelterOperation(store, OWNER_UID, changed), /Conflicting pending/)
  await first
  await assert.rejects(saveShelterOperation(store, OWNER_UID, changed), /Conflicting operation/)
  await assert.rejects(saveShelterOperation(store, OWNER_UID, operation(2)), /Stale shelter/)
  assert.equal(store.calls.writes.length, 4)
})

test('transaction failure makes no writes and exact retry can succeed', async () => {
  const store = serialStore()
  store.failTransaction = 1
  await assert.rejects(saveShelterOperation(store, OWNER_UID, operation()), /Disconnected/)
  assert.equal(store.calls.writes.length, 0)
  assert.equal((await saveShelterOperation(store, OWNER_UID, operation())).focusSeconds, 900)
})

test('language changes persist once, unchanged values write nothing and save failures preserve language', async () => {
  const store = serialStore()
  const preference = { id: id(1), revision: 0, command: { type: 'language', language: 'th' } }
  await saveShelterOperation(store, OWNER_UID, preference)
  assert.deepEqual(store.calls.batches[0], { reads: 2, writes: 2 })
  const readCount = store.calls.get.length
  assert.equal((await loadShelter(store, OWNER_UID)).language, 'th')
  assert.equal((await loadShelter(store, OWNER_UID)).language, 'th')
  assert.equal(store.calls.get.length, readCount)
  await saveShelterOperation(store, OWNER_UID, { ...preference, id: id(2), revision: 1 })
  assert.deepEqual(store.calls.batches[1], { reads: 2, writes: 0 })
  store.failTransaction = 3
  await assert.rejects(saveShelterOperation(store, OWNER_UID, { id: id(3), revision: 1, command: { type: 'language', language: 'en' } }))
  assert.equal((await loadShelter(store, OWNER_UID)).language, 'th')
  const otherDevice = serialStore([...store.data])
  assert.equal((await loadShelter(otherDevice, OWNER_UID)).language, 'th')
  await assert.rejects(saveShelterOperation(store, OWNER_UID, { id: id(4), revision: 1, command: { type: 'language', language: 'xx' } }))
  assert.equal(store.calls.writes.length, 2)
})

test('operations capture payloads and reject invalid metadata before writes', async () => {
  const store = serialStore(), original = operation()
  const save = saveShelterOperation(store, OWNER_UID, original)
  original.command.seconds = 1
  assert.equal((await save).focusSeconds, 900)
  for (const mutate of [
    row => { row.focus = undefined },
    row => { row.focus.title = '' },
    row => { row.focus.completedAt = row.focus.startedAt },
    row => { row.command.seconds = -1 },
    row => { row.command.targetSeconds = 10801 },
  ]) {
    const row = operation(2, 1); mutate(row)
    await assert.rejects(async () => saveShelterOperation(store, OWNER_UID, row))
  }
  await assert.rejects(async () => saveShelterOperation(store, 'other', operation()))
  assert.equal(store.calls.writes.length, 4)
})

test('history is on-demand, uses 25-session cursor pages and bounds daily reads', async () => {
  const seed = [[path, createShelter()]]
  for (let index = 1; index <= 26; index++) seed.push([`${base}/shelterSessions/${id(index)}`, { ...operation().focus, id: id(index), seconds: 900, targetSeconds: 900, completed: true }])
  const store = serialStore(seed)
  await loadShelter(store, OWNER_UID)
  assert.equal(store.calls.list.length, 0)
  const first = await loadShelterSessions(store, OWNER_UID)
  assert.equal(first.rows.length, 25)
  const second = await loadShelterSessions(store, OWNER_UID, first.cursor)
  assert.equal(second.rows.length, 1)
  assert.equal(second.cursor, null)
  await loadShelterDays(store, OWNER_UID, 30, Date.parse('2026-10-17T08:00:00Z'))
  await loadShelterDays(store, OWNER_UID, 'all', Date.parse('2026-10-17T08:00:00Z'))
  assert.deepEqual(store.calls.list.map(call => call.options.limit), [25, 25, 30, 25])
  const corrupt = serialStore([[`${base}/shelterSessions/${id(1)}`, { ...operation().focus, id: id(1), seconds: 900, targetSeconds: 900, completed: false }]])
  await assert.rejects(loadShelterSessions(corrupt, OWNER_UID), /Invalid shelter focus session/)
})
