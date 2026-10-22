import { lazy, Suspense, useState } from 'react'
import PageLoading from '@/screens/system/loading'
import { useFocusRound } from './use-focus-round'
import { initialFocusSetup } from '@/lib/focus-setup'

const HomePage = lazy(() => import('@/screens/home'))
const FocusSetupPage = lazy(() => import('@/screens/focus/setup'))

const ActiveFocusPage = lazy(() => import('@/screens/focus/active'))

export default function OwnerGame({ onSignOut, preview = false }: { onSignOut: () => void; preview?: boolean }) {
  const timer = useFocusRound(!preview)
  const [screen, setScreen] = useState<'home' | 'setup'>('home')
  const [setup, setSetup] = useState(timer.round?.setup ?? initialFocusSetup)
  return <Suspense fallback={<PageLoading/>}>{timer.round ? <ActiveFocusPage round={timer.round} now={timer.now} recoverable={timer.recoverable} onAction={timer.action} onHome={() => { timer.close(); setScreen('home') }} onSignOut={() => { timer.action('pause'); onSignOut() }}/> : screen === 'home'
    ? <HomePage onSignOut={onSignOut} onStartFocus={() => setScreen('setup')}/>
    : <FocusSetupPage value={setup} onChange={setSetup} onBack={() => setScreen('home')} onStart={() => timer.start(setup)}/>}</Suspense>
}
