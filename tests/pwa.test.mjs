import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
}
function installer(standalone = false) {
  const window = new EventTarget()
  window.matchMedia = () => ({ matches: standalone })
  const module = { exports: {} }, navigator = { standalone: false }
  new Function('window', 'navigator', 'module', 'exports', compile('../src/lib/pwa.ts'))(window, navigator, module, module.exports)
  return { window, navigator, ...module.exports }
}

test('install manifest uses the deployment scope and real 192/512 icons', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(manifest.name, 'Focuswilds')
  assert.equal(manifest.start_url, '/focuswilds/')
  assert.equal(manifest.scope, manifest.start_url)
  assert.equal(manifest.id, manifest.start_url)
  assert.equal(manifest.display, 'standalone')
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512'])
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL(`../public/${icon.src}`, import.meta.url))
    const size = Number(icon.sizes.split('x')[0])
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
  }
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.ok(html.includes('rel="manifest" href="/manifest.webmanifest"'))
  assert.ok(html.includes('Existing stored timer data is not cleared.'))
  assert.ok(html.includes('onclick="location.reload()"'))
})

test('installation waits for a user action, consumes one prompt and recognizes installation', async () => {
  const app = installer()
  let calls = 0, notifications = 0
  const unsubscribe = app.subscribeInstall(() => notifications++)
  assert.equal(app.installState(), 'unavailable')
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = async () => { calls++ }
  event.userChoice = Promise.resolve({ outcome: 'accepted' })
  app.window.dispatchEvent(event)
  assert.equal(event.defaultPrevented, true)
  assert.equal(calls, 0)
  assert.equal(app.installState(), 'available')
  await app.installApp()
  await app.installApp()
  assert.equal(calls, 1)
  assert.equal(app.installState(), 'unavailable')
  app.window.dispatchEvent(new Event('appinstalled'))
  assert.equal(app.installState(), 'installed')
  assert.equal(notifications, 4)
  unsubscribe()
  app.window.dispatchEvent(new Event('appinstalled'))
  assert.equal(notifications, 4)
  assert.equal(installer(true).installState(), 'installed')
  const safari = installer(); safari.navigator.standalone = true
  assert.equal(safari.installState(), 'installed')
})

test('dismissed and failed installation do not loop or reuse the browser prompt', async () => {
  for (const failure of [false, true]) {
    const app = installer(), event = new Event('beforeinstallprompt', { cancelable: true })
    let calls = 0
    event.prompt = async () => { calls++; if (failure) throw new Error('Unavailable') }
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    app.window.dispatchEvent(event)
    if (failure) await assert.rejects(app.installApp())
    else await app.installApp()
    await app.installApp()
    assert.equal(app.installState(), 'unavailable')
    assert.equal(calls, 1)
  }
})

test('render failures offer manual reload in both languages without erasing browser storage', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window
  try {
    const module = { exports: {} }
    new Function('require', 'module', 'exports', compile('../src/components/app-error-boundary.tsx'))(require, module, module.exports)
    const { AppErrorBoundary } = module.exports
    for (const language of ['en', 'th']) {
      let reloads = 0
      globalThis.document = { documentElement: { lang: language } }
      globalThis.window = { location: { reload() { reloads++ } } }
      const boundary = new AppErrorBoundary({ children: 'Timer' })
      assert.equal(boundary.render(), 'Timer')
      boundary.state = AppErrorBoundary.getDerivedStateFromError()
      const fallback = boundary.render(), html = renderToStaticMarkup(fallback)
      assert.ok(html.includes('role="alert"'))
      assert.ok(html.includes(language === 'th' ? 'โหลดใหม่' : 'Reload'))
      assert.equal(reloads, 0)
      fallback.props.children.at(-1).props.onClick()
      assert.equal(reloads, 1)
    }
  } finally { globalThis.document = previousDocument; globalThis.window = previousWindow }
})
