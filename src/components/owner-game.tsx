import { lazy, Suspense, useState } from 'react'
import PageLoading from '@/screens/system/loading'
import { initialFocusSetup } from '@/lib/focus-setup'

const HomePage = lazy(() => import('@/screens/home'))
const FocusSetupPage = lazy(() => import('@/screens/focus/setup'))

export default function OwnerGame({ onSignOut }: { onSignOut: () => void }) {
  const [screen, setScreen] = useState<'home' | 'setup'>('home')
  const [setup, setSetup] = useState(initialFocusSetup)
  return <Suspense fallback={<PageLoading/>}>{screen === 'home'
    ? <HomePage onSignOut={onSignOut} onStartFocus={() => setScreen('setup')}/>
    : <FocusSetupPage value={setup} onChange={setSetup} onBack={() => setScreen('home')}/>}</Suspense>
}
