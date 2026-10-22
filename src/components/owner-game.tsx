import { lazy, Suspense, useState } from 'react'
import PageLoading from '@/screens/system/loading'
import { useFocusRound } from './use-focus-round'
import { initialFocusSetup } from '@/lib/focus-setup'

const HomePage = lazy(() => import('@/screens/home'))
const FocusSetupPage = lazy(() => import('@/screens/focus/setup'))

const ActiveFocusPage = lazy(() => import('@/screens/focus/active'))
const FocusSummaryPage = lazy(() => import('@/screens/focus/summary'))

export default function OwnerGame({ onSignOut, preview = false }: { onSignOut: () => void; preview?: boolean }) {
  const timer = useFocusRound(!preview)
  const [screen, setScreen] = useState<'home' | 'setup'>('home')
  const [setup, setSetup] = useState(timer.round?.setup ?? initialFocusSetup)
  return <Suspense fallback={<PageLoading/>}>{timer.round?.status === 'finished'
    ? <FocusSummaryPage round={timer.round} recoverable={timer.recoverable} onHome={() => { timer.close(); setScreen('home') }}/>
    : timer.round ? <ActiveFocusPage round={timer.round} now={timer.now} recoverable={timer.recoverable} onAction={timer.action} onSignOut={() => { timer.action('pause'); onSignOut() }}/> : screen === 'home'
    ? <HomePage onSignOut={onSignOut} onStartFocus={() => setScreen('setup')}/>
    : <FocusSetupPage value={setup} onChange={setSetup} onBack={() => setScreen('home')} onStart={() => timer.start(setup)}/>}</Suspense>
}
