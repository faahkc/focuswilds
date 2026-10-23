import { restoreRound, type FocusRound } from './focus-round.ts'

export type FocusSaveResult = 'saved' | 'unavailable' | 'limited' | 'full' | 'invalid'
export type FocusSaveState = 'saving' | FocusSaveResult
export type SaveFocusRound = (round: FocusRound) => Promise<FocusSaveResult>
export const historyCapacity = 10000
export const historyRate = 60

export function historyRecord(round: FocusRound) {
  const valid = restoreRound(JSON.stringify(round))
  if (!valid || valid.id !== round.id || valid.status !== 'finished' || !Number.isSafeInteger(valid.elapsedMs) || valid.setup.title.length > 10000) throw new Error('Invalid finished round')
  return { schemaVersion: 1, roundId: valid.id, task: valid.setup.title.trim(), mode: valid.setup.mode,
    plannedMinutes: valid.setup.minutes, elapsedMs: valid.elapsedMs,
    completion: valid.setup.mode === 'down' && valid.elapsedMs === valid.setup.minutes * 60000 ? 'completed' : 'ended',
  }
}
