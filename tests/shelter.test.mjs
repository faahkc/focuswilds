import test from 'node:test'
import assert from 'node:assert/strict'
import { createShelter, applyShelterCommand, inventorySlots, gearSlots, availableSkills, expeditionCapacity, parseLanguage, previewEvent, emptyInventory, previewReturn } from '../src/lib/shelter.ts'
import { parseShelter } from '../src/lib/shelter-data.ts'
import { areas } from '../src/lib/shelter-content.ts'
import { fakeStore } from './fake-focus-store.mjs'

const apply = (state, command) => applyShelterCommand(state, state.revision, command)
const focus = seconds => ({ type: 'focus', seconds, targetSeconds: 900, completed: seconds === 900 })
const loot = { wood: 1, stone: 0, provisions: 0, medicine: 0 }

test('legacy snapshots stay readable; recovered blueprints unlock focused armor crafting and repair', () => {
  let state = parseShelter(createShelter())
  const assignment = { type: 'assign', survivor: 'survivor-1', job: 'bulwark' }
  assert.throws(() => apply(state, assignment), /blueprint/)
  state.armory.push({ id: 'found-blueprint', kind: 'blueprint', durability: 0 })
  assert.throws(() => apply(state, { type: 'equip', survivor: 'survivor-1', slot: 'armor', gearId: 'found-blueprint' }))
  assert.throws(() => apply(state, { type: 'assign', survivor: 'survivor-1', job: 'repair', gearId: 'found-blueprint' }))
  state = apply(state, assignment)
  assert.throws(() => apply(state, { type: 'discardGear', gearId: 'found-blueprint' }), /in use/)
  assert.equal(state.inventory.wood, 3)
  assert.equal(state.inventory.stone, 0)
  state = parseShelter(apply(state, focus(900)))
  const armor = state.armory.find(gear => gear.kind === 'bulwark')
  assert.ok(armor)
  state = apply(state, { type: 'equip', survivor: 'survivor-1', slot: 'armor', gearId: armor.id })
  state = apply(state, { type: 'depart', team: ['survivor-1'], provisions: 2 })
  const protectedDamage = previewEvent(state, 'survivor-1', 'force').damage[0].maximum
  const coatState = structuredClone(state)
  coatState.survivors[0].equipment.armor.kind = 'coat'
  assert.equal(previewEvent(coatState, 'survivor-1', 'force').damage[0].maximum, protectedDamage + 1)
  state = apply(state, { type: 'choose', event: 0, actor: 'survivor-1', approach: 'observe' })
  assert.equal(state.survivors[0].equipment.armor.durability, 9)
  state = apply(state, { type: 'return' })
  state = apply(state, { type: 'equip', survivor: 'survivor-1', slot: 'armor', gearId: null })
  state.inventory.stone = 1
  state = apply(state, { type: 'assign', survivor: 'survivor-1', job: 'repair', gearId: armor.id })
  state = parseShelter(apply(state, focus(300)))
  assert.equal(state.armory.find(gear => gear.id === armor.id).durability, 10)
  state = apply(state, { type: 'discardGear', gearId: 'found-blueprint' })
  assert.throws(() => apply(state, assignment), /blueprint/)
})

test('large objects consume three slots on collection, return and saved-state validation', () => {
  let state = apply(createShelter(), { type: 'depart', team: ['survivor-1'], provisions: 1 })
  state = apply(state, { type: 'choose', event: 0, actor: 'survivor-1', approach: 'quiet' })
  const relic = { id: 'stone-relic', kind: 'relic', durability: 0 }
  state.sites['border:0'].gear.push(relic)
  assert.equal(gearSlots([relic]), 3)
  const collect = { type: 'collect', inventory: emptyInventory(), gearIds: [relic.id] }
  state.expedition.inventory = { ...emptyInventory(), wood: 6 }
  assert.throws(() => apply(state, collect), /Choose what to leave/)
  assert.equal(state.sites['border:0'].gear.length, 1)
  state.expedition.inventory = emptyInventory()
  state = parseShelter(apply(state, collect))
  const overloaded = structuredClone(state)
  overloaded.expedition.inventory.wood = 6
  assert.throws(() => parseShelter(overloaded), /carrying capacity/)
  state.storage = inventorySlots(state.inventory) + 2
  assert.deepEqual(previewReturn(state).gearIds, [])
  assert.throws(() => apply(state, { type: 'return', take: { inventory: emptyInventory(), gearIds: [relic.id] } }), /storage full/)
  const returned = parseShelter(apply(state, { type: 'return' }))
  assert.equal(returned.sites['border:0'].gear[0].id, relic.id)
  state.storage += 1
  state = parseShelter(apply(state, { type: 'return' }))
  assert.equal(state.armory[0].id, relic.id)
  const invalid = structuredClone(state)
  invalid.storage -= 1
  assert.throws(() => parseShelter(invalid), /storage exceeded/)
  state = apply(state, { type: 'discardGear', gearId: relic.id })
  assert.equal(gearSlots(state.armory), 0)
})

