import test from 'node:test'
import assert from 'node:assert/strict'
import { authErrorMessage } from '../src/lib/auth-error.ts'

test('account errors explain cancellation, blocked popups and Firebase setup failures', () => {
  assert.match(authErrorMessage({ code: 'auth/popup-closed-by-user' }), /cancelled/)
  assert.equal(authErrorMessage({ code: 'auth/cancelled-popup-request' }), authErrorMessage({ code: 'auth/popup-closed-by-user' }))
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }), /Allow pop-ups/)
  assert.match(authErrorMessage({ code: 'auth/unauthorized-domain' }), /domain is not authorized/)
  assert.match(authErrorMessage({ code: 'auth/operation-not-allowed' }), /not enabled/)
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }), /connection/)
  assert.match(authErrorMessage({ code: 'auth/too-many-requests' }), /wait/)
})

test('unknown errors do not expose provider messages or credentials', () => {
  for (const error of [null, undefined, 'private message', new Error('secret'), { code: 'unknown', message: 'secret' }]) {
    assert.equal(authErrorMessage(error), 'Could not complete the account action. Please try again.')
  }
})
