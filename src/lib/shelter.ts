import { areas, eventAt, type Approach, type AreaId } from './shelter-content.ts'

export type Language = 'en' | 'th'
export type Item = 'wood' | 'stone' | 'provisions' | 'medicine'
export type Inventory = Record<Item, number>
export type Gear = { id: string; kind: 'sword' | 'coat' | 'bulwark' | 'blueprint' | 'relic'; durability: number }
export type Skill = 'gatherer' | 'scout' | 'pathfinder'
export type Job = 'garden' | 'recover' | 'housing' | 'storage' | 'medicine' | 'sword' | 'coat' | 'bulwark' | 'repair' | 'train'
export type Survivor = {
  id: string; hp: number; maxHp: number; carry: number; xp: number
  personalSkill: 'forager' | 'scout'; generalSkill: Skill
  equipment: { weapon: Gear | null; armor: Gear | null; usable: 'medicine' | null }
  job: { kind: Job; seconds: number; gearId: string | null; skill: Skill | null } | null
}
export type Site = { inventory: Inventory; gear: Gear[]; survivors: Survivor[] }
export type PackSelection = { inventory: Inventory; gearIds: string[] }
export type Expedition = {
  id: string; area: AreaId; team: string[]; inventory: Inventory; gear: Gear[]
  event: number; location: string | null; escorted: { person: Survivor; helper: string }[]
}
export type Shelter = {
  schema: 1; revision: number; language: Language; focusSeconds: number; completedSessions: number
  housing: number; storage: number; inventory: Inventory; armory: Gear[]; survivors: Survivor[]
  expedition: Expedition | null; sites: Record<string, Site>; knowledge: string[]; foundPeople: string[]; deaths: number
}
export const DEFAULT_FOCUS_SECONDS = 15 * 60
export const FOCUS_PRESETS = [5, 15, 25] as const
export const items = ['wood', 'stone', 'provisions', 'medicine'] as const
export const emptyInventory = (): Inventory => ({ wood: 0, stone: 0, provisions: 0, medicine: 0 })
export const jobs = {
  garden: { seconds: 300, wood: 0, stone: 0 }, recover: { seconds: 300, wood: 0, stone: 0 },
  housing: { seconds: 900, wood: 4, stone: 2 }, storage: { seconds: 600, wood: 2, stone: 2 },
  medicine: { seconds: 300, wood: 1, stone: 0 }, sword: { seconds: 600, wood: 2, stone: 2 },
  coat: { seconds: 600, wood: 2, stone: 0 }, repair: { seconds: 300, wood: 1, stone: 1 },
  train: { seconds: 600, wood: 0, stone: 0 },
  bulwark: { seconds: 900, wood: 3, stone: 4 },
} as const

