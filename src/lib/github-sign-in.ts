import { GithubAuthProvider, signInWithCredential } from 'firebase/auth'
import { app, auth, authHeaders } from './firebase'
import { OWNER_UID } from './account'

const storageKey = 'focuswilds.github-redirect'
const maxAge = 10 * 60 * 1000
const invalidRedirect = () => Object.assign(new Error('Invalid sign-in return'), { code: 'auth/invalid-redirect' })

async function request(method: 'createAuthUri' | 'signInWithIdp', body: object) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${app.options.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await authHeaders() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new Error('Sign-in service unavailable')
  return response.json()
}

export async function startGitHubSignIn() {
  const callback = new URL(import.meta.env.BASE_URL, location.origin)
  callback.searchParams.set('focuswilds-auth', '1')
  const result = await request('createAuthUri', {
    providerId: 'github.com', continueUri: callback.href,
    customParameter: { allow_signup: 'false' },
  })
  const destination = new URL(result.authUri)
  const state = destination.searchParams.get('state')
  if (destination.origin !== 'https://github.com' || destination.pathname !== '/login/oauth/authorize' || !state || typeof result.sessionId !== 'string' || !result.sessionId) throw invalidRedirect()
  // Persist only this short-lived challenge, never a provider or Firebase access token.
  sessionStorage.setItem(storageKey, JSON.stringify({ state, sessionId: result.sessionId, callback: callback.href, created: Date.now() }))
  location.assign(destination.href)
}

let completion: Promise<void> | undefined
export function finishGitHubSignIn(): Promise<void> {
  return completion ??= completeRedirect()
}

async function completeRedirect() {
  const returned = new URL(location.href)
  if (!returned.searchParams.has('focuswilds-auth')) return
  // Remove the one-use code before loading the UI or issuing further requests.
  const clean = new URL(import.meta.env.BASE_URL, location.origin)
  history.replaceState(null, '', clean.href)
  const saved = sessionStorage.getItem(storageKey)
  sessionStorage.removeItem(storageKey)
  if (!saved) throw invalidRedirect()
  const pending = JSON.parse(saved)
  const callback = new URL(clean)
  callback.searchParams.set('focuswilds-auth', '1')
  if (returned.origin !== callback.origin || returned.pathname !== callback.pathname || returned.searchParams.getAll('focuswilds-auth').length !== 1 || returned.searchParams.get('focuswilds-auth') !== '1') throw invalidRedirect()
  if (pending.callback !== callback.href || typeof pending.created !== 'number' || Date.now() < pending.created || Date.now() - pending.created > maxAge || typeof pending.sessionId !== 'string' || !pending.sessionId) throw invalidRedirect()
  if (typeof pending.state !== 'string' || !pending.state || returned.searchParams.getAll('state').length !== 1 || returned.searchParams.get('state') !== pending.state) throw invalidRedirect()
  if (returned.searchParams.has('error')) throw Object.assign(new Error('Sign-in cancelled'), { code: 'auth/sign-in-cancelled' })
  if (returned.searchParams.getAll('code').length !== 1 || !returned.searchParams.get('code')) throw invalidRedirect()
  const result = await request('signInWithIdp', {
    requestUri: returned.href, sessionId: pending.sessionId,
    returnSecureToken: true, returnIdpCredential: true, autoCreate: false,
  })
  if (result.localId !== OWNER_UID) throw Object.assign(new Error('Owner account required'), { code: 'auth/access-denied' })
  if (result.providerId !== 'github.com' || typeof result.oauthAccessToken !== 'string' || !result.oauthAccessToken) throw invalidRedirect()
  await signInWithCredential(auth, GithubAuthProvider.credential(result.oauthAccessToken))
}
