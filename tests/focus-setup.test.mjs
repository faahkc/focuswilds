import test from 'node:test'
import assert from 'node:assert/strict'
import { durationError, titleError, initialFocusSetup, durationPresets } from '../src/lib/focus-setup.ts'
import { editText } from '../src/lib/text-edit.ts'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'

test('Focus setup defaults and custom whole-minute bounds reject invalid intermediate values', () => {
  assert.deepEqual(initialFocusSetup, { title: '', mode: 'down', minutes: 25 })
  assert.deepEqual(durationPresets, [10, 25, 50])
  for (const value of ['1', '25', '75', '180', '025']) assert.equal(durationError(value), '')
  for (const value of ['', '0', '-1', '181', '2.5', '1e2', 'Infinity', '25 min', '๒๕']) assert.ok(durationError(value), value)
})

test('task length counts user-perceived Thai/emoji characters without cutting combining marks', () => {
  assert.equal(titleError(''), '')
  assert.equal(titleError('ก้'.repeat(100)), '')
  assert.ok(titleError('ก้'.repeat(101)))
  assert.equal(titleError('👨‍👩‍👧‍👦'.repeat(100)), '')
})

test('editor inserts and replaces selections and deletes complete Thai/emoji graphemes', () => {
  assert.deepEqual(editText('abcd', 1, 3, 'แมว'), { value: 'aแมวd', caret: 4 })
  assert.deepEqual(editText('ก้', 2, 2, '', true), { value: '', caret: 0 })
  const family = '👨‍👩‍👧‍👦'
  assert.deepEqual(editText(family + '!', family.length, family.length, '', true), { value: '!', caret: 0 })
  assert.deepEqual(editText('a' + family + 'b', 2, 3, '', true), { value: 'ab', caret: 1 })
  assert.deepEqual(editText('abc', 0, 0, '', true), { value: 'abc', caret: 0 })
  assert.deepEqual(editText('abc', 99, 99, '!'), { value: 'abc!', caret: 4 })
})

test('owner navigation preserves confirmed setup across Back and reentry without account imports', () => {
  const values = []
  let cursor = 0
  const dependencies = {
    react: { Suspense: React.Suspense, lazy: () => function Screen() {}, useState: initial => {
      const index = cursor++
      if (!(index in values)) values[index] = initial
      return [values[index], value => { values[index] = value }]
    } },
    'react/jsx-runtime': { jsx: React.createElement },
    '@/screens/system/loading': { default: () => null },
    '@/lib/focus-setup': { initialFocusSetup },
  }
  const source = readFileSync(new URL('../src/components/owner-game.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in dependencies, `Unexpected service import: ${name}`)
    return dependencies[name]
  }, module, module.exports)
  const render = () => { cursor = 0; return module.exports.default({ onSignOut() {} }).props.children.props }
  render().onStartFocus()
  assert.deepEqual(render().value, initialFocusSetup)
  const confirmed = { title: 'อ่านหนังสือ', mode: 'up', minutes: 75 }
  render().onChange(confirmed)
  render().onBack()
  render().onStartFocus()
  assert.deepEqual(render().value, confirmed)
})