test('Pathfinder requires confirmed knowledge and training, preserves the personal skill and reduces observe cost', () => {
  let state = createShelter()
  const train = { type: 'assign', survivor: 'survivor-1', job: 'train', skill: 'pathfinder' }
  assert.deepEqual(availableSkills(state), ['gatherer', 'scout'])
  assert.throws(() => apply(state, train), /undiscovered/)
  state.survivors[0].generalSkill = 'pathfinder'
  assert.throws(() => parseShelter(state), /undiscovered/)
  state.survivors[0].generalSkill = 'gatherer'
  state.knowledge.push('ward')
  state = apply(state, train)
  state = parseShelter(apply(state, focus(600)))
  assert.equal(state.survivors[0].personalSkill, 'scout')
  state = apply(state, { type: 'depart', team: ['survivor-1'], provisions: 1 })
  assert.equal(previewEvent(state, 'survivor-1', 'observe').provisions, 1)
  state = parseShelter(apply(state, { type: 'choose', event: 0, actor: 'survivor-1', approach: 'observe' }))
  assert.equal(state.expedition.inventory.provisions, 0)
})

test('special discoveries are disclosed, deterministic, optional and require recovery to unlock crafting', () => {
  const found = { blueprint: 0, relic: 0 }
  for (let seed = 0; seed < 32; seed++) {
    let state = createShelter()
    state.revision = seed
    state.knowledge.push('hermit')
    state = apply(state, { type: 'depart', team: ['survivor-1'], area: 'barrow', provisions: 1 })
    const preview = previewEvent(state, 'survivor-1', 'quiet')
    assert.deepEqual(preview.specialLoot, ['blueprint', 'relic'])
    assert.equal(preview.specialChance, 25)
    const command = { type: 'choose', event: 0, actor: 'survivor-1', approach: 'quiet' }
    const next = parseShelter(apply(state, command))
    assert.deepEqual(apply(state, command), next)
    assert.equal(next.expedition.gear.length, 0, 'discoveries do not silently change the carried pack')
    for (const gear of next.sites['barrow:0'].gear) found[gear.kind]++
    if (next.sites['barrow:0'].gear.some(gear => gear.kind === 'blueprint')) {
      const returned = apply(next, { type: 'return' })
      assert.throws(() => apply(returned, { type: 'assign', survivor: 'survivor-2', job: 'bulwark' }), /blueprint/)
    }
  }
  assert.deepEqual(found, { blueprint: 8, relic: 8 })
})

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
  const event = { type: 'choose', event: 0, actor: 'survivor-1', approach: 'force' }
  const before = structuredClone(state)
  state = apply(state, event)
  assert.deepEqual(before.survivors[0].hp, 10)
  assert.ok(state.survivors[0].hp >= 6 && state.survivors[0].hp <= 7)
  assert.throws(() => apply(state, event), /Stale expedition/)
  state = apply(state, { type: 'return' })
  assert.equal(state.inventory.wood, 8)
  assert.equal(state.inventory.provisions, 3)
  assert.ok(state.survivors[0].hp < 10)
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

