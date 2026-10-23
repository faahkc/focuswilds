import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as history from '../src/lib/focus-history.ts'
import * as rounds from '../src/lib/focus-round.ts'
import { initialFocusSetup } from '../src/lib/focus-setup.ts'
import { OWNER_UID } from '../src/lib/account.ts'

const finished = () => rounds.changeRound(rounds.startRound(initialFocusSetup, 1000), 'finish', 13000)
function load(path, dependencies, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
    return dependencies[name]
  }, module, module.exports, ...Object.values(globals))
  return module.exports
}

function store({ documents = new Map(), loseAck = false, denied = false, stalledToken = false, skew = 0 } = {}) {
  let now = Date.parse('2026-10-22T00:00:00Z'), commits = 0, requests = 0
  const timers = new Map()
  const root = `projects/test/databases/(default)/documents/users/${OWNER_UID}`
  const counter = root + '/focus/history'
  const reply = (value, status = 200) => new Response(JSON.stringify(value), { status })
  const fetch = async (url, options) => {
    requests++
    assert.equal(options.headers.Authorization, 'Bearer token')
    assert.equal(options.headers['X-Firebase-AppCheck'], 'attestation')
    assert.equal(options.signal.aborted, false)
    assert.equal(options.cache, 'no-store')
    assert.equal(options.credentials, 'omit')
    if (denied) return reply({}, 403)
    const path = url.split('/v1/')[1]
    if (options.method === 'GET') return documents.has(path) ? reply(documents.get(path)) : reply({}, 404)
    const body = JSON.parse(options.body)
    if (path.endsWith(':runQuery')) {
      assert.equal(path, root + ':runQuery')
      const query = body.structuredQuery
      assert.equal(query.limit, 25)
      assert.deepEqual(query.from, [{ collectionId: 'focusRounds' }])
      assert.deepEqual(query.orderBy.map(order => [order.field.fieldPath, order.direction]), [['savedAt', 'DESCENDING'], ['__name__', 'DESCENDING']])
      assert.equal(query.offset, undefined)
      const rows = [...documents].filter(([name]) => name.startsWith(root + '/focusRounds/')).map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.fields.savedAt.timestampValue.localeCompare(a.fields.savedAt.timestampValue) || b.name.localeCompare(a.name))
        .filter(value => {
          if (!query.startAt) return true
          assert.equal(query.startAt.before, false)
          const [time, name] = query.startAt.values
          return value.fields.savedAt.timestampValue < time.timestampValue || (value.fields.savedAt.timestampValue === time.timestampValue && value.name < name.referenceValue)
        }).slice(0, query.limit)
      return reply(rows.length ? rows.map(document => ({ document })) : [{ readTime: new Date(now).toISOString() }])
    }
    const { writes } = body
    assert.equal(writes.length, 2)
    // Fake atomic preconditions/rate enforcement; this is not a Firestore Rules emulator.
    for (const write of writes) {
      const old = documents.get(write.update.name)
      if ((write.currentDocument.exists === false && old) || (write.currentDocument.updateTime && write.currentDocument.updateTime !== old?.updateTime)) return reply({ error: { status: 'FAILED_PRECONDITION' } }, 400)
      for (const t of write.updateTransforms) {
        assert.equal(t.setToServerValue, 'REQUEST_TIME')
        write.update.fields[t.fieldPath] = { timestampValue: new Date(now).toISOString() }
      }
    }
    const previous = documents.get(counter)?.fields
    const next = writes[1].update.fields
    const reset = !previous || now >= Date.parse(previous.windowStartedAt.timestampValue) + 60000
    const valid = Number(next.count.integerValue) === Number(previous?.count.integerValue ?? 0) + 1
      && Number(next.count.integerValue) <= history.historyCapacity
      && Number(next.windowCount.integerValue) <= history.historyRate
      && (reset ? Number(next.windowCount.integerValue) === 1 && next.windowStartedAt.timestampValue === new Date(now).toISOString()
        : next.windowStartedAt.timestampValue === previous.windowStartedAt.timestampValue && Number(next.windowCount.integerValue) === Number(previous.windowCount.integerValue) + 1)
      && next.lastRoundId.stringValue === writes[0].update.fields.roundId.stringValue
    if (!valid) return reply({}, 403)
    commits++
    for (const write of writes) documents.set(write.update.name, { fields: write.update.fields, updateTime: String(commits) })
    if (loseAck) { loseAck = false; throw Error('Acknowledgement lost') }
    return reply({})
  }
  const api = load('../src/lib/focus-records.ts', {
    './firebase': { app: { options: { projectId: 'test' } }, authHeaders: async () => ({ 'X-Firebase-AppCheck': 'attestation' }) },
    './account': { OWNER_UID }, './focus-history': history,
  }, { fetch, Date: { now: () => now + skew, parse: Date.parse }, setTimeout: fn => { const id = Symbol(); timers.set(id, fn); return id }, clearTimeout: id => timers.delete(id) })
  const user = { uid: OWNER_UID, getIdToken: async () => stalledToken ? new Promise(() => {}) : 'token' }
  return { ...api, user, documents, counter, root, advance: ms => { now += ms },
    stats: () => ({ commits, requests, timers: timers.size }), expire: () => { for (const fn of timers.values()) fn() } }
}

