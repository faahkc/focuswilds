import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync(new URL('../src/lib/firebase.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText
  .replace(/^import .*\n/gm, '').replace(/export /g, '').replaceAll('import.meta.env', 'env')

function initialize(env) {
  const calls = []
  const self = {}
  const context = {
    env, self,
    initializeApp: () => { calls.push('app'); return {} },
    initializeAppCheck: (_app, options) => {
      calls.push({ options, debugToken: self.FIREBASE_APPCHECK_DEBUG_TOKEN })
      return { name: 'app-check' }
    },
    ReCaptchaEnterpriseProvider: class { constructor(key) { this.key = key } },
    initializeAuth: () => { calls.push('auth') },
    browserSessionPersistence: {}, browserPopupRedirectResolver: {},
    getToken: async check => { calls.push({ tokenFor: check.name }) },
  }
  runInNewContext(source, context)
  return { calls, self, prepareSignIn: context.prepareSignIn }
}

test('sign-in preparation warms production attestation without turning on background refresh', async () => {
  const production = initialize({ PROD: true, DEV: false })
  await production.prepareSignIn()
  assert.equal(production.calls.at(-1).tokenFor, 'app-check')
  const development = initialize({ PROD: false, DEV: true })
  await development.prepareSignIn()
  assert.deepEqual(development.calls, ['app', 'auth'])
})

test('production initializes App Check before Auth, disables background refresh and ignores debug credentials', () => {
  const { calls, self } = initialize({ PROD: true, DEV: false, VITE_APPCHECK_DEBUG_TOKEN: 'private-test-token' })
  assert.equal(calls.length, 3)
  assert.equal(calls[0], 'app')
  assert.equal(calls[2], 'auth')
  assert.equal(calls[1].options.provider.key, '6Lck1fAtAAAAACOkQEGIe3mcEYdx6KTaWc8tsjQE')
  assert.equal(calls[1].options.isTokenAutoRefreshEnabled, false)
  assert.equal(self.FIREBASE_APPCHECK_DEBUG_TOKEN, undefined)
})

test('development avoids production attestation and only enables App Check with an explicit private debug token', () => {
  assert.deepEqual(initialize({ PROD: false, DEV: true }).calls, ['app', 'auth'])
  const { calls } = initialize({ PROD: false, DEV: true, VITE_APPCHECK_DEBUG_TOKEN: 'private-test-token' })
  assert.equal(calls[1].debugToken, 'private-test-token')
  assert.equal(calls[1].options.isTokenAutoRefreshEnabled, false)
  assert.equal(calls[2], 'auth')
})
