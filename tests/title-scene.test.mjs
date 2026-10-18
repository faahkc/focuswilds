import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const flush = () => new Promise(resolve => setImmediate(resolve))
function titleScene(renderer) {
  let effect, state = 'loading'
  const host = {}
  const source = fs.readFileSync(new URL('../src/components/title-scene.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return { ...React, useRef: () => ({ current: host }), useState: () => [state, value => { state = value }], useEffect: fn => { effect = fn } }
    if (name === '@/lib/fort-renderer') { if (renderer instanceof Error) throw renderer; return { createFortRenderer: renderer } }
    if (name === '@/assets/title-fallback.webp') return { __esModule: true, default: '/assets/title-fallback.webp' }
    return require(name)
  }, module, module.exports)
  const html = renderToStaticMarkup(React.createElement(module.exports.TitleScene))
  return { html, host, mount: () => effect(), state: () => state }
}

test('the title has an accessible animated load status and a bundled fallback independent of signed-in camp assets', () => {
  const scene = titleScene(() => () => {})
  assert.match(scene.html, /role="status"/)
  assert.match(scene.html, /wilds-loading-mark/)
  assert.match(scene.html, /title-fallback-image/)
  assert.match(scene.html, /src="\/assets\/title-fallback.webp"/)
  assert.doesNotMatch(scene.html, /https:|shelter-courtyard|survivors/)
})

test('title rendering starts after mounting, reports readiness and disposes on unmount', async () => {
  let starts = 0, stops = 0
  const scene = titleScene((host, status) => { starts++; assert.equal(host, scene.host); status('ready'); return () => stops++ })
  const stop = scene.mount()
  await flush()
  assert.equal(starts, 1)
  assert.equal(scene.state(), 'ready')
  stop()
  assert.equal(stops, 1)
})

test('an unavailable renderer ends loading in fallback and late imports do not create abandoned scenes', async () => {
  const failure = titleScene(new Error('offline'))
  failure.mount()
  await flush()
  assert.equal(failure.state(), 'fallback')
  let starts = 0
  const abandoned = titleScene(() => { starts++; return () => {} })
  abandoned.mount()()
  await flush()
  assert.equal(starts, 0)
})
