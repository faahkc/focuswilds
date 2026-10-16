import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import ts from 'typescript'

test('scene renders once when still, stops hidden animation, and releases resources on replacement', () => {
  const original = Object.fromEntries(['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]]))
  const pending = new Map()
  const loaded = []
  const listeners = new Map()
  let id = 0
  let renders = 0
  let resets = 0
  let disposed = 0
  let disconnected = false
  let lastScene
  const context = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }
  try {
    globalThis.window = { devicePixelRatio: 2 }
    globalThis.document = { hidden: false, createElement: () => ({ getContext: () => context }), addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
    globalThis.ResizeObserver = class { observe() {} disconnect() { disconnected = true } }
    globalThis.requestAnimationFrame = fn => { pending.set(++id, fn); return id }
    globalThis.cancelAnimationFrame = key => pending.delete(key)
    const source = fs.readFileSync(new URL('../src/lib/woodland-renderer.ts', import.meta.url), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(() => ({
      ...THREE,
      TextureLoader: class { load(_url, callback) { const texture = new THREE.Texture(); loaded.push(callback); return texture } },
      WebGLRenderer: class {
        setPixelRatio(ratio) { assert.equal(ratio, 1.5) }
        setClearColor() {} setSize() {}
        render(scene) { renders++; lastScene = scene }
        resetState() { resets++ }
        dispose() { disposed++ }
      },
    }), module, module.exports)
    const canvas = { dataset: {}, getBoundingClientRect: () => ({ width: 1280, height: 720 }) }
    const scene = module.exports.createWoodland(canvas, 'woodland.webp', ['idle', 'left', 'right', 'left'], true, false)
    assert.equal(pending.size, 0, 'no animation loop before assets are ready')
    loaded.forEach(callback => callback())
    assert.equal(canvas.dataset.ready, 'true')
    assert.equal(pending.size, 1, 'one loop after all textures load')
    scene.update(false, false)
    assert.equal(pending.size, 0, 'Motion off cancels the loop')
    const stillRenders = renders
    assert(stillRenders > 0, 'a static scene is still rendered')
    scene.update(true, true)
    assert.equal(pending.size, 1)
    globalThis.document.hidden = true
    listeners.get('visibilitychange')()
    assert.equal(pending.size, 0, 'hidden tabs spend no animation frames')
    globalThis.document.hidden = false
    listeners.get('visibilitychange')()
    assert.equal(pending.size, 1)
    let geometryDisposals = 0
    let geometries = 0
    lastScene.traverse(object => {
      if (object.geometry) { geometries++; object.geometry.addEventListener('dispose', () => geometryDisposals++) }
    })
    scene.dispose()
    assert.equal(pending.size, 0)
    assert.equal(listeners.size, 0)
    assert(disconnected)
    assert(geometries > 0)
    assert.equal(geometryDisposals, geometries)
    assert.equal(resets, 1)
    assert.equal(disposed, 1)
    assert.equal(canvas.dataset.ready, undefined)
    loaded.forEach(callback => callback())
    assert.equal(pending.size, 0, 'late texture callbacks cannot restart a disposed scene')
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
