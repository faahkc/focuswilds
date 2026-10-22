import { useCallback, useEffect, useRef, useState } from 'react'
import { changeRound, restoreRound, roundStorageKey, startRound, type FocusRound } from '@/lib/focus-round'
import type { FocusSetup } from '@/lib/focus-setup'

export function useFocusRound(persist = true) {
  const [round, setRound] = useState(() => {
    try { return persist ? restoreRound(sessionStorage.getItem(roundStorageKey)) : null } catch { return null }
  })
  const current = useRef(round)
  const [now, setNow] = useState(Date.now)
  const [recoverable, setRecoverable] = useState(true)
  const replace = useCallback((next: FocusRound | null) => {
    current.current = next
    setRound(next)
    try {
      if (!persist) return
      if (next) sessionStorage.setItem(roundStorageKey, JSON.stringify(next))
      else sessionStorage.removeItem(roundStorageKey)
      setRecoverable(true)
    } catch { setRecoverable(false) }
  }, [persist])
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
    replace(startRound(setup, time))
  }, [replace])
  return { round, now, recoverable, action, start,
    close() { if (current.current?.status === 'finished') replace(null) },
  }
}
