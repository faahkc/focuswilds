export const FOCUS_MS = 25 * 60 * 1000
export const BREAK_MS = 5 * 60 * 1000
export const DAILY_FOCUS_GOAL = 4

export function dailyGoalProgress(savedSessions: number) {
  return { completed: Math.min(savedSessions, DAILY_FOCUS_GOAL), remaining: Math.max(DAILY_FOCUS_GOAL - savedSessions, 0) }
}

export type CompletedFocus = { id: string; startedAt: string; completedAt: string }
export type Timer = {
  phase: 'focus' | 'break'
  remainingMs: number
  deadline: number | null
  id: string
  startedAt: string | null
  pending: CompletedFocus | null
}

export function newTimer(id: string): Timer {
  return { phase: 'focus', remainingMs: FOCUS_MS, deadline: null, id, startedAt: null, pending: null }
}

export function remaining(timer: Timer, now: number): number {
  return timer.deadline === null ? timer.remainingMs : Math.max(0, timer.deadline - now)
}

export function advance(timer: Timer, now: number): Timer {
  if (timer.deadline === null || remaining(timer, now) > 0) return timer
  if (timer.phase === 'focus') {
    return {
      ...timer, phase: 'break', remainingMs: BREAK_MS, deadline: null,
      pending: { id: timer.id, startedAt: timer.startedAt!, completedAt: new Date(timer.deadline).toISOString() },
    }
  }
  return { ...newTimer(timer.id), pending: timer.pending }
}

export function toggleTimer(timer: Timer, now: number, id: string): Timer {
  const next = advance(timer, now)
  if (next !== timer || (timer.phase === 'focus' && timer.pending)) return next
  return timer.deadline === null
    ? { ...timer, id: timer.startedAt === null && timer.phase === 'focus' ? id : timer.id,
      startedAt: timer.startedAt ?? new Date(now).toISOString(), deadline: now + timer.remainingMs }
    : { ...timer, remainingMs: remaining(timer, now), deadline: null }
}

export function resetTimer(timer: Timer, now: number): Timer {
  const next = advance(timer, now)
  return { ...next, remainingMs: next.phase === 'focus' ? FOCUS_MS : BREAK_MS, deadline: null, startedAt: null }
}

export function todayBounds(now: number) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function restoreTimer(raw: string | null, id: string): Timer {
  if (!raw) return newTimer(id)
  try {
    const timer = JSON.parse(raw) as Timer
    const duration = timer.phase === 'focus' ? FOCUS_MS : BREAK_MS
    if (!timer || !['focus', 'break'].includes(timer.phase) || !uuid.test(timer.id)
      || !Number.isFinite(timer.remainingMs) || timer.remainingMs <= 0 || timer.remainingMs > duration
      || (timer.deadline !== null && (!Number.isSafeInteger(timer.deadline) || timer.deadline < 0 || timer.deadline > 8640000000000000))
      || (timer.startedAt !== null && !isDate(timer.startedAt))
      || (timer.deadline !== null && timer.startedAt === null)
      || (timer.pending !== null && (!timer.pending || !uuid.test(timer.pending.id)
        || !isDate(timer.pending.completedAt) || !isDate(timer.pending.startedAt)
        || Date.parse(timer.pending.startedAt) > Date.parse(timer.pending.completedAt)))
      || (timer.phase === 'focus' && timer.pending && timer.deadline !== null)) return newTimer(id)
    return timer
  } catch {
    return newTimer(id)
  }
}
