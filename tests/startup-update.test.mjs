import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import ts from 'typescript'

const base = 'http://localhost:5173/focuswilds/'
const flush = () => new Promise(resolve => setImmediate(resolve))
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const html = version => ({ ok: true, text: async () => `<meta name="application-version" content="${version}" />` })

async function startup({ href = base, fetch = async () => ({ ok: true, json: async () => ({ version: '0.1.109' }) }) } = {}) {
  const views = [], navigation = [], requests = []
  let appLoads = 0
  const location = { href, hostname: 'localhost', search: new URL(href).search }
  location.replace = url => navigation.push(url)
  const window = { location, history: { state: { preserved: true }, replaceState: (state, _title, url) => {
    assert.deepEqual(state, { preserved: true })
    location.href = url.href
  } } }
  const updateModule = { exports: {} }
  new Function('module', 'exports', 'fetch', 'window', compile(readFileSync(new URL('../src/lib/app-update.ts', import.meta.url), 'utf8')))(updateModule, updateModule.exports, (...args) => { requests.push(args); return fetch(...args) }, window)
  const dependencies = {
    react: { StrictMode: React.StrictMode },
    'react/jsx-runtime': { jsx: React.createElement },
    'react-dom/client': { createRoot: () => ({ render: view => views.push(view.props.children.props.children.props.children) }) },
    './index.css': {},
    './components/screen-layout': { ScreenLayout: () => null },
    './components/app-error-boundary': { AppErrorBoundary: () => null },
    './screens/system/app-error': { __esModule: true, default: function AppRecovery() {} },
    './screens/system/update-error': { __esModule: true, default: function UpdateRecovery() {} },
    './screens/system/loading': { __esModule: true, default: function PageLoading() {} },
    '../package.json': { version: '0.1.109' },
    './lib/app-update': updateModule.exports,
  }
  const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8').replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.BASE_URL', JSON.stringify('/focuswilds/'))
  new Function('require', 'exports', 'document', 'window', compile(source))(name => {
    if (name === './App') { appLoads++; return { __esModule: true, default: function App() {} } }
    assert.ok(name in dependencies, name)
    return dependencies[name]
  }, {}, { getElementById: () => ({}) }, window)
  await flush()
  return { views, navigation, requests, location, appLoads: () => appLoads, current: () => views.at(-1) }
}

test('startup waits for metadata before loading account services; offline checks remain usable', async () => {
  let resolve
  const boot = await startup({ fetch: () => new Promise(done => { resolve = done }) })
  assert.equal(boot.current().type.name, 'PageLoading')
  assert.equal(boot.current().props.message, undefined)
  assert.equal(boot.appLoads(), 0)
  resolve({ ok: true, json: async () => ({ version: '0.1.109' }) })
  await flush()
  assert.equal(boot.current().type.name, 'App')
  assert.equal(boot.requests.length, 1)
  const offline = await startup({ fetch: async () => { throw new Error('Offline') } })
  assert.equal(offline.current().type.name, 'App')
  assert.equal(offline.navigation.length, 0)
})

test('new releases show the update animation before fresh HTML loads and navigate only once', async () => {
  let resolve
  const boot = await startup({ href: `${base}?code=test-code&state=test-state&focuswilds-auth=1#keep`, fetch: async url => {
    if (String(url).endsWith('version.json')) return { ok: true, json: async () => ({ version: '0.1.110' }) }
    return new Promise(done => { resolve = done })
  } })
  assert.equal(boot.current().type.name, 'PageLoading')
  assert.equal(boot.current().props.message, 'Loading the latest version…')
  assert.equal(boot.appLoads(), 0)
  assert.equal(boot.navigation.length, 0)
  assert.equal(boot.requests[1][1].cache, 'no-store')
  resolve(html('0.1.110'))
  await flush()
  assert.equal(boot.navigation.length, 1)
  const url = new URL(boot.navigation[0])
  assert.equal(url.origin, new URL(base).origin)
  assert.equal(url.pathname, '/focuswilds/')
  assert.equal(url.searchParams.get('focuswilds-update'), '0.1.110')
  assert.match(url.searchParams.get('focuswilds-refresh'), /^\d+$/)
  assert.equal(url.searchParams.get('code'), 'test-code')
  assert.equal(url.searchParams.get('state'), 'test-state')
  assert.equal(url.hash, '#keep')
  assert.equal(boot.appLoads(), 0)
})

