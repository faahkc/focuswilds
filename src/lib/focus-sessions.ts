import { dayKey, userPath } from './account.ts'
import { creatures } from './discoveries.ts'
import { isCompanionId, type CompanionId } from './companion.ts'
import { addSession, parseDay, parseProfile, parseSession, type DayProgress, type FocusSession, type Profile } from './focus-data.ts'
import type { Cursor, FocusStore, Transaction } from './focus-store.ts'
import { historyRange, type HistoryPeriod } from './history.ts'
import type { CompletedFocus } from './pomodoro.ts'
import { normalizeFocusTitle } from './focus-title.ts'

export const PAGE_SIZE = 25
const progressPath = (userId: string) => `${userPath(userId)}/state/progress`

type Overview = { profile: Profile | null; day: DayProgress }
const overviews = new WeakMap<FocusStore, { key: string; promise: Promise<Overview> }>()

export function loadOverview(store: FocusStore, userId: string, day: string, refresh = false): Promise<Overview> {
  const base = userPath(userId)
  const key = `${base}:${day}`
  const cached = overviews.get(store)
  if (!refresh && cached?.key === key) return cached.promise
  const promise = Promise.all([store.get(progressPath(userId)), store.get(`${base}/days/${day}`)]).then(([profile, daily]) => ({
    profile: profile === null ? null : parseProfile(profile), day: parseDay(daily, day),
  })).catch(error => {
    if (overviews.get(store)?.promise === promise) overviews.delete(store)
    throw error
  })
  overviews.set(store, { key, promise })
  return promise
}

async function writeRows(tx: Transaction, base: string, profile: Profile, rows: FocusSession[]) {
  const stored = await Promise.all(rows.map(row => tx.get(`${base}/sessions/${row.id}`)))
  const fresh = rows.filter((row, index) => {
    if (stored[index] === null) return true
    if (JSON.stringify(parseSession(stored[index])) !== JSON.stringify(row)) throw new Error('Existing session conflicts with saved data')
    return false
  })
  const keys = [...new Set(rows.map(row => dayKey(row.completedAt)))]
  const daily = await Promise.all(keys.map(async key => parseDay(await tx.get(`${base}/days/${key}`), key)))
  const days = new Map(daily.map(day => [day.day, day]))
  for (const row of fresh) {
    const day = days.get(dayKey(row.completedAt))!
    addSession(profile, day, row)
    tx.set(`${base}/sessions/${row.id}`, row)
  }
  for (const key of new Set(fresh.map(row => dayKey(row.completedAt)))) tx.set(`${base}/days/${key}`, days.get(key)!)
  return { fresh: fresh.length, days }
}

const saving = new Map<string, { row: string; promise: Promise<Awaited<ReturnType<typeof saveCompleted>>> }>()
async function saveCompleted(store: FocusStore, userId: string, row: FocusSession) {
  const base = userPath(userId)
  const result = await store.transaction(async tx => {
    const profile = parseProfile(await tx.get(progressPath(userId)))
    if (!profile.ready) throw new Error('Saved progress is not ready')
    const result = await writeRows(tx, base, profile, [row])
    if (result.fresh) { profile.revision += 1; tx.set(progressPath(userId), profile) }
    return { profile, day: result.days.get(dayKey(row.completedAt))! }
  })
  overviews.delete(store)
  return result
}

export function saveFocus(store: FocusStore, userId: string, session: CompletedFocus) {
  userPath(userId)
  const row = parseSession({ ...session, title: normalizeFocusTitle(session.title), seconds: 1500 })
  const key = `${userId}:${row.id}`
  const existing = saving.get(key)
  if (existing) {
    if (existing.row !== JSON.stringify(row)) throw new Error('Conflicting pending session ID')
    return existing.promise
  }
  const promise = saveCompleted(store, userId, row).finally(() => saving.delete(key))
  saving.set(key, { row: JSON.stringify(row), promise })
  return promise
}

export async function saveSelectedCompanion(store: FocusStore, userId: string, selected: CompanionId) {
  if (!isCompanionId(selected)) throw new Error('Unknown companion')
  const result = await store.transaction(async tx => {
    const profile = parseProfile(await tx.get(progressPath(userId)))
    if (!profile.ready) throw new Error('Saved progress is not ready')
    if (selected !== 'moss' && !profile.encounters[creatures.findIndex(creature => creature.icon === selected)]) throw new Error('Companion has not been discovered')
    if (profile.selected !== selected) { profile.selected = selected; profile.revision += 1; tx.set(progressPath(userId), profile) }
    return profile
  })
  overviews.delete(store)
  return result
}

export async function loadHistoryDays(store: FocusStore, userId: string, period: HistoryPeriod, now: number, cursor?: Cursor | null) {
  const { start, end } = historyRange(period, now)
  const page = await store.list(`${userPath(userId)}/days`, {
    field: 'day', limit: period === 'all' ? PAGE_SIZE : period,
    start: start ? dayKey(start) : undefined, end: dayKey(end), cursor,
  })
  return { days: page.rows.map(row => parseDay(row.data, row.id)), cursor: page.rows.length === PAGE_SIZE && period === 'all' ? page.cursor : null }
}

export async function loadSessionPage(store: FocusStore, userId: string, period: HistoryPeriod, now: number, cursor?: Cursor | null) {
  const { start, end } = historyRange(period, now)
  const page = await store.list(`${userPath(userId)}/sessions`, { field: 'completedAt', limit: PAGE_SIZE, start: start ?? undefined, end, cursor })
  return { entries: page.rows.map(row => {
    const session = parseSession(row.data)
    if (session.id !== row.id) throw new Error('Invalid history session ID')
    return session
  }), cursor: page.rows.length === PAGE_SIZE ? page.cursor : null }
}
