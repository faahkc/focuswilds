import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('emulator commands use only the simulated project and local endpoints', () => {
  const { scripts } = JSON.parse(read('../package.json'))
  for (const name of ['emulators', 'test:emulators']) {
    assert.match(scripts[name], /--project demo-focuswilds(?: |$)/)
    assert.match(scripts[name], /--only auth,firestore(?: |$)/)
    assert.doesNotMatch(scripts[name], /deploy|--import|--export/)
  }
  const { emulators, firestore } = JSON.parse(read('../firebase.json'))
  for (const service of ['auth', 'firestore', 'ui']) {
    assert.equal(emulators[service].host, '127.0.0.1')
  }
  assert.equal(emulators.singleProjectMode, true)
  assert.match(read(`../${firestore.rules}`), /allow read, write: if false;/)
})
