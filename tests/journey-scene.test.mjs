import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function component(file, dependencies = {}, extension = 'tsx') {
  const source = fs.readFileSync(new URL(`../src/components/${file}.${extension}`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => dependencies[name] ?? require(name), module, module.exports)
  return module.exports
}
const pixel = component('pixel-companion')
test('game windows close with Escape and restore focus to the opening control', () => {
  const previousDocument = globalThis.document
  const previousHTMLElement = globalThis.HTMLElement
  let effect
  let shown = 0
  let closed = 0
  let focused = 0
  let cancelled = 0
  class Element { focus() { focused++ } }
  try {
    globalThis.HTMLElement = Element
    globalThis.document = { activeElement: new Element() }
    const { GameWindow } = component('game-window', {
      react: { ...React, useEffect: callback => { effect = callback }, useRef: () => ({ current: { showModal: () => shown++, close: () => closed++ } }) },
      '@/components/ui/button': { Button: () => null },
    })
    const dialog = GameWindow({ title: 'Creature journal', open: true, onClose: () => cancelled++, children: 'Saved discoveries' })
    assert.equal(dialog.type, 'dialog')
    assert.equal(dialog.props['aria-label'], 'Creature journal')
    const cleanup = effect()
    assert.equal(shown, 1)
    dialog.props.onCancel()
    assert.equal(cancelled, 1)
    cleanup()
    assert.equal(closed, 1)
    assert.equal(focused, 1)
  } finally {
    globalThis.document = previousDocument
    globalThis.HTMLElement = previousHTMLElement
  }
})
const sceneDependencies = {
  '@/components/pixel-companion': pixel,
  '@/components/woodland-stage': { WoodlandStage: ({ selected, evolved }) => React.createElement(pixel.PixelCompanion, { selected, evolved }) },
  '@/lib/scene-motion': component('../lib/scene-motion', {}, 'ts'),
  '@/components/ui/button': { Button: ({ children, variant: _variant, size: _size, ...props }) => React.createElement('button', props, children) },
  '@/lib/companion': require('../src/lib/companion.ts'),
  '@/assets/woodland.webp': 'woodland.webp',
}
const { JourneyScene } = component('journey-scene', sceneDependencies)

test('motion toggles without a running timer and reports device reduced motion honestly', () => {
  let motion = true
  let reduced = false
  let toggle
  const { JourneyScene: Scene } = component('journey-scene', {
    ...sceneDependencies,
    '@/lib/scene-motion': component('../lib/scene-motion', {
      react: { ...React, useState: () => [motion, update => { motion = update(motion) }], useSyncExternalStore: () => reduced },
    }, 'ts'),
    '@/components/ui/button': { Button: ({ children, onClick, variant: _variant, size: _size, ...props }) => {
      toggle = onClick
      return React.createElement('button', props, children)
    } },
  })
  const render = () => renderToStaticMarkup(React.createElement(Scene, { phase: 'focus', selected: 'moss', sessions: 0 }))
  assert(render().includes('is-moving'))
  toggle()
  let html = render()
  assert(!html.includes('is-moving'))
  assert(html.includes('Motion off'))
  toggle()
  assert(render().includes('is-moving'))
  reduced = true
  html = render()
  assert(!html.includes('is-moving'))
  assert(html.includes('Motion reduced'))
  assert(html.includes('aria-pressed="false"'))
  assert(html.includes('disabled=""'))
})

test('focus and rest reuse one deferred scene with the selected companion and phase-specific ambience', () => {
  for (const phase of ['focus', 'break']) {
    const html = renderToStaticMarkup(React.createElement(JourneyScene, { phase, selected: 'bird', sessions: 16 }))
    assert(html.includes('src="woodland.webp"'))
    assert(html.includes('loading="lazy"'))
    assert(html.includes('aria-label="Dawn Finch"'))
    assert(html.includes('is-moving'))
    assert.equal(html.includes('journey-fire'), phase === 'break')
    assert(html.includes('aria-pressed="true"'))
  }
  const paused = renderToStaticMarkup(React.createElement(JourneyScene, { phase: 'focus', selected: 'moss', sessions: 16 }))
  assert(paused.includes('is-moving'))
  assert(paused.includes('aria-label="Mossgrove"'))
})

test('scene assets stay within the initial transfer budget and reduced-motion users receive a static scene', () => {
  const root = new URL('../src/assets/', import.meta.url)
  const bytes = fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(file => file.isFile())
    .reduce((sum, file) => sum + fs.statSync(`${file.parentPath}/${file.name}`).size, 0)
  assert(bytes <= 500_000, `Scene assets exceed 500 kB: ${bytes}`)
  const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none/)
})

test('walk frames change foot positions while preserving every companion identity', () => {
  for (const selected of ['moss', 'rabbit', 'bird', 'squirrel']) {
    const frames = [0, 1, 2].map(frame => renderToStaticMarkup(React.createElement(pixel.PixelCompanion, { selected, frame })))
    assert.equal(new Set(frames).size, 3)
    assert(frames.every(html => html.includes('shape-rendering="crispEdges"') && html.includes('companion-feet')))
    assert.equal(new Set(frames.map(html => html.match(/aria-label="([^"]+)"/)[1])).size, 1)
  }
})

test('only small touch screens in physical landscape are blocked, without unmounting the app', () => {
  const previous = globalThis.window
  try {
    for (const [width, height, coarse, blocked] of [[844, 390, true, true], [390, 844, true, false], [1440, 900, false, false], [1024, 768, true, false]]) {
      globalThis.window = { screen: { width, height }, matchMedia: () => ({ matches: coarse }) }
      const { ScreenLayout } = component('screen-layout', { react: { ...React, useSyncExternalStore: (_subscribe, get) => get() } })
      const html = renderToStaticMarkup(React.createElement(ScreenLayout, null, React.createElement('span', null, 'Timer stays mounted')))
      assert.equal(html.includes('Rotate your phone upright'), blocked)
      assert.equal(html.includes('inert=""'), blocked)
      assert(html.includes('Timer stays mounted'))
    }
  } finally { globalThis.window = previous }
})