test('invalid actor and capacity leave expedition intact, while a full fort permits safe return', () => {
  const state = apply(createShelter(), { type: 'depart', team: ['survivor-1'], provisions: 1 })
  const before = structuredClone(state)
  const event = { type: 'choose', event: 0, actor: 'survivor-1', approach: 'quiet' }
  assert.throws(() => apply(state, { ...event, actor: 'survivor-5' }))
  const crowded = structuredClone(state)
  crowded.expedition.inventory.wood = 20
  assert.throws(() => apply(crowded, event), /Choose what to leave/)
  const full = { ...state, storage: inventorySlots(state.inventory) }
  const returned = apply(full, { type: 'return' })
  assert.equal(returned.expedition, null)
  assert.ok(inventorySlots(returned.inventory) <= returned.storage)
  assert.deepEqual(state, before)
})

test('crafting, equipping, wear, zero durability and repair preserve gear identity', () => {
  let state = createShelter()
  state = apply(state, { type: 'assign', survivor: 'survivor-1', job: 'sword' })
  state = apply(state, focus(600))
  const id = state.armory[0].id
  state.armory[0].durability = 1
  state = apply(state, { type: 'equip', survivor: 'survivor-1', slot: 'weapon', gearId: id })
  state = apply(state, { type: 'depart', team: ['survivor-1'], provisions: 3 })
  const protectedDamage = previewEvent(state, 'survivor-1', 'force').damage[0].maximum
  state = apply(state, { type: 'choose', event: 0, actor: 'survivor-1', approach: 'force' })
  assert.equal(state.survivors[0].equipment.weapon.durability, 0)
  assert.ok(previewEvent(state, 'survivor-1', 'force').damage[0].maximum > protectedDamage)
  state = apply(state, { type: 'return' })
  state = apply(state, { type: 'equip', survivor: 'survivor-1', slot: 'weapon', gearId: null })
  state = apply(state, { type: 'assign', survivor: 'survivor-1', job: 'repair', gearId: id })
  assert.throws(() => apply(state, { type: 'equip', survivor: 'survivor-2', slot: 'weapon', gearId: id }), /repair/)
  assert.throws(() => apply(state, { type: 'assign', survivor: 'survivor-2', job: 'repair', gearId: id }))
  state = apply(state, focus(300))
  assert.deepEqual(state.armory[0], { id, kind: 'sword', durability: 10 })
  assert.deepEqual(parseShelter(state), state)
})

test('medicine and retraining consume resources and time without changing personal skills', () => {
  let state = apply(createShelter(), { type: 'assign', survivor: 'survivor-1', job: 'medicine' })
  state = apply(state, focus(300))
  state.survivors[0].hp = 2
  state = apply(state, { type: 'usable', survivor: 'survivor-1', equipped: true })
  assert.equal(state.inventory.medicine, 0)
  state = apply(state, { type: 'heal', survivor: 'survivor-1' })
  assert.equal(state.survivors[0].hp, 7)
  assert.equal(state.survivors[0].equipment.usable, null)
  state = apply(state, { type: 'assign', survivor: 'survivor-2', job: 'train', skill: 'scout' })
  state = apply(state, focus(600))
  assert.equal(state.survivors[1].generalSkill, 'scout')
  assert.equal(state.survivors[1].personalSkill, 'forager')
})

function reachTraveler(state = createShelter()) {
  if (state.inventory.provisions < 3) {
    state = apply(state, { type: 'assign', survivor: 'survivor-5', job: 'garden' })
    state = apply(state, focus(300))
  }
  state = apply(state, { type: 'depart', team: ['survivor-1', 'survivor-2'], provisions: 3 })
  for (let event = 0; event < 2; event++) state = apply(state, { type: 'choose', event, actor: 'survivor-1', approach: 'quiet' })
  return state
}

