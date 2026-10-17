import { todayBounds } from './account.ts'

export type HistoryPeriod = 7 | 30 | 'all'

export function historyRange(period: HistoryPeriod, now: number) {
  const { start, end } = todayBounds(now)
  if (period === 'all') return { start: null, end }
  const firstDay = new Date(start)
  firstDay.setUTCDate(firstDay.getUTCDate() - period + 1)
  return { start: firstDay.toISOString(), end }
}
