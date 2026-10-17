import test from 'node:test'
import assert from 'node:assert/strict'
import { createShelter, applyShelterCommand, inventorySlots, expeditionCapacity, parseLanguage } from '../src/lib/shelter.ts'
import { fakeStore } from './fake-focus-store.mjs'

const apply = (state, command) => applyShelterCommand(state, state.revision, command)
const focus = seconds => ({ type: 'focus', seconds, targetSeconds: 900, completed: seconds === 900 })
const loot = { wood: 1, stone: 0, provisions: 0, medicine: 0 }

test('new accounts have independent state, five survivors, eight beds and English', () => {
  const state = createShelter()
  assert.equal(state.language, 'en')
  assert.equal(state.survivors.length, 5)
  assert.equal(state.housing, 8)
  state.inventory.wood = 0
  assert.equal(createShelter().inventory.wood, 6)
  assert.equal(parseLanguage('th'), 'th')
  for (const value of [null, 'fr', '', {}, 1]) assert.throws(() => parseLanguage(value))
})

test('parallel jobs retain partial focus; materials are charged once on assignment', () => {
  let state = createShelter()
  state.survivors[1].hp = 2
  for (const [index, job] of ['garden', 'recover', 'housing'].entries()) {
    state = apply(state, { type: 'assign', survivor: `survivor-${index + 1}`, job })
  }
  assert.equal(state.inventory.wood, 2)
  assert.throws(() => apply(state, { type: 'assign', survivor: 'survivor-1', job: 'garden' }))
  state = apply(state, focus(200))
  assert.equal(state.survivors[0].job.seconds, 200)
  assert.equal(state.completedSessions, 0)
  state = apply(state, focus(100))
  assert.equal(state.inventory.provisions, 6)
  assert.equal(state.survivors[1].hp, 7)
  assert.equal(state.survivors[0].job, null)
  state = apply(state, focus(900))
  assert.equal(state.housing, 10)
  assert.equal(state.focusSeconds, 1200)
  assert.equal(state.completedSessions, 1)
  assert.equal(state.inventory.wood, 2)
})

test('full storage preserves completed production until space is available', () => {
  let state = createShelter()
  state.storage = inventorySlots(state.inventory)
  state = apply(state, { type: 'assign', survivor: 'survivor-1', job: 'garden' })
  state = apply(state, focus(300))
  assert.equal(state.survivors[0].job.seconds, 300)
  assert.equal(state.inventory.provisions, 4)
  state = apply(state, { type: 'discard', item: 'wood', quantity: 6 })
  state = apply(state, focus(1))
  assert.equal(state.inventory.provisions, 6)
  assert.equal(state.survivors[0].job, null)
})

test('exploration costs, loot, event sequence and safe return preserve injuries', () => {
  let state = apply(createShelter(), { type: 'depart', team: ['survivor-1', 'survivor-2', 'survivor-3'], provisions: 2 })
  assert.equal(expeditionCapacity(state), 10)
  const event = { type: 'event', event: 0, actor: 'survivor-1', damage: 3, provisions: 1, loot }
  const before = structuredClone(state)
  state = apply(state, event)
  assert.deepEqual(before.survivors[0].hp, 10)
  assert.equal(state.survivors[0].hp, 7)
  assert.throws(() => apply(state, event), /Stale expedition/)
  state = apply(state, { type: 'return' })
  assert.equal(state.inventory.wood, 7)
  assert.equal(state.inventory.provisions, 3)
  assert.equal(state.survivors[0].hp, 7)
  assert.equal(state.expedition, null)
})

test('invalid commands fail without mutating state', () => {
  const state = createShelter()
  const before = structuredClone(state)
  for (const command of [
    { type: 'language', language: 'xx' },
    { type: 'focus', seconds: NaN, targetSeconds: 900, completed: true },
    { ...focus(200), completed: true },
    { type: 'discard', item: 'wood', quantity: -1 },
    { type: 'discard', item: 'gold', quantity: 1 },
    { type: 'depart', team: ['survivor-1', 'survivor-1'], provisions: 1 },
    { type: 'depart', team: ['missing'], provisions: 1 },
    { type: 'depart', team: ['survivor-1'], provisions: 5 },
    { type: 'unknown' },
  ]) assert.throws(() => apply(state, command))
  assert.deepEqual(state, before)
  assert.throws(() => inventorySlots({ ...loot, wood: -1 }))
})

test('failed capacity or lethal outcome leaves expedition intact', () => {
  const state = apply(createShelter(), { type: 'depart', team: ['survivor-1'], provisions: 1 })
  const before = structuredClone(state)
  const event = { type: 'event', event: 0, actor: 'survivor-1', damage: 0, provisions: 1, loot }
  assert.throws(() => apply(state, { ...event, damage: 10 }))
  assert.throws(() => apply(state, { ...event, loot: { ...loot, wood: 100 } }), /full/)
  assert.throws(() => apply({ ...state, storage: 0 }, { type: 'return' }), /full/)
  assert.deepEqual(state, before)
})

test('revision boundary prevents a lost transaction response from applying focus twice', async () => {
  const path = 'accounts/owner/shelter/state'
  const store = fakeStore([[path, createShelter()]])
  const save = () => store.transaction(async transaction => {
    const state = await transaction.get(path)
    const next = applyShelterCommand(state, 0, focus(900))
    transaction.set(path, next)
    return next
  })
  store.loseResponse = true
  await assert.rejects(save, /Response lost/)
  await assert.rejects(save, /Stale shelter revision/)
  const state = await store.get(path)
  assert.equal(state.focusSeconds, 900)
  assert.equal(state.completedSessions, 1)
  assert.equal(store.calls.writes.length, 1)
})
