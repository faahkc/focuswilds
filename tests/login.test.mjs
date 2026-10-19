import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'
import { OWNER_UID } from '../src/lib/account.ts'

const flush = () => new Promise(resolve => setImmediate(resolve))
async function panel({ initialUser = null, restoreError = false, signInError = null, callbackError = null } = {}) {
  const values = [], setters = []
  let cursor = 0, subscribe, stop = 0, signIns = 0, signOuts = 0
  const source = readFileSync(new URL('../src/components/auth-panel.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  const dependencies = {
    react: { ...React, useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; setters[i] = value => { values[i] = value }; return [values[i], setters[i]] }, useEffect: fn => { subscribe = fn } },
    'react/jsx-runtime': { jsx: React.createElement, jsxs: (type, props) => React.createElement(type, props) },
    'firebase/auth': {
      onAuthStateChanged: (_auth, next, error) => { if (restoreError) error(); else next(initialUser); return () => stop++ },
      signOut: async () => { signOuts++ },
    },
    '@/lib/firebase': { auth: {} },
    '@/lib/github-sign-in': {
      startGitHubSignIn: async () => { signIns++; if (signInError) throw signInError },
      finishGitHubSignIn: async () => { if (callbackError) throw callbackError },
    },
    '@/lib/account': { OWNER_UID },
    '@/lib/auth-error': { authErrorMessage: () => 'Safe account error' },
    '@/screens/system/loading': { __esModule: true, default: function PageLoading() { return null } },
  }
  const viewModule = { exports: {} }
  const viewCode = ts.transpileModule(readFileSync(new URL('../src/components/account-view.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', viewCode)(name => { assert.ok(name in dependencies); return dependencies[name] }, viewModule, viewModule.exports)
  dependencies['@/components/account-view'] = viewModule.exports
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name] }, module, module.exports)
  const view = () => {
    cursor = 0
    const element = module.exports.AuthPanel()
    return element.type === viewModule.exports.AccountView ? element.type(element.props) : element
  }
  const initial = view()
  const unmount = subscribe()
  await flush()
  return { initial, view, unmount, calls: () => ({ signIns, signOuts, stop }) }
}

test('login waits for redirect completion and auth restore, stays on one screen and unsubscribes', async () => {
  const login = await panel()
  assert.equal(login.initial.type.name, 'PageLoading')
  const view = login.view()
  assert.equal(view.props['aria-label'], 'Account')
  assert.equal(view.props.children[1].props.children, 'Sign in with GitHub')
  login.unmount()
  assert.equal(login.calls().stop, 1)
})

test('only the owner receives the signed-in message; other accounts can sign out', async () => {
  for (const uid of [OWNER_UID, 'another-account']) {
    const login = await panel({ initialUser: { uid } })
    const view = login.view()
    assert.equal(view.props.children[0].props.role, uid === OWNER_UID ? 'status' : 'alert')
    assert.equal(view.props.children[1].props.children, 'Sign out')
    view.props.children[1].props.onClick()
    await flush()
    assert.equal(login.calls().signOuts, 1)
    assert.equal(login.calls().signIns, 0)
  }
})

test('restore, redirect and callback failures recover without exposing provider details', async () => {
  for (const options of [{ restoreError: true }, { signInError: new Error('private provider data') }, { callbackError: new Error('private callback data') }]) {
    const login = await panel(options)
    if (options.signInError) {
      login.view().props.children[1].props.onClick()
      assert.equal(login.view().props['aria-busy'], true)
      await flush()
    }
    const view = login.view()
    assert.equal(view.props['aria-busy'], false)
    assert.equal(view.props.children[1].props.disabled, false)
    assert.equal(view.props.children[2].props.role, 'alert')
    assert.equal(view.props.children[2].props.children, 'Safe account error')
  }
})

test('the sign-in button starts same-window GitHub navigation', async () => {
  const login = await panel()
  login.view().props.children[1].props.onClick()
  assert.equal(login.calls().signIns, 1)
  await flush()
})

test('login-only rules deny all database access and the shell requests portrait installation', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  assert.match(rules, /allow read, write: if false;/)
  assert.equal((rules.match(/allow /g) ?? []).length, 1)
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(manifest.orientation, 'portrait')
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) assert.ok(readFileSync(new URL(`../public/${icon.src}`, import.meta.url)).length > 0)
})
