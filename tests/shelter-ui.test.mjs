import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { createShelter } from '../src/lib/shelter.ts'
import { areas } from '../src/lib/shelter-content.ts'
import { eventText, shelterText } from '../src/lib/shelter-text.ts'
const require = createRequire(import.meta.url)
function component(name) {
  const source = fs.readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@/components/ui/button') return { Button: ({ children, variant: _variant, ...props }) => React.createElement('button', props, children) }
    if (name.startsWith('@/lib/')) return require(`../src/lib/${name.slice(6)}.ts`)
    if (name.startsWith('@/components/')) return component(name.slice(13))
    return require(name)
  }, module, module.exports)
  return module.exports
}
const { ShelterCamp } = component('shelter-camp')
test('camp renders both languages with accessible timer, navigation and usable input sizes', () => {
  const previous = globalThis.sessionStorage
  globalThis.sessionStorage = { getItem: () => null }
  try {
    for (const language of ['en', 'th']) {
      const state = { ...createShelter(), language }, t = shelterText(language)
      const html = renderToStaticMarkup(React.createElement(ShelterCamp, { initialState: state, userId: 'test', store: {}, onLanguageChange() {} }))
      for (const key of ['crew', 'stores', 'explore', 'journal', 'history', 'settings', 'focus']) assert.ok(html.includes(`aria-label="${t[key]}"`))
      assert.ok(html.includes('15:00'))
      assert.ok(html.includes('aria-hidden="true"'))
      assert.ok(html.includes('min="1" max="180"'))
    }
  } finally { globalThis.sessionStorage = previous }
})
test('unreadable local timer remains visible as a recoverable error', () => {
  const previous = globalThis.sessionStorage
  globalThis.sessionStorage = { getItem: key => key.includes('shelter-timer') ? 'not-json' : null }
  try {
    const html = renderToStaticMarkup(React.createElement(ShelterCamp, { initialState: createShelter(), userId: 'test', store: {}, onLanguageChange() {} }))
    assert.ok(html.includes(shelterText('en').corruptTimer))
    assert.ok(html.includes(shelterText('en').resetTimer))
  } finally { globalThis.sessionStorage = previous }
})
test('every event and interface label has English and Thai text', () => {
  const en = shelterText('en'), th = shelterText('th')
  assert.deepEqual(Object.keys(en), Object.keys(th))
  assert.ok(Object.values(en).every(value => typeof value === 'string' && value.trim()))
  assert.ok(Object.values(th).every(value => typeof value === 'string' && (value === 'HP' || /[ก-๛]/u.test(value))))
  for (const area of Object.values(areas)) for (const event of area.events) {
    assert.ok(eventText(event.id, 'en'))
    assert.match(eventText(event.id, 'th'), /[ก-๛]/u)
  }
})
