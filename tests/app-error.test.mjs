import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import ts from 'typescript'

test('React recovery uses a static cat, shared controls/version and a working reload action', () => {
  const source = readFileSync(new URL('../src/screens/system/app-error.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const dependencies = {
    'react/jsx-runtime': { jsx: React.createElement, jsxs: React.createElement },
    '@/components/button': { Button: () => null },
    '@/components/app-version': { AppVersion: () => null },
  }
  const module = { exports: {} }
  let reloads = 0
  new Function('require', 'module', 'exports', 'window', code)(name => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports, { location: { reload: () => reloads++ } })
  const view = module.exports.default()
  assert.equal(view.props.role, 'alert')
  const [cat, title, message, button, version] = view.props.children
  assert.equal(cat.props.className, 'recovery-cat')
  assert.equal(cat.props['aria-hidden'], 'true')
  assert.equal(title.props.children, 'Something went wrong')
  assert.equal(message.props.children, 'Please reload to try again.')
  assert.equal(button.type, dependencies['@/components/button'].Button)
  assert.equal(version.type, dependencies['@/components/app-version'].AppVersion)
  button.props.onClick()
  assert.equal(reloads, 1)
})

test('pre-React failure hides loading and exposes the same recovery content', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /href="\/src\/recovery.css"/)
  assert.match(html, /class="startup-recovery content-column" role="alert" hidden><span class="recovery-cat" aria-hidden="true"><\/span><h1>Something went wrong<\/h1><p>Please reload to try again\.<\/p>/)
  assert.match(html, /class="app-version">v%APP_VERSION%<\/footer>/)
  const loading = { hidden: false }, recovery = { hidden: true }
  const document = { querySelector: selector => selector === '.page-loading' ? loading : recovery }
  const handler = html.match(/<script id="startup-error">([\s\S]*?)<\/script>/)[1]
  let listener
  const window = { addEventListener: (name, callback, capture) => {
    assert.equal(name, 'error')
    assert.equal(capture, true)
    listener = callback
  } }
  runInNewContext(handler, { document, window })
  listener({ target: { tagName: 'IMG' } })
  listener({ target: { tagName: 'SCRIPT', type: 'text/javascript' } })
  assert.equal(loading.hidden, false)
  listener({ target: { tagName: 'SCRIPT', type: 'module' } })
  assert.equal(loading.hidden, true)
  assert.equal(recovery.hidden, false)
  assert.doesNotThrow(() => runInNewContext(handler, { document: { querySelector: () => null }, window: { addEventListener: (_, callback) => callback({ target: { tagName: 'SCRIPT', type: 'module' } }) } }))
  const css = readFileSync(new URL('../src/loading.css', import.meta.url), 'utf8')
  const rule = css.match(/^\.recovery-cat \{[^}]+\}/m)[0]
  assert.doesNotMatch(rule, /animation:/)
  assert.match(rule, /-1056px -32px/)
})
