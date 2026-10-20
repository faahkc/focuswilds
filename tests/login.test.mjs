import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import ts from 'typescript'
import { OWNER_UID } from '../src/lib/account.ts'

const flush = () => new Promise(resolve => setImmediate(resolve))
async function panel({ initialUser = null, restoreError = false, signInError = null, callbackError = null, returning = false, finishWait, holdRestore = false, signOutError = null, logWait } = {}) {
  const values = [], setters = [], events = new Map()
  let observer
  const accountEvents = [], accountErrors = [], profiles = []
  let cursor = 0, subscribe, stop = 0, signIns = 0, signOuts = 0
  const source = readFileSync(new URL('../src/components/auth-panel.tsx', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  const dependencies = {
    react: { ...React, lazy: () => function HomePage() {}, useState: initial => { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; setters[i] = value => { values[i] = value }; return [values[i], setters[i]] }, useEffect: fn => { subscribe = fn }, useRef: initial => { const i = cursor++; if (!(i in values)) values[i] = { current: initial }; return values[i] } },
    'react/jsx-runtime': { Fragment: React.Fragment, jsx: React.createElement, jsxs: (type, props) => React.createElement(type, props) },
    'firebase/auth': {
      onAuthStateChanged: (_auth, next, error) => { observer = next; if (restoreError) error(); else if (!holdRestore) next(initialUser); return () => stop++ },
      signOut: async () => { signOuts++; if (signOutError) throw signOutError },
    },
    '@/lib/firebase': { auth: {} },
    '@/lib/github-sign-in': {
      startGitHubSignIn: async () => { signIns++; if (signInError) throw signInError },
      finishGitHubSignIn: async () => { await finishWait; if (callbackError) throw callbackError },
    },
    '@/lib/account': { OWNER_UID },
    '@/lib/account-records': {
      prepareOwnerAccount: async user => { profiles.push(user.uid) },
      recordAccountEvent: async (user, type) => { accountEvents.push({ uid: user?.uid, type }); return await logWait },
      recordAccountError: async (user, error) => { accountErrors.push({ uid: user?.uid, error }) },
    },
    '@/screens/login': { __esModule: true, default: function LoginPage() {} },
    '@/lib/auth-error': { authErrorMessage: () => 'Safe account error' },
    '@/screens/system/loading': { __esModule: true, default: function PageLoading() { return null } },
  }
  const buttonModule = { exports: {} }
  const buttonCode = ts.transpileModule(readFileSync(new URL('../src/components/button.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', buttonCode)(name => { assert.ok(name in dependencies); return dependencies[name] }, buttonModule, buttonModule.exports)
  dependencies['@/components/button'] = buttonModule.exports
  const viewModule = { exports: {} }
  const viewCode = ts.transpileModule(readFileSync(new URL('../src/components/account-view.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', viewCode)(name => { assert.ok(name in dependencies); return dependencies[name] }, viewModule, viewModule.exports)
  dependencies['@/components/account-view'] = viewModule.exports
  new Function('require', 'module', 'exports', 'location', 'window', code)(name => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name] }, module, module.exports, { search: returning ? '?focuswilds-auth=1' : '' }, { addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) })
  let screenProps
  const view = () => {
    cursor = 0
    const result = module.exports.AuthPanel()
    const element = result.type === React.Fragment ? result.props.children[0] : result.type === React.Suspense ? result.props.children : result
    if (element.type !== viewModule.exports.AccountView) return element
    const screen = element.type(element.props)
    if (screen.type === dependencies['@/screens/system/loading'].default) return screen
    screenProps = screen.props
    return screen.props.children
  }
  const initial = view()
  const unmount = subscribe()
  await flush()
  return { initial, view, unmount, screen: () => screenProps, emit: next => observer(next), resume: () => events.get('pageshow')({ persisted: true }), failSignIn: error => { signInError = error }, calls: () => ({ signIns, signOuts, stop, accountEvents, accountErrors, profiles }) }
}

test('login waits for redirect completion and auth restore, stays on one screen and unsubscribes', async () => {
  const login = await panel()
  assert.equal(login.initial.type.name, 'PageLoading')
  const view = login.view()
  assert.equal(view.props['aria-label'], 'Account')
  assert.equal(view.props.children.props.children, 'Sign in')
  login.unmount()
  assert.equal(login.calls().stop, 1)
})

test('only the owner reaches Home; account actions reuse the existing signing-out state', async () => {
  for (const uid of [OWNER_UID, 'another-account']) {
    const login = await panel({ initialUser: { uid } })
    const view = login.view()
    if (uid === OWNER_UID) {
      assert.equal(view.type.name, 'HomePage')
      view.props.onSignOut()
    } else {
      assert.equal(login.screen().errorMessage, 'This account does not have access to Focuswilds.')
      assert.equal(view.props.children.props.children, 'Sign out')
      view.props.children.props.onClick()
    }
    assert.equal(login.view().props.children.props.children, 'Signing out…')
    assert.equal(login.view().props.children.props.disabled, true)
    assert.equal(login.screen().statusMessage, 'Signing you out…')
    assert.equal(login.screen().errorMessage, null)
    await flush()
    const completed = login.view()
    if (uid === OWNER_UID) assert.equal(completed.type.name, 'HomePage')
    else assert.equal(login.screen().statusMessage, null)
    assert.equal(login.calls().signOuts, 1)
    assert.equal(login.calls().signIns, 0)
  }
})

test('restore, redirect and callback failures recover without exposing provider details', async () => {
  for (const options of [{ restoreError: true }, { signInError: new Error('private provider data') }, { callbackError: new Error('private callback data') }]) {
    const login = await panel(options)
    if (options.signInError) {
      login.view().props.children.props.onClick()
      assert.equal(login.view().props.children.props.children, 'Signing in…')
      await flush()
    }
    const view = login.view()
    assert.equal(view.props['aria-busy'], false)
    assert.equal(view.props.children.props.disabled, false)
    assert.equal(login.screen().errorMessage, 'Safe account error')
    assert.equal(login.screen().statusMessage, null)
  }
})

test('access denial and an account error pass one error to the intro and retain a sign-out action', async () => {
  const login = await panel({ initialUser: { uid: 'another-account' }, callbackError: new Error('private') })
  const view = login.view()
  assert.equal(view.props.children.props.children, 'Sign out')
  assert.equal(login.screen().errorMessage, 'Safe account error')
  assert.equal(React.Children.count(view.props.children), 1)
})

test('sign-in keeps the busy button through navigation and blocks stale repeated clicks', async () => {
  const login = await panel()
  const click = login.view().props.children.props.onClick
  click(); click(); click()
  assert.equal(login.calls().signIns, 1)
  assert.equal(login.view().props.children.props.children, 'Signing in\u2026')
  assert.equal(login.view().props.children.props.disabled, true)
  await flush()
  assert.equal(login.view().props.children.props.children, 'Signing in\u2026')
  assert.equal(login.view().props.children.props.disabled, true)
  click()
  assert.equal(login.calls().signIns, 1)
  login.resume()
  assert.equal(login.view().props.children.props.children, 'Sign in')
})

test('OAuth return keeps Signing in loading until completion and the first restored account', async () => {
  let complete
  const finishWait = new Promise(resolve => { complete = resolve })
  const login = await panel({ returning: true, finishWait, holdRestore: true })
  assert.equal(login.initial.props.message, 'Signing in…')
  assert.equal(login.view().type.name, 'PageLoading')
  complete(); await flush()
  assert.equal(login.view().type.name, 'PageLoading')
  login.emit({ uid: OWNER_UID })
  assert.equal(login.view().type.name, 'HomePage')
})

test('a failed sign-in can retry once without duplicate requests or stale error copy', async () => {
  const login = await panel({ signInError: new Error('private') })
  login.view().props.children.props.onClick()
  await flush()
  const retry = login.view().props.children.props.onClick
  assert.equal(login.screen().errorMessage, 'Safe account error')
  login.failSignIn(null)
  retry(); retry()
  assert.equal(login.calls().signIns, 2)
  assert.equal(login.view().props.children.props.children, 'Signing in…')
  await flush()
  assert.equal(login.view().props.children.props.disabled, true)
})

test('sign-out releases its guard after failure and accepts a retry', async () => {
  const login = await panel({ initialUser: { uid: OWNER_UID }, signOutError: new Error('private') })
  const click = login.view().props.onSignOut
  click(); click()
  assert.equal(login.calls().accountEvents.length, 1)
  await flush()
  assert.equal(login.calls().signOuts, 1)
  const retry = login.view().props.children.props.onClick
  assert.equal(login.screen().errorMessage, 'Safe account error')
  retry(); retry()
  await flush()
  assert.equal(login.calls().signOuts, 2)
})

test('database rules retain a deny-all fallback and request portrait installation', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  assert.match(rules, /allow read, write: if false;/)
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(manifest.orientation, 'portrait')
  assert.equal(manifest.display, 'standalone')
  for (const icon of manifest.icons) assert.ok(readFileSync(new URL(`../public/${icon.src}`, import.meta.url)).length > 0)
})


test('account logging distinguishes OAuth success from restoration and ignores denied accounts', async () => {
  const restored = await panel({ initialUser: { uid: OWNER_UID } })
  assert.equal(restored.calls().accountEvents.length, 0)
  assert.equal(restored.calls().profiles.length, 1)
  const returned = await panel({ returning: true, initialUser: { uid: OWNER_UID } })
  returned.emit({ uid: OWNER_UID })
  assert.deepEqual(returned.calls().accountEvents, [{ uid: OWNER_UID, type: 'sign_in' }])
  const failed = await panel({ returning: true, initialUser: { uid: OWNER_UID }, callbackError: { code: 'auth/invalid-redirect' } })
  assert.equal(failed.calls().accountEvents.length, 0)
  assert.equal(failed.calls().accountErrors.length, 1)
  const denied = await panel({ returning: true, initialUser: { uid: 'another-account' } })
  assert.equal(denied.calls().profiles.length, 0)
  assert.equal(denied.calls().accountEvents.length, 0)
})

test('sign-out remains busy and guards rapid clicks while its bounded logging finishes', async () => {
  let release
  const logWait = new Promise(resolve => { release = resolve })
  const login = await panel({ initialUser: { uid: OWNER_UID }, logWait })
  const click = login.view().props.onSignOut
  click(); click(); click()
  assert.equal(login.calls().accountEvents.length, 1)
  assert.equal(login.calls().signOuts, 0)
  assert.equal(login.view().props.children.props.disabled, true)
  release(); await flush()
  assert.equal(login.calls().signOuts, 1)
})

test('a failed diagnostic write never prevents sign-out or creates an account error', async () => {
  const login = await panel({ initialUser: { uid: OWNER_UID }, logWait: Promise.resolve(false) })
  login.view().props.onSignOut()
  await flush()
  assert.equal(login.calls().signOuts, 1)
  assert.equal(login.calls().accountErrors.length, 0)
})
