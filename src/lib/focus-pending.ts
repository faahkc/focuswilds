import { OWNER_UID } from './account.ts'
import { restoreRound, type FocusRound } from './focus-round.ts'

const prefix = `focuswilds.pending-focus.${OWNER_UID}.`
const capacity = 20

function keys() {
  return Object.keys(localStorage).filter(key => key.startsWith(prefix)).sort()
}

export function keepPendingFocus(round: FocusRound) {
  try {
    const key = prefix + round.id
    const value = JSON.stringify(round)
    const previous = localStorage.getItem(key)
    if (previous) return previous === value
    if (keys().length >= capacity) return false
    localStorage.setItem(key, value)
    return true
  } catch { return false }
}

export function restorePendingFocus(excludeId?: string): FocusRound | null {
  try {
    for (const key of keys().slice(0, capacity)) {
      const round = restoreRound(localStorage.getItem(key))
      if (round?.status === 'finished' && round.id !== excludeId && key === prefix + round.id) return round
    }
  } catch { /* The current tab can still recover through session storage. */ }
  return null
}

export function clearPendingFocus(round: FocusRound) {
  try {
    const key = prefix + round.id
    if (localStorage.getItem(key) === JSON.stringify(round)) localStorage.removeItem(key)
  } catch { /* A later retry checks the immutable cloud receipt. */ }
}
