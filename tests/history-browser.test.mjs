import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { formatFocusTime } from '../src/lib/focus-round.ts'

function load(path, deps) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in deps, name); return deps[name] }, module, module.exports)
  return module.exports
}

test('History shows actual saved data with Bangkok receipt time, empty fallback and safe long text', () => {
  const Screen = load('../src/screens/history.tsx', {
    react: React, 'react/jsx-runtime': jsx, '@/components/button': { Button: props => React.createElement('button', props) },
    '@/lib/focus-round': { formatFocusTime }, './system/loading': { __esModule: true, default: () => React.createElement('p', null, 'Loading history') }, './history.css': {},
  }).default
  const render = props => renderToStaticMarkup(React.createElement(Screen, props))
  const entries = [{ roundId: 'id', savedAt: '2026-10-22T20:00:00Z', task: '', mode: 'down', completion: 'ended', elapsedMs: 12000 }]
  const html = render({ entries })
  assert.match(html, />Focus<\/p>/)
  assert.match(html, /00:12.*Ended early/)
  assert.match(html, /23 Oct 2026/)
  assert.match(html, /03:00/)
  assert.match(html, /role="region" aria-label="Saved focus rounds"/)
  assert.match(render({ entries: [{ ...entries[0], task: '<script>อ่าน</script>', mode: 'up' }] }), /&lt;script&gt;อ่าน&lt;\/script&gt;/)
  assert.match(render({}), /No rounds saved yet/)
  assert.match(render({ state: 'error' }), /role="alert"/)
  assert.match(render({ state: 'loading' }), /Loading history/)
})

test('history navigation guards rapid reads, reuses previous pages, retries safely and ignores closed-menu results', async () => {
  const values = [], effects = []
  let cursor = 0, calls = 0, resolve, reject
  const deps = {
    react: {
      useState(initial) { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], next => { values[i] = next }] },
      useRef(initial) { const i = cursor++; return values[i] ??= { current: initial } },
      useEffect: effect => effects.push(effect),
    },
    'react/jsx-runtime': jsx, '@/screens/history': { default: function History() {} },
  }
  const Browser = load('../src/components/focus-history-browser.tsx', deps).FocusHistoryBrowser
  const requests = []
  const loader = (cursor, refresh) => { calls++; requests.push({ cursor, refresh }); return new Promise((yes, no) => { resolve = yes; reject = no }) }
  const render = () => { cursor = 0; return Browser({ load: loader, onBack() {} }).props }
  render(); const cleanup = effects[0]()
  render().onRefresh(); render().onNext()
  assert.equal(calls, 1)
  const first = { entries: [{ roundId: 'a' }], next: { id: 'a', savedAt: 'precise' } }
  resolve(first); await new Promise(yes => setImmediate(yes))
  assert.equal(render().state, 'ready')
  render().onNext(); render().onNext()
  assert.equal(calls, 2)
  assert.deepEqual(requests[1].cursor, first.next)
  reject(Error('network')); await new Promise(yes => setImmediate(yes))
  assert.equal(render().state, 'error')
  render().onRetry()
  assert.equal(calls, 3)
  resolve({ entries: [{ roundId: 'b' }], next: null }); await new Promise(yes => setImmediate(yes))
  assert.equal(render().page, 2)
  render().onPrevious()
  assert.equal(render().page, 1)
  render().onNext()
  assert.equal(render().page, 2)
  assert.equal(calls, 3)
  render().onNext()
  assert.equal(calls, 3)
  render().onRefresh()
  assert.equal(requests[3].refresh, true)
  cleanup()
  resolve({ entries: [], next: null }); await new Promise(yes => setImmediate(yes))
  assert.equal(render().state, 'loading')
})
