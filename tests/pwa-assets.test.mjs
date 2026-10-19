import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pwaAssets } from '../scripts/pwa-assets.ts'

test('app icons use stable content hashes and preserve installed-app identity and OAuth scope', t => {
  const directory = mkdtempSync(join(tmpdir(), 'focuswilds-pwa-'))
  t.after(() => { for (const file of readdirSync(directory)) unlinkSync(join(directory, file)); rmdirSync(directory) })
  for (const file of ['manifest.webmanifest', 'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
    copyFileSync(new URL(`../public/${file}`, import.meta.url), join(directory, file))
  }
  const plugin = pwaAssets()
  plugin.configResolved({ publicDir: directory, base: '/focuswilds/' })
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const transform = () => plugin.transformIndexHtml.handler(html)
  function manifest() {
    let emitted
    plugin.generateBundle.call({ emitFile: file => { emitted = file } })
    assert.equal(emitted.fileName, 'manifest.webmanifest')
    return JSON.parse(emitted.source)
  }
  const first = manifest()
  assert.deepEqual(manifest(), first)
  assert.equal(first.id, '/focuswilds/')
  assert.equal(first.scope, '/focuswilds/')
  assert.equal(first.start_url, '/focuswilds/')
  assert.equal(first.display, 'standalone')
  for (const icon of first.icons) assert.match(icon.src, /^icon-(192|512)\.png\?v=[a-f0-9]{12}$/)
  const firstHtml = transform()
  assert.equal(transform(), firstHtml)
  for (const name of ['icon-16', 'icon-32', 'icon-48', 'apple-touch-icon']) assert.match(firstHtml, new RegExp(`${name}\\.png\\?v=[a-f0-9]{12}`))
  assert.match(firstHtml, /href="\/manifest.webmanifest"/)
  writeFileSync(join(directory, 'icon-192.png'), Buffer.concat([readFileSync(join(directory, 'icon-192.png')), Buffer.from([1])]))
  assert.notEqual(manifest().icons[0].src, first.icons[0].src)
  assert.equal(manifest().icons[1].src, first.icons[1].src)
  assert.equal(transform(), firstHtml)
  writeFileSync(join(directory, 'apple-touch-icon.png'), Buffer.concat([readFileSync(join(directory, 'apple-touch-icon.png')), Buffer.from([1])]))
  assert.notEqual(transform(), firstHtml)

  let middleware
  plugin.configureServer({ middlewares: { use: value => { middleware = value } } })
  const headers = new Map()
  let body, next = false
  const response = { setHeader: (name, value) => headers.set(name, value), end: value => { body = value } }
  middleware({ url: '/focuswilds/manifest.webmanifest?test=1', method: 'GET' }, response, () => { next = true })
  assert.deepEqual(JSON.parse(body), manifest())
  assert.equal(headers.get('Cache-Control'), 'no-cache')
  assert.equal(next, false)
  middleware({ url: '/focuswilds/manifest.webmanifest', method: 'HEAD' }, response, () => { next = true })
  assert.equal(body, undefined)
  middleware({ url: '/focuswilds/other', method: 'GET' }, response, () => { next = true })
  assert.equal(next, true)
})
