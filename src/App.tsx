import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { Badge } from '@/components/ui/badge'
import { AuthPanel } from '@/components/auth-panel'
import { ScreenLayout } from '@/components/screen-layout'
import { PageLoading } from '@/components/page-loading'
import { TitleScene } from '@/components/title-scene'
import type { Language } from '@/lib/shelter'
import { version } from '../package.json'

const ShelterJourney = lazy(() => import('@/components/shelter-journey').then(module => ({ default: module.ShelterJourney })))

export default function App() {
  const [session, setSession] = useState<User | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [checkingSession, setCheckingSession] = useState(true)
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const handleSessionChange = useCallback((user: User | null) => {
    setCheckingSession(false)
    setLanguage('en')
    setSession(user)
  }, [])
  useEffect(() => {
    document.documentElement.lang = session ? language : 'en'
  }, [session, language])
  const loading = checkingSession || !session && sceneStatus === 'loading'
  return (
    <ScreenLayout language={session ? language : 'en'}><main className={`wilds-shell ${session ? 'wilds-playing' : 'wilds-landing'} text-[#f4eddc]`}>
      {!session && <TitleScene onStatusChange={setSceneStatus}/>}
      {loading && <PageLoading/>}
      <div className="mx-auto max-w-7xl" inert={loading} aria-hidden={loading || undefined}>
        <header className="wilds-header flex flex-wrap items-center justify-between gap-4 pb-6">
          {session ? <span className="flex items-center gap-3 font-serif text-2xl tracking-wide"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="32" height="32" className="size-8" />Focuswilds</span>
            : <h1 className="wilds-title">Focuswilds</h1>}
          <Badge variant="outline" className="border-white/25 text-[#e8c782]">v{version}</Badge>
          <AuthPanel onSessionChange={handleSessionChange} language={session ? language : 'en'} />
        </header>
        {session && <Suspense fallback={<PageLoading/>}><ShelterJourney key={session.uid} userId={session.uid} onLanguageChange={setLanguage}/></Suspense>}
      </div>
    </main></ScreenLayout>
  )
}
