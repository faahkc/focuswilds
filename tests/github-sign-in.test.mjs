import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { OWNER_UID } from '../src/lib/account.ts'

const callback = 'https://faahkc.github.io/focuswilds/?focuswilds-auth=1'
const storageKey = 'focuswilds.github-redirect'
const authorization = 'https://github.com/login/oauth/authorize?state=challenge'
const challenge = () => ({ state: 'challenge', sessionId: 'server-session', callback, created: Date.now() })
const source = ts.transpileModule(readFileSync(new URL('../src/lib/github-sign-in.ts', import.meta.url), 'utf8').replaceAll('import.meta.env.BASE_URL', JSON.stringify('/focuswilds/')), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS } }).outputText

function flow({ url = 'https://faahkc.github.io/focuswilds/', pending, response = {}, ok = true, storageBlocked = false } = {}) {
  const store = new Map(pending === undefined ? [] : [[storageKey, JSON.stringify(pending)]])
  const requests = [], navigations = [], credentials = []
  const location = { href: url, origin: new URL(url).origin, assign: value => navigations.push(value) }
  const dependencies = {
    'firebase/auth': { GithubAuthProvider: { credential: token => ({ token }) }, signInWithCredential: async (_auth, credential) => { credentials.push(credential) } },
    './firebase': { app: { options: { apiKey: 'public-test-key' } }, auth: {}, authHeaders: async () => ({ 'X-Firebase-AppCheck': 'attestation' }) },
    './account': { OWNER_UID },
  }
  const module = { exports: {} }
  runInNewContext(source, {
    module, exports: module.exports, require: name => dependencies[name], URL, AbortSignal,
    location, history: { replaceState: (_state, _title, value) => { location.href = value } },
    sessionStorage: {
      setItem: (key, value) => { if (storageBlocked) throw new Error('Storage unavailable'); store.set(key, value) },
      getItem: key => store.get(key) ?? null, removeItem: key => store.delete(key),
    },
    fetch: async (endpoint, options) => { requests.push({ endpoint, options, locationAtRequest: location.href }); return { ok, json: async () => response } },
  })
  return { ...module.exports, store, requests, navigations, credentials, location }
}

test('sign-in stores only a short-lived challenge before navigating in the same window', async () => {
  const login = flow({ response: { authUri: authorization, sessionId: 'server-session' } })
  await login.startGitHubSignIn()
  assert.deepEqual(login.navigations, [authorization])
  const stored = JSON.parse(login.store.get(storageKey))
  assert.equal(stored.state, 'challenge')
  assert.equal(stored.callback, callback)
  assert.deepEqual(Object.keys(stored).sort(), ['callback', 'created', 'sessionId', 'state'])
  const request = login.requests[0]
  assert.match(request.endpoint, /accounts:createAuthUri/)
  assert.equal(JSON.parse(request.options.body).continueUri, callback)
  assert.equal(request.options.headers['X-Firebase-AppCheck'], 'attestation')
})

test('invalid authorization destinations, failed requests and unavailable storage never navigate', async () => {
  for (const options of [
    { response: { authUri: 'https://evil.example/?state=challenge', sessionId: 'session' } },
    { response: { authUri: authorization, sessionId: '' } },
    { response: { authUri: authorization, sessionId: 'session' }, storageBlocked: true },
    { ok: false },
  ]) {
    const login = flow(options)
    await assert.rejects(login.startGitHubSignIn())
    assert.equal(login.navigations.length, 0)
  }
})

test('owner callback clears the URL and challenge, sends App Check and restores SDK sign-in exactly once', async () => {
  const login = flow({ url: `${callback}&code=one-use-code&state=challenge`, pending: challenge(), response: { localId: OWNER_UID, providerId: 'github.com', oauthAccessToken: 'provider-token' } })
  await Promise.all([login.finishGitHubSignIn(), login.finishGitHubSignIn()])
  assert.equal(login.requests.length, 1)
  assert.deepEqual(login.credentials, [{ token: 'provider-token' }])
  assert.equal(login.store.size, 0)
  const request = login.requests[0]
  assert.equal(request.locationAtRequest, 'https://faahkc.github.io/focuswilds/')
  assert.equal(JSON.parse(request.options.body).autoCreate, false)
  assert.equal(JSON.parse(request.options.body).sessionId, 'server-session')
  assert.equal(request.options.headers['X-Firebase-AppCheck'], 'attestation')
})

test('missing, expired, future, mismatched and duplicate challenges fail before token exchange', async () => {
  for (const options of [
    {}, { pending: { ...challenge(), created: Date.now() - 600001 } },
    { pending: { ...challenge(), created: Date.now() + 60000 } },
    { pending: { ...challenge(), state: 'wrong' } },
    { pending: { ...challenge(), callback: 'https://evil.example/' } },
    { pending: { ...challenge(), sessionId: '' } },
    { pending: challenge(), extra: '&state=duplicate' },
    { pending: challenge(), extra: '&code=duplicate' },
    { pending: challenge(), extra: '&focuswilds-auth=1' },
    { pending: challenge(), url: 'https://faahkc.github.io/wrong/?focuswilds-auth=1&code=code&state=challenge' },
  ]) {
    const login = flow({ url: `${callback}&code=code&state=challenge${options.extra ?? ''}`, ...options })
    await assert.rejects(login.finishGitHubSignIn(), error => error.code === 'auth/invalid-redirect')
    assert.equal(login.requests.length, 0)
    assert.equal(login.credentials.length, 0)
    assert.equal(login.store.size, 0)
  }
})

test('provider cancellation, non-owner, missing credentials and failed exchange do not persist a login', async () => {
  for (const options of [
    { url: `${callback}&error=access_denied&state=challenge` },
    { response: { localId: 'another-user', providerId: 'github.com', oauthAccessToken: 'token' } },
    { response: { localId: OWNER_UID, providerId: 'github.com' } },
    { ok: false },
  ]) {
    const login = flow({ url: `${callback}&code=code&state=challenge`, pending: challenge(), ...options })
    await assert.rejects(login.finishGitHubSignIn())
    assert.equal(login.credentials.length, 0)
    assert.equal(login.store.size, 0)
  }
})

test('ordinary visits restore Firebase without additional OAuth requests', async () => {
  const login = flow()
  await login.finishGitHubSignIn()
  assert.equal(login.requests.length, 0)
  assert.equal(login.credentials.length, 0)
})
