import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { createShelter, applyShelterCommand, availableSkills } from '../src/lib/shelter.ts'
import { areas, journalRumors } from '../src/lib/shelter-content.ts'
import { parseShelter } from '../src/lib/shelter-data.ts'
import { eventText, rumorText, shelterText } from '../src/lib/shelter-text.ts'
const require = createRequire(import.meta.url)
function component(name) {
  const source = fs.readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@/assets/shelter-courtyard.webp') return { __esModule: true, default: '/assets/shelter-courtyard.webp' }
    if (name === '@/assets/shelter-survivors.webp') return { __esModule: true, default: '/assets/shelter-survivors.webp' }
    if (name === '@/assets/title-fallback.webp') return { __esModule: true, default: '/assets/title-fallback.webp' }
    if (name === '@/components/ui/button') return { Button: ({ children, variant: _variant, ...props }) => React.createElement('button', props, children) }
    if (name === '@/lib/legacy-cleanup-store') return { legacyCleanupStore: {} }
    if (name.startsWith('@/lib/')) return require(`../src/lib/${name.slice(6)}.ts`)
    if (name.startsWith('@/components/')) return component(name.slice(13))
    return require(name)
  }, module, module.exports)
  return module.exports
}
const { ShelterCamp } = component('shelter-camp')
const { ShelterJournal } = component('shelter-journal')
const { FortStage } = component('fort-stage')
const { TitleScene } = component('title-scene')
const { PageLoading } = component('page-loading')
const { LegacyCleanup } = component('legacy-cleanup')

test('cleanup describes permanent deletion and preserves the fort in both languages, with a disabled control during focus', () => {
  for (const language of ['en', 'th']) {
    const t = shelterText(language)
    const html = renderToStaticMarkup(React.createElement(LegacyCleanup, { userId: 'test', language, disabled: true }))
    assert.ok(html.includes(t.cleanup))
    assert.ok(html.includes(t.cleanupHint))
    assert.ok(html.includes('disabled=""'))
  }
})

test('fort and expedition art remain decorative and display the correct party without mounting a timer', () => {
  const exterior = renderToStaticMarkup(React.createElement(TitleScene))
  assert.ok(exterior.includes('aria-hidden="true"'))
  assert.ok(!exterior.includes('class="fort-person"'))
  const loading = renderToStaticMarkup(React.createElement(PageLoading))
  assert.ok(loading.includes('role="status"'))
  assert.ok(loading.includes('Preparing\u2026'))
  assert.ok(loading.includes('page-loading-spinner'))
  assert.ok(!loading.includes('<img'))
  assert.ok(!exterior.includes('shelter-courtyard.webp'))
  const courtyard = renderToStaticMarkup(React.createElement(FortStage, { people: 5 }))
  assert.equal((courtyard.match(/class="fort-person"/g) ?? []).length, 5)
  assert.ok(courtyard.includes('fort-flame'))
  assert.ok(courtyard.includes('href="/assets/shelter-courtyard.webp"'))
  const crowded = renderToStaticMarkup(React.createElement(FortStage, { people: 20 }))
  assert.equal((crowded.match(/class="fort-person"/g) ?? []).length, 8)
  for (const area of Object.keys(areas)) {
    const html = renderToStaticMarkup(React.createElement(FortStage, { area, people: 2 }))
    assert.ok(html.includes(`data-area="${area}"`))
    assert.ok(html.includes(`class="trail-${area}"`))
    assert.ok(html.includes('aria-hidden="true"'))
    assert.equal((html.match(/class="fort-person"/g) ?? []).length, 2)
    assert.ok(!html.includes('fort-flame'))
    assert.ok(html.includes('href="/assets/shelter-survivors.webp"'))
    assert.ok(!html.includes('https://'), 'scenes use bundled assets')
  }
})

test('camp selects expedition scenery from saved state and keeps its focus controls', () => {
  const previous = globalThis.sessionStorage
  globalThis.sessionStorage = { getItem: () => null }
  try {
    for (const area of Object.keys(areas)) {
      const state = createShelter()
      if (areas[area].requires) state.knowledge.push(areas[area].requires)
      const departed = applyShelterCommand(state, state.revision, { type: 'depart', area, team: ['survivor-1', 'survivor-2'], provisions: 1 })
      const html = renderToStaticMarkup(React.createElement(ShelterCamp, { initialState: departed, userId: 'test', store: {}, onLanguageChange() {} }))
      assert.ok(html.includes(`data-area="${area}"`))
      assert.equal((html.match(/class="fort-person"/g) ?? []).length, 2)
      assert.ok(html.includes('15:00'))
      assert.ok(html.includes('aria-label="Focus"'))
      assert.deepEqual(departed.expedition.team, ['survivor-1', 'survivor-2'])
    }
  } finally { globalThis.sessionStorage = previous }
})

test('rumors follow known sources and become confirmed only after the matching saved event', () => {
  const state = createShelter()
  const snapshot = structuredClone(state)
  assert.deepEqual(journalRumors(state.knowledge).map(row => row.evidence), ['tracks', 'lanterns'])
  assert.deepEqual(journalRumors(['traveler']).map(row => row.evidence), ['tracks', 'lanterns', 'ward'])
  assert.equal(journalRumors(['hermit']).find(row => row.evidence === 'shade').source, 'hermitRumor')
  assert.deepEqual(availableSkills(state), ['gatherer', 'scout'], 'hearsay cannot unlock skills')
  assert.deepEqual(state, snapshot, 'reading rumors never changes progress')
  const departed = applyShelterCommand(state, state.revision, { type: 'depart', team: ['survivor-1'], provisions: 1 })
  assert.ok(journalRumors(departed.knowledge).some(row => row.evidence === 'tracks'), 'previewing an event is not confirmation')
  const confirmed = applyShelterCommand(departed, departed.revision, { type: 'choose', event: 0, actor: 'survivor-1', approach: 'quiet' })
  const reloaded = parseShelter(JSON.parse(JSON.stringify(confirmed)))
  assert.ok(reloaded.knowledge.includes('tracks'))
  assert.deepEqual(journalRumors(reloaded.knowledge).map(row => row.evidence), ['lanterns'])
  assert.deepEqual(journalRumors(['traveler', 'hermit', 'tracks', 'lanterns', 'ward', 'shade']), [])
})

test('journal separates sourced hearsay from confirmed observations in English and Thai', () => {
  for (const language of ['en', 'th']) {
    const knowledge = ['traveler', 'tracks'], t = shelterText(language)
    const html = renderToStaticMarkup(React.createElement(ShelterJournal, { knowledge, language }))
    assert.ok(html.includes(`<h3>${t.knowledge}</h3>`))
    assert.ok(html.includes(`<h3>${t.rumors}</h3>`))
    assert.ok(html.includes(t.travelerRumor))
    assert.ok(html.includes(eventText('tracks', language)))
    assert.ok(!html.includes(rumorText('tracks', language)))
    assert.ok(!html.includes(eventText('ward', language)), 'unverified claims are not observations')
    for (const rumor of journalRumors(knowledge)) {
      const text = rumorText(rumor.evidence, language)
      assert.ok(text && html.includes(text))
      assert.match(text, language === 'th' ? /[ก-๛]/u : /^[^ก-๛]+$/u)
    }
    assert.ok(!html.includes(rumorText('shade', language)), 'unknown source reveals no rumor')
    assert.ok(rumorText('shade', language))
  }
})
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
