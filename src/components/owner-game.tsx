import { lazy, Suspense, useState } from 'react'
import PageLoading from '@/screens/system/loading'
import { useFocusRound } from './use-focus-round'
import { initialFocusSetup } from '@/lib/focus-setup'

const HomePage = lazy(() => import('@/screens/home'))
const FocusSetupPage = lazy(() => import('@/screens/focus/setup'))

const ActiveFocusPage = lazy(() => import('@/screens/focus/active'))
const FocusSummaryPage = lazy(() => import('@/screens/focus/summary'))
const RestPage = lazy(() => import('@/screens/focus/rest'))

export default function OwnerGame({ onSignOut, preview = false }: { onSignOut: () => void; preview?: boolean }) {
  const timer = useFocusRound(!preview)
  const rest = useFocusRound(!preview, 'rest')
  const [screen, setScreen] = useState<'home' | 'setup'>('home')
  const [setup, setSetup] = useState(timer.round?.setup ?? initialFocusSetup)
  function leaveRest(destination: 'home' | 'setup') { rest.close(); timer.close(); setScreen(destination) }
  return <Suspense fallback={<PageLoading/>}>{rest.round
    ? <RestPage round={rest.round} now={rest.now} recoverable={rest.recoverable} onAction={rest.action} onFocus={() => leaveRest('setup')} onHome={() => leaveRest('home')} onSignOut={() => { rest.action('pause'); onSignOut() }}/>
    : timer.round?.status === 'finished'
    ? <FocusSummaryPage round={timer.round} recoverable={timer.recoverable} onRest={minutes => rest.start({ title: '', mode: 'down', minutes })} onHome={() => { timer.close(); setScreen('home') }}/>
    : timer.round ? <ActiveFocusPage round={timer.round} now={timer.now} recoverable={timer.recoverable} onAction={timer.action} onSignOut={() => { timer.action('pause'); onSignOut() }}/> : screen === 'home'
    ? <HomePage onSignOut={onSignOut} onStartFocus={() => setScreen('setup')}/>
    : <FocusSetupPage value={setup} onChange={setSetup} onBack={() => setScreen('home')} onStart={() => timer.start(setup)}/>}</Suspense>
}
