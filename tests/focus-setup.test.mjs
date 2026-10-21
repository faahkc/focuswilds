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
