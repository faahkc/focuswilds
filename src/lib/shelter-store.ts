import { dayKey, userPath } from './account.ts'
import { record } from './saved-data.ts'
import { historyRange, type HistoryPeriod } from './history.ts'
import type { Cursor, FocusStore } from './focus-store.ts'
import { applyShelterCommand, createShelter, integer, requireValue, type Shelter, type ShelterCommand } from './shelter.ts'
import { parseShelter } from './shelter-data.ts'

export type ShelterFocus = { startedAt: string; completedAt: string; title: string }
export type ShelterOperation = { id: string; revision: number; command: ShelterCommand; focus?: ShelterFocus }
export type ShelterSession = ShelterFocus & { id: string; seconds: number; targetSeconds: number; completed: boolean }
export type ShelterDay = { day: string; sessions: number; seconds: number }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
export const shelterPath = (userId: string) => `${userPath(userId)}/shelter/state`
type CacheEntry = { promise: Promise<Shelter | null>; revision: number; loading: boolean }
const loaded = new WeakMap<FocusStore, Map<string, CacheEntry>>()
const initializing = new WeakMap<FocusStore, Promise<Shelter>>()
const pending = new WeakMap<FocusStore, Map<string, { fingerprint: string; promise: Promise<Shelter> }>>()

function cacheFor(store: FocusStore) {
  let cache = loaded.get(store)
  if (!cache) { cache = new Map(); loaded.set(store, cache) }
  return cache
}
function remember(store: FocusStore, path: string, state: Shelter) {
  const cache = cacheFor(store)
  if ((cache.get(path)?.revision ?? -1) <= state.revision) cache.set(path, { promise: Promise.resolve(structuredClone(state)), revision: state.revision, loading: false })
}
export async function loadShelter(store: FocusStore, userId: string, refresh = false): Promise<Shelter | null> {
  const path = shelterPath(userId), cache = cacheFor(store)
  if (refresh && !cache.get(path)?.loading) cache.delete(path)
  let entry = cache.get(path)
  if (!entry) {
    const next: CacheEntry = { revision: -1, promise: Promise.resolve(null), loading: true }
    next.promise = store.get(path).then(value => {
      const state = value === null ? null : parseShelter(value)
      next.revision = state?.revision ?? -1
      return state
    }).catch(error => { if (cache.get(path) === next) cache.delete(path); throw error }).finally(() => { next.loading = false })
    cache.set(path, next); entry = next
  }
  const value = await entry.promise
  return structuredClone(value)
}
export async function initializeShelter(store: FocusStore, userId: string): Promise<Shelter> {
  const path = shelterPath(userId)
  const existing = initializing.get(store)
  if (existing) return structuredClone(await existing)
  const promise = store.transaction(async tx => {
    const saved = await tx.get(path)
    if (saved !== null) return parseShelter(saved)
    const state = createShelter(); tx.set(path, state); return state
  }).finally(() => initializing.delete(store))
  initializing.set(store, promise)
  const state = await promise
  remember(store, path, state)
  return structuredClone(state)
}
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') { requireValue(Number.isFinite(value), 'Invalid operation number'); return JSON.stringify(value) }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const row = record(value)
  requireValue(Object.getPrototypeOf(row) === Object.prototype, 'Invalid operation object')
  return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${canonical(row[key])}`).join(',')}}`
}
function parseFocus(value: unknown): ShelterFocus {
  const row = record(value)
  requireValue(typeof row.startedAt === 'string' && typeof row.completedAt === 'string'
    && Number.isFinite(Date.parse(row.startedAt)) && Number.isFinite(Date.parse(row.completedAt))
    && Date.parse(row.completedAt) >= Date.parse(row.startedAt)
    && typeof row.title === 'string' && row.title.trim().length > 0 && [...row.title].length <= 120, 'Invalid shelter focus metadata')
  return { startedAt: new Date(row.startedAt).toISOString(), completedAt: new Date(row.completedAt).toISOString(), title: row.title.trim() }
}
export function parseShelterSession(value: unknown): ShelterSession {
  const row = record(value), focus = parseFocus(row)
  integer(row.seconds as number, 1); integer(row.targetSeconds as number, 1)
  requireValue(typeof row.id === 'string' && uuid.test(row.id) && typeof row.completed === 'boolean'
    && Number(row.seconds) <= Number(row.targetSeconds) && Number(row.targetSeconds) <= 10800
    && row.completed === (row.seconds === row.targetSeconds)
    && Date.parse(focus.completedAt) - Date.parse(focus.startedAt) >= Number(row.seconds) * 1000, 'Invalid shelter focus session')
  return { ...focus, id: row.id, seconds: row.seconds as number, targetSeconds: row.targetSeconds as number, completed: row.completed }
}
function parseDay(value: unknown, day: string): ShelterDay {
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(day), 'Invalid shelter day')
  if (value === null) return { day, sessions: 0, seconds: 0 }
  const row = record(value)
  integer(row.sessions as number); integer(row.seconds as number)
  requireValue(row.day === day && Number(row.seconds) >= Number(row.sessions), 'Invalid shelter daily summary')
  return { day, sessions: row.sessions as number, seconds: row.seconds as number }
}
async function commitOperation(store: FocusStore, userId: string, operation: ShelterOperation, fingerprint: string): Promise<Shelter> {
  const base = userPath(userId), path = shelterPath(userId)
  const receiptPath = `${base}/shelterOperations/${operation.id}`
  let session: ShelterSession | null = null
  if (operation.command.type === 'focus') {
    session = parseShelterSession({ ...operation.focus, ...operation.command, id: operation.id })
  } else requireValue(operation.focus === undefined, 'Unexpected focus metadata')
  const state = await store.transaction(async tx => {
    const [saved, receipt] = await Promise.all([tx.get(path), tx.get(receiptPath)])
    requireValue(saved !== null, 'Shelter has not been initialized')
    const current = parseShelter(saved)
    if (receipt !== null) {
      const row = record(receipt)
      integer(row.revision as number, 1)
      requireValue(row.id === operation.id && row.fingerprint === fingerprint && Number(row.revision) <= current.revision, 'Conflicting operation receipt')
      return current
    }
    requireValue(current.revision === operation.revision, 'Stale shelter revision')
    if (operation.command.type === 'language' && operation.command.language === current.language) return current
    const next = parseShelter(applyShelterCommand(current, operation.revision, operation.command))
    const day = session ? parseDay(await tx.get(`${base}/shelterDays/${dayKey(session.completedAt)}`), dayKey(session.completedAt)) : null
    tx.set(path, next)
    tx.set(receiptPath, { id: operation.id, revision: next.revision, fingerprint })
    if (session && day) {
      day.sessions += Number(session.completed); day.seconds += session.seconds
      parseDay(day, day.day)
      tx.set(`${base}/shelterDays/${day.day}`, day)
      tx.set(`${base}/shelterSessions/${session.id}`, session)
    }
    return next
  })
  remember(store, path, state)
  return structuredClone(state)
}
export function saveShelterOperation(store: FocusStore, userId: string, operation: ShelterOperation): Promise<Shelter> {
  userPath(userId)
  requireValue(uuid.test(operation.id), 'Invalid shelter operation ID'); integer(operation.revision)
  const fingerprint = canonical(operation)
  requireValue(fingerprint.length <= 16000, 'Operation is too large')
  // Capture the exact payload now so caller edits cannot change an in-flight command.
  const captured = JSON.parse(fingerprint) as ShelterOperation
  let operations = pending.get(store)
  if (!operations) { operations = new Map(); pending.set(store, operations) }
  const key = `${userId}:${operation.id}`, existing = operations.get(key)
  if (existing) {
    requireValue(existing.fingerprint === fingerprint, 'Conflicting pending operation ID')
    return existing.promise.then(state => structuredClone(state))
  }
  const promise = commitOperation(store, userId, captured, fingerprint).finally(() => operations.delete(key))
  operations.set(key, { fingerprint, promise })
  return promise.then(state => structuredClone(state))
}
export async function loadShelterSessions(store: FocusStore, userId: string, cursor?: Cursor | null) {
  const page = await store.list(`${userPath(userId)}/shelterSessions`, { field: 'completedAt', limit: 25, cursor })
  return { rows: page.rows.map(row => { const session = parseShelterSession(row.data); requireValue(session.id === row.id, 'Session ID mismatch'); return session }), cursor: page.rows.length === 25 ? page.cursor : null }
}
export async function loadShelterDays(store: FocusStore, userId: string, period: HistoryPeriod, now: number, cursor?: Cursor | null) {
  requireValue(period === 7 || period === 30 || period === 'all', 'Invalid history period')
  const range = historyRange(period, now), limit = period === 'all' ? 25 : period
  const page = await store.list(`${userPath(userId)}/shelterDays`, { field: 'day', limit, start: range.start ? dayKey(range.start) : undefined, end: dayKey(range.end), cursor: period === 'all' ? cursor : undefined })
  return { rows: page.rows.map(row => parseDay(row.data, row.id)), cursor: period === 'all' && page.rows.length === 25 ? page.cursor : null }
}
