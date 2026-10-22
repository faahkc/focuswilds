import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'

const flush = () => new Promise(resolve => setImmediate(resolve))
function home() {
  const values = [], effects = [], images = []
  let cursor = 0, writes = 0
  const source = readFileSync(new URL('../src/screens/home.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const dependencies = {
    react: {
      useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], next => { writes++; values[i] = next }] },
      useRef: () => ({ current: null }),
      useEffect: effect => effects.push(effect),
    },
    'react/jsx-runtime': { jsx: React.createElement, jsxs: React.createElement },
    '@/components/button': { Button: () => null },
    '@/components/game-menu': { GameMenu: () => null },
    './system/loading': { __esModule: true, default: function PageLoading() {} },
    './system/app-error': { __esModule: true, default: function AppRecovery() {} },
    '@/assets/home-room-atlas.png': { default: 'portrait.png' },
    '@/assets/home-room-compact-atlas.png': { default: 'compact.png' },
    '@/assets/home-room.css': {}, './home.css': {},
  }
  class Image {
    constructor() { images.push(this) }
    decode() { return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject }) }
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'Image', code)(name => { assert.ok(name in dependencies, `Unexpected service: ${name}`); return dependencies[name] }, module, module.exports, Image)
  const view = (props = {}) => { cursor = 0; return module.exports.default({ onSignOut() {}, ...props }) }
  return { view, images, start: () => effects.at(-1)(), writes: () => writes }
}

test('Home hides all page controls until both atlases decode and deduplicates StrictMode loading', async () => {
  const room = home()
  assert.equal(room.view().props.message, 'Loading your home…')
  const stop = room.start()
  stop()
  room.start()
  assert.equal(room.images.length, 2)
  room.images[0].resolve(); await flush()
  assert.equal(room.view().type.name, 'PageLoading')
  room.images[1].resolve(); await flush()
  const ready = room.view()
  assert.equal(ready.type, 'main')
  assert.equal(ready.props.className, 'home-page content-column')
  const content = JSON.stringify(ready)
  assert.match(content, /1 cat at home/)
  assert.match(content, /Lv\. 1/)
  assert.match(content, /0 coins/)
  assert.match(content, /Your black cat/)
  assert.doesNotMatch(content, /Player Lv|Mochi|120 coins|Feeling good/)
  const buttons = []
  function visit(element) {
    if (!React.isValidElement(element)) return
    if (element.type.name === 'Button') buttons.push(element)
    React.Children.forEach(element.props.children, visit)
  }
  visit(ready)
  for (const label of ['Start focus', 'Cats', 'City', 'Shop']) {
    const button = buttons.find(element => element.props.children === label)
    assert.equal(button?.props.disabled, true)
    assert.equal(button.props['aria-description'], 'Coming soon')
    assert.equal(button.props.onClick, undefined)
  }
})

test('Home opens setup only when its owner navigation callback is supplied', async () => {
  const room = home()
  room.view(); room.start()
  room.images.forEach(image => image.resolve()); await flush()
  let opens = 0
  const ready = room.view({ onStartFocus: () => opens++ })
  const start = React.Children.toArray(ready.props.children).find(element => element.props?.children === 'Start focus')
  assert.equal(start.props.disabled, false)
  assert.equal(start.props['aria-description'], undefined)
  start.props.onClick()
  assert.equal(opens, 1)
})

test('a failed room decode shows existing recovery, and unmount prevents late state writes', async () => {
  const failed = home()
  failed.view(); failed.start()
  failed.images[0].reject(new Error('Image unavailable')); await flush()
  assert.equal(failed.view().type.name, 'AppRecovery')
  const abandoned = home()
  abandoned.view()
  const stop = abandoned.start(); stop()
  abandoned.images.forEach(image => image.resolve()); await flush()
  assert.equal(abandoned.writes(), 0)
})

test('runtime room exports retain approved cells, frame durations and visibility behavior', () => {
  for (const [name, height] of [['home-room', 144], ['home-room-compact', 80]]) {
    const png = readFileSync(new URL(`../src/assets/${name}-atlas.png`, import.meta.url))
    assert.equal(png.readUInt32BE(16), 128 * 32)
    assert.equal(png.readUInt32BE(20), height)
  }
  const css = readFileSync(new URL('../src/assets/home-room.css', import.meta.url), 'utf8')
  assert.match(css, /10770ms step-end infinite/)
  assert.match(css, /var\(--loading-animation-state, running\)/)
  assert.doesNotMatch(css, /prefers-reduced-motion/)
  const frames = [...css.matchAll(/([\d.]+)% \{ background-position: ([\d.]+)% 0; \}/g)]
  assert.equal(frames.length, 33)
  const timing = [900,200,80,120,80,120,450,450,100,140,100,850,900,10,200,200,190,10,440,450,100,140,100,850,900,600,450,450,100,140,100,850]
  for (let i = 0; i < 32; i++) {
    assert.ok(Math.abs(Number(frames[i][2]) - i / 31 * 100) < 0.000001)
    assert.ok(Math.abs((Number(frames[i + 1][1]) - Number(frames[i][1])) * 107.7 - timing[i]) < 0.001)
  }
})
