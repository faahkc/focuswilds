/* oxlint-disable react/only-export-components -- Preview fixtures export presentation cases. */
import { useEffect } from 'react'
import { useFocusRound } from '@/components/use-focus-round'
import PageLoading from '@/screens/system/loading'
import { startRest } from '@/lib/focus-round'
import RestPage from './rest'

const noop = () => {}
const loadHistory = async () => ({ entries: [], next: null })
const base = startRest(5, 0)
function LiveRest() {
  const timer = useFocusRound(false, 'rest')
  const { start } = timer
  useEffect(() => { start({ title: '', mode: 'down', minutes: 5 }) }, [start])
  return timer.round ? <RestPage round={timer.round} now={timer.now} onAction={timer.action} onHome={noop} onFocus={noop} onSignOut={noop} loadHistory={loadHistory}/> : <PageLoading/>
}
export default { Default: LiveRest, cases: {
  'Paused': () => <RestPage round={{ ...base, status: 'paused', startedAt: null, elapsedMs: 60_000 }} now={60_000} onAction={noop} onHome={noop} onFocus={noop} onSignOut={noop} loadHistory={loadHistory}/>,
  'Finished': () => <RestPage round={{ ...base, status: 'finished', startedAt: null, elapsedMs: 300_000 }} now={300_000} onAction={noop} onHome={noop} onFocus={noop} onSignOut={noop} loadHistory={loadHistory}/>,
  'Recovery unavailable': () => <RestPage round={base} now={0} recoverable={false} onAction={noop} onHome={noop} onFocus={noop} onSignOut={noop} loadHistory={loadHistory}/>,
} }
