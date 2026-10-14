import test from 'node:test'
import assert from 'node:assert/strict'
import { validateAuthConfig, getAuthRedirect } from '../src/lib/auth-config.ts'

test('configuration rejects missing values, invalid URLs, and secret keys', () => {
  const key = 'sb_publishable_example'
  assert.equal(validateAuthConfig(undefined, key), null)
  assert.equal(validateAuthConfig('https://example.supabase.co', ''), null)
  assert.equal(validateAuthConfig('invalid', key), null)
  assert.equal(validateAuthConfig('http://example.supabase.co', key), null)
  assert.equal(validateAuthConfig('https://user:password@example.supabase.co', key), null)
  assert.equal(validateAuthConfig('https://example.supabase.co/auth', key), null)
  assert.equal(validateAuthConfig('https://example.supabase.co', 'sb_secret_example'), null)
  assert.deepEqual(validateAuthConfig('https://example.supabase.co/', key), { url: 'https://example.supabase.co', key })
})

test('OAuth returns to the Pages subpath or the local Vite subpath', () => {
  assert.equal(getAuthRedirect('https://faahkc.github.io', '/focuswilds/'), 'https://faahkc.github.io/focuswilds/')
  assert.equal(getAuthRedirect('http://localhost:5173', '/focuswilds/'), 'http://localhost:5173/focuswilds/')
})
