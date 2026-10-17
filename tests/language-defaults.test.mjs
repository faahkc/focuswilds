import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { authErrorMessage } from '../src/lib/auth-error.ts'

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
  assert.match(html, /<title>Focuswilds<\/title>/)
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
    for (const [session, language] of [[null, 'th'], [{ uid: 'owner' }, 'en'], [{ uid: 'owner' }, 'th']]) {
      globalThis.document = { documentElement: { lang: '' }, title: 'Focuswilds' }
      const runtime = hooks([session, language])
      let account
      const { default: App } = load('App.tsx', {
        react: runtime.react, '@/components/ui/badge': { Badge: div }, '@/components/ui/button': { Button },
        '@/components/auth-panel': { AuthPanel: props => { account = props; return null } },
        '@/components/screen-layout': { ScreenLayout: div }, '@/components/fort-stage': { FortStage: () => null },
      })
      renderToStaticMarkup(React.createElement(App))
      runtime.effects.forEach(effect => effect())
      const expected = session ? language : 'en'
      assert.equal(document.documentElement.lang, expected)
      assert.equal(account.language, expected)
      assert.equal(document.title, 'Focuswilds')
      account.onSessionChange(null)
      assert.equal(runtime.values[1], 'en', 'sign-out must clear the previous account language')
      runtime.values[1] = 'th'
      account.onSessionChange({ uid: 'next-account' })
      assert.equal(runtime.values[1], 'en', 'sign-in starts in English until its saved preference loads')
    }
  } finally { globalThis.document = previousDocument }
})

test('root and old links all open the fort without legacy navigation', () => {
  const previousWindow = globalThis.window
  try {
    for (const hash of ['', '#shelter', '#legacy', '#unknown']) {
      globalThis.window = { location: { hash } }
      const runtime = hooks([{ uid: 'owner' }])
      let journeyProps
      const { default: App } = load('App.tsx', {
        react: { ...runtime.react, lazy: () => {
          const journey = 'shelter'
          return props => { journeyProps = props; return React.createElement('div', { 'data-journey': journey }) }
        } },
        '@/components/ui/badge': { Badge: div }, '@/components/ui/button': { Button },
        '@/components/auth-panel': { AuthPanel: () => null },
        '@/components/screen-layout': { ScreenLayout: div }, '@/components/fort-stage': { FortStage: () => null },
      })
      const html = renderToStaticMarkup(React.createElement(App))
      assert.ok(html.includes('data-journey="shelter"'))
      assert.ok(!html.includes('Enter the fort'))
      assert.equal(journeyProps.userId, 'owner')
      assert.equal(journeyProps.onLegacy, undefined)
    }
  } finally { globalThis.window = previousWindow }
})

test('rotation guidance defaults to English and translates only after selecting Thai', () => {
  const { ScreenLayout } = load('components/screen-layout.tsx', { react: { ...React, useSyncExternalStore: () => true } })
  noThai(renderToStaticMarkup(React.createElement(ScreenLayout, null, 'Timer')))
  assert.match(renderToStaticMarkup(React.createElement(ScreenLayout, { language: 'th' }, 'Timer')), /หมุนโทรศัพท์/)
})
