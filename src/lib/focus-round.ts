import { durationError, titleError, type FocusSetup } from './focus-setup.ts'

export type FocusRound = {
  version: 1
  id: string
  setup: FocusSetup
  elapsedMs: number
  startedAt: number | null
  status: 'running' | 'paused' | 'finished'
}
export const roundStorageKey = 'focuswilds.focus-round.v1'
export const restStorageKey = 'focuswilds.rest-round.v1'
export const restPresets = [5, 10, 15]

export function startRest(minutes: number, now: number): FocusRound {
  if (!restPresets.includes(minutes)) throw new Error('Invalid rest duration')
  return startRound({ title: '', mode: 'down', minutes }, now)
}

export function startRound(setup: FocusSetup, now: number): FocusRound {
  if (!['down', 'up'].includes(setup.mode) || titleError(setup.title) || durationError(String(setup.minutes)) || !Number.isFinite(now) || now < 0) throw new Error('Invalid focus setup')
  return { version: 1, id: crypto.randomUUID(), setup: { ...setup }, elapsedMs: 0, startedAt: now, status: 'running' }
}

export function elapsedTime(round: FocusRound, now: number) {
  const elapsed = round.elapsedMs + (round.startedAt === null ? 0 : Math.max(0, now - round.startedAt))
  return round.setup.mode === 'down' ? Math.min(elapsed, round.setup.minutes * 60_000) : elapsed
}

export function changeRound(round: FocusRound, action: 'tick' | 'pause' | 'resume' | 'finish', now: number): FocusRound {
  if (round.status === 'finished') return round
  const elapsedMs = elapsedTime(round, now)
  if (action === 'finish' || (round.setup.mode === 'down' && elapsedMs >= round.setup.minutes * 60_000)) return { ...round, elapsedMs, startedAt: null, status: 'finished' }
  if (action === 'pause' && round.status === 'running') return { ...round, elapsedMs, startedAt: null, status: 'paused' }
  if (action === 'resume' && round.status === 'paused') return { ...round, startedAt: now, status: 'running' }
  return round
}

export function restoreRound(raw: string | null, phase: 'focus' | 'rest' = 'focus'): FocusRound | null {
  try {
    const value = JSON.parse(raw ?? 'null') as FocusRound
    if (!value || value.version !== 1 || !value.setup || typeof value.setup.title !== 'string' || !Number.isInteger(value.setup.minutes)) return null
    if (value.id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.id)) return null
    startRound(value.setup, 0)
    if (phase === 'rest') {
      startRest(value.setup.minutes, 0)
      if (value.setup.mode !== 'down' || value.setup.title !== '') return null
    }
    if (!Number.isFinite(value.elapsedMs) || value.elapsedMs < 0 || value.elapsedMs > Number.MAX_SAFE_INTEGER || !['running', 'paused', 'finished'].includes(value.status)) return null
    if (value.status === 'running' ? typeof value.startedAt !== 'number' || !Number.isFinite(value.startedAt) || value.startedAt < 0 : value.startedAt !== null) return null
    if (value.setup.mode === 'down' && value.elapsedMs > value.setup.minutes * 60_000) return null
    return { version: 1, id: value.id ?? crypto.randomUUID(), setup: { title: value.setup.title, mode: value.setup.mode, minutes: value.setup.minutes }, elapsedMs: value.elapsedMs, startedAt: value.startedAt, status: value.status }
  } catch { return null }
}

export function formatFocusTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const tail = String(seconds % 60).padStart(2, '0')
  return minutes < 60 ? `${String(minutes).padStart(2, '0')}:${tail}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${tail}`
}
