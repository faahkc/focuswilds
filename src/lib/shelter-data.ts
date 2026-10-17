import { areas, eventAt } from './shelter-content.ts'
import { record } from './focus-data.ts'
import { expeditionCapacity, inventorySlots, items, jobs, parseLanguage, requireValue, type Shelter } from './shelter.ts'

const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000_000
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{1,120}$/.test(value)
function keys(value: unknown, names: string[]) {
  const row = record(value)
  requireValue(Object.keys(row).length === names.length && names.every(name => Object.hasOwn(row, name)), 'Invalid saved shelter fields')
  return row
}
function list(value: unknown): unknown[] {
  requireValue(Array.isArray(value), 'Invalid saved shelter list'); return value
}
function inventory(value: unknown) {
  const row = keys(value, [...items])
  requireValue(items.every(item => count(row[item])), 'Invalid saved inventory')
}
function strings(value: unknown, allowed?: string[]) {
  const rows = list(value)
  requireValue(rows.every(id) && new Set(rows).size === rows.length && (!allowed || rows.every(row => allowed.includes(row as string))), 'Invalid saved identifiers')
  return rows as string[]
}

export function parseShelter(value: unknown): Shelter {
  const row = keys(value, ['schema', 'revision', 'language', 'focusSeconds', 'completedSessions', 'housing', 'storage', 'inventory', 'armory', 'survivors', 'expedition', 'sites', 'knowledge', 'foundPeople', 'deaths'])
  requireValue(row.schema === 1 && ['revision', 'focusSeconds', 'completedSessions', 'housing', 'storage', 'deaths'].every(key => count(row[key]))
    && Number(row.housing) >= 1 && Number(row.storage) >= 1 && Number(row.completedSessions) <= Number(row.focusSeconds), 'Invalid saved shelter totals')
  parseLanguage(row.language); inventory(row.inventory)
  const personIds = new Set<string>(), gearIds = new Set<string>()
  function gear(value: unknown, kind?: string) {
    const gear = keys(value, ['id', 'kind', 'durability'])
    requireValue(id(gear.id) && !gearIds.has(gear.id) && ['sword', 'coat'].includes(String(gear.kind))
      && (!kind || gear.kind === kind) && count(gear.durability) && gear.durability <= 10, 'Invalid saved gear')
    gearIds.add(gear.id)
  }
  function person(value: unknown, away = false) {
    const person = keys(value, ['id', 'hp', 'maxHp', 'carry', 'xp', 'personalSkill', 'generalSkill', 'equipment', 'job'])
    requireValue(id(person.id) && !personIds.has(person.id) && count(person.hp) && person.hp > 0 && count(person.xp)
      && person.maxHp === 10 + Math.min(4, Math.floor(person.xp / 5)) && person.hp <= Number(person.maxHp) && person.carry === 4
      && ['forager', 'scout'].includes(String(person.personalSkill)) && ['gatherer', 'scout'].includes(String(person.generalSkill)), 'Invalid saved survivor')
    personIds.add(person.id)
    const equipment = keys(person.equipment, ['weapon', 'armor', 'usable'])
    if (equipment.weapon !== null) gear(equipment.weapon, 'sword')
    if (equipment.armor !== null) gear(equipment.armor, 'coat')
    requireValue(equipment.usable === null || equipment.usable === 'medicine', 'Invalid saved usable item')
    if (person.job !== null) {
      const job = keys(person.job, ['kind', 'seconds', 'gearId', 'skill'])
      requireValue(!away && typeof job.kind === 'string' && Object.hasOwn(jobs, job.kind) && count(job.seconds)
        && job.seconds <= jobs[job.kind as keyof typeof jobs].seconds
        && (job.kind === 'repair' ? id(job.gearId) : job.gearId === null)
        && (job.kind === 'train' ? job.skill === 'scout' || job.skill === 'gatherer' : job.skill === null), 'Invalid saved job')
    }
  }
  for (const entry of list(row.armory)) gear(entry)
  for (const entry of list(row.survivors)) person(entry)
  requireValue(list(row.survivors).length > 0, 'Missing fallback survivor')
  const allEvents = Object.values(areas).flatMap(area => area.events)
  strings(row.knowledge, allEvents.map(event => event.id))
  strings(row.foundPeople, allEvents.filter(event => event.rescue).map(event => event.id))
  const sites = record(row.sites)
  for (const [location, value] of Object.entries(sites)) {
    const [area, index] = location.split(':')
    requireValue(location === `${area}:${Number(index)}` && Object.hasOwn(areas, area), 'Invalid saved site')
    eventAt(area as keyof typeof areas, Number(index))
    const site = keys(value, ['inventory', 'gear', 'survivors'])
    inventory(site.inventory)
    for (const entry of list(site.gear)) gear(entry)
    for (const entry of list(site.survivors)) person(entry, true)
  }
  if (row.expedition !== null) {
    const expedition = keys(row.expedition, ['id', 'area', 'team', 'inventory', 'gear', 'event', 'location', 'escorted'])
    requireValue(id(expedition.id) && typeof expedition.area === 'string' && Object.hasOwn(areas, expedition.area)
      && count(expedition.event) && expedition.event <= areas[expedition.area as keyof typeof areas].events.length, 'Invalid saved expedition')
    const team = strings(expedition.team)
    requireValue(team.length >= 1 && team.length <= 3, 'Invalid saved team')
    const living = row.survivors as Shelter['survivors']
    requireValue(team.every(id => living.some(person => person.id === id && !person.job)), 'Invalid saved team member')
    requireValue(expedition.location === null ? expedition.event === 0 : expedition.location === `${expedition.area}:${expedition.event - 1}`
      && Object.hasOwn(sites, String(expedition.location)), 'Invalid expedition location')
    inventory(expedition.inventory)
    for (const entry of list(expedition.gear)) gear(entry)
    const helpers = new Set<string>()
    for (const entry of list(expedition.escorted)) {
      const escort = keys(entry, ['person', 'helper'])
      requireValue(typeof escort.helper === 'string' && team.includes(escort.helper) && !helpers.has(escort.helper), 'Invalid rescue helper')
      helpers.add(escort.helper); person(escort.person, true)
    }
  }
  const state = structuredClone(row) as Shelter
  requireValue(state.survivors.length + (state.expedition?.escorted.length ?? 0) <= state.housing, 'Saved housing exceeded')
  requireValue(inventorySlots(state.inventory) + state.armory.length <= state.storage, 'Saved storage exceeded')
  if (state.expedition) requireValue(inventorySlots(state.expedition.inventory) + state.expedition.gear.length <= expeditionCapacity(state), 'Saved carrying capacity exceeded')
  const repairs = new Set<string>()
  for (const person of state.survivors) if (person.job?.kind === 'repair') {
    const id = person.job.gearId!
    requireValue(!repairs.has(id) && state.armory.some(gear => gear.id === id), 'Invalid saved repair target'); repairs.add(id)
  }
  // shortcut: one bounded state snapshot; split rosters/caches before larger content exceeds this guard.
  requireValue(new TextEncoder().encode(JSON.stringify(state)).length <= 600_000, 'Shelter snapshot is too large')
  return state
}
