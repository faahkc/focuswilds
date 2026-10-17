import test from 'node:test'
import assert from 'node:assert/strict'
import { OWNER_UID } from '../src/lib/account.ts'
import { createShelter } from '../src/lib/shelter.ts'
import { cleanupLegacyChunk, validateLegacyPaths } from '../src/lib/legacy-cleanup.ts'

const base = `users/${OWNER_UID}`
function fixture() {
  const data = new Map([[`${base}/shelter/state`, createShelter()], [`${base}/state/progress`, { sessions: 31 }],
    [`${base}/shelterDays/2026-10-17`, { seconds: 60 }], [`${base}/shelterSessions/keep`, { seconds: 60 }],
    [`${base}/shelterOperations/keep`, { revision: 1 }], ['users/other/sessions/keep', {}]])
  for (let i = 0; i < 31; i++) data.set(`${base}/sessions/${i}`, { seconds: 1500 })
  for (let i = 0; i < 2; i++) data.set(`${base}/days/day-${i}`, {})
  const calls = { reads: [], lists: [], batches: [] }
  const store = {
    data, calls, fail: false, lost: false,
    async get(path) { calls.reads.push(path); return structuredClone(data.get(path) ?? null) },
    async list(path, limit) { calls.lists.push({ path, limit }); return [...data.keys()].filter(key => key.startsWith(`${path}/`)).sort().slice(0, limit) },
    async remove(paths) {
      if (store.fail) { store.fail = false; throw new Error('Denied') }
      calls.batches.push([...paths]); paths.forEach(path => data.delete(path))
      if (store.lost) { store.lost = false; throw new Error('Response lost') }
    },
  }
  return store
}

test('cleanup processes bounded sessions then days then progress, preserving all shelter and other-account data', async () => {
  const store = fixture()
  const protectedRows = [...store.data].filter(([path]) => path.includes('/shelter') || path.startsWith('users/other/'))
  const results = []
  for (let i = 0; i < 4; i++) results.push(await cleanupLegacyChunk(store, OWNER_UID))
  assert.deepEqual(results, [{ processed: 20, done: false }, { processed: 11, done: false }, { processed: 2, done: false }, { processed: 1, done: true }])
  assert.deepEqual([...store.data], protectedRows)
  assert.ok(store.calls.batches.every(paths => paths.length <= 20))
  assert.ok(store.calls.lists.every(query => query.limit === 20))
  assert.equal(store.calls.reads.filter(path => path.endsWith('/shelter/state')).length, 4)
  assert.deepEqual(await cleanupLegacyChunk(store, OWNER_UID), { processed: 0, done: true })
})

test('failed or lost-response batches can resume without restoring old data or changing the fort', async () => {
  const store = fixture(), snapshot = structuredClone([...store.data])
  store.fail = true
  await assert.rejects(cleanupLegacyChunk(store, OWNER_UID))
  assert.deepEqual([...store.data], snapshot)
  store.lost = true
  await assert.rejects(cleanupLegacyChunk(store, OWNER_UID))
  assert.equal([...store.data.keys()].filter(path => path.startsWith(`${base}/sessions/`)).length, 11)
  assert.deepEqual(await cleanupLegacyChunk(store, OWNER_UID), { processed: 11, done: false })
  assert.deepEqual(store.data.get(`${base}/shelter/state`), createShelter())
})

test('cleanup rejects missing/corrupt shelter, wrong accounts and unsafe or oversized paths before deleting', async () => {
  for (const value of [null, {}, { ...createShelter(), language: 'bad' }]) {
    const store = fixture()
    store.data.set(`${base}/shelter/state`, value)
    await assert.rejects(cleanupLegacyChunk(store, OWNER_UID))
    assert.equal(store.calls.lists.length, 0)
    assert.equal(store.calls.batches.length, 0)
  }
  assert.throws(() => cleanupLegacyChunk(fixture(), 'other'))
  for (const paths of [[], [`${base}/shelter/state`], [`${base}/shelterSessions/one`], ['users/other/sessions/one'],
    [`${base}/sessions/a/nested/b`], [`${base}/sessions/`], Array(21).fill(`${base}/sessions/a`), [`${base}/sessions/a`, `${base}/sessions/a`]]) {
    assert.throws(() => validateLegacyPaths(OWNER_UID, paths))
  }
  for (const paths of [[`${base}/shelter/state`], [`${base}/days/day-1`], Array.from({ length: 21 }, (_, i) => `${base}/sessions/${i}`)]) {
    const store = fixture(); store.list = async () => paths
    await assert.rejects(cleanupLegacyChunk(store, OWNER_UID))
    assert.equal(store.calls.batches.length, 0)
  }
})

test('simultaneous cleanup requests share the same bounded operation', async () => {
  const store = fixture()
  const first = cleanupLegacyChunk(store, OWNER_UID), second = cleanupLegacyChunk(store, OWNER_UID)
  assert.equal(first, second)
  await Promise.all([first, second])
  assert.equal(store.calls.batches.length, 1)
  assert.equal(store.calls.reads.length, 1)
})
