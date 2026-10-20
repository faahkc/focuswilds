import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { OWNER_UID } from '../src/lib/account.ts'

function store({ fail = false, stalledToken = false, conflict = false, existingProfile = false, initialLocal = [] } = {}) {
  const documents = new Map(), requests = [], timers = new Map(), local = new Map(initialLocal), toasts = []
  let revision = 0, writes = 0, tokenCalls = 0, conflicted = false
  let now = Date.parse('2026-10-20T00:00:00Z'), clientOffset = 0
  class ClientDate extends Date {
    constructor(value) { super(value === undefined ? now + clientOffset : value) }
    static now() { return now + clientOffset }
  }
  const profile = `projects/test/databases/(default)/documents/users/${OWNER_UID}`
  if (existingProfile) documents.set(profile, { fields: { language: { stringValue: 'th' }, legacy: { stringValue: 'preserve' } }, updateTime: 'existing' })
  const dependencies = {
    '../../package.json': { version: '0.1.0' },
    './firebase': { app: { options: { projectId: 'test' } }, authHeaders: async () => ({ 'X-Firebase-AppCheck': 'private-attestation' }) },
    './account': { OWNER_UID },
    './toast': { showToast: (title, message) => toasts.push({ title, message }) },
  }
  const source = readFileSync(new URL('../src/lib/account-records.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  const reply = (value, status = 200) => new Response(JSON.stringify(value), { status })
  const fetch = async (url, options) => {
    requests.push({ url, options })
    assert.equal(options.headers.Authorization, 'Bearer private-token')
    assert.equal(options.headers['X-Firebase-AppCheck'], 'private-attestation')
    assert.equal(options.referrerPolicy, 'no-referrer')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.signal.aborted, false)
    if (fail) return reply({ error: { status: 'PERMISSION_DENIED', message: 'private provider detail' } }, 403)
    const path = url.split('/v1/')[1]
    if (options.method === 'GET') return documents.has(path) ? reply(documents.get(path)) : reply({}, 404)
    const { writes: batch } = JSON.parse(options.body)
    assert.equal(batch.length, 1)
    const write = batch[0], old = documents.get(write.update.name)
    if ((write.currentDocument.exists === false && old) || (write.currentDocument.updateTime && write.currentDocument.updateTime !== old?.updateTime)) return reply({ error: { status: 'FAILED_PRECONDITION' } }, 400)
    const fields = structuredClone(write.update.fields)
    for (const transform of write.updateTransforms) {
      assert.equal(transform.setToServerValue, 'REQUEST_TIME')
      fields[transform.fieldPath] = { timestampValue: new Date(now).toISOString() }
    }
    if (write.update.name.endsWith('/logs/account')) {
      const count = Number(fields.windowCount.integerValue)
      const start = Date.parse(fields.windowStartedAt.timestampValue)
      const oldStart = old?.fields.windowStartedAt?.timestampValue
      const resetAllowed = !oldStart || now >= Date.parse(oldStart) + 60000
      const valid = Number.isInteger(count) && count >= 1 && count <= 60 && (resetAllowed
        ? count === 1 && start === now
        : start === Date.parse(oldStart) && count === Number(old.fields.windowCount.integerValue) + 1)
      if (!valid) return reply({ error: { status: 'PERMISSION_DENIED' } }, 403)
      if (conflict && !conflicted) {
        conflicted = true
        // Simulate a successful write whose acknowledgement was lost; retry must not append it twice.
        documents.set(write.update.name, { fields, updateTime: String(++revision) }); writes++
        return reply({ error: { status: 'FAILED_PRECONDITION' } }, 400)
      }
    }
    documents.set(write.update.name, { fields, updateTime: String(++revision) }); writes++
    return reply({})
  }
  new Function('require', 'module', 'exports', 'fetch', 'matchMedia', 'navigator', 'location', 'sessionStorage', 'setTimeout', 'clearTimeout', 'Date', code)(
    name => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports,
    fetch, () => ({ matches: true }), {}, { hostname: 'localhost' },
    { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) },
    fn => { const id = Symbol(); timers.set(id, fn); return id }, id => timers.delete(id), ClientDate,
  )
  const user = { uid: OWNER_UID, getIdToken: async () => { tokenCalls++; return stalledToken ? new Promise(() => {}) : 'private-token' } }
  return { advance: ms => { now += ms }, skew: ms => { clientOffset = ms }, api: module.exports, toasts, user, documents, requests, local, profile, events: () => documents.get(`${profile}/logs/account`)?.fields.events.arrayValue.values.map(value => value.mapValue.fields) ?? [], stats: () => ({ writes, tokenCalls, timers: timers.size }), expire: () => { for (const fn of timers.values()) fn() } }
}

