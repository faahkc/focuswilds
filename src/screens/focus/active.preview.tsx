/* oxlint-disable react/only-export-components -- Preview fixtures export presentation cases. */
import { useFocusRound } from '@/components/use-focus-round'
import { useEffect } from 'react'
import ActiveFocusPage from './active'
import { initialFocusSetup } from '@/lib/focus-setup'
import { startRound } from '@/lib/focus-round'

function LivePreview({ mode = 'down' }: { mode?: 'down' | 'up' }) {
  const timer = useFocusRound(false)
  const { start } = timer
  useEffect(() => { start({ ...initialFocusSetup, mode }) }, [mode, start])
  return timer.round ? <ActiveFocusPage round={timer.round} now={timer.now} onAction={timer.action} onHome={timer.close} onSignOut={() => {}}/> : null
}
const base = startRound(initialFocusSetup, 1000)
const noop = () => {}
export default { Default: LivePreview, cases: {
  'Count up': () => <LivePreview mode="up"/>,
  'Paused': () => <ActiveFocusPage round={{ ...base, elapsedMs: 60_000, startedAt: null, status: 'paused' }} now={61_000} onAction={noop} onHome={noop} onSignOut={noop}/>,
  'Finished': () => <ActiveFocusPage round={{ ...base, elapsedMs: 1_500_000, startedAt: null, status: 'finished' }} now={1_501_000} onAction={noop} onHome={noop} onSignOut={noop}/>,
  'Long Thai task': () => <ActiveFocusPage round={{ ...base, setup: { ...base.setup, title: 'อ่านหนังสือและเตรียมงานให้เสร็จ '.repeat(3) } }} now={1000} onAction={noop} onHome={noop} onSignOut={noop}/>,
  'Recovery unavailable': () => <ActiveFocusPage round={base} now={1000} recoverable={false} onAction={noop} onHome={noop} onSignOut={noop}/>,
} }
