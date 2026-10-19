import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import ts from 'typescript'

test('bootstrap and application share a text-free, accessible cat loading screen', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /href="\/src\/loading.css"/)
  assert.match(html, /<main class="page-loading" role="status" aria-label="Loading"><span class="loading-cat" aria-hidden="true"><\/span><\/main>/)
  assert.doesNotMatch(html, /page-loading-spinner|Preparing|loading-spin/)
  const source = readFileSync(new URL('../src/screens/system/loading.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    assert.equal(name, 'react/jsx-runtime')
    return { jsx: React.createElement, jsxs: React.createElement }
  }, module, module.exports)
  const view = module.exports.default()
  assert.equal(view.props.role, 'status')
  assert.equal(view.props['aria-label'], 'Loading')
  assert.equal(view.props.children[0].props.className, 'loading-cat')
  assert.equal(view.props.children[0].props['aria-hidden'], 'true')
  assert.equal(view.props.children[0].props.children, undefined)
  assert.equal(view.props.children[1], undefined)
  for (const message of ['Signing in…', 'กำลังโหลด…']) {
    const status = module.exports.default({ message })
    assert.equal(status.props['aria-label'], message)
    assert.equal(status.props['aria-atomic'], 'true')
    assert.equal(status.props.children[1].props.children, message)
  }
  assert.equal(module.exports.default({ label: 'กำลังโหลด' }).props['aria-label'], 'กำลังโหลด')
})

test('sprite timing preserves the approved nine poses and 3040ms loop', () => {
  const css = readFileSync(new URL('../src/loading.css', import.meta.url), 'utf8')
  const png = readFileSync(new URL('../src/assets/loading-cat.png', import.meta.url))
  assert.equal(png.readUInt32BE(16), 32 * 9)
  assert.equal(png.readUInt32BE(20), 40)
  assert.match(css, /width: 128px; height: 160px/)
  assert.match(css, /1152px 160px/)
  assert.match(css, /3040ms step-end infinite/)
  assert.doesNotMatch(css, /prefers-reduced-motion/)
  const frames = [...css.matchAll(/([\d.]+)% \{ background-position: (-?\d+)(?:px)? 0; \}/g)]
  assert.equal(frames.length, 10)
  const durations = [450, 350, 350, 350, 140, 500, 300, 100, 500]
  for (let i = 0; i < 9; i++) {
    assert.equal(Number(frames[i][2]), (0 - i) * 128)
    assert.ok(Math.abs((Number(frames[i + 1][1]) - Number(frames[i][1])) * 30.4 - durations[i]) < 0.001)
  }
  assert.equal(Number(frames[9][2]), 0)
})

test('cat animation pauses while hidden and resumes even before React loads', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const source = html.match(/<script id="loading-visibility">([\s\S]*?)<\/script>/)[1]
  for (const initiallyHidden of [false, true]) {
    let state, listener
    const document = {
      hidden: initiallyHidden,
      documentElement: { style: { setProperty: (name, value) => { assert.equal(name, '--loading-animation-state'); state = value } } },
      addEventListener: (name, callback) => { assert.equal(name, 'visibilitychange'); listener = callback },
    }
    runInNewContext(source, { document })
    assert.equal(state, initiallyHidden ? 'paused' : 'running')
    document.hidden = true
    listener()
    assert.equal(state, 'paused')
    document.hidden = false
    listener()
    assert.equal(state, 'running')
  }
})
