import { todayBounds } from './pomodoro.ts'

export type HistoryPeriod = 7 | 30 | 'all'
export type HistorySession = { finished_at: string; duration_seconds: number }

export function historyRange(period: HistoryPeriod, now: number) {
  const { start, end } = todayBounds(now)
  if (period === 'all') return { start: null, end }
  const firstDay = new Date(start)
  firstDay.setDate(firstDay.getDate() - period + 1)
  return { start: firstDay.toISOString(), end }
}

export function summarizeHistory(rows: HistorySession[]) {
  const groups = new Map<string, { sessions: number; seconds: number }>()
  let seconds = 0
  for (const row of rows) {
    const date = new Date(row.finished_at)
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const group = groups.get(day) ?? { sessions: 0, seconds: 0 }
    group.sessions += 1
    group.seconds += row.duration_seconds
    groups.set(day, group)
    seconds += row.duration_seconds
  }
  return {
    sessions: rows.length,
    minutes: Math.floor(seconds / 60),
    days: [...groups].sort(([a], [b]) => b.localeCompare(a))
      .map(([date, group]) => ({ date, sessions: group.sessions, minutes: Math.floor(group.seconds / 60) })),
  }
}
