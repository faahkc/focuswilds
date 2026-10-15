import { isCompanionId, type CompanionId } from './companion.ts'
import { encounterIndex } from './discoveries.ts'
import { normalizeFocusTitle } from './focus-title.ts'

export type FocusSession = { id: string; title: string; startedAt: string; completedAt: string; seconds: number }
export type DayProgress = { day: string; sessions: number; seconds: number }
export type Profile = {
  version: 1; revision: number; ready: boolean; sessions: number; seconds: number; encounters: number[]
  latest: { id: string; finishedAt: string } | null; selected: CompanionId
  migration: { fingerprint: string; processed: number; total: number } | null
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved data')
  return value as Record<string, unknown>
}

export function parseSession(value: unknown): FocusSession {
  const row = record(value)
  if (typeof row.id !== 'string' || !uuid.test(row.id) || !date(row.startedAt) || !date(row.completedAt)
    || Date.parse(row.startedAt) > Date.parse(row.completedAt) || !count(row.seconds) || row.seconds < 60 || row.seconds > 10800
    || typeof row.title !== 'string' || [...row.title].length > 120 || !row.title.trim()) throw new Error('Invalid focus session')
  return { id: row.id.toLowerCase(), title: normalizeFocusTitle(row.title), startedAt: new Date(row.startedAt).toISOString(), completedAt: new Date(row.completedAt).toISOString(), seconds: row.seconds }
}


export function parseProfile(value: unknown): Profile {
  const row = record(value)
  if (row.version !== 1 || !count(row.revision) || typeof row.ready !== 'boolean' || !count(row.sessions) || !count(row.seconds)
    || !Array.isArray(row.encounters) || row.encounters.length !== 3 || !row.encounters.every(count)
    || row.encounters.reduce((a, b) => a + b, 0) !== row.sessions || !isCompanionId(row.selected)) throw new Error('Invalid progress summary')
  if (row.selected !== 'moss' && !row.encounters[['rabbit', 'bird', 'squirrel'].indexOf(row.selected)]) throw new Error('Selected companion has not been discovered')
  if (row.latest !== null) {
    const latest = record(row.latest)
    if (typeof latest.id !== 'string' || !uuid.test(latest.id) || !date(latest.finishedAt)) throw new Error('Invalid latest discovery')
  }
  if ((row.sessions === 0) !== (row.latest === null)) throw new Error('Invalid latest discovery')
  if (row.seconds < row.sessions * 60 || row.seconds > row.sessions * 10800) throw new Error('Invalid summary duration')
  if (row.migration !== null) {
    const migration = record(row.migration)
    if (typeof migration.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(migration.fingerprint)
      || !count(migration.processed) || !count(migration.total) || migration.processed > migration.total
      || row.ready !== (migration.processed === migration.total)) throw new Error('Invalid import state')
  }
  return row as Profile
}

export function parseDay(value: unknown, day: string): DayProgress {
  if (value === null) return { day, sessions: 0, seconds: 0 }
  const row = record(value)
  if (row.day !== day || !count(row.sessions) || !count(row.seconds)
    || row.seconds < row.sessions * 60 || row.seconds > row.sessions * 10800) throw new Error('Invalid daily summary')
  return { day, sessions: row.sessions, seconds: row.seconds }
}

export function addSession(profile: Profile, day: DayProgress, row: FocusSession) {
  profile.sessions += 1
  profile.seconds += row.seconds
  profile.encounters[encounterIndex(row.id)] += 1
  if (!profile.latest || row.completedAt > profile.latest.finishedAt
    || (row.completedAt === profile.latest.finishedAt && row.id < profile.latest.id)) profile.latest = { id: row.id, finishedAt: row.completedAt }
  day.sessions += 1
  day.seconds += row.seconds
}
