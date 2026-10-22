import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'

test('Active hides blank tasks and requires an open confirmation before finishing once', async () => {
  const refs = [], effects = [], values = []
  let refIndex = 0, stateIndex = 0
  const code = ts.transpileModule(readFileSync(new URL('../src/screens/focus/active.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const deps = {
    react: {
      useRef: () => refs[refIndex++] ??= { current: null },
      useState: initial => { const i = stateIndex++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = value }] },
      useEffect: effect => effects.push(effect),
    },
    'react/jsx-runtime': { jsx: React.createElement, jsxs: React.createElement },
    '@/components/button': { Button: function Button() {} },
    '@/components/game-menu': { GameMenu: function GameMenu() {} },
    '@/lib/focus-round': { elapsedTime: () => 0, formatFocusTime: () => '25:00' },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'Image', code)(name => {
    if (name in deps) return deps[name]
    assert.match(name, /(?:assets\/|screens\/system\/|\.css$)/)
    return { default: function Asset() {} }
  }, module, module.exports, class Image { async decode() {} })
  const actions = []
  const round = { setup: { title: '  ', mode: 'down', minutes: 25 }, status: 'running' }
  const render = () => {
    refIndex = stateIndex = 0; effects.length = 0
    return module.exports.default({ round, now: 0, onAction: action => actions.push(action), onHome() {}, onSignOut() {} })
  }
  render(); effects[0](); await new Promise(resolve => setImmediate(resolve))
  function elements(tree) {
    const result = []
    function visit(node) { if (!React.isValidElement(node)) return; result.push(node); React.Children.forEach(node.props.children, visit) }
    visit(tree); return result
  }
  let nodes = elements(render())
  const title = nodes.find(node => node.props.id === 'finish-title')
  assert.equal(title.props.autoFocus, true)
  assert.equal(title.props.tabIndex, -1)
  assert.equal(nodes.filter(node => node.props.className === 'focus-task').length, 0)
  const dialog = refs[1].current = { open: false, showModal() { this.open = true }, close() { this.open = false } }
  const button = name => nodes.find(node => node.type?.name === 'Button' && node.props.children === name)
  button('Finish round').props.onClick(); assert.deepEqual(actions, [])
  button('Finish').props.onClick(); assert.equal(dialog.open, true); assert.deepEqual(actions, [])
  button('Go back').props.onClick(); assert.equal(dialog.open, false); assert.deepEqual(actions, [])
  button('Finish').props.onClick()
  button('Finish round').props.onClick(); button('Finish round').props.onClick()
  assert.deepEqual(actions, ['finish'])
  round.setup.title = '  Read  '; nodes = elements(render())
  assert.equal(nodes.find(node => node.props.className === 'focus-task').props.children, 'Read')
  dialog.open = true; round.status = 'finished'; render(); effects.at(-1)()
  assert.equal(dialog.open, false)
})
