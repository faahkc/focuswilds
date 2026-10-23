import { useCallback, useEffect, useRef, useState } from 'react'
import type { FocusRound } from '@/lib/focus-round'
import type { FocusSaveState, SaveFocusRound } from '@/lib/focus-history'
import { clearPendingFocus, keepPendingFocus } from '@/lib/focus-pending'

export function useFocusHistory(round: FocusRound | null, save?: SaveFocusRound) {
  const [result, setResult] = useState<{ id: string; state: FocusSaveState } | null>(null)
  const [retained, setRetained] = useState(true)
  const busy = useRef(false)
  const retry = useCallback(async () => {
    if (!save || round?.status !== 'finished' || busy.current) return
    busy.current = true
    setRetained(keepPendingFocus(round))
    setResult({ id: round.id, state: 'saving' })
    try {
      const state = await save(round)
      if (state === 'saved') clearPendingFocus(round)
      setResult({ id: round.id, state })
    } catch { setResult({ id: round.id, state: 'unavailable' }) }
    finally { busy.current = false }
  }, [round, save])
  const attempted = useRef<string | null>(null)
  useEffect(() => {
    if (round?.status !== 'finished' || !save || attempted.current === round.id) return
    attempted.current = round.id
    void retry()
  }, [round, save, retry])
  return { state: !save ? undefined : result?.id === round?.id ? result?.state : 'saving' as FocusSaveState, retained, retry }
}
