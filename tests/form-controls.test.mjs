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
    if (name === 'react-dom') return { createPortal: element => element }
    if (name === '../form-controls.css') return {}
    if (name === '../pixel-icon.css') return {}
    if (name === './pixel-icon') return load('pixel-icon')
    assert.equal(name, 'react/jsx-runtime')
    return { jsx: React.createElement, jsxs: React.createElement }
  }, module, module.exports)
  return module.exports
}

test('Input forwards native editing, validation, accessibility and refs', () => {
  const { Input } = load('input')
  const onChange = () => {}
  const ref = { current: null }
  const frame = Input({ type: 'search', value: 'แมว', onChange, ref, disabled: true, 'aria-invalid': true, 'aria-describedby': 'error', className: 'search' })
  const input = frame.props.children[0]
  assert.equal(frame.props['data-invalid'], true)
  assert.equal(frame.props['data-disabled'], true)
  assert.equal(input.type, 'input')
  assert.equal(input.props.className, 'pixel-input search')
  for (const [key, expected] of Object.entries({ type: 'search', value: 'แมว', onChange, ref, disabled: true, 'aria-invalid': true, 'aria-describedby': 'error' })) assert.equal(input.props[key], expected)
})

test('controlled search has an accessible themed clear action and keeps focus without scrolling', () => {
  const { Input } = load('input')
  let clears = 0
  const props = { type: 'search', value: 'complete', onClear: () => clears++, clearLabel: 'ล้างการค้นหา' }
  const view = Input(props)
  const clear = view.props.children[1]
  assert.equal(clear.props['aria-label'], 'ล้างการค้นหา')
  assert.equal(clear.props.children.props.name, 'close')
  const mark = clear.props.children.type(clear.props.children.props)
  assert.equal(mark.props['aria-hidden'], 'true')
  assert.equal(mark.props.children, undefined, 'the clear icon does not depend on a text glyph baseline')
  let focusOptions
  clear.props.onClick({ currentTarget: { previousElementSibling: { focus: options => { focusOptions = options } } } })
  assert.equal(clears, 1)
  assert.deepEqual(focusOptions, { preventScroll: true })
  assert.equal(Input({ ...props, value: '' }).props.children[1], false)
  assert.equal(Input({ ...props, disabled: true }).props.children[1].props.disabled, true)
  assert.equal(Input({ ...props, readOnly: true }).props.children[1].props.disabled, true)
})

test('Select supports keyboard navigation, selection, cancellation, typeahead and disabled actions', () => {
  const slots = []
  let cursor = 0
  const { Select } = load('select', {
    useId: () => 'select-test',
    useRef: value => { const index = cursor++; return slots[index] ??= { current: value } },
    useState: value => { const index = cursor++; slots[index] ??= value; return [slots[index], next => { slots[index] = next }] },
    useEffect: () => {},
    useLayoutEffect: () => {},
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
  assert.equal(view.props.children[2].props.children.props['aria-activedescendant'], 'select-test-option-0')
  key('End')
  assert.equal(view.props.children[2].props.children.props['aria-activedescendant'], 'select-test-option-2')
  key('Enter')
  assert.deepEqual(changed, ['cat'])
  assert.equal(trigger().props['aria-expanded'], false)
  key(' ')
  key('ArrowUp')
  assert.equal(view.props.children[2].props.children.props['aria-activedescendant'], 'select-test-option-2')
  key('Escape')
  assert.deepEqual(changed, ['cat'])
  key('B')
  assert.equal(view.props.children[2].props.children.props['aria-activedescendant'], 'select-test-option-1')
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

test('opening Select prevents focus scrolling and scrolls only its own options', () => {
  const slots = []
  let cursor = 0
  let effects = []
  const { Select } = load('select', {
    useId: () => 'position-test',
    useRef: value => { const index = cursor++; return slots[index] ??= { current: value } },
    useState: value => { const index = cursor++; slots[index] ??= value; return [slots[index], next => { slots[index] = next }] },
    useEffect: callback => effects.push(callback),
    useLayoutEffect: () => {},
  })
  const render = () => { cursor = 0; effects = []; return Select({ label: 'State', value: 'a', options: [{ value: 'a', label: 'Account' }], onChange: () => {} }) }
  let view = render()
  view.props.children[1].props.onClick()
  view = render()
  const frame = view.props.children[2]
  let prevented = false
  frame.props.onPointerDown({ currentTarget: frame, target: frame, preventDefault: () => { prevented = true } })
  assert.equal(prevented, true, 'frame padding keeps list focus')
  prevented = false
  frame.props.onPointerDown({ currentTarget: frame, target: {}, preventDefault: () => { prevented = true } })
  assert.equal(prevented, false, 'option pointer events remain available for selection and touch scrolling')
  const focusCalls = []
  const menu = { contains: () => false, focus: options => focusCalls.push(options), children: [{ getBoundingClientRect: () => ({ top: 140, bottom: 200 }) }], getBoundingClientRect: () => ({ top: 20, bottom: 120 }), scrollTop: 0 }
  view.props.children[2].props.children.props.ref.current = menu
  const previousDocument = globalThis.document
  let pointerDown
  globalThis.document = { addEventListener: (name, handler) => { assert.equal(name, 'pointerdown'); pointerDown = handler }, removeEventListener: () => {} }
  try {
    for (const effect of effects) effect()
    assert.deepEqual(focusCalls, [{ preventScroll: true }])
    assert.equal(menu.scrollTop, 86)
    pointerDown({ target: {} })
    view = render()
    assert.equal(view.props.children[1].props['aria-expanded'], false)
  } finally { globalThis.document = previousDocument }
})