test('rescue reserves housing, reduces carrying and reveals a survivor only at the fort', () => {
  let state = reachTraveler()
  const rescued = state.sites['border:1'].survivors[0].id
  const capacity = expeditionCapacity(state)
  state = apply(state, { type: 'rescue', survivor: rescued, helper: 'survivor-1' })
  assert.equal(expeditionCapacity(state), capacity - 2)
  assert.equal(state.survivors.some(person => person.id === rescued), false)
  assert.throws(() => apply(state, { type: 'choose', event: 2, actor: rescued, approach: 'quiet' }))
  assert.throws(() => apply(state, { type: 'assign', survivor: rescued, job: 'garden' }))
  state = apply(state, { type: 'return' })
  assert.equal(state.survivors.find(person => person.id === rescued).hp, 4)
  assert.equal(state.survivors.find(person => person.id === rescued).personalSkill, 'scout')
  state = reachTraveler(state)
  assert.equal(state.sites['border:1'].survivors.length, 0, 'revisits cannot duplicate rescued people')
  assert.deepEqual(parseShelter(state), state)
})

test('full housing leaves the waiting person safe and expansion allows later rescue', () => {
  let state = reachTraveler()
  state.housing = state.survivors.length
  const before = structuredClone(state)
  assert.throws(() => apply(state, { type: 'rescue', survivor: 'rescued-traveler', helper: 'survivor-1' }), /Housing full/)
  assert.deepEqual(state, before)
  state = apply(state, { type: 'return' })
  state = apply(state, { type: 'assign', survivor: 'survivor-1', job: 'housing' })
  state = apply(state, focus(900))
  state = reachTraveler(state)
  state = apply(state, { type: 'rescue', survivor: 'rescued-traveler', helper: 'survivor-1' })
  assert.equal(state.expedition.escorted.length, 1)
})

test('total defeat leaves items, equipment and escorted people at a recovery site', () => {
  let state = reachTraveler()
  state = apply(state, { type: 'rescue', survivor: 'rescued-traveler', helper: 'survivor-1' })
  state.survivors = state.survivors.filter(person => state.expedition.team.includes(person.id))
  for (const person of state.survivors) person.hp = 1
  state.survivors[0].equipment.weapon = { id: 'lost-sword', kind: 'sword', durability: 4 }
  state.survivors[0].equipment.usable = 'medicine'
  const before = structuredClone(state)
  const preview = previewEvent(state, 'survivor-1', 'force')
  assert.ok(preview.damage.every(damage => damage.possibleDeath))
  state = apply(state, { type: 'choose', event: 2, actor: 'survivor-1', approach: 'force' })
  assert.equal(state.expedition, null)
  assert.equal(state.deaths, 2)
  assert.equal(state.survivors.length, 1)
  assert.match(state.survivors[0].id, /^arrival-/)
  assert.equal(state.sites['border:2'].gear[0].id, 'lost-sword')
  assert.equal(state.sites['border:2'].survivors[0].id, 'rescued-traveler')
  assert.equal(state.sites['border:2'].inventory.medicine, 1)
  assert.deepEqual(apply(before, { type: 'choose', event: 2, actor: 'survivor-1', approach: 'force' }), state, 'same command cannot reroll')
  assert.deepEqual(parseShelter(state), state)
})

test('partial defeat keeps surviving team, drops dead equipment and requires explicit excess selection', () => {
  let state = apply(createShelter(), { type: 'depart', team: ['survivor-1', 'survivor-2'], provisions: 3 })
  state.survivors[0].hp = 1
  state.expedition.inventory.wood = 15
  const command = { type: 'choose', event: 0, actor: 'survivor-1', approach: 'force' }
  assert.throws(() => apply(state, command), /Choose what to leave/)
  state = apply(state, { ...command, pack: { inventory: { ...emptyInventory(), wood: 10, provisions: 2 }, gearIds: [] } })
  assert.equal(state.survivors.some(person => person.id === 'survivor-1'), false)
  assert.deepEqual(state.expedition.team, ['survivor-2'])
  assert.equal(state.sites['border:0'].inventory.wood, 7)
  assert.equal(state.sites['border:0'].inventory.stone, 2)
  assert.equal(state.deaths, 1)
  assert.deepEqual(parseShelter(state), state)
})