test('a failed preflight offers bounded explicit retries and a way to continue', async () => {
  const boot = await startup({ fetch: async url => {
    if (String(url).endsWith('version.json')) return { ok: true, json: async () => ({ version: '0.1.110' }) }
    throw new Error('Offline')
  } })
  assert.equal(boot.current().type.name, 'UpdateRecovery')
  assert.equal(boot.appLoads(), 0)
  assert.equal(boot.requests.length, 2)
  const retry = boot.current().props.onRetry
  retry(); retry()
  await flush()
  assert.equal(boot.requests.length, 3)
  assert.equal(boot.current().type.name, 'UpdateRecovery')
  boot.current().props.onContinue()
  await flush()
  assert.equal(boot.current().type.name, 'App')
  assert.equal(boot.navigation.length, 0)
})

test('an old release after update navigation stops without a reload loop, including offline', async () => {
  const boot = await startup({ href: `${base}?focuswilds-update=0.1.110&focuswilds-refresh=1&code=test-code`, fetch: () => { throw new Error('Must not fetch') } })
  assert.equal(boot.current().type.name, 'UpdateRecovery')
  assert.equal(boot.requests.length, 0)
  assert.equal(boot.navigation.length, 0)
  assert.equal(boot.appLoads(), 0)
  boot.current().props.onContinue()
  await flush()
  const url = new URL(boot.location.href)
  assert.equal(url.searchParams.has('focuswilds-update'), false)
  assert.equal(url.searchParams.has('focuswilds-refresh'), false)
  assert.equal(url.searchParams.get('code'), 'test-code')
  assert.equal(boot.current().type.name, 'App')
})

test('a matching or newer loaded release clears update markers and opens the app', async () => {
  for (const target of ['0.1.109', '0.1.108']) {
    const boot = await startup({ href: `${base}?focuswilds-update=${target}&focuswilds-refresh=1&focuswilds-auth=1&state=keep#keep` })
    assert.equal(boot.current().type.name, 'App')
    assert.equal(boot.requests.length, 0)
    const url = new URL(boot.location.href)
    assert.equal(url.searchParams.has('focuswilds-update'), false)
    assert.equal(url.searchParams.get('focuswilds-auth'), '1')
    assert.equal(url.searchParams.get('state'), 'keep')
    assert.equal(url.hash, '#keep')
  }
})

test('incomplete, missing and malformed releases never navigate automatically', async () => {
  for (const response of [{ ok: false }, html('0.1.109'), html('999999999999999999999.0.0'), { ok: true, text: async () => '<html>Not a release</html>' }]) {
    const boot = await startup({ fetch: async url => String(url).endsWith('version.json') ? { ok: true, json: async () => ({ version: '0.1.110' }) } : response })
    assert.equal(boot.current().type.name, 'UpdateRecovery')
    assert.equal(boot.navigation.length, 0)
  }
})

test('pre-React update navigation uses the shared loading message without exposing URL values', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const script = html.match(/<script id="update-loading">([\s\S]*?)<\/script>/)[1]
  for (const [search, expected] of [['', false], ['?focuswilds-update=bad', false], ['?focuswilds-update=0.1.110', true]]) {
    const appended = []
    const loading = { setAttribute: (name, text) => { assert.equal(name, 'aria-label'); assert.equal(text, 'Loading the latest version…') }, append: value => appended.push(value) }
    runInNewContext(script, { URLSearchParams, location: { search }, document: { querySelector: () => loading, createElement: () => ({}) } })
    assert.equal(appended.length, expected ? 1 : 0)
    if (expected) assert.equal(appended[0].textContent, 'Loading the latest version…')
  }
})

test('update recovery uses the shared controls and exposes both recovery actions', () => {
  const source = readFileSync(new URL('../src/screens/system/update-error.tsx', import.meta.url), 'utf8')
  const dependencies = { 'react/jsx-runtime': { jsx: React.createElement, jsxs: React.createElement }, '@/components/button': { Button: () => null }, '@/components/app-version': { AppVersion: () => null } }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compile(source))(name => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports)
  let retries = 0, continued = 0
  const view = module.exports.default({ onRetry: () => retries++, onContinue: () => continued++ })
  assert.equal(view.props.role, 'alert')
  assert.equal(view.props.children[0].props.className, 'recovery-cat')
  const [retry, proceed] = view.props.children[3].props.children
  assert.equal(retry.type, dependencies['@/components/button'].Button)
  assert.equal(proceed.type, retry.type)
  retry.props.onClick(); proceed.props.onClick()
  assert.equal(retries, 1)
  assert.equal(continued, 1)
})
