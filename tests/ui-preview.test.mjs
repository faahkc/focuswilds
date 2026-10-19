import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'
import { build } from 'vite'

test('preview entry is restricted to development on loopback hosts with an explicit query', async () => {
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
  for (const [dev, url, preview] of [
    [true, 'http://localhost:5173/focuswilds/?preview=ui', true],
    [true, 'http://127.0.0.1:5173/focuswilds/?preview=ui', true],
    [true, 'http://[::1]:5173/focuswilds/?preview=ui', true],
    [true, 'http://localhost:5173/focuswilds/', false],
    [true, 'http://192.168.1.2:5173/focuswilds/?preview=ui', false],
    [false, 'http://localhost:5173/focuswilds/?preview=ui', false],
    [false, 'https://faahkc.github.io/focuswilds/?preview=ui', false],
  ]) {
    const loaded = []
    let rendered = 0
    const dependencies = {
      react: { StrictMode: React.StrictMode },
      'react/jsx-runtime': { jsx: React.createElement },
      'react-dom/client': { createRoot: () => ({ render: () => rendered++ }) },
      './index.css': {},
      './components/screen-layout': { ScreenLayout: () => null },
      './components/app-error-boundary': { AppErrorBoundary: () => null, AppRecovery: () => null },
      './dev/ui-preview': { default: () => null },
      './App': { default: () => null },
    }
    const code = ts.transpileModule(main.replaceAll('import.meta.env.DEV', String(dev)), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
    new Function('require', 'exports', 'location', 'document', code)(name => { assert.ok(name in dependencies, name); loaded.push(name); return dependencies[name] }, {}, new URL(url), { getElementById: () => ({}) })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(loaded.includes('./dev/ui-preview'), preview, url)
    assert.equal(loaded.includes('./App'), !preview, url)
    assert.equal(rendered, 1)
  }
})

test('UI preview switches shared screens without importing account services', () => {
  const values = []
  let cursor = 0
  const dependencies = {
    react: { useState: initial => { const index = cursor++; values[index] ??= initial; return [values[index], value => { values[index] = value }] } },
    'react/jsx-runtime': { jsx: React.createElement, jsxs: React.createElement, Fragment: React.Fragment },
    '@/components/login-page': { LoginPage: () => null },
    '@/components/account-view': { AccountView: () => null },
    '@/components/page-loading': { PageLoading: () => null },
    '@/components/app-error-boundary': { AppRecovery: () => null },
    './ui-preview.css': {},
  }
  const source = readFileSync(new URL('../src/dev/ui-preview.tsx', import.meta.url), 'utf8').replaceAll('import.meta.env.BASE_URL', "'/focuswilds/'")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in dependencies, `Preview must not import ${name}`); return dependencies[name] }, module, module.exports)
  const render = () => { cursor = 0; return module.exports.default() }
  const buttons = render().props.children[0].props.children[1].props.children[0]
  for (const button of buttons) {
    let closed = false
    button.props.onClick({ currentTarget: { closest: () => ({ removeAttribute: name => { assert.equal(name, 'open'); closed = true } }) } })
    assert.ok(closed)
    const screen = render().props.children[1]
    const name = button.props.children
    if (name === 'Loading' || name === 'App error') {
      assert.equal(screen.type, name === 'Loading' ? dependencies['@/components/page-loading'].PageLoading : dependencies['@/components/app-error-boundary'].AppRecovery)
    } else {
      assert.equal(screen.type, dependencies['@/components/login-page'].LoginPage)
      const panel = screen.props.children
      assert.equal(panel.type, dependencies['@/components/account-view'].AccountView)
      assert.equal(panel.props.signedIn, ['Owner signed in', 'Access denied'].includes(name))
      assert.equal(panel.props.owner, name === 'Owner signed in')
      assert.equal(panel.props.busy, name === 'Signing in')
      assert.equal(panel.props.error?.code ?? null, name === 'Account error' ? 'auth/restore-failed' : null)
      panel.props.onAction()
      assert.match(values[1], /No sign-in or sign-out/)
    }
  }
})

test('production build excludes UI preview code and styles', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } })
  const files = (Array.isArray(result) ? result : [result]).flatMap(bundle => bundle.output)
  for (const file of files) {
    assert.doesNotMatch(file.fileName, /ui-preview/)
    const content = file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : ''
    assert.doesNotMatch(content, /UI preview:|Preview only\.|ui-preview-tools|preview=ui|\.\/dev\/ui-preview/)
  }
})
