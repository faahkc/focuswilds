import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { startRound, changeRound, formatFocusTime } from '../src/lib/focus-round.ts'
import { initialFocusSetup } from '../src/lib/focus-setup.ts'

function load(path, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
    return dependencies[name]
  }, module, module.exports)
  return module.exports.default
}

test('Summary renders actual focused time and unavailable outcomes without granting mock rewards', () => {
  const Summary = load('../src/screens/focus/summary.tsx', {
    react: React, 'react/jsx-runtime': jsx,
    '@/components/button': { Button: props => React.createElement('button', props) },
    '@/lib/focus-round': { formatFocusTime }, './summary.css': {},
  })
  for (const [mode, elapsed, expected] of [['down', 12_000, '00:12'], ['down', 1_500_000, '25:00'], ['up', 3_723_000, '1:02:03']]) {
    const round = changeRound(startRound({ ...initialFocusSetup, mode, title: '  Read  ' }, 0), 'finish', elapsed)
    const before = structuredClone(round)
    const html = renderToStaticMarkup(React.createElement(Summary, { round, onHome() {} }))
    assert.match(html, new RegExp(expected))
    assert.match(html, />Read<\/p>/)
    assert.equal((html.match(/aria-label="Not available yet"/g) ?? []).length, 4)
    assert.match(html, /disabled="" aria-description="Coming soon">Take a break/)
    assert.match(html, />Back home<\/button>/)
    assert.deepEqual(round, before)
  }
})

test('Owner routes restored/manual/automatic finished rounds to Summary and clears only on Back home', () => {
  const values = [], screens = []
  let cursor = 0, clears = 0
  const round = changeRound(startRound(initialFocusSetup, 0), 'finish', 12_000)
  const timer = { round, now: 12_000, recoverable: true,
    action(action) { this.round = changeRound(this.round, action, this.now) },
    close() { clears++; this.round = null },
  }
  const Owner = load('../src/components/owner-game.tsx', {
    react: { Suspense: React.Suspense, lazy: () => { const screen = function Screen() {}; screens.push(screen); return screen },
      useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = value }] } },
    'react/jsx-runtime': jsx, '@/screens/system/loading': { default: () => null },
    '@/lib/focus-setup': { initialFocusSetup }, './use-focus-round': { useFocusRound: () => timer },
  })
  const render = () => { cursor = 0; return Owner({ onSignOut() {} }).props.children }
  assert.equal(render().type, screens[3])
  assert.equal(render().props.round, round)
  assert.equal(clears, 0)
  render().props.onHome()
  assert.equal(clears, 1)
  assert.equal(render().type, screens[0])
  for (const action of ['finish', 'tick']) {
    timer.round = startRound(initialFocusSetup, 0); timer.now = 1_500_000
    assert.equal(render().type, screens[2])
    timer.action(action)
    assert.equal(render().type, screens[3])
    assert.equal(render().props.round.elapsedMs, 1_500_000)
  }
})
