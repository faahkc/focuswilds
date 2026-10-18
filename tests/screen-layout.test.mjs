import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function component(file, dependencies = {}, extension = 'tsx') {
  const source = fs.readFileSync(new URL(`../src/components/${file}.${extension}`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => dependencies[name] ?? require(name), module, module.exports)
  return module.exports
}
test('game windows close with Escape and restore focus to the opening control', () => {
  const previousDocument = globalThis.document
  const previousHTMLElement = globalThis.HTMLElement
  let effect
  let shown = 0
  let closed = 0
  let focused = 0
  let cancelled = 0
  class Element { focus() { focused++ } }
  try {
    globalThis.HTMLElement = Element
    globalThis.document = { activeElement: new Element() }
    const { GameWindow } = component('game-window', {
      react: { ...React, useEffect: callback => { effect = callback }, useRef: () => ({ current: { showModal: () => shown++, close: () => closed++ } }) },
      '@/components/ui/button': { Button: () => null },
    })
    const dialog = GameWindow({ title: 'Creature journal', open: true, onClose: () => cancelled++, children: 'Saved discoveries' })
    assert.equal(dialog.type, 'dialog')
    assert.equal(dialog.props['aria-label'], 'Creature journal')
    const cleanup = effect()
    assert.equal(shown, 1)
    dialog.props.onCancel()
    assert.equal(cancelled, 1)
    cleanup()
    assert.equal(closed, 1)
    assert.equal(focused, 1)
  } finally {
    globalThis.document = previousDocument
    globalThis.HTMLElement = previousHTMLElement
  }
})
test('the shared landscape frame keeps app content mounted and interactive', () => {
  const { ScreenLayout } = component('screen-layout')
  const content = React.createElement('span', null, 'Timer stays mounted')
  const frame = ScreenLayout({ children: content })
  assert.equal(frame.props.children, content)
  const html = renderToStaticMarkup(frame)
  assert.match(html, /class="landscape-screen"/)
  assert.ok(!html.includes('inert'))
})
