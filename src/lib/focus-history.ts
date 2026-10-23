import { restoreRound, type FocusRound } from './focus-round.ts'

export type FocusSaveResult = 'saved' | 'unavailable' | 'limited' | 'full' | 'invalid'
export type FocusSaveState = 'saving' | FocusSaveResult
export type SaveFocusRound = (round: FocusRound) => Promise<FocusSaveResult>
export const historyCapacity = 10000
export const historyRate = 60
export const historyPageSize = 25
export type HistoryCursor = { savedAt: string; id: string }
export type HistoryEntry = ReturnType<typeof historyRecord> & { savedAt: string }
export type HistoryPage = { entries: HistoryEntry[]; next: HistoryCursor | null }
export type LoadFocusHistory = (cursor?: HistoryCursor, refresh?: boolean) => Promise<HistoryPage>

export function validHistoryCursor(cursor: HistoryCursor) {
  return typeof cursor?.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cursor.id)
    && typeof cursor.savedAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(cursor.savedAt) && Number.isFinite(Date.parse(cursor.savedAt))
}

export function parseHistoryPage(raw: unknown, parent: string): HistoryPage {
  if (!Array.isArray(raw) || raw.length > historyPageSize + 1) throw new Error('Invalid history page')
  const entries: HistoryEntry[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object' || row.error) throw new Error('Invalid history result')
    if (!row.document) {
      if (typeof row.readTime !== 'string' || !Number.isFinite(Date.parse(row.readTime))) throw new Error('Invalid history metadata')
      continue
    }
    const { name, fields } = row.document
    const id = fields?.roundId?.stringValue
    const savedAt = fields?.savedAt?.timestampValue
    if (!validHistoryCursor({ id, savedAt }) || name !== `${parent}/focusRounds/${id}` || fields.schemaVersion?.integerValue !== '1') throw new Error('Invalid history receipt')
    for (const key of ['plannedMinutes', 'elapsedMs']) if (typeof fields[key]?.integerValue !== 'string' || !/^(0|[1-9]\d*)$/.test(fields[key].integerValue)) throw new Error('Invalid history duration')
    const record = historyRecord({ version: 1, id, setup: { title: fields.task?.stringValue, mode: fields.mode?.stringValue, minutes: Number(fields.plannedMinutes?.integerValue) },
      elapsedMs: Number(fields.elapsedMs?.integerValue), startedAt: null, status: 'finished',
    })
    if (record.completion !== fields.completion?.stringValue || entries.some(entry => entry.roundId === id)) throw new Error('Invalid history completion')
    entries.push({ ...record, savedAt })
  }
  if (entries.length > historyPageSize) throw new Error('History page too large')
  const last = entries.at(-1)
  return { entries, next: entries.length === historyPageSize && last ? { id: last.roundId, savedAt: last.savedAt } : null }
}

export function historyRecord(round: FocusRound) {
  const valid = restoreRound(JSON.stringify(round))
  if (!valid || valid.id !== round.id || valid.status !== 'finished' || !Number.isSafeInteger(valid.elapsedMs) || valid.setup.title.length > 10000) throw new Error('Invalid finished round')
  return { schemaVersion: 1, roundId: valid.id, task: valid.setup.title.trim(), mode: valid.setup.mode,
    plannedMinutes: valid.setup.minutes, elapsedMs: valid.elapsedMs,
    completion: valid.setup.mode === 'down' && valid.elapsedMs === valid.setup.minutes * 60000 ? 'completed' : 'ended',
  }
}