test('owner profile initialization is deduplicated, creates once and never overwrites saved fields', async () => {
  const s = store()
  const first = s.api.prepareOwnerAccount(s.user)
  assert.equal(first, s.api.prepareOwnerAccount(s.user))
  assert.equal(await first, true)
  assert.equal(await s.api.prepareOwnerAccount(s.user), true)
  assert.equal(s.requests.length, 2)
  assert.equal(s.stats().writes, 1)
  assert.equal(s.documents.get(s.profile).fields.timezone.stringValue, 'Asia/Bangkok')
  const existing = store({ existingProfile: true })
  assert.equal(await existing.api.prepareOwnerAccount(existing.user), true)
  assert.equal(existing.stats().writes, 0)
  assert.equal(existing.documents.get(existing.profile).fields.language.stringValue, 'th')
  const tabs = store()
  const a = tabs.api.prepareOwnerAccount(tabs.user)
  tabs.documents.set(tabs.profile, { fields: { language: { stringValue: 'th' } } })
  assert.equal(await a, true)
  assert.equal(tabs.documents.get(tabs.profile).fields.language.stringValue, 'th')
})

test('history retains the latest 100 events, uses server receipt times and serializes no credentials', async () => {
  const s = store()
  for (let i = 0; i < 103; i++) {
    assert.equal(await s.api.recordAccountEvent(s.user, i % 2 ? 'sign_in' : 'sign_out_requested'), true)
    s.advance(6000)
  }
  assert.equal(s.events().length, 100)
  assert.equal(s.stats().writes, 103)
  assert.equal(s.events()[0].type.stringValue, 'sign_in')
  assert.equal(s.events()[99].mode.stringValue, 'pwa')
  assert.equal(s.events()[99].environment.stringValue, 'local')
  assert.ok(s.documents.get(`${s.profile}/logs/account`).fields.updatedAt.timestampValue)
  assert.doesNotMatch(JSON.stringify([...s.documents]), /private-token|private-attestation|email|password|callback|state/)
  assert.equal(s.stats().timers, 0)
})

test('conditional retries reuse the event identity after a lost acknowledgement', async () => {
  const s = store({ conflict: true })
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_in'), true)
  assert.equal(s.events().length, 1)
  assert.equal(s.requests.length, 3)
})

test('null and non-owner accounts cannot issue any database requests', async () => {
  const s = store()
  for (const user of [null, { ...s.user, uid: 'another-account' }]) {
    assert.equal(await s.api.prepareOwnerAccount(user), false)
    assert.equal(await s.api.recordAccountEvent(user, 'sign_in'), false)
  }
  assert.equal(s.requests.length, 0)
  assert.equal(s.stats().tokenCalls, 0)
})

test('permission failures are best effort, do not retry automatically and permit later initialization', async () => {
  const s = store({ fail: true })
  assert.equal(await s.api.prepareOwnerAccount(s.user), false)
  assert.equal(await s.api.prepareOwnerAccount(s.user), false)
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_in'), false)
  assert.equal(s.requests.length, 3)
  assert.equal(s.stats().timers, 0)
})

test('the overall deadline includes credential retrieval and does not leave background requests', async () => {
  const s = store({ stalledToken: true })
  const pending = s.api.recordAccountEvent(s.user, 'sign_in')
  s.expire()
  assert.equal(await pending, false)
  assert.equal(s.requests.length, 0)
  assert.equal(s.stats().timers, 0)
})

test('account errors whitelist codes and keep unauthenticated failures in a bounded local buffer', async () => {
  const s = store()
  for (let i = 0; i < 25; i++) await s.api.recordAccountError(null, { code: 'secret-token', message: 'private email callback token' })
  const saved = JSON.parse([...s.local.values()][0])
  assert.equal(saved.length, 20)
  assert.equal(saved[0].code, 'auth/unknown')
  assert.equal(s.requests.length, 0)
  await s.api.recordAccountError(s.user, { code: 'auth/network-request-failed', message: 'private details' })
  assert.equal(s.events()[0].code.stringValue, 'auth/network-request-failed')
  assert.doesNotMatch(JSON.stringify([...s.local, ...s.documents]), /private email|secret-token|private details/)
})

test('rules contract scopes access to the owner and validates bounded append-only account diagnostics', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  assert.ok(rules.includes(`request.auth.uid == '${OWNER_UID}'`))
  assert.match(rules, /uid == request.auth.uid/)
  assert.match(rules, /data.events.size\(\) <= 100/)
  assert.match(rules, /data.updatedAt == request.time/)
  assert.match(rules, /logId == 'account'/)
  assert.match(rules, /resource.data.events.removeAll/)
  assert.match(rules, /data.windowCount is int.*data.windowCount <= 60/)
  assert.match(rules, /request.time >= previous.windowStartedAt \+ duration.value\(60, 's'\)/)
  assert.match(rules, /next.windowCount == previous.windowCount \+ 1/)
  assert.match(rules, /request.resource.data.windowStartedAt == request.time/)
  assert.match(rules, /allow read, write: if false/)
  assert.doesNotMatch(rules, /allow (list|delete):|allow write: if owner|allow update: if owner\(uid\);/)
})