test('history stores actual time and distinguishes completed countdown, early end and count-up without rewards', () => {
  for (const [mode, elapsed, completion] of [['down', 0, 'ended'], ['down', 12000, 'ended'], ['down', 1500000, 'completed'], ['up', 8000000, 'ended']]) {
    const round = rounds.changeRound(rounds.startRound({ ...initialFocusSetup, mode, title: ' อ่าน ' }, 1000), 'finish', 1000 + elapsed)
    const record = history.historyRecord(round)
    assert.equal(record.elapsedMs, elapsed)
    assert.equal(record.completion, completion)
    assert.equal(record.task, 'อ่าน')
    assert.equal('coins' in record, false)
    assert.equal(rounds.restoreRound(JSON.stringify(round)).id, round.id)
  }
  for (const invalid of [rounds.startRound(initialFocusSetup, 0), { ...finished(), id: '../other' }, { ...finished(), elapsedMs: 1.5 }, { ...finished(), elapsedMs: Infinity }]) assert.throws(() => history.historyRecord(invalid))
  const legacy = finished(); delete legacy.id
  assert.ok(rounds.restoreRound(JSON.stringify(legacy)).id)
  assert.throws(() => history.historyRecord(legacy))
})

test('owner saves atomically once, deduplicates rapid submissions and verifies an existing receipt', async () => {
  const s = store(), round = finished()
  const first = s.saveFocusRound(s.user, round)
  assert.equal(first, s.saveFocusRound(s.user, round))
  assert.equal(await s.saveFocusRound(s.user, { ...round, elapsedMs: 13000 }), 'invalid')
  assert.equal(await first, 'saved')
  assert.equal(await s.saveFocusRound(s.user, round), 'saved')
  assert.equal(s.stats().commits, 1)
  assert.equal(s.stats().requests, 4)
  assert.equal(s.stats().timers, 0)
  assert.equal(s.documents.get(s.counter).fields.count.integerValue, '1')
  assert.equal(await s.saveFocusRound(s.user, { ...round, elapsedMs: 13000 }), 'invalid')
  assert.equal(s.stats().commits, 1)
})

test('lost acknowledgements and concurrent tabs reuse receipts without double counting', async () => {
  const first = store({ loseAck: true }), round = finished()
  assert.equal(await first.saveFocusRound(first.user, round), 'unavailable')
  const reopened = store({ documents: first.documents })
  assert.equal(await reopened.saveFocusRound(reopened.user, round), 'saved')
  assert.equal(reopened.stats().commits, 0)
  const a = store(), b = store({ documents: a.documents })
  assert.deepEqual(await Promise.all([a.saveFocusRound(a.user, round), b.saveFocusRound(b.user, round)]), ['saved', 'saved'])
  assert.equal(a.stats().commits + b.stats().commits, 1)
  const c = finished(), d = finished()
  assert.deepEqual(await Promise.all([a.saveFocusRound(a.user, c), b.saveFocusRound(b.user, d)]), ['saved', 'saved'])
  assert.equal(a.documents.get(a.counter).fields.count.integerValue, '3')
})

test('ordinary bursts fit, 61st new round is retained for retry, and server window resets at the boundary', async () => {
  const s = store()
  for (let i = 0; i < 60; i++) assert.equal(await s.saveFocusRound(s.user, finished()), 'saved')
  const round = finished()
  assert.equal(await s.saveFocusRound(s.user, round), 'limited')
  assert.equal(s.stats().commits, 60)
  s.advance(59999)
  assert.equal(await s.saveFocusRound(s.user, round), 'limited')
  s.advance(1)
  assert.equal(await s.saveFocusRound(s.user, round), 'saved')
  assert.equal(s.documents.get(s.counter).fields.windowCount.integerValue, '1')
  assert.equal(s.documents.get(s.counter).fields.count.integerValue, '61')
})

