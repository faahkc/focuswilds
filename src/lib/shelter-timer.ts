import { DEFAULT_FOCUS_SECONDS, integer, requireValue } from './shelter.ts'
import { record } from './focus-data.ts'
import { parseShelterSession, type ShelterOperation } from './shelter-store.ts'

export type ShelterTimer = {
  id: string; targetSeconds: number; remainingMs: number; deadline: number | null
  startedAt: string | null; title: string; pending: ShelterOperation | null
}
export function newShelterTimer(id: string, targetSeconds = DEFAULT_FOCUS_SECONDS): ShelterTimer {
  integer(targetSeconds, 1); requireValue(targetSeconds <= 10800, 'Invalid focus duration')
  return { id, targetSeconds, remainingMs: targetSeconds * 1000, deadline: null, startedAt: null, title: 'Keep the fire', pending: null }
}
export const timerRemaining = (timer: ShelterTimer, now: number) => timer.deadline === null ? timer.remainingMs : Math.max(0, timer.deadline - now)
export function toggleShelterTimer(timer: ShelterTimer, now: number): ShelterTimer {
  requireValue(!timer.pending && timerRemaining(timer, now) > 0, 'Timer is waiting to save')
  return timer.deadline === null
    ? { ...timer, deadline: now + timer.remainingMs, startedAt: timer.startedAt ?? new Date(now).toISOString() }
    : { ...timer, deadline: null, remainingMs: timerRemaining(timer, now) }
}
export function finishShelterTimer(timer: ShelterTimer, now: number, revision: number): ShelterTimer {
  if (timer.pending) return timer
  const remainingMs = timerRemaining(timer, now)
  const seconds = Math.floor((timer.targetSeconds * 1000 - remainingMs) / 1000)
  if (!seconds) return newShelterTimer(timer.id, timer.targetSeconds)
  requireValue(timer.startedAt, 'Timer has not started')
  const completedAt = new Date(timer.deadline !== null && remainingMs === 0 ? timer.deadline : now).toISOString()
  return { ...timer, remainingMs, deadline: null, pending: {
    id: timer.id, revision,
    command: { type: 'focus', seconds, targetSeconds: timer.targetSeconds, completed: remainingMs === 0 },
    focus: { startedAt: timer.startedAt, completedAt, title: timer.title.trim() || 'Keep the fire' },
  } }
}
export function restoreShelterTimer(raw: string | null, id: string): ShelterTimer {
  if (!raw) return newShelterTimer(id)
  const row = record(JSON.parse(raw))
  requireValue(typeof row.id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(row.id), 'Invalid stored timer ID')
  integer(row.targetSeconds as number, 1); integer(row.remainingMs as number)
  requireValue(Number(row.targetSeconds) <= 10800 && Number(row.remainingMs) <= Number(row.targetSeconds) * 1000
    && typeof row.title === 'string' && [...row.title].length <= 120
    && (row.startedAt === null || typeof row.startedAt === 'string' && Number.isFinite(Date.parse(row.startedAt)))
    && (row.deadline === null || Number.isSafeInteger(row.deadline) && Number(row.deadline) > 0 && Number(row.deadline) <= 8640000000000000 && row.startedAt !== null), 'Invalid stored timer')
  if (row.pending !== null) {
    const operation = record(row.pending), command = record(operation.command)
    requireValue(operation.id === row.id && command.type === 'focus' && command.targetSeconds === row.targetSeconds && row.deadline === null, 'Invalid pending timer')
    integer(operation.revision as number)
    const session = parseShelterSession({ ...record(operation.focus), ...command, id: operation.id })
    requireValue(session.seconds === Math.floor((Number(row.targetSeconds) * 1000 - Number(row.remainingMs)) / 1000), 'Invalid pending duration')
  }
  return row as ShelterTimer
}