test('account diagnostics accept sixty events, drop excess without a write and reopen exactly at 60 seconds', async () => {
  const s = store()
  for (let i = 0; i < 60; i++) assert.equal(await s.api.recordAccountEvent(s.user, 'sign_in'), true)
  assert.equal(s.documents.get(`${s.profile}/logs/account`).fields.windowCount.integerValue, '60')
  assert.equal(await s.api.recordAccountEvent(s.user, 'account_error'), false)
  assert.equal(s.stats().writes, 60)
  s.advance(59999)
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_out_requested'), false)
  s.advance(1)
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_out_requested'), true)
  assert.equal(s.documents.get(`${s.profile}/logs/account`).fields.windowCount.integerValue, '1')
  assert.equal(s.events().length, 61)
})

test('concurrent event calls share the persisted limit instead of receiving a per-tab allowance', async () => {
  const s = store()
  for (let i = 0; i < 58; i++) await s.api.recordAccountEvent(s.user, 'sign_in')
  const results = await Promise.all(Array.from({ length: 5 }, () => s.api.recordAccountEvent(s.user, 'sign_out_requested')))
  assert.equal(results.filter(Boolean).length, 2)
  assert.equal(s.events().length, 60)
  assert.equal(s.documents.get(`${s.profile}/logs/account`).fields.windowCount.integerValue, '60')
})

test('normal low-frequency use opens a fresh window without accumulating a lifetime action count', async () => {
  const s = store()
  for (let i = 0; i < 15; i++) {
    assert.equal(await s.api.recordAccountEvent(s.user, 'sign_in'), true)
    assert.equal(s.documents.get(`${s.profile}/logs/account`).fields.windowCount.integerValue, '1')
    s.advance(60000)
  }
  assert.equal(s.events().length, 15)
})

test('an existing history upgrades its missing rate metadata without resetting events or the profile', async () => {
  const s = store({ existingProfile: true })
  await s.api.recordAccountEvent(s.user, 'sign_in')
  const current = s.documents.get(`${s.profile}/logs/account`)
  delete current.fields.windowCount
  delete current.fields.windowStartedAt
  const originalEvent = structuredClone(s.events()[0])
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_out_requested'), true)
  assert.deepEqual(s.events()[0], originalEvent)
  assert.equal(s.events().length, 2)
  assert.equal(s.documents.get(`${s.profile}/logs/account`).fields.windowCount.integerValue, '1')
  assert.equal(s.documents.get(s.profile).fields.language.stringValue, 'th')
})

test('a fast client clock cannot force an early window reset accepted by the in-memory server', async () => {
  const s = store()
  await s.api.recordAccountEvent(s.user, 'sign_in')
  s.skew(3600000)
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_out_requested'), false)
  assert.equal(s.events().length, 1)
  assert.equal(s.requests.length, 4)
  assert.equal(s.stats().writes, 1)
  s.skew(0)
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_out_requested'), true)
})


test('limited events notify once per window, count locally and report a snapshot on the next successful event', async () => {
  const s = store()
  for (let i = 0; i < 60; i++) await s.api.recordAccountEvent(s.user, 'sign_in')
  for (let i = 0; i < 3; i++) assert.equal(await s.api.recordAccountEvent(s.user, 'sign_out_requested'), false)
  assert.equal(s.toasts.length, 1)
  const stats = JSON.parse(s.local.get('focuswilds.account-rate'))
  assert.equal(stats.count, 3)
  assert.equal(stats.reported, 0)
  s.advance(60000)
  assert.equal(await s.api.recordAccountEvent(s.user, 'sign_in'), true)
  const report = s.events().at(-1).limited.mapValue.fields
  assert.equal(report.count.integerValue, '3')
  assert.equal(report.windowStartedAt.timestampValue, stats.window)
  assert.equal(JSON.parse(s.local.get('focuswilds.account-rate')).reported, 3)
  await s.api.recordAccountEvent(s.user, 'sign_in')
  assert.equal(s.events().at(-1).limited, undefined)
  for (let i = 0; i < 59; i++) await s.api.recordAccountEvent(s.user, 'sign_in')
  assert.equal(s.toasts.length, 2)
})


test('reloading within the same limited window preserves the count and does not repeat its toast', async () => {
  const first = store()
  for (let i = 0; i < 60; i++) await first.api.recordAccountEvent(first.user, 'sign_in')
  await first.api.recordAccountEvent(first.user, 'sign_out_requested')
  const reopened = store({ initialLocal: [...first.local] })
  for (const [key, value] of first.documents) reopened.documents.set(key, structuredClone(value))
  assert.equal(await reopened.api.recordAccountEvent(reopened.user, 'sign_out_requested'), false)
  assert.equal(reopened.toasts.length, 0)
  assert.equal(JSON.parse(reopened.local.get('focuswilds.account-rate')).count, 2)
})