test('capacity, permission failures, skew and token timeout cannot report success or remove a round', async () => {
  const s = store(); await s.saveFocusRound(s.user, finished())
  s.documents.get(s.counter).fields.count.integerValue = String(history.historyCapacity)
  assert.equal(await s.saveFocusRound(s.user, finished()), 'full')
  const denied = store({ denied: true })
  assert.equal(await denied.saveFocusRound(denied.user, finished()), 'unavailable')
  assert.equal(await denied.saveFocusRound({ uid: 'other' }, finished()), 'unavailable')
  assert.equal(await denied.saveFocusRound(null, finished()), 'unavailable')
  assert.equal(denied.stats().requests, 1)
  const stalled = store({ stalledToken: true }), pending = stalled.saveFocusRound(stalled.user, finished())
  stalled.expire()
  assert.equal(await pending, 'unavailable')
  assert.equal(stalled.stats().requests, 0)
  assert.equal(stalled.stats().timers, 0)
  const skewed = store({ skew: 60001 })
  assert.equal(await skewed.saveFocusRound(skewed.user, finished()), 'saved')
  assert.equal(await skewed.saveFocusRound(skewed.user, finished()), 'unavailable')
  assert.equal(skewed.stats().commits, 1)
})

test('pending rounds survive a new tab, preserve separate IDs and never overwrite unrelated local data', () => {
  const storage = { unrelated: 'keep' }
  const localStorage = { ...storage }
  Object.defineProperties(localStorage, {
    getItem: { value: key => localStorage[key] ?? null },
    setItem: { value: (key, value) => { localStorage[key] = value } },
    removeItem: { value: key => { delete localStorage[key] } },
  })
  const deps = { './account.ts': { OWNER_UID }, './focus-round.ts': rounds }
  const loadPending = () => load('../src/lib/focus-pending.ts', deps, { localStorage })
  const a = loadPending(), round = finished(), another = finished()
  assert.equal(a.keepPendingFocus(round), true)
  assert.equal(a.keepPendingFocus(another), true)
  const reopened = loadPending()
  assert.ok([round.id, another.id].includes(reopened.restorePendingFocus().id))
  assert.equal(a.keepPendingFocus({ ...another, elapsedMs: 13000 }), false)
  a.clearPendingFocus({ ...another, elapsedMs: 13000 })
  assert.ok(localStorage[Object.keys(localStorage).find(key => key.endsWith(another.id))])
  a.clearPendingFocus(round)
  assert.equal(reopened.restorePendingFocus().id, another.id)
  for (let i = 0; i < 19; i++) assert.equal(a.keepPendingFocus(finished()), true)
  assert.equal(a.keepPendingFocus(finished()), false)
  assert.equal(a.keepPendingFocus(another), true)
  assert.equal(localStorage.unrelated, 'keep')
  const blocked = load('../src/lib/focus-pending.ts', deps, { localStorage: { getItem() { throw Error() } } })
  assert.equal(blocked.keepPendingFocus(round), false)
  assert.equal(blocked.restorePendingFocus(), null)
})

test('save controller keeps pending data, guards repeated attempts and releases recovery after confirmed success', async () => {
  const state = [], effects = [], cleared = []
  let cursor = 0, calls = 0, settle
  const round = finished()
  const react = {
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value }] },
    useRef(initial) { const i = cursor++; return state[i] ??= { current: initial } },
    useCallback: fn => fn, useEffect: fn => effects.push(fn),
  }
  const hook = load('../src/components/use-focus-history.ts', {
    react, '@/lib/focus-pending': { keepPendingFocus: () => false, clearPendingFocus: round => cleared.push(round.id) },
  }).useFocusHistory
  const save = () => { calls++; return new Promise(resolve => { settle = resolve }) }
  const render = (persist = true) => { cursor = 0; effects.length = 0; return hook(round, persist ? save : undefined) }
  render(); effects[0]()
  assert.equal(render().state, 'saving')
  assert.equal(render().retained, false)
  render().retry(); render().retry(); effects[0]()
  assert.equal(calls, 1)
  settle('unavailable'); await new Promise(resolve => setImmediate(resolve))
  assert.equal(render().state, 'unavailable')
  assert.equal(cleared.length, 0)
  const attempt = render().retry()
  render().retry()
  assert.equal(calls, 2)
  settle('saved'); await attempt
  assert.equal(render().state, 'saved')
  assert.deepEqual(cleared, [round.id])
  render(false); effects[0](); await render(false).retry()
  assert.equal(calls, 2)
  assert.equal(render(false).state, undefined)
})

