import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'
import { build } from 'vite'
import { createCatalog } from '../src/dev/preview-catalog.ts'

test('preview entry is restricted to development on loopback hosts with an explicit query', async () => {
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
  for (const [dev, url, preview] of [
    [true, 'http://localhost:5173/focuswilds/?preview=ui', true],
    [true, 'http://127.0.0.1:5173/focuswilds/?preview=ui', true],
    [true, 'http://[::1]:5173/focuswilds/?preview=ui', true],
    [true, 'http://localhost:5173/focuswilds/', false],
    [true, 'http://192.168.1.2:5173/focuswilds/?preview=ui', false],
    [false, 'http://localhost:5173/focuswilds/?preview=ui', false],
    [false, 'https://faahkc.github.io/focuswilds/?preview=ui', false],
  ]) {
    const loaded = []
    let rendered = 0
    const dependencies = {
      react: { StrictMode: React.StrictMode },
      'react/jsx-runtime': { jsx: React.createElement },
      'react-dom/client': { createRoot: () => ({ render: () => rendered++ }) },
      './index.css': {},
      './components/screen-layout': { ScreenLayout: () => null },
      './components/app-error-boundary': { AppErrorBoundary: () => null },
      './screens/system/app-error': { default: () => null },
      './dev/ui-preview': { default: () => null },
      './App': { default: () => null },
    }
    const code = ts.transpileModule(main.replaceAll('import.meta.env.DEV', String(dev)), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'exports', 'location', 'document', code)(name => { assert.ok(name in dependencies, name); loaded.push(name); return dependencies[name] }, {}, new URL(url), { getElementById: () => ({}) })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(loaded.includes('./dev/ui-preview'), preview, url)
    assert.equal(loaded.includes('./App'), !preview, url)
    assert.equal(rendered, 1)
  }
})

test('catalog discovers new and nested screens without a central list and loads only the selected module', async () => {
  const loaded = []
  const Default = () => null
  const Fixture = () => null
  const Owner = () => null
  const screens = {
    '../screens/login.tsx': async () => { loaded.push('real login'); return { default: Default } },
    '../screens/system/loading.tsx': async () => { loaded.push('loading'); return { default: Default } },
  }
  const fixtures = { '../screens/login.preview.tsx': async () => { loaded.push('login fixture'); return { default: { Default: Fixture, cases: { Owner } } } } }
  screens['../screens/cats/new-arrival.tsx'] = async () => { loaded.push('new arrival'); return { default: Default } }
  const catalog = createCatalog(screens, fixtures)
  assert.deepEqual(loaded, [])
  assert.deepEqual(catalog.map(({ group, name }) => [group, name]), [['Cats', 'New Arrival'], ['Screens', 'Login'], ['System', 'Loading']])
  assert.deepEqual(await catalog[1].load(), { Default: Fixture, cases: { Owner } })
  assert.deepEqual(loaded, ['login fixture'])
  assert.deepEqual(await catalog[0].load(), { Default, cases: {} })
  assert.deepEqual(loaded, ['login fixture', 'new arrival'])
})

test('catalog handles hundreds of screens and permits retry after a failed lazy import', async () => {
  let calls = 0
  const Default = () => null
  const screens = Object.fromEntries(Array.from({ length: 500 }, (_, index) => [`../screens/group-${index % 5}/screen-${index}.tsx`, async () => ({ default: Default })]))
  screens['../screens/retry.tsx'] = async () => { if (++calls === 1) throw new Error('load failed'); return { default: Default } }
  const catalog = createCatalog(screens, {})
  assert.equal(catalog.length, 501)
  assert.equal(new Set(catalog.map(screen => screen.id)).size, 501)
  const retry = catalog.find(screen => screen.name === 'Retry')
  await assert.rejects(retry.load(), /load failed/)
  assert.equal((await retry.load()).Default, Default)
  assert.deepEqual(createCatalog({}, {}), [])
})

test('login preview fixtures use shared account UI without account services', () => {
  const dependencies = {
    'react/jsx-runtime': { jsx: React.createElement, jsxs: React.createElement },
    './login': { __esModule: true, default: () => null },
    '@/components/account-view': { AccountView: () => null },
  }
  const source = readFileSync(new URL('../src/screens/login.preview.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in dependencies, `Preview must not import ${name}`); return dependencies[name] }, module, module.exports)
  for (const [name, Component] of Object.entries({ Default: module.exports.default.Default, ...module.exports.default.cases })) {
    const preview = Component()
    const screen = preview.type(preview.props)
    assert.equal(screen.type, dependencies['./login'].default)
    const panel = screen.props.children
    assert.equal(panel.type, dependencies['@/components/account-view'].AccountView)
    assert.equal(panel.props.signedIn, ['Owner signed in', 'Access denied'].includes(name))
    assert.equal(panel.props.owner, name === 'Owner signed in')
    assert.equal(panel.props.busy, name === 'Signing in')
    assert.equal(panel.props.error?.code ?? null, name === 'Account error' ? 'auth/restore-failed' : null)
    assert.doesNotThrow(() => panel.props.onAction())
  }
})

test('production build excludes UI preview code and styles', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } })
  const files = (Array.isArray(result) ? result : [result]).flatMap(bundle => bundle.output)
  for (const file of files) {
    assert.doesNotMatch(file.fileName, /ui-preview|\.preview\./)
    if (file.type === 'chunk') for (const path of Object.keys(file.modules)) assert.doesNotMatch(path.replaceAll('\\', '/'), /\/src\/dev\/|\.preview\.tsx$/)
    const content = file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : ''
    assert.doesNotMatch(content, /UI preview:|Preview only\.|ui-preview-tools|preview=ui|\.\/dev\/ui-preview/)
  }
})
