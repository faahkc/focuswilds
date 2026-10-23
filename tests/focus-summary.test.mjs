import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { startRound, startRest, restPresets, changeRound, formatFocusTime } from '../src/lib/focus-round.ts'
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
  return module.exports.default ?? module.exports
}

test('Summary renders actual focused time and unavailable outcomes without granting mock rewards', () => {
  const { RoundRecoveryWarning } = load('../src/components/round-recovery-warning.tsx', {
    'react/jsx-runtime': jsx, './round-recovery-warning.css': {},
  })
  const Summary = load('../src/screens/focus/summary.tsx', {
    react: React, 'react/jsx-runtime': jsx,
    '@/components/button': { Button: props => React.createElement('button', props) },
    '@/components/round-recovery-warning': { RoundRecoveryWarning },
    '@/lib/focus-round': { formatFocusTime, restPresets }, './summary.css': {}, '@/components/game-menu.css': {},
  })
  for (const [mode, elapsed, expected] of [['down', 12_000, '00:12'], ['down', 1_500_000, '25:00'], ['up', 3_723_000, '1:02:03']]) {
    const round = changeRound(startRound({ ...initialFocusSetup, mode, title: '  Read  ' }, 0), 'finish', elapsed)
    const before = structuredClone(round)
    const html = renderToStaticMarkup(React.createElement(Summary, { round, onHome() {} }))
    assert.match(html, new RegExp(expected))
    assert.match(html, />Read<\/p>/)
    assert.match(html, /<dl role="region" aria-label="Focus results" tabindex="0">/)
    assert.equal((html.match(/aria-label="Not available yet"/g) ?? []).length, 4)
    assert.match(html, /disabled="" aria-description="Coming soon">Take a break/)
    assert.match(html, />Back home<\/button>/)
    assert.deepEqual(round, before)
  }
  const round = changeRound(startRound(initialFocusSetup, 0), 'finish', 12_000)
  const pending = renderToStaticMarkup(React.createElement(Summary, { round, recoverable: false, saveState: 'unavailable', onRetry() {}, onHome() {} }))
  assert.match(pending, /class="round-recovery-warning message-copy" role="alert">Reloading may lose this round\.<br\/>Keep this tab open\./)
  assert.match(pending, /Could not save/)
  assert.match(pending, />Try again<\/button>/)
  assert.doesNotMatch(pending, />Back home<\/button>/)
  for (const [saveState, message] of [
    ['full', 'History is full.<br/>Keep this round here.'],
    ['limited', 'History is busy.<br/>Try again shortly.'],
    ['invalid', 'This round needs checking.<br/>Keep it here.'],
    ['unavailable', 'Could not save.<br/>Your round is kept here.'],
  ]) {
    const html = renderToStaticMarkup(React.createElement(Summary, { round, saveState, onRetry() {}, onHome() {} }))
    assert.ok(html.includes(`aria-live="polite">${message}</p>`), `${saveState} separates the condition from its instruction`)
    assert.match(html, />Try again<\/button>/)
    assert.doesNotMatch(html, />Back home<\/button>/)
  }
  const saved = renderToStaticMarkup(React.createElement(Summary, { round, recoverable: false, saveState: 'saved', onHome() {} }))
  assert.doesNotMatch(saved, /Keep this tab open/)
  assert.match(renderToStaticMarkup(React.createElement(RoundRecoveryWarning, { kind: 'break' })), /Reloading may lose this break/)
})

test('Owner routes restored/manual/automatic finished rounds to Summary and clears only on Back home', () => {
  const values = [], screens = []
  let cursor = 0, clears = 0, saveState
  const round = changeRound(startRound(initialFocusSetup, 0), 'finish', 12_000)
  const timer = { round, now: 12_000, recoverable: true,
    action(action) { this.round = changeRound(this.round, action, this.now) },
    close() { clears++; this.round = null },
  }
  const rest = { round: null, now: 12_000, recoverable: true,
    start(setup) { this.round = startRest(setup.minutes, this.now) },
    close() { this.round = null },
  }
  const Owner = load('../src/components/owner-game.tsx', {
    react: { Suspense: React.Suspense, lazy: () => { const screen = function Screen() {}; screens.push(screen); return screen },
      useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = value }] } },
    'react/jsx-runtime': jsx, '@/screens/system/loading': { default: () => null },
    '@/lib/focus-setup': { initialFocusSetup }, './use-focus-round': { useFocusRound: (persist, phase) => phase === 'rest' ? rest : timer },
    './use-focus-history': { useFocusHistory: () => ({ state: saveState, retained: true, retry() {} }) },
  })
  const render = () => { cursor = 0; return Owner({ onSignOut() {} }).props.children }
  assert.equal(render().type, screens[3])
  assert.equal(render().props.round, round)
  assert.equal(clears, 0)
  for (const pending of ['saving', 'unavailable', 'limited']) {
    saveState = pending
    render().props.onHome()
    render().props.onRest(5)
    assert.equal(clears, 0)
    assert.equal(rest.round, null)
  }
  saveState = 'saved'
  render().props.onHome()
  assert.equal(clears, 1)
  assert.equal(render().type, screens[0])
  saveState = undefined
  for (const action of ['finish', 'tick']) {
    timer.round = startRound(initialFocusSetup, 0); timer.now = 1_500_000
    assert.equal(render().type, screens[2])
    timer.action(action)
    assert.equal(render().type, screens[3])
    assert.equal(render().props.round.elapsedMs, 1_500_000)
  }
  const focused = structuredClone(timer.round)
  render().props.onRest(10)
  assert.equal(render().type, screens[4])
  assert.equal(render().props.round.setup.minutes, 10)
  assert.deepEqual(timer.round, focused)
  rest.round = changeRound(rest.round, 'tick', rest.now + 600_000)
  render().props.onFocus()
  assert.equal(rest.round, null)
  assert.equal(timer.round, null)
  assert.equal(render().type, screens[1])
  assert.deepEqual(render().props.value, initialFocusSetup)
})
