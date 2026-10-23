import { useEffect, useRef, useState } from 'react'
import HistoryPage from '@/screens/history'
import type { HistoryPage as Page, LoadFocusHistory } from '@/lib/focus-history'

export function FocusHistoryBrowser({ load, onBack }: { load: LoadFocusHistory; onBack: () => void }) {
  const [pages, setPages] = useState<Page[]>([])
  const [index, setIndex] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const busy = useRef(false)
  const mounted = useRef(false)
  const target = useRef({ index: 0, refresh: false })
  async function request(next: number, refresh = false) {
    if (busy.current || next < 0 || next > pages.length || (next > 0 && !pages[next - 1]?.next)) return
    if (pages[next] && !refresh) { setIndex(next); setState('ready'); return }
    busy.current = true
    target.current = { index: next, refresh }
    setState('loading')
    try {
      const result = await load(next === 0 ? undefined : pages[next - 1]?.next ?? undefined, refresh)
      if (mounted.current) { setPages([...pages.slice(0, next), result]); setIndex(next); setState('ready') }
    } catch { if (mounted.current) setState('error') }
    finally { busy.current = false }
  }
  useEffect(() => {
    mounted.current = true
    void request(0)
    return () => { mounted.current = false }
    // A menu visit keeps one loader; opening History again remounts this controller.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [])
  return <HistoryPage state={state} entries={pages[index]?.entries ?? []} page={index + 1}
    hasPrevious={index > 0} hasNext={!!pages[index]?.next}
    onPrevious={() => void request(index - 1)} onNext={() => void request(index + 1)}
    onRetry={() => void request(target.current.index, target.current.refresh)} onRefresh={() => void request(0, true)} onBack={onBack}/>
}
