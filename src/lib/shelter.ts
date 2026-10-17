export type Language = 'en' | 'th'
export type Item = 'wood' | 'stone' | 'provisions' | 'medicine'
export type Inventory = Record<Item, number>
export type Job = 'garden' | 'recover' | 'housing' | 'storage'
export type Survivor = {
  id: string
  hp: number
  maxHp: number
  carry: number
  personalSkill: 'forager' | 'scout'
  generalSkill: 'gatherer'
  equipment: { weapon: null; armor: null; usable: null }
  job: { kind: Job; seconds: number } | null
}
export type Shelter = {
  schema: 1
  revision: number
  language: Language
  focusSeconds: number
  completedSessions: number
  housing: number
  storage: number
  inventory: Inventory
  survivors: Survivor[]
  expedition: { team: string[]; inventory: Inventory; event: number } | null
}
export const DEFAULT_FOCUS_SECONDS = 15 * 60
export const FOCUS_PRESETS = [5, 15, 25] as const
const emptyInventory = (): Inventory => ({ wood: 0, stone: 0, provisions: 0, medicine: 0 })
const jobs = {
  garden: { seconds: 300, wood: 0, stone: 0 },
  recover: { seconds: 300, wood: 0, stone: 0 },
  housing: { seconds: 900, wood: 4, stone: 2 },
  storage: { seconds: 600, wood: 2, stone: 2 },
} as const

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function integer(value: number, minimum = 0) {
  requireValue(Number.isSafeInteger(value) && value >= minimum, 'Invalid integer')
}
export function parseLanguage(value: unknown): Language {
  requireValue(value === 'en' || value === 'th', 'Unsupported language')
  return value
}
export function createShelter(): Shelter {
  return {
    schema: 1, revision: 0, language: 'en', focusSeconds: 0, completedSessions: 0,
    housing: 8, storage: 20,
    inventory: { wood: 6, stone: 4, provisions: 4, medicine: 0 },
    survivors: Array.from({ length: 5 }, (_, index) => ({
      id: `survivor-${index + 1}`, hp: 10, maxHp: 10, carry: 4,
      personalSkill: index === 0 ? 'scout' : 'forager', generalSkill: 'gatherer',
      equipment: { weapon: null, armor: null, usable: null }, job: null,
    })),
    expedition: null,
  }
}
export function inventorySlots(inventory: Inventory): number {
  let slots = 0
  for (const item of ['wood', 'stone', 'provisions', 'medicine'] as const) {
    integer(inventory[item])
    slots += Math.ceil(inventory[item] / 5)
  }
  return slots
}
export function expeditionCapacity(state: Shelter): number {
  return Math.min(10, state.survivors.filter(person => state.expedition?.team.includes(person.id) && person.hp > 0)
    .reduce((sum, person) => sum + person.carry, 0))
}
export type ShelterCommand =
  | { type: 'language'; language: Language }
  | { type: 'assign'; survivor: string; job: Job }
  | { type: 'focus'; seconds: number; targetSeconds: number; completed: boolean }
  | { type: 'discard'; item: Item; quantity: number }
  | { type: 'depart'; team: string[]; provisions: number }
  | { type: 'event'; event: number; actor: string; damage: number; provisions: number; loot: Inventory }
  | { type: 'return' }

