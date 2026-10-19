import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'

test('shared button defaults to non-submit and forwards native behavior and accessibility', () => {
  const source = readFileSync(new URL('../src/components/button.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    assert.equal(name, 'react/jsx-runtime')
    return { jsx: React.createElement }
  }, module, module.exports)
  const { Button } = module.exports
  const onClick = () => {}
  const ref = { current: null }
  const view = Button({ children: 'Save', disabled: true, 'aria-label': 'Save changes', onClick, ref })
  assert.equal(view.type, 'button')
  assert.equal(view.props.type, 'button')
  assert.equal(view.props.className, 'pixel-button')
  assert.equal(view.props.disabled, true)
  assert.equal(view.props['aria-label'], 'Save changes')
  assert.equal(view.props.onClick, onClick)
  assert.equal(view.props.ref, ref)
  assert.equal(view.props.children, 'Save')
  const submit = Button({ type: 'submit', className: 'purchase', 'aria-busy': true })
  assert.equal(submit.props.type, 'submit')
  assert.equal(submit.props.className, 'pixel-button purchase')
  assert.equal(submit.props['aria-busy'], true)
})