test('history reads are owner-only, bounded, cursor-paged with stable ties and cached without extra traffic', async () => {
  const s = store()
  for (let i = 0; i < 60; i++) await s.saveFocusRound(s.user, finished())
  const before = s.stats()
  const first = s.readFocusHistory(s.user)
  assert.equal(first, s.readFocusHistory(s.user))
  const a = await first
  assert.equal(a.entries.length, 25)
  assert.equal(a.next.id, a.entries.at(-1).roundId)
  assert.equal(a.next.savedAt, a.entries.at(-1).savedAt)
  assert.equal(await s.readFocusHistory(s.user), a)
  assert.equal(s.stats().requests, before.requests + 1)
  const b = await s.readFocusHistory(s.user, a.next)
  const c = await s.readFocusHistory(s.user, b.next)
  assert.equal(b.entries.length, 25)
  assert.equal(c.entries.length, 10)
  assert.equal(c.next, null)
  assert.equal(new Set([...a.entries, ...b.entries, ...c.entries].map(entry => entry.roundId)).size, 60)
  assert.equal(s.stats().commits, before.commits)
  await s.readFocusHistory(s.user, undefined, true)
  assert.equal(s.stats().requests, before.requests + 4)
  s.advance(60000)
  await s.readFocusHistory(s.user)
  assert.equal(s.stats().requests, before.requests + 5)
  await s.saveFocusRound(s.user, finished())
  const count = s.stats().requests
  await s.readFocusHistory(s.user)
  assert.equal(s.stats().requests, count + 1)
  assert.equal(s.stats().timers, 0)
})

test('history rejects invalid cursors, malformed/foreign receipts and failed reads; token stalls are bounded', async () => {
  const s = store()
  assert.deepEqual(await s.readFocusHistory(s.user), { entries: [], next: null })
  const before = s.stats().requests
  for (const cursor of [{ id: '../other', savedAt: new Date().toISOString() }, { id: finished().id, savedAt: 'wrong' }]) await assert.rejects(s.readFocusHistory(s.user, cursor))
  await assert.rejects(s.readFocusHistory({ uid: 'other' }))
  await assert.rejects(s.readFocusHistory(null))
  assert.equal(s.stats().requests, before)
  const denied = store({ denied: true })
  await assert.rejects(denied.readFocusHistory(denied.user))
  await assert.rejects(denied.readFocusHistory(denied.user))
  assert.equal(denied.stats().requests, 2)
  const stalled = store({ stalledToken: true }), promise = stalled.readFocusHistory(stalled.user)
  stalled.expire()
  await assert.rejects(promise, /timeout/)
  assert.equal(stalled.stats().requests, 0)
  const round = finished()
  await s.saveFocusRound(s.user, round)
  const doc = s.documents.get(s.root + '/focusRounds/' + round.id)
  doc.fields.savedAt.timestampValue = '2026-10-23T01:02:03.123456789Z'
  const parsed = history.parseHistoryPage([{ document: { ...doc, name: s.root + '/focusRounds/' + round.id } }], s.root)
  assert.equal(parsed.entries[0].savedAt, '2026-10-23T01:02:03.123456789Z')
  const valid = { ...doc, name: s.root + '/focusRounds/' + round.id }
  for (const raw of [null, {}, [{}], [{ readTime: 'wrong' }], [{ error: {} }], [{ document: { ...valid, name: 'other/' + round.id } }], [{ document: valid }, { document: valid }], Array(27).fill({})]) assert.throws(() => history.parseHistoryPage(raw, s.root))
  doc.fields.elapsedMs.integerValue = null
  assert.throws(() => history.parseHistoryPage([{ document: valid }], s.root))
  doc.fields.elapsedMs.integerValue = '-1'
  assert.throws(() => history.parseHistoryPage([{ document: valid }], s.root))
})