// Expected revision is the persistence transaction's compare-and-set boundary.
export function applyShelterCommand(current: Shelter, revision: number, command: ShelterCommand): Shelter {
  integer(revision)
  requireValue(current.schema === 1 && current.revision === revision, 'Stale shelter revision')
  const state = structuredClone(current)
  switch (command.type) {
    case 'language':
      state.language = parseLanguage(command.language)
      break
    case 'assign': {
      const person = state.survivors.find(person => person.id === command.survivor)
      requireValue(person && person.hp > 0 && !person.job && !state.expedition?.team.includes(person.id), 'Survivor unavailable')
      requireValue(Object.hasOwn(jobs, command.job), 'Unknown job')
      const job = jobs[command.job]
      requireValue(state.inventory.wood >= job.wood && state.inventory.stone >= job.stone, 'Insufficient materials')
      state.inventory.wood -= job.wood
      state.inventory.stone -= job.stone
      person.job = { kind: command.job, seconds: 0 }
      break
    }
    case 'focus':
      integer(command.seconds, 1)
      integer(command.targetSeconds, 1)
      requireValue(command.seconds <= command.targetSeconds && typeof command.completed === 'boolean', 'Invalid focus duration')
      requireValue(!command.completed || command.seconds === command.targetSeconds, 'Incomplete session')
      state.focusSeconds += command.seconds
      state.completedSessions += Number(command.completed)
      integer(state.focusSeconds)
      for (const person of state.survivors) {
        if (!person.job || person.hp === 0) continue
        const job = person.job
        job.seconds += command.seconds
        if (job.seconds < jobs[job.kind].seconds) continue
        if (job.kind === 'garden') {
          const inventory = { ...state.inventory, provisions: state.inventory.provisions + 2 }
          if (inventorySlots(inventory) > state.storage) {
            job.seconds = jobs.garden.seconds
            continue
          }
          state.inventory = inventory
        }
        if (job.kind === 'recover') person.hp = Math.min(person.maxHp, person.hp + 5)
        if (job.kind === 'housing') state.housing += 2
        if (job.kind === 'storage') state.storage += 10
        person.job = null
      }
      break
    case 'discard':
      requireValue(Object.hasOwn(state.inventory, command.item), 'Unknown item')
      integer(command.quantity, 1)
      requireValue(state.inventory[command.item] >= command.quantity, 'Insufficient items')
      state.inventory[command.item] -= command.quantity
      break
    case 'depart': {
      requireValue(!state.expedition, 'Expedition already active')
      requireValue(command.team.length >= 1 && command.team.length <= 3 && new Set(command.team).size === command.team.length, 'Invalid team')
      for (const id of command.team) {
        requireValue(state.survivors.some(person => person.id === id && person.hp > 0 && !person.job), 'Survivor unavailable')
      }
      integer(command.provisions, 1)
      requireValue(state.inventory.provisions >= command.provisions, 'Insufficient provisions')
      state.inventory.provisions -= command.provisions
      state.expedition = { team: [...command.team], inventory: { ...emptyInventory(), provisions: command.provisions }, event: 0 }
      requireValue(inventorySlots(state.expedition.inventory) <= expeditionCapacity(state), 'Expedition full')
      break
    }
    case 'event': {
      const expedition = state.expedition
      requireValue(expedition && expedition.event === command.event, 'Stale expedition event')
      const actor = state.survivors.find(person => person.id === command.actor)
      requireValue(actor && actor.hp > 0 && expedition.team.includes(actor.id), 'Invalid actor')
      integer(command.damage)
      integer(command.provisions)
      // shortcut: only nonfatal trial events, add disclosed death/cache resolution before lethal content.
      requireValue(command.damage < actor.hp, 'Lethal events require recovery-site resolution')
      requireValue(expedition.inventory.provisions >= command.provisions, 'Insufficient provisions')
      inventorySlots(command.loot)
      actor.hp -= command.damage
      expedition.inventory.provisions -= command.provisions
      for (const item of ['wood', 'stone', 'provisions', 'medicine'] as const) expedition.inventory[item] += command.loot[item]
      requireValue(inventorySlots(expedition.inventory) <= expeditionCapacity(state), 'Expedition full')
      expedition.event += 1
      break
    }
    case 'return': {
      requireValue(state.expedition, 'No expedition')
      const inventory = { ...state.inventory }
      for (const item of ['wood', 'stone', 'provisions', 'medicine'] as const) inventory[item] += state.expedition.inventory[item]
      requireValue(inventorySlots(inventory) <= state.storage, 'Fort storage full')
      state.inventory = inventory
      state.expedition = null
      break
    }
    default:
      throw new Error('Unknown shelter command')
  }
  state.revision += 1
  integer(state.revision)
  return state
}
