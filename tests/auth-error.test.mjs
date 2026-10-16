import test from 'node:test'
import assert from 'node:assert/strict'
import { authErrorMessage } from '../src/lib/auth-error.ts'

test('account errors explain cancellation, blocked popups and Firebase setup failures', () => {
  assert.match(authErrorMessage({ code: 'auth/popup-closed-by-user' }), /ยกเลิก/)
  assert.equal(authErrorMessage({ code: 'auth/cancelled-popup-request' }), authErrorMessage({ code: 'auth/popup-closed-by-user' }))
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }), /ป๊อปอัป/)
  assert.match(authErrorMessage({ code: 'auth/unauthorized-domain' }), /ยังไม่ได้รับอนุญาต/)
  assert.match(authErrorMessage({ code: 'auth/operation-not-allowed' }), /ยังไม่ได้เปิดใช้งาน/)
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }), /อินเทอร์เน็ต/)
  assert.match(authErrorMessage({ code: 'auth/too-many-requests' }), /รอสักครู่/)
})

test('unknown errors do not expose provider messages or credentials', () => {
  for (const error of [null, undefined, 'private message', new Error('secret'), { code: 'unknown', message: 'secret' }]) {
    assert.equal(authErrorMessage(error), 'ดำเนินการกับบัญชีไม่ได้ โปรดลองอีกครั้ง')
  }
})
