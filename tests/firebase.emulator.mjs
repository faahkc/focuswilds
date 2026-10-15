import assert from 'node:assert/strict'

const project = 'demo-focuswilds'
assert.equal(process.env.GCLOUD_PROJECT, project)
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8085')

const auth = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ returnSecureToken: true }),
  signal: AbortSignal.timeout(10000),
})
assert.equal(auth.status, 200)
const { idToken, localId } = await auth.json()
assert.ok(idToken && localId)

const url = `http://127.0.0.1:8085/v1/projects/${project}/databases/(default)/documents/smoke/check`
for (const token of [null, idToken]) {
  for (const method of ['GET', 'PATCH']) {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(method === 'PATCH' ? { body: JSON.stringify({ fields: { value: { stringValue: 'local only' } } }) } : {}),
      signal: AbortSignal.timeout(10000),
    })
    assert.equal(response.status, 403, `${method}: deny access with and without authentication`)
  }
}
console.log('Local Auth and Firestore checks passed; database access remains denied.')
