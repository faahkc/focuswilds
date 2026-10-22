/* oxlint-disable react/only-export-components -- Preview fixtures export presentation cases. */
import { useFocusRound } from '@/components/use-focus-round'
import { useEffect, useState } from 'react'
import OwnerGame from '@/components/owner-game'
import PageLoading from '@/screens/system/loading'
import ActiveFocusPage from './active'
import FocusSummaryPage from './summary'
import RestPage from './rest'
import FocusSetupPage from './setup'
import { initialFocusSetup } from '@/lib/focus-setup'
import { startRound } from '@/lib/focus-round'

function LivePreview({ mode = 'down' }: { mode?: 'down' | 'up' }) {
  const timer = useFocusRound(false)
  const rest = useFocusRound(false, 'rest')
  const [home, setHome] = useState(false)
  const [setup, setSetup] = useState({ ...initialFocusSetup, mode })
  const [editing, setEditing] = useState(false)
  const { start } = timer
  useEffect(() => { start({ ...initialFocusSetup, mode }) }, [mode, start])
  if (home) return <OwnerGame preview onSignOut={() => {}}/>
  if (rest.round) return <RestPage round={rest.round} now={rest.now} onAction={rest.action} onFocus={() => { rest.close(); timer.close(); setEditing(true) }} onHome={() => { rest.close(); timer.close(); setHome(true) }} onSignOut={() => rest.action('pause')}/>
  if (editing) return <FocusSetupPage value={setup} onChange={setSetup} onBack={() => setHome(true)} onStart={() => { timer.start(setup); setEditing(false) }}/>
  if (timer.round?.status === 'finished') return <FocusSummaryPage round={timer.round} onRest={minutes => rest.start({ title: '', mode: 'down', minutes })} onHome={() => { timer.close(); setHome(true) }}/>
  return timer.round ? <ActiveFocusPage round={timer.round} now={timer.now} onAction={timer.action} onSignOut={() => {}}/> : <PageLoading/>
}
const base = startRound(initialFocusSetup, 1000)
const noop = () => {}
export default { Default: LivePreview, cases: {
  'Count up': () => <LivePreview mode="up"/>,
  'Paused': () => <ActiveFocusPage round={{ ...base, elapsedMs: 60_000, startedAt: null, status: 'paused' }} now={61_000} onAction={noop} onSignOut={noop}/>,
  'Long Thai task': () => <ActiveFocusPage round={{ ...base, setup: { ...base.setup, title: 'อ่านหนังสือและเตรียมงานให้เสร็จ '.repeat(3) } }} now={1000} onAction={noop} onSignOut={noop}/>,
  'Recovery unavailable': () => <ActiveFocusPage round={base} now={1000} recoverable={false} onAction={noop} onSignOut={noop}/>,
} }
