import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { OWNER_UID } from '../src/lib/account.ts'

function store({ fail = false, stalledToken = false, conflict = false, existingProfile = false } = {}) {
  const documents = new Map(), requests = [], timers = new Map(), local = new Map()
  let revision = 0, writes = 0, tokenCalls = 0, conflicted = false
  const profile = `projects/test/databases/(default)/documents/users/${OWNER_UID}`
  if (existingProfile) documents.set(profile, { fields: { language: { stringValue: 'th' }, legacy: { stringValue: 'preserve' } }, updateTime: 'existing' })
  const dependencies = {
    '../../package.json': { version: '0.1.0' },
    './firebase': { app: { options: { projectId: 'test' } }, authHeaders: async () => ({ 'X-Firebase-AppCheck': 'private-attestation' }) },
    './account': { OWNER_UID },
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
    if (conflict && !conflicted && write.update.name.endsWith('/logs/account')) {
      conflicted = true
      // Simulate a successful write whose acknowledgement was lost; retry must not append it twice.
      documents.set(write.update.name, { fields: structuredClone(write.update.fields), updateTime: String(++revision) })
      return reply({ error: { status: 'FAILED_PRECONDITION' } }, 400)
    }
    if ((write.currentDocument.exists === false && old) || (write.currentDocument.updateTime && write.currentDocument.updateTime !== old?.updateTime)) return reply({ error: { status: 'FAILED_PRECONDITION' } }, 400)
    const fields = structuredClone(write.update.fields)
    for (const transform of write.updateTransforms) {
      assert.equal(transform.setToServerValue, 'REQUEST_TIME')
      fields[transform.fieldPath] = { timestampValue: new Date().toISOString() }
    }
    documents.set(write.update.name, { fields, updateTime: String(++revision) }); writes++
    return reply({})
  }
  new Function('require', 'module', 'exports', 'fetch', 'matchMedia', 'navigator', 'location', 'sessionStorage', 'setTimeout', 'clearTimeout', code)(
    name => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports,
    fetch, () => ({ matches: true }), {}, { hostname: 'localhost' },
    { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) },
    fn => { const id = Symbol(); timers.set(id, fn); return id }, id => timers.delete(id),
  )
  const user = { uid: OWNER_UID, getIdToken: async () => { tokenCalls++; return stalledToken ? new Promise(() => {}) : 'private-token' } }
  return { api: module.exports, user, documents, requests, local, profile, events: () => documents.get(`${profile}/logs/account`)?.fields.events.arrayValue.values.map(value => value.mapValue.fields) ?? [], stats: () => ({ writes, tokenCalls, timers: timers.size }), expire: () => { for (const fn of timers.values()) fn() } }
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
  for (let i = 0; i < 103; i++) assert.equal(await s.api.recordAccountEvent(s.user, i % 2 ? 'sign_in' : 'sign_out_requested'), true)
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
  assert.match(rules, /allow read, write: if false/)
  assert.doesNotMatch(rules, /allow (list|delete):|allow write: if owner|allow update: if owner\(uid\);/)
})
