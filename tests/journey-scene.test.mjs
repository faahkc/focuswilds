import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function component(file, dependencies = {}) {
  const source = fs.readFileSync(new URL(`../src/components/${file}.tsx`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => dependencies[name] ?? require(name), module, module.exports)
  return module.exports
}
const pixel = component('pixel-companion')
const { JourneyScene } = component('journey-scene', {
  '@/components/pixel-companion': pixel,
  '@/components/ui/button': { Button: ({ children, variant: _variant, size: _size, ...props }) => React.createElement('button', props, children) },
  '@/lib/companion': require('../src/lib/companion.ts'),
  '@/assets/woodland.webp': 'woodland.webp',
})

test('focus and rest reuse one deferred scene with the selected companion and phase-specific ambience', () => {
  for (const phase of ['focus', 'break']) {
    const html = renderToStaticMarkup(React.createElement(JourneyScene, { phase, running: true, selected: 'bird', sessions: 16 }))
    assert(html.includes('src="woodland.webp"'))
    assert(html.includes('loading="lazy"'))
    assert(html.includes('aria-label="Dawn Finch"'))
    assert(html.includes('is-moving'))
    assert.equal(html.includes('journey-fire'), phase === 'break')
    assert(html.includes('aria-pressed="true"'))
  }
  const paused = renderToStaticMarkup(React.createElement(JourneyScene, { phase: 'focus', running: false, selected: 'moss', sessions: 16 }))
  assert(!paused.includes('is-moving'))
  assert(paused.includes('aria-label="Mossgrove"'))
})

test('scene assets stay within the initial transfer budget and reduced-motion users receive a static scene', () => {
  const bytes = fs.readdirSync(new URL('../src/assets/', import.meta.url))
    .reduce((sum, file) => sum + fs.statSync(new URL(`../src/assets/${file}`, import.meta.url)).size, 0)
  assert(bytes <= 500_000, `Scene assets exceed 500 kB: ${bytes}`)
  const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none/)
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