test('overflow remains marked, is recoverable after revisiting risks and is never created from nothing', () => {
  let state = reachTraveler()
  state.storage = inventorySlots(state.inventory)
  const expected = previewReturn(state)
  state = apply(state, { type: 'return', take: expected })
  assert.equal(state.expedition, null)
  assert.ok(state.sites['border:1'].inventory.stone > 0)
  state = apply(state, { type: 'assign', survivor: 'survivor-3', job: 'storage' })
  state = apply(state, focus(600))
  state = reachTraveler(state)
  const site = state.sites['border:1']
  const before = structuredClone(state)
  assert.throws(() => apply(state, { type: 'collect', inventory: { ...emptyInventory(), medicine: 100 }, gearIds: [] }))
  assert.deepEqual(state, before)
  const amount = site.inventory.stone
  state = apply(state, { type: 'collect', inventory: { ...emptyInventory(), stone: amount }, gearIds: [] })
  assert.equal(state.sites['border:1'].inventory.stone, 0)
  assert.deepEqual(parseShelter(state), state)
})

test('areas unlock through discovered information; exhaustion permits return and events stop at area end', () => {
  let state = createShelter()
  assert.throws(() => apply(state, { type: 'depart', area: 'hollow', team: ['survivor-1'], provisions: 1 }), /undiscovered/)
  state = reachTraveler(state)
  state.expedition.inventory.provisions = 0
  assert.throws(() => apply(state, { type: 'choose', event: 2, actor: 'survivor-1', approach: 'quiet' }), /provisions/)
  state = apply(state, { type: 'return' })
  state.inventory.provisions = 5
  state = apply(state, { type: 'depart', area: 'hollow', team: ['survivor-1'], provisions: 5 })
  assert.equal(state.expedition.area, 'hollow')
  state.expedition.event = 4
  assert.throws(() => previewEvent(state, 'survivor-1', 'quiet'), /No event/)
})

test('persisted state rejects malformed fields, duplicate identities and invalid language without resetting', () => {
  assert.deepEqual(parseShelter(createShelter()), createShelter())
  for (const mutate of [
    state => { state.language = 'xx' },
    state => { delete state.sites },
    state => { state.inventory.wood = -1 },
    state => { state.survivors[0].hp = 0 },
    state => { state.survivors[1].id = state.survivors[0].id },
    state => { state.survivors[0].equipment.armor = { id: 'wrong-slot', kind: 'sword', durability: 5 } },
    state => { state.sites['border:99'] = { inventory: emptyInventory(), gear: [], survivors: [] } },
    state => { state.knowledge.push('invented') },
    state => { state.survivors[0].job = { kind: 'repair', seconds: 0, gearId: 'missing', skill: null } },
  ]) { const state = createShelter(); mutate(state); assert.throws(() => parseShelter(state)) }
})

test('all event approaches stay within disclosed damage and loot bounds across deterministic seeds', () => {
  let emptyRewards = 0
  for (const [areaId, area] of Object.entries(areas)) for (let event = 0; event < area.events.length; event++) {
    for (const approach of ['quiet', 'force', 'observe']) for (let seed = 0; seed < 12; seed++) {
      let state = createShelter()
      state.revision = seed
      if (area.requires) state.knowledge.push(area.requires)
      state = apply(state, { type: 'depart', team: ['survivor-1', 'survivor-2', 'survivor-3'], area: areaId, provisions: 3 })
      state.expedition.event = event
      const preview = previewEvent(state, 'survivor-1', approach)
      const next = apply(state, { type: 'choose', event, actor: 'survivor-1', approach })
      for (const damage of preview.damage) {
        const person = next.survivors.find(person => person.id === damage.survivor)
        const lost = 10 - (person?.hp ?? 0)
        assert.ok(lost >= damage.minimum && lost <= damage.maximum)
        if (!person) assert.equal(damage.possibleDeath, true)
      }
      const inventory = next.expedition?.inventory ?? next.sites[`${areaId}:${event}`].inventory
      assert.ok(inventory.wood === 0 || inventory.wood === preview.loot.wood)
      if (!inventory.wood) emptyRewards++
      assert.deepEqual(parseShelter(next), next)
      const injected = apply(state, { type: 'choose', event, actor: 'survivor-1', approach, loot: { wood: 999999 }, damage: 0 })
      assert.deepEqual(injected, next, 'callers cannot supply rewards or damage')
    }
  }
  assert.ok(emptyRewards > 0, 'higher risk does not guarantee loot')
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
