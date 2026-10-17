import test from 'node:test'
import assert from 'node:assert/strict'
import { authErrorMessage } from '../src/lib/auth-error.ts'

test('account errors default to English for every known code and explain recovery without exposing details', () => {
  for (const code of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/popup-blocked', 'auth/unauthorized-domain', 'auth/operation-not-allowed', 'auth/network-request-failed', 'auth/too-many-requests', 'unknown']) {
    const message = authErrorMessage({ code })
    assert.equal(message, authErrorMessage({ code }, 'en'))
    assert.doesNotMatch(message, /[ก-๛]/u)
  }
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }, 'en'), /Allow popups/)
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }, 'en'), /connection/)
  assert.equal(authErrorMessage({ secret: 'private' }, 'en').includes('private'), false)
})

test('Thai account errors require an explicit Thai language selection', () => {
  assert.match(authErrorMessage({ code: 'auth/popup-closed-by-user' }, 'th'), /ยกเลิก/)
  assert.equal(authErrorMessage({ code: 'auth/cancelled-popup-request' }, 'th'), authErrorMessage({ code: 'auth/popup-closed-by-user' }, 'th'))
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }, 'th'), /ป๊อปอัป/)
  assert.match(authErrorMessage({ code: 'auth/unauthorized-domain' }, 'th'), /ยังไม่ได้รับอนุญาต/)
  assert.match(authErrorMessage({ code: 'auth/operation-not-allowed' }, 'th'), /ยังไม่ได้เปิดใช้งาน/)
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }, 'th'), /อินเทอร์เน็ต/)
  assert.match(authErrorMessage({ code: 'auth/too-many-requests' }, 'th'), /รอสักครู่/)
})

test('unknown errors do not expose provider messages or credentials', () => {
  for (const error of [null, undefined, 'private message', new Error('secret'), { code: 'unknown', message: 'secret' }]) {
    assert.equal(authErrorMessage(error), 'Could not complete the account action. Please retry.')
    assert.equal(authErrorMessage(error, 'th'), 'ดำเนินการกับบัญชีไม่ได้ โปรดลองอีกครั้ง')
  }
})