export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
export function integer(value: number, minimum = 0) {
  requireValue(Number.isSafeInteger(value) && value >= minimum, 'Invalid integer')
}
export function parseLanguage(value: unknown): Language {
  requireValue(value === 'en' || value === 'th', 'Unsupported language'); return value
}
export function newSurvivor(id: string, scout = false): Survivor {
  return {
    id, hp: 10, maxHp: 10, carry: 4, xp: 0,
    personalSkill: scout ? 'scout' : 'forager', generalSkill: 'gatherer',
    equipment: { weapon: null, armor: null, usable: null }, job: null,
  }
}
export function createShelter(): Shelter {
  return {
    schema: 1, revision: 0, language: 'en', focusSeconds: 0, completedSessions: 0,
    housing: 8, storage: 20, inventory: { wood: 6, stone: 4, provisions: 4, medicine: 0 }, armory: [],
    survivors: Array.from({ length: 5 }, (_, index) => newSurvivor(`survivor-${index + 1}`, index === 0)),
    expedition: null, sites: {}, knowledge: [], foundPeople: [], deaths: 0,
  }
}
export function inventorySlots(inventory: Inventory): number {
  let slots = 0
  for (const item of items) { integer(inventory[item]); slots += Math.ceil(inventory[item] / 5) }
  return slots
}
export const gearSlots = (gear: Gear[]) => gear.reduce((slots, item) => slots + (item.kind === 'relic' ? 3 : 1), 0)
export const equippable = (kind: Gear['kind'], slot: 'weapon' | 'armor') => slot === 'weapon' ? kind === 'sword' : kind === 'coat' || kind === 'bulwark'
export const availableSkills = (state: Shelter): Skill[] => state.knowledge.includes('ward') ? ['gatherer', 'scout', 'pathfinder'] : ['gatherer', 'scout']
export const hasBlueprint = (state: Shelter) => state.armory.some(gear => gear.kind === 'blueprint')
export function expeditionCapacity(state: Shelter): number {
  const expedition = state.expedition
  if (!expedition) return 0
  return Math.min(10, state.survivors.filter(person => expedition.team.includes(person.id))
    .reduce((sum, person) => sum + Math.max(0, person.carry - 2 * expedition.escorted.filter(escort => escort.helper === person.id).length), 0))
}
function siteAt(state: Shelter, location: string): Site {
  return state.sites[location] ??= { inventory: emptyInventory(), gear: [], survivors: [] }
}
function addInventory(target: Inventory, source: Inventory) {
  inventorySlots(source)
  for (const item of items) { target[item] += source[item]; integer(target[item]) }
}
function takeInventory(source: Inventory, selection: Inventory) {
  inventorySlots(selection)
  for (const item of items) {
    requireValue(source[item] >= selection[item], 'Insufficient items'); source[item] -= selection[item]
  }
}
function personAt(state: Shelter, id: string) {
  const person = state.survivors.find(person => person.id === id)
  requireValue(person, 'Survivor unavailable'); return person
}
function fortPerson(state: Shelter, id: string) {
  const person = personAt(state, id)
  requireValue(!person.job && !state.expedition?.team.includes(id), 'Survivor unavailable'); return person
}
function packFit(state: Shelter, selection?: PackSelection) {
  const expedition = state.expedition!
  if (selection) {
    const site = siteAt(state, expedition.location!)
    inventorySlots(selection.inventory)
    const kept = { ...selection.inventory }
    for (const item of items) kept[item] = Math.min(kept[item], expedition.inventory[item])
    const left = { ...expedition.inventory }; takeInventory(left, kept)
    requireValue(new Set(selection.gearIds).size === selection.gearIds.length
      && selection.gearIds.every(id => expedition.gear.some(gear => gear.id === id)), 'Invalid gear selection')
    addInventory(site.inventory, left)
    site.gear.push(...expedition.gear.filter(gear => !selection.gearIds.includes(gear.id)))
    expedition.inventory = kept
    expedition.gear = expedition.gear.filter(gear => selection.gearIds.includes(gear.id))
  }
  requireValue(inventorySlots(expedition.inventory) + gearSlots(expedition.gear) <= expeditionCapacity(state), 'Choose what to leave at the marked site')
}
export type EventPreview = {
  id: string; noise: 'quiet' | 'noisy' | 'unknown'; provisions: number
  damage: { survivor: string; minimum: number; maximum: number; possibleDeath: boolean }[]
  loot: Inventory; lootChance: number; specialLoot: ('blueprint' | 'relic')[]; specialChance: number; rescueClue: string | null; wear: number
}
export function previewEvent(state: Shelter, actorId: string, approach: Approach): EventPreview {
  const expedition = state.expedition
  requireValue(expedition, 'No expedition')
  const event = eventAt(expedition.area, expedition.event)
  requireValue(['quiet', 'force', 'observe'].includes(approach), 'Unknown approach')
  requireValue(expedition.team.includes(actorId), 'Invalid actor')
  const actor = personAt(state, actorId)
  const skilled = actor.personalSkill === 'scout' || actor.generalSkill === 'scout'
  const weapon = actor.equipment.weapon && actor.equipment.weapon.durability > 0
  const base = Math.max(0, event.danger + (approach === 'force' ? (weapon ? -2 : 2) : approach === 'quiet' && skilled ? -2 : 0))
  const affected = event.teamWide ? expedition.team : [actorId]
  return {
    id: event.id, noise: approach === 'force' ? 'noisy' : approach === 'quiet' ? 'quiet' : 'unknown',
    provisions: approach === 'observe' && actor.generalSkill !== 'pathfinder' ? 2 : 1,
    damage: affected.map(id => {
      const person = personAt(state, id)
      const armor = person.equipment.armor && person.equipment.armor.durability > 0 ? (person.equipment.armor.kind === 'bulwark' ? 3 : 2) : 0
      const maximum = Math.max(0, base - armor - Math.min(1, Math.floor(person.xp / 10)))
      return { survivor: id, minimum: Math.max(0, maximum - 1), maximum, possibleDeath: maximum >= person.hp }
    }),
    loot: { wood: expedition.area === 'border' ? 2 : 4, stone: approach === 'force' ? 2 : 1, provisions: actor.personalSkill === 'forager' ? 1 : 0, medicine: expedition.area === 'barrow' ? 1 : 0 },
    lootChance: 75,
    specialLoot: expedition.area === 'barrow' ? ['blueprint', 'relic'] : expedition.area === 'hollow' ? ['blueprint'] : [], specialChance: 25,
    rescueClue: event.rescue ? 'An injured traveler knows the old paths.' : null, wear: 1,
  }
}
function roll(id: string): number {
  let hash = 0
  for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0
  return hash >>> 0
}
export function previewReturn(state: Shelter): PackSelection {
  const expedition = state.expedition
  requireValue(expedition, 'No expedition')
  const inventory = emptyInventory(), combined = { ...state.inventory }
  for (const item of ['medicine', 'provisions', 'wood', 'stone'] as const) {
    // Fill an existing partial stack before allocating more slots.
    const free = state.storage - inventorySlots(combined) - gearSlots(state.armory)
    const partial = combined[item] % 5 ? 5 - combined[item] % 5 : 0
    inventory[item] = Math.min(expedition.inventory[item], Math.max(0, free * 5 + partial))
    combined[item] += inventory[item]
  }
  let free = Math.max(0, state.storage - inventorySlots(combined) - gearSlots(state.armory))
  const gearIds: string[] = []
  for (const gear of expedition.gear) if (gearSlots([gear]) <= free) { gearIds.push(gear.id); free -= gearSlots([gear]) }
  return { inventory, gearIds }
}
export type ShelterCommand =
  | { type: 'language'; language: Language }
  | { type: 'discardGear'; gearId: string }
  | { type: 'assign'; survivor: string; job: Job; gearId?: string; skill?: Skill }
  | { type: 'focus'; seconds: number; targetSeconds: number; completed: boolean }
  | { type: 'discard'; item: Item; quantity: number }
  | { type: 'equip'; survivor: string; slot: 'weapon' | 'armor'; gearId: string | null }
  | { type: 'usable'; survivor: string; equipped: boolean }
  | { type: 'heal'; survivor: string }
  | { type: 'depart'; team: string[]; provisions: number; area?: AreaId }
  | { type: 'choose'; event: number; actor: string; approach: Approach; pack?: PackSelection }
  | { type: 'rescue'; survivor: string; helper: string; pack?: PackSelection }
  | { type: 'collect'; inventory: Inventory; gearIds: string[] }
  | { type: 'return'; take?: PackSelection }

