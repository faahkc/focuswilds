import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { authErrorMessage } from '../src/lib/auth-error.ts'
import { creatures, encounterIndex } from '../src/lib/discoveries.ts'

const require = createRequire(import.meta.url)
const noThai = text => assert.doesNotMatch(text, /[ก-๛]/u)
const Button = ({ children, variant: _variant, ...props }) => React.createElement('button', props, children)
const div = ({ children }) => React.createElement('div', null, children)
function load(file, dependencies) {
  const source = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8').replaceAll('import.meta.env.BASE_URL', JSON.stringify('/focuswilds/'))
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', '__APP_VERSION__', code)(name => dependencies[name] ?? require(name), module, module.exports, 'test')
  return module.exports
}
function hooks(seed = []) {
  const values = [], effects = []
  let cursor = 0
  return { values, effects, react: {
    ...React,
    useState(initial) {
      const index = cursor++
      values[index] = index in seed ? seed[index] : typeof initial === 'function' ? initial() : initial
      return [values[index], update => { values[index] = typeof update === 'function' ? update(values[index]) : update }]
    },
    useEffect: effect => { effects.push(effect) },
    useCallback: callback => callback,
    lazy: () => () => null,
  } }
}

test('HTML language, title and description default to nonempty English before JavaScript loads', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /<html\s+lang="en"/)
  assert.match(html, /<title>Focuswilds[^<]*The last hearth<\/title>/)
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)
  assert.ok(description?.[1].includes('Focuswilds'))
  noThai(html)
})

test('sign-in controls, loading, busy states and errors use English unless Thai is explicitly selected', () => {
  for (const seed of [[null, true, false, null], [null, false, false, null], [null, false, true, null], [{}, false, false, null], [{}, false, true, null], [null, false, false, { code: 'auth/popup-blocked' }]]) {
    for (const language of [undefined, 'th']) {
      const runtime = hooks(seed)
      const { AuthPanel } = load('components/auth-panel.tsx', {
        react: runtime.react, 'firebase/auth': {}, '@/lib/firebase': { auth: {} },
        '@/lib/auth-error': { authErrorMessage }, '@/components/ui/button': { Button },
      })
      const html = renderToStaticMarkup(React.createElement(AuthPanel, { onSessionChange() {}, ...(language ? { language } : {}) }))
      if (language === 'th') assert.match(html, /[ก-๛]/u)
      else { noThai(html); assert.ok(html.includes('aria-label="Account"')) }
    }
  }
})

test('runtime metadata and account controls require a signed-in saved Thai preference', () => {
  const previousDocument = globalThis.document
  try {
    for (const [session, shelter, language] of [[null, true, 'th'], [{ uid: 'owner' }, false, 'th'], [{ uid: 'owner' }, true, 'en'], [{ uid: 'owner' }, true, 'th']]) {
      globalThis.document = { documentElement: { lang: '' }, title: '' }
      const runtime = hooks([session, shelter, language])
      let account
      const { default: App } = load('App.tsx', {
        react: runtime.react, '@/components/ui/badge': { Badge: div }, '@/components/ui/button': { Button },
        '@/components/auth-panel': { AuthPanel: props => { account = props; return null } },
        '@/components/screen-layout': { ScreenLayout: div }, '@/components/fort-stage': { FortStage: () => null }, '@/assets/woodland.webp': 'woodland.webp',
      })
      renderToStaticMarkup(React.createElement(App))
      runtime.effects.forEach(effect => effect())
      const expected = session && shelter ? language : 'en'
      assert.equal(document.documentElement.lang, expected)
      assert.equal(account.language, expected)
      if (expected === 'th') assert.match(document.title, /กองไฟสุดท้าย/)
      else { noThai(document.title); assert.match(document.title, /The last hearth/) }
      account.onSessionChange(null)
      assert.equal(runtime.values[2], 'en', 'sign-out must clear the previous account language')
      runtime.values[2] = 'th'
      account.onSessionChange({ uid: 'next-account' })
      assert.equal(runtime.values[2], 'en', 'sign-in starts in English until its saved preference loads')
    }
  } finally { globalThis.document = previousDocument }
})

test('rotation guidance defaults to English and translates only after selecting Thai', () => {
  const { ScreenLayout } = load('components/screen-layout.tsx', { react: { ...React, useSyncExternalStore: () => true } })
  noThai(renderToStaticMarkup(React.createElement(ScreenLayout, null, 'Timer')))
  assert.match(renderToStaticMarkup(React.createElement(ScreenLayout, { language: 'th' }, 'Timer')), /หมุนโทรศัพท์/)
})

test('legacy dates stay English and use Bangkok time even when the browser defaults to Thai', () => {
  const original = Date.prototype.toLocaleString, previousTimezone = process.env.TZ
  const date = '2026-10-16T17:05:00.000Z'
  const expected = original.call(new Date(date), 'en', { timeZone: 'Asia/Bangkok' })
  Date.prototype.toLocaleString = function (locale, options) { return original.call(this, locale ?? 'th-TH', options) }
  process.env.TZ = 'America/New_York'
  try {
    const runtime = hooks([7, 0, { days: [], cursor: null }, { entries: [{ id: 'session', title: 'Focus', completedAt: date, seconds: 1500 }], cursor: null }, false, ''])
    const { HistoryView } = load('components/history-view.tsx', {
      react: runtime.react, '@/components/ui/button': { Button }, '@/lib/firestore-store': { focusStore: {} }, '@/lib/focus-sessions': {},
    })
    const history = renderToStaticMarkup(React.createElement(HistoryView, { userId: 'owner', todayStart: date, profile: { sessions: 1, seconds: 1500 } }))
    const { DiscoveryJournal } = load('components/discovery-journal.tsx', {
      '@/components/ui/button': { Button }, '@/components/pixel-companion': { PixelCompanion: () => null },
      '@/components/ui/card': { Card: div, CardContent: div, CardHeader: div, CardTitle: div }, '@/lib/discoveries': { creatures, encounterIndex },
    })
    const journal = renderToStaticMarkup(React.createElement(DiscoveryJournal, { journal: { encounters: [1, 0, 0], latest: { id: '00000000-0000-4000-8000-000000000001', finishedAt: date } }, error: '', selected: 'moss', saving: false, onSelect() {}, onRetry() {} }))
    for (const html of [history, journal]) { noThai(html); assert.ok(html.includes(expected), `Missing Bangkok date ${expected}`) }
  } finally {
    Date.prototype.toLocaleString = original
    if (previousTimezone === undefined) delete process.env.TZ
    else process.env.TZ = previousTimezone
  }
})
