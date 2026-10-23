import { lazy, Suspense, useState } from 'react'
import PageLoading from '@/screens/system/loading'
import { useFocusRound } from '@/hooks/use-focus-round'
import { initialFocusSetup } from '@/lib/focus-setup'
import type { SaveFocusRound, LoadFocusHistory } from '@/lib/focus-history'
import { useFocusHistory } from '@/hooks/use-focus-history'

const HomePage = lazy(() => import('@/screens/home'))
const FocusSetupPage = lazy(() => import('@/screens/focus/setup'))

const ActiveFocusPage = lazy(() => import('@/screens/focus/active'))
const FocusSummaryPage = lazy(() => import('@/screens/focus/summary'))
const RestPage = lazy(() => import('@/screens/focus/rest'))

export default function OwnerGame({ onSignOut, preview = false, onSaveRound, loadHistory }: { onSignOut: () => void; preview?: boolean; onSaveRound?: SaveFocusRound; loadHistory?: LoadFocusHistory }) {
  const timer = useFocusRound(!preview)
  const rest = useFocusRound(!preview, 'rest')
  const history = useFocusHistory(timer.round, preview ? undefined : onSaveRound)
  const [screen, setScreen] = useState<'home' | 'setup'>('home')
  const [setup, setSetup] = useState(timer.round?.setup ?? initialFocusSetup)
  function leaveRest(destination: 'home' | 'setup') { rest.close(); timer.close(); setScreen(destination) }
  return <Suspense fallback={<PageLoading/>}>{rest.round
    ? <RestPage round={rest.round} now={rest.now} recoverable={rest.recoverable} onAction={rest.action} loadHistory={loadHistory} onFocus={() => leaveRest('setup')} onHome={() => leaveRest('home')} onSignOut={() => { rest.action('pause'); onSignOut() }}/>
    : timer.round?.status === 'finished'
    ? <FocusSummaryPage round={timer.round} recoverable={timer.recoverable && history.retained} saveState={history.state} onRetry={() => void history.retry()} onRest={minutes => { if (history.state && history.state !== 'saved') return; rest.start({ title: '', mode: 'down', minutes }) }} onHome={() => { if (history.state && history.state !== 'saved') return; timer.close(); setScreen('home') }}/>
    : timer.round ? <ActiveFocusPage round={timer.round} now={timer.now} recoverable={timer.recoverable} onAction={timer.action} loadHistory={loadHistory} onSignOut={() => { timer.action('pause'); onSignOut() }}/> : screen === 'home'
    ? <HomePage onSignOut={onSignOut} loadHistory={loadHistory} onStartFocus={() => setScreen('setup')}/>
    : <FocusSetupPage value={setup} onChange={setSetup} onBack={() => setScreen('home')} onStart={() => timer.start(setup)}/>}</Suspense>
}