// Only validated state and expected revision may enter a persistence transaction.
export function applyShelterCommand(current: Shelter, revision: number, command: ShelterCommand): Shelter {
  integer(revision)
  requireValue(current.schema === 1 && current.revision === revision, 'Stale shelter revision')
  const state = structuredClone(current)
  switch (command.type) {
    case 'language': state.language = parseLanguage(command.language); break
    case 'assign': {
      const person = fortPerson(state, command.survivor)
      requireValue(Object.hasOwn(jobs, command.job), 'Unknown job')
      const job = jobs[command.job]
      if (command.job === 'bulwark') requireValue(hasBlueprint(state), 'Recover a blueprint to the fort first')
      if (command.job === 'repair') requireValue(state.armory.some(gear => gear.id === command.gearId && (equippable(gear.kind, 'weapon') || equippable(gear.kind, 'armor')) && gear.durability < 10)
        && !state.survivors.some(person => person.job?.gearId === command.gearId), 'Gear unavailable for repair')
      if (command.job === 'train') requireValue(command.skill && availableSkills(state).includes(command.skill), 'Skill undiscovered')
      requireValue(state.inventory.wood >= job.wood && state.inventory.stone >= job.stone, 'Insufficient materials')
      state.inventory.wood -= job.wood; state.inventory.stone -= job.stone
      person.job = { kind: command.job, seconds: 0, gearId: command.job === 'repair' ? command.gearId! : null, skill: command.job === 'train' ? command.skill! : null }
      break
    }
    case 'focus':
      integer(command.seconds, 1); integer(command.targetSeconds, 1)
      requireValue(command.targetSeconds <= 10800 && command.seconds <= command.targetSeconds && typeof command.completed === 'boolean', 'Invalid focus duration')
      requireValue(command.completed === (command.seconds === command.targetSeconds), 'Incomplete session')
      state.focusSeconds += command.seconds; state.completedSessions += Number(command.completed)
      integer(state.focusSeconds); integer(state.completedSessions)
      for (const person of state.survivors) {
        if (!person.job) continue
        const job = person.job
        job.seconds = Math.min(jobs[job.kind].seconds, job.seconds + command.seconds)
        if (job.seconds < jobs[job.kind].seconds) continue
        if (job.kind === 'garden' || job.kind === 'medicine' || job.kind === 'sword' || job.kind === 'coat' || job.kind === 'bulwark') {
          const inventory = { ...state.inventory }, gear = [...state.armory]
          if (job.kind === 'garden') inventory.provisions += 2
          else if (job.kind === 'medicine') inventory.medicine += 1
          else gear.push({ id: `gear-${state.revision}-${person.id}`, kind: job.kind, durability: 10 })
          if (inventorySlots(inventory) + gearSlots(gear) > state.storage) continue
          state.inventory = inventory; state.armory = gear
        }
        if (job.kind === 'recover') person.hp = Math.min(person.maxHp, person.hp + 5)
        if (job.kind === 'housing') state.housing += 2
        if (job.kind === 'storage') state.storage += 10
        if (job.kind === 'repair') state.armory.find(gear => gear.id === job.gearId)!.durability = 10
        if (job.kind === 'train') person.generalSkill = job.skill!
        person.job = null
      }
      break
    case 'discardGear': {
      const gear = state.armory.find(gear => gear.id === command.gearId)
      requireValue(gear && !state.survivors.some(person => person.job?.gearId === gear.id), 'Gear unavailable')
      requireValue(gear.kind !== 'blueprint' || state.armory.filter(item => item.kind === 'blueprint').length > 1
        || !state.survivors.some(person => person.job?.kind === 'bulwark'), 'Blueprint in use')
      state.armory = state.armory.filter(gear => gear.id !== command.gearId); break
    }
    case 'discard':
      requireValue(Object.hasOwn(state.inventory, command.item), 'Unknown item'); integer(command.quantity, 1)
      takeInventory(state.inventory, { ...emptyInventory(), [command.item]: command.quantity }); break
    case 'equip': {
      requireValue(command.slot === 'weapon' || command.slot === 'armor', 'Invalid equipment slot')
      const person = personAt(state, command.survivor)
      requireValue(!person.job, 'Survivor unavailable')
      const expedition = state.expedition?.team.includes(person.id) ? state.expedition : null
      const gear = expedition ? expedition.gear : state.armory
      const chosen = command.gearId === null ? null : gear.find(gear => gear.id === command.gearId)
      requireValue(command.gearId === null || (chosen && equippable(chosen.kind, command.slot)), 'Wrong equipment')
      requireValue(!state.survivors.some(person => person.job?.gearId === command.gearId && command.gearId !== null), 'Gear under repair')
      const previous = person.equipment[command.slot]
      if (chosen) gear.splice(gear.indexOf(chosen), 1)
      if (previous) gear.push(previous)
      person.equipment[command.slot] = chosen ?? null
      requireValue(inventorySlots(expedition ? expedition.inventory : state.inventory) + gearSlots(gear) <= (expedition ? expeditionCapacity(state) : state.storage), 'No equipment storage space')
      break
    }
    case 'usable': {
      const person = personAt(state, command.survivor)
      requireValue(!person.job && typeof command.equipped === 'boolean', 'Survivor unavailable')
      const expedition = state.expedition?.team.includes(person.id) ? state.expedition : null
      const inventory = expedition ? expedition.inventory : state.inventory
      if (command.equipped && !person.equipment.usable) {
        takeInventory(inventory, { ...emptyInventory(), medicine: 1 }); person.equipment.usable = 'medicine'
      } else if (!command.equipped && person.equipment.usable) {
        inventory.medicine += 1; person.equipment.usable = null
      }
      requireValue(inventorySlots(inventory) + (expedition ? gearSlots(expedition.gear) : gearSlots(state.armory)) <= (expedition ? expeditionCapacity(state) : state.storage), 'No item storage space')
      break
    }
    case 'heal': {
      const person = personAt(state, command.survivor)
      requireValue(person.equipment.usable === 'medicine' && person.hp < person.maxHp, 'Medicine unavailable or survivor healthy')
      person.hp = Math.min(person.maxHp, person.hp + 5); person.equipment.usable = null; break
    }
    case 'depart': {
      requireValue(!state.expedition, 'Expedition already active')
      const area = command.area ?? 'border'
      requireValue(Object.hasOwn(areas, area), 'Unknown area')
      requireValue(!areas[area].requires || state.knowledge.includes(areas[area].requires!), 'Area undiscovered')
      requireValue(command.team.length >= 1 && command.team.length <= 3 && new Set(command.team).size === command.team.length, 'Invalid team')
      for (const id of command.team) fortPerson(state, id)
      integer(command.provisions, 1); takeInventory(state.inventory, { ...emptyInventory(), provisions: command.provisions })
      state.expedition = { id: `expedition-${state.revision}`, area, team: [...command.team], inventory: { ...emptyInventory(), provisions: command.provisions }, gear: [], event: 0, location: null, escorted: [] }
      requireValue(inventorySlots(state.expedition.inventory) <= expeditionCapacity(state), 'Expedition full'); break
    }
    case 'choose': {
      const expedition = state.expedition
      requireValue(expedition && expedition.event === command.event, 'Stale expedition event')
      const preview = previewEvent(state, command.actor, command.approach)
      requireValue(expedition.inventory.provisions >= preview.provisions, 'Insufficient provisions')
      const definition = eventAt(expedition.area, expedition.event)
      expedition.location = `${expedition.area}:${expedition.event}`
      const site = siteAt(state, expedition.location)
      expedition.inventory.provisions -= preview.provisions
      if (roll(`${expedition.id}:${command.event}:${command.approach}:loot`) % 4 !== 0) addInventory(expedition.inventory, preview.loot)
      // Optional discoveries stay at the site until explicitly collected.
      for (const kind of preview.specialLoot) if (roll(`${expedition.id}:${command.event}:${command.approach}:${kind}`) % 4 === 0) {
        site.gear.push({ id: `${kind}-${expedition.id}-${command.event}`, kind, durability: 0 })
      }
      for (const damage of preview.damage) {
        const person = personAt(state, damage.survivor)
        person.hp = Math.max(0, person.hp - (damage.minimum + roll(`${expedition.id}:${command.event}:${command.approach}:${person.id}`) % (damage.maximum - damage.minimum + 1)))
        if (person.equipment.armor && person.equipment.armor.durability > 0) person.equipment.armor.durability -= 1
      }
      const actor = personAt(state, command.actor)
      if (command.approach === 'force' && actor.equipment.weapon && actor.equipment.weapon.durability > 0) actor.equipment.weapon.durability -= 1
      for (const person of state.survivors.filter(person => expedition.team.includes(person.id) && person.hp === 0)) {
        for (const gear of [person.equipment.weapon, person.equipment.armor]) if (gear) site.gear.push(gear)
        if (person.equipment.usable) site.inventory.medicine += 1
        state.deaths += 1
      }
      state.survivors = state.survivors.filter(person => person.hp > 0)
      expedition.team = expedition.team.filter(id => state.survivors.some(person => person.id === id))
      for (const escort of expedition.escorted) {
        if (!expedition.team.includes(escort.helper)) {
          const helper = expedition.team.find(id => !expedition.escorted.some(other => other.helper === id))
          if (helper) escort.helper = helper
          else { site.survivors.push(escort.person); escort.helper = '' }
        }
      }
      expedition.escorted = expedition.escorted.filter(escort => escort.helper)
      for (const id of expedition.team) {
        const person = personAt(state, id)
        person.xp += 1; person.maxHp = 10 + Math.min(4, Math.floor(person.xp / 5))
      }
      if (!state.knowledge.includes(definition.id)) state.knowledge.push(definition.id)
      if (definition.rescue && !state.foundPeople.includes(definition.id)) {
        const person = newSurvivor(`rescued-${definition.id}`, true); person.hp = 4
        site.survivors.push(person); state.foundPeople.push(definition.id)
      }
      expedition.event += 1
      if (!expedition.team.length) {
        addInventory(site.inventory, expedition.inventory); site.gear.push(...expedition.gear)
        site.survivors.push(...expedition.escorted.map(escort => escort.person)); state.expedition = null
        if (!state.survivors.length) state.survivors.push(newSurvivor(`arrival-${state.revision}`))
      } else packFit(state, command.pack)
      break
    }
    case 'rescue': {
      const expedition = state.expedition
      requireValue(expedition?.location, 'No marked location')
      const site = siteAt(state, expedition.location)
      const person = site.survivors.find(person => person.id === command.survivor)
      requireValue(person && expedition.team.includes(command.helper) && !expedition.escorted.some(escort => escort.helper === command.helper), 'Rescue helper unavailable')
      requireValue(state.survivors.length + expedition.escorted.length < state.housing, 'Housing full')
      expedition.escorted.push({ person, helper: command.helper })
      site.survivors = site.survivors.filter(candidate => candidate.id !== person.id)
      packFit(state, command.pack); break
    }
    case 'collect': {
      const expedition = state.expedition
      requireValue(expedition?.location, 'No marked location')
      const site = siteAt(state, expedition.location)
      takeInventory(site.inventory, command.inventory); addInventory(expedition.inventory, command.inventory)
      requireValue(new Set(command.gearIds).size === command.gearIds.length, 'Duplicate gear')
      for (const id of command.gearIds) {
        const index = site.gear.findIndex(gear => gear.id === id)
        requireValue(index >= 0, 'Gear unavailable'); expedition.gear.push(site.gear.splice(index, 1)[0])
      }
      packFit(state); break
    }
    case 'return': {
      const expedition = state.expedition
      requireValue(expedition, 'No expedition')
      const take = command.take ?? previewReturn(state)
      const left = { ...expedition.inventory }; takeInventory(left, take.inventory)
      requireValue(new Set(take.gearIds).size === take.gearIds.length && take.gearIds.every(id => expedition.gear.some(gear => gear.id === id)), 'Invalid gear selection')
      addInventory(state.inventory, take.inventory)
      state.armory.push(...expedition.gear.filter(gear => take.gearIds.includes(gear.id)))
      requireValue(inventorySlots(state.inventory) + gearSlots(state.armory) <= state.storage, 'Fort storage full')
      const site = siteAt(state, expedition.location ?? `${expedition.area}:0`)
      addInventory(site.inventory, left); site.gear.push(...expedition.gear.filter(gear => !take.gearIds.includes(gear.id)))
      state.survivors.push(...expedition.escorted.map(escort => escort.person)); state.expedition = null; break
    }
    default: throw new Error('Unknown shelter command')
  }
  state.revision += 1; integer(state.revision); return state
}
