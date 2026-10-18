import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'
import { OWNER_UID } from '../src/lib/account.ts'

const flush = () => new Promise(resolve => setImmediate(resolve))
function panel({ initialUser = null, restoreError = false, popupError = null } = {}) {
  const values = [], setters = []
  let cursor = 0, subscribe, stop = 0, signIns = 0, signOuts = 0
  const source = readFileSync(new URL('../src/components/auth-panel.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  const dependencies = {
    react: { ...React, useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; setters[i] = value => { values[i] = value }; return [values[i], setters[i]] }, useEffect: fn => { subscribe = fn } },
    'react/jsx-runtime': { jsx: React.createElement, jsxs: (type, props) => React.createElement(type, props) },
    'firebase/auth': {
      GithubAuthProvider: class {},
      onAuthStateChanged: (_auth, next, error) => { if (restoreError) error(); else next(initialUser); return () => stop++ },
      signInWithPopup: async () => { signIns++; if (popupError) throw popupError },
      signOut: async () => { signOuts++ },
    },
    '@/lib/firebase': { auth: {} },
    '@/lib/account': { OWNER_UID },
    '@/lib/auth-error': { authErrorMessage: () => 'Safe account error' },
    '@/components/page-loading': { PageLoading: () => null },
  }
  new Function('require', 'module', 'exports', code)(name => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name] }, module, module.exports)
  const view = () => { cursor = 0; return module.exports.AuthPanel() }
  const initial = view()
  const unmount = subscribe()
  return { initial, view, unmount, calls: () => ({ signIns, signOuts, stop }) }
}

test('login waits for auth restore, stays on one screen and unsubscribes', () => {
  const login = panel()
  assert.equal(login.initial.type.name, 'PageLoading')
  const view = login.view()
  assert.equal(view.props['aria-label'], 'Account')
  assert.equal(view.props.children[1].props.children, 'Sign in with GitHub')
  login.unmount()
  assert.equal(login.calls().stop, 1)
})

test('only the owner receives the signed-in message; other accounts can sign out', async () => {
  for (const uid of [OWNER_UID, 'another-account']) {
    const login = panel({ initialUser: { uid } })
    const view = login.view()
    assert.equal(view.props.children[0].props.role, uid === OWNER_UID ? 'status' : 'alert')
    assert.equal(view.props.children[1].props.children, 'Sign out')
    view.props.children[1].props.onClick()
    await flush()
    assert.equal(login.calls().signOuts, 1)
    assert.equal(login.calls().signIns, 0)
  }
})

test('restore and popup failures recover to usable controls without exposing provider details', async () => {
  for (const options of [{ restoreError: true }, { popupError: new Error('private provider data') }]) {
    const login = panel(options)
    if (!options.restoreError) {
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

test('login-only rules deny all database access and the shell requests portrait installation', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  assert.match(rules, /allow read, write: if false;/)
  assert.equal((rules.match(/allow /g) ?? []).length, 1)
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(manifest.orientation, 'portrait')
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) assert.ok(readFileSync(new URL(`../public/${icon.src}`, import.meta.url)).length > 0)
})
