import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'

function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in dependencies, name); return dependencies[name] }, module, module.exports)
  return module.exports
}

test('shared toast state survives page consumers, replaces instead of queuing and ignores stale animation completion', () => {
  const { showToast, clearToast, toastStore } = load('../src/lib/toast.ts')
  let updates = 0
  const stop = toastStore.subscribe(() => updates++)
  assert.equal(toastStore.getSnapshot(), null)
  showToast('First', 'Message')
  const first = toastStore.getSnapshot()
  showToast('Second', 'Message')
  const second = toastStore.getSnapshot()
  assert.ok(second.id > first.id)
  clearToast(first.id)
  assert.equal(toastStore.getSnapshot(), second)
  assert.equal(updates, 2)
  stop()
  clearToast(second.id)
  assert.equal(updates, 2)
  assert.equal(toastStore.getSnapshot(), null)
})

test('toast uses a persistent polite live region and clears only after its own exit animation', () => {
  const store = load('../src/lib/toast.ts')
  const { ToastHost } = load('../src/components/toast.tsx', {
    react: { useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    'react/jsx-runtime': { jsx: (type, props, key) => React.createElement(type, { ...props, key }), jsxs: (type, props, key) => React.createElement(type, { ...props, key }) },
    '@/lib/toast': store,
    './toast.css': {},
  })
  const idle = ToastHost()
  assert.equal(idle.props.role, 'status')
  assert.equal(idle.props['aria-live'], 'polite')
  assert.equal(idle.props.children, null)
  store.showToast('History limit reached', 'You can continue.')
  const card = ToastHost().props.children
  assert.equal(card.props.children[0].props.children, 'History limit reached')
  card.props.onAnimationEnd({ target: {}, currentTarget: {} })
  assert.ok(store.toastStore.getSnapshot())
  const target = {}
  card.props.onAnimationEnd({ target, currentTarget: target })
  assert.equal(store.toastStore.getSnapshot(), null)
})