test('shared game fields require deliberate editing and keep disabled/read-only values locked', () => {
  let opens = 0
  const dependencies = {
    react: { useId: () => 'editor-test', useRef: () => ({ current: null }), useState: () => [false, () => opens++] },
    'react/jsx-runtime': { Fragment: React.Fragment, jsx: React.createElement, jsxs: React.createElement },
    './input': { Input: () => null }, './game-keyboard': { GameKeyboard: () => null },
  }
  const source = readFileSync(new URL('../src/components/game-input.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports)
  function field(extra = {}) {
    return module.exports.GameInput({ label: 'Task', value: '', onChange() {}, ...extra }).props.children[0].props.children[1].props
  }
  field({ disabled: true }).onClick()
  field({ readOnly: true }).onKeyDown({ key: 'Enter', preventDefault() {} })
  assert.equal(opens, 0)
  assert.equal(field().readOnly, true)
  field().onKeyDown({ key: 'Tab' })
  assert.equal(opens, 0)
  field().onKeyDown({ key: 'Enter', preventDefault() {} })
  assert.equal(opens, 1)
})

test('shared keyboard preserves symbol drafts and enforces numeric validation without treating empty editing as an error', () => {
  const hooks = []
  let cursor = 0
  let committed
  const input = { selectionStart: 0, selectionEnd: 0, focus() {}, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end } }
  const dependencies = {
    react: {
      useId: () => 'keyboard-test', useEffect() {},
      useRef: initial => {
        const index = cursor++
        return hooks[index] ??= { current: index === 1 ? input : initial }
      },
      useState: initial => {
        const index = cursor++
        if (!(index in hooks)) hooks[index] = initial
        return [hooks[index], value => { hooks[index] = value }]
      },
    },
    'react/jsx-runtime': { Fragment: React.Fragment, jsx: (type, props, key) => React.createElement(type, { ...props, key }), jsxs: (type, props, key) => React.createElement(type, { ...props, key }) },
    './input': { Input: () => null }, './button': { Button: () => null },
    '@/lib/text-edit': { editText }, './game-keyboard.css': {},
  }
  const source = readFileSync(new URL('../src/components/game-keyboard.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'requestAnimationFrame', code)(name => { assert.ok(name in dependencies); return dependencies[name] }, module, module.exports, callback => callback())
  const render = (numeric, extra = {}) => {
    cursor = 0
    return module.exports.GameKeyboard({ label: 'Task', value: '', numeric, onDone: value => { committed = value }, onCancel() {}, ...extra })
  }
  function elements(node) {
    return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(elements)] : []
  }
  const button = name => elements(render(false)).find(node => node.props['aria-label'] === name)
  button('Switch keyboard language').props.onClick()
  button('Show symbols').props.onClick()
  assert.ok(elements(render(false)).some(node => node.props['aria-label'] === 'Symbol keyboard'))
  const keys = elements(render(false)).filter(node => node.props.tabIndex === -1).map(node => node.props['aria-label'])
  for (let code = 33; code <= 126; code++) {
    const character = String.fromCharCode(code)
    if (!/[a-z]/i.test(character)) assert.ok(keys.includes(character), character)
  }
  button('_').props.onClick()
  button('Return to letters').props.onClick()
  assert.ok(elements(render(false)).some(node => node.props['aria-label'] === 'Thai keyboard'))
  elements(render(false)).find(node => node.props.children === 'Done').props.onClick()
  assert.equal(committed, '_')
  assert.ok(!elements(render(true)).some(node => node.props['aria-label'] === 'Show symbols'))
  hooks.length = 0
  committed = undefined
  const number = () => elements(render(true, { value: '25', validate: durationError, helpText: '1-180 minutes' }))
  const field = () => number().find(node => node.props['aria-label'] === 'Task')
  const done = () => number().find(node => node.props.children === 'Done')
  field().props.onChange({ target: { value: '' } })
  assert.equal(field().props['aria-invalid'], false)
  assert.equal(done().props.disabled, true)
  assert.ok(number().some(node => node.props.className === 'game-editor-help'))
  done().props.onClick()
  field().props.onKeyDown({ key: 'Enter', nativeEvent: {}, preventDefault() {} })
  assert.equal(committed, undefined)
  field().props.onChange({ target: { value: '181' } })
  assert.equal(field().props['aria-invalid'], true)
  assert.equal(done().props.disabled, true)
  assert.ok(number().some(node => node.props.className === 'game-editor-error'))
  done().props.onClick()
  assert.equal(committed, undefined)
  field().props.onChange({ target: { value: '75' } })
  assert.equal(field().props['aria-invalid'], false)
  assert.equal(done().props.disabled, false)
  done().props.onClick()
  assert.equal(committed, '75')
})
