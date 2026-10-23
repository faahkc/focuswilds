import { useCallback, useEffect, useRef, useState } from 'react'
import { changeRound, restoreRound, roundStorageKey, restStorageKey, startRound, startRest, type FocusRound } from '@/lib/focus-round'
import type { FocusSetup } from '@/lib/focus-setup'
import { keepPendingFocus, restorePendingFocus } from '@/lib/focus-pending'

export function useFocusRound(persist = true, phase: 'focus' | 'rest' = 'focus') {
  const storageKey = phase === 'rest' ? restStorageKey : roundStorageKey
  const [round, setRound] = useState(() => {
    if (!persist) return null
    let restored: FocusRound | null = null
    try {
      const raw = sessionStorage.getItem(storageKey)
      restored = restoreRound(raw, phase) ?? (phase === 'focus' ? restorePendingFocus() : null)
      // Persist recovered/legacy IDs before cloud acknowledgement can clear the pending journal.
      if (restored && raw !== JSON.stringify(restored)) sessionStorage.setItem(storageKey, JSON.stringify(restored))
      return restored
    }
    catch { return restored ?? (phase === 'focus' ? restorePendingFocus() : null) }
  })
  const current = useRef(round)
  const [now, setNow] = useState(Date.now)
  const [recoverable, setRecoverable] = useState(true)
  const replace = useCallback((next: FocusRound | null) => {
    const durable = !persist || phase !== 'focus' || next?.status !== 'finished' || keepPendingFocus(next)
    current.current = next
    setRound(next)
    try {
      if (!persist) return
      if (next) sessionStorage.setItem(storageKey, JSON.stringify(next))
      else sessionStorage.removeItem(storageKey)
      setRecoverable(durable)
    } catch { setRecoverable(false) }
  }, [persist, storageKey, phase])
  const action = useCallback((action: 'tick' | 'pause' | 'resume' | 'finish') => {
    const time = Date.now()
    setNow(time)
    if (current.current) {
      const next = changeRound(current.current, action, time)
      if (next !== current.current) replace(next)
    }
  }, [replace])
  useEffect(() => {
    const refresh = () => { if (!document.hidden) action('tick') }
    refresh()
    const interval = current.current?.status === 'running' ? window.setInterval(refresh, 250) : undefined
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', refresh)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('pageshow', refresh) }
    // Timer reads the synchronous ref so rapid actions cannot use an obsolete round.
  }, [round?.status, action])
  const start = useCallback((setup: FocusSetup) => {
    if (current.current) return
    const time = Date.now()
    setNow(time)
    replace(phase === 'rest' ? startRest(setup.minutes, time) : startRound(setup, time))
  }, [replace, phase])
  return { round, now, recoverable, action, start,
    close() { if (current.current?.status === 'finished') replace(persist && phase === 'focus' ? restorePendingFocus(current.current.id) : null) },
  }
}
