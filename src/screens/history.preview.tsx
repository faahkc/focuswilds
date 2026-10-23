/* oxlint-disable react/only-export-components -- Isolated dialog fixtures for the preview catalog. */
import { useEffect, useRef } from 'react'
import HistoryPage from './history'
import { FocusHistoryBrowser } from '@/components/focus-history-browser'
import { historyRecord } from '@/lib/focus-history'
import { changeRound, startRound } from '@/lib/focus-round'
import { initialFocusSetup } from '@/lib/focus-setup'
import '@/components/game-menu.css'

const entries = Array.from({ length: 25 }, (_, i) => ({
  ...historyRecord(changeRound(startRound({ ...initialFocusSetup, title: i === 0 ? '' : `Reading ${i}`, mode: i === 1 ? 'up' : 'down' }, 0), 'finish', i === 2 ? 12000 : 1500000)),
  savedAt: new Date(Date.UTC(2026, 9, 23, 10, 30 - i)).toISOString(),
}))
function Preview({ state, empty = false, thai = false }: { state?: 'loading' | 'error'; empty?: boolean; thai?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} className="game-menu history-menu pixel-frame" aria-label="History">
    {state ? <HistoryPage state={state} onBack={() => dialog.current?.close()}/>
    : <FocusHistoryBrowser load={async cursor => ({ entries: empty ? [] : thai ? [{ ...entries[0], task: 'อ่านหนังสือและเตรียมงานให้เสร็จ '.repeat(3) }] : cursor ? entries.slice(0, 2) : entries,
      next: !empty && !thai && !cursor ? { id: entries[24].roundId, savedAt: entries[24].savedAt } : null,
    })} onBack={() => dialog.current?.close()}/>}
  </dialog>
}
export default { Default: Preview, cases: {
  'Empty history': () => <Preview empty/>,
  'Loading history': () => <Preview state="loading"/>,
  'History error': () => <Preview state="error"/>,
  'Long Thai task': () => <Preview thai/>,
} }
