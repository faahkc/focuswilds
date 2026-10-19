import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'

function load(name, hooks = {}) {
  const source = readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return hooks
    if (name === '../form-controls.css') return {}
    assert.equal(name, 'react/jsx-runtime')
    return { jsx: React.createElement, jsxs: React.createElement }
  }, module, module.exports)
  return module.exports
}

test('Input forwards native editing, validation, accessibility and refs', () => {
  const { Input } = load('input')
  const onChange = () => {}
  const ref = { current: null }
  const input = Input({ type: 'search', value: 'แมว', onChange, ref, disabled: true, 'aria-invalid': true, 'aria-describedby': 'error', className: 'search' })
  assert.equal(input.type, 'input')
  assert.equal(input.props.className, 'pixel-input search')
  for (const [key, expected] of Object.entries({ type: 'search', value: 'แมว', onChange, ref, disabled: true, 'aria-invalid': true, 'aria-describedby': 'error' })) assert.equal(input.props[key], expected)
})

test('Select supports keyboard navigation, selection, cancellation, typeahead and disabled actions', () => {
  const slots = []
  let cursor = 0
  const { Select } = load('select', {
    useId: () => 'select-test',
    useRef: value => { const index = cursor++; return slots[index] ??= { current: value } },
    useState: value => { const index = cursor++; slots[index] ??= value; return [slots[index], next => { slots[index] = next }] },
    useEffect: () => {},
  })
  const changed = []
  const props = { label: 'State', value: 'a', options: [{ value: 'a', label: 'Account' }, { value: 'b', label: 'Busy' }, { value: 'cat', label: 'แมว' }], onChange: value => changed.push(value) }
  const render = () => { cursor = 0; return Select(props) }
  let view = render()
  const trigger = () => view.props.children[1]
  const key = key => { let prevented = false; view.props.onKeyDown({ key, timeStamp: 1000, preventDefault: () => { prevented = true } }); view = render(); return prevented }
  assert.equal(trigger().props['aria-expanded'], false)
  assert.equal(key('ArrowDown'), true)
  assert.equal(trigger().props['aria-expanded'], true)
  assert.equal(view.props.children[2].props['aria-activedescendant'], 'select-test-option-0')
  key('End')
  assert.equal(view.props.children[2].props['aria-activedescendant'], 'select-test-option-2')
  key('Enter')
  assert.deepEqual(changed, ['cat'])
  assert.equal(trigger().props['aria-expanded'], false)
  key(' ')
  key('ArrowUp')
  assert.equal(view.props.children[2].props['aria-activedescendant'], 'select-test-option-2')
  key('Escape')
  assert.deepEqual(changed, ['cat'])
  key('B')
  assert.equal(view.props.children[2].props['aria-activedescendant'], 'select-test-option-1')
  assert.equal(key('Tab'), false)
  assert.equal(trigger().props['aria-expanded'], false)
  props.disabled = true
  view = render()
  key('Enter')
  assert.equal(trigger().props.disabled, true)
  assert.equal(trigger().props['aria-expanded'], false)
  props.disabled = false
  props.options = []
  view = render()
  key('ArrowDown')
  assert.equal(trigger().props.disabled, true)
  assert.deepEqual(changed, ['cat'])
})
