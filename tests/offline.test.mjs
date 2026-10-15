import test from 'node:test'
import assert from 'node:assert/strict'
import { connect } from 'node:net'
import { connect as secureConnect } from 'node:tls'

test('unit tests block HTTP fetch and SDK socket connections before any network access', async () => {
  await assert.rejects(fetch('https://example.invalid'), /Network is disabled/)
  assert.throws(() => connect({ host: 'example.invalid', port: 443 }), /Network is disabled/)
  assert.throws(() => secureConnect({ host: 'example.invalid', port: 443 }), /Network is disabled/)
})
