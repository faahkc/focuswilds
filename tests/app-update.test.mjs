import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function checker(fetch, timers = { setTimeout, clearTimeout }) {
  const source = readFileSync(new URL('../src/lib/app-update.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'fetch', 'AbortController', 'setTimeout', 'clearTimeout', code)(module, module.exports, fetch, AbortController, timers.setTimeout, timers.clearTimeout)
  return module.exports
}

test('version comparisons accept only valid newer numeric releases', () => {
  const { newerVersion } = checker(() => { throw new Error('Unexpected fetch') })
  for (const version of ['0.1.105', '0.2.0', '1.0.0']) assert.equal(newerVersion(version, '0.1.104'), true)
  for (const version of ['0.1.104', '0.1.9', '0.0.999', 'bad', '1.2.3<script>', '999999999999999999999.0.0', null, 123, {}, '1.2']) assert.equal(newerVersion(version, '0.1.104'), false)
})

test('update check is deduplicated and makes one uncached static request', async () => {
  let calls = 0, resolve
  const response = new Promise(done => { resolve = done })
  const { checkForUpdate } = checker((url, options) => {
    calls++
    assert.equal(url, '/focuswilds/version.json')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'error')
    return response
  })
  const first = checkForUpdate('/focuswilds/', '0.1.104')
  assert.equal(checkForUpdate('/focuswilds/', '0.1.104'), first)
  resolve({ ok: true, json: async () => ({ version: '0.1.105' }) })
  assert.equal(await first, '0.1.105')
  assert.equal(await checkForUpdate('/focuswilds/', '0.1.104'), '0.1.105')
  assert.equal(calls, 1)
})

test('missing, invalid, older and failed updates leave the app usable without retries', async () => {
  for (const fetch of [
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ version: '0.1.104' }) }),
    async () => ({ ok: true, json: async () => ({ version: '0.1.103' }) }),
    async () => ({ ok: true, json: async () => ({ version: '<script>' }) }),
    async () => ({ ok: true, json: async () => null }),
    async () => ({ ok: true, json: async () => { throw new Error('Not JSON') } }),
    async () => { throw new Error('Offline') },
  ]) {
    let calls = 0
    const { checkForUpdate } = checker((...args) => { calls++; return fetch(...args) })
    assert.equal(await checkForUpdate('/focuswilds/', '0.1.104'), null)
    assert.equal(await checkForUpdate('/focuswilds/', '0.1.104'), null)
    assert.equal(calls, 1)
  }
})

test('stalled update checks are bounded to five seconds', async () => {
  let expire, cleared = false
  const { checkForUpdate } = checker((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Aborted')))
  }), {
    setTimeout: (callback, ms) => { assert.equal(ms, 5000); expire = callback; return 1 },
    clearTimeout: id => { assert.equal(id, 1); cleared = true },
  })
  const result = checkForUpdate('/focuswilds/', '0.1.104')
  expire()
  assert.equal(await result, null)
  assert.equal(cleared, true)
})

test('fresh HTML preflight has a ten-second timeout and clears its timer', async () => {
  let expire, cleared = false
  const { loadUpdate } = checker((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Aborted')))
  }), {
    setTimeout: (callback, ms) => { assert.equal(ms, 10000); expire = callback; return 1 },
    clearTimeout: id => { assert.equal(id, 1); cleared = true },
  })
  const result = loadUpdate('https://example.com/focuswilds/', '0.1.110')
  expire()
  await assert.rejects(result, /Aborted/)
  assert.equal(cleared, true)
})
