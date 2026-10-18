import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { Badge } from '@/components/ui/badge'
import { AuthPanel } from '@/components/auth-panel'
import { ScreenLayout } from '@/components/screen-layout'
import { FortStage } from '@/components/fort-stage'
import type { Language } from '@/lib/shelter'
import { version } from '../package.json'

const ShelterJourney = lazy(() => import('@/components/shelter-journey').then(module => ({ default: module.ShelterJourney })))

export default function App() {
  const [session, setSession] = useState<User | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const handleSessionChange = useCallback((user: User | null) => {
    setLanguage('en')
    setSession(user)
  }, [])
  useEffect(() => {
    document.documentElement.lang = session ? language : 'en'
  }, [session, language])
  return (
    <ScreenLayout language={session ? language : 'en'}><main className={`wilds-shell ${session ? 'wilds-playing' : 'wilds-landing'} text-[#f4eddc]`}>
      {!session && <FortStage exterior/>}
      <div className="mx-auto max-w-7xl">
        <header className="wilds-header flex flex-wrap items-center justify-between gap-4 pb-6">
          {session ? <span className="flex items-center gap-3 font-serif text-2xl tracking-wide"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="32" height="32" className="size-8" />Focuswilds</span>
            : <h1 className="wilds-title"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="64" height="64" /><span>Focuswilds</span></h1>}
          <Badge variant="outline" className="border-white/25 text-[#e8c782]">v{version}</Badge>
          <AuthPanel onSessionChange={handleSessionChange} language={session ? language : 'en'} />
        </header>
        {session && <Suspense fallback={<p role="status" className="py-10">Loading your shelter…</p>}><ShelterJourney key={session.uid} userId={session.uid} onLanguageChange={setLanguage}/></Suspense>}
      </div>
    </main></ScreenLayout>
  )
}
