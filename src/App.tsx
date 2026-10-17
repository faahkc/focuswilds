import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { Badge } from '@/components/ui/badge'
import { AuthPanel } from '@/components/auth-panel'
import { ScreenLayout } from '@/components/screen-layout'
import woodland from '@/assets/woodland.webp'
import { FortStage } from '@/components/fort-stage'
import { Button } from '@/components/ui/button'
import type { Language } from '@/lib/shelter'

const FocusJourney = lazy(() => import('@/components/focus-journey').then(module => ({ default: module.FocusJourney })))
const ShelterJourney = lazy(() => import('@/components/shelter-journey').then(module => ({ default: module.ShelterJourney })))

export default function App() {
  const [session, setSession] = useState<User | null>(null)
  const [shelter, setShelter] = useState(() => window.location.hash === '#shelter')
  const [language, setLanguage] = useState<Language>('en')
  const handleSessionChange = useCallback((user: User | null) => {
    setLanguage('en')
    setSession(user)
  }, [])
  useEffect(() => {
    document.documentElement.lang = session && shelter ? language : 'en'
    document.title = session && shelter && language === 'th' ? 'Focuswilds — กองไฟสุดท้าย' : 'Focuswilds — The last hearth'
  }, [session, shelter, language])
  return (
    <ScreenLayout language={session && shelter ? language : 'en'}><main className={`wilds-shell ${session ? 'wilds-playing' : 'wilds-landing'} text-[#f4eddc]`}>
      {!session && <img src={woodland} alt="" width="1536" height="1024" className="wilds-title-backdrop" decoding="async" />}
      {!session && <FortStage exterior/>}
      <div className="mx-auto max-w-7xl">
        <header className="wilds-header flex flex-wrap items-center justify-between gap-4 pb-6">
          {session ? <span className="flex items-center gap-3 font-serif text-2xl tracking-wide"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="32" height="32" className="size-8" />Focuswilds</span>
            : <h1 className="wilds-title"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="64" height="64" /><span>Focuswilds</span></h1>}
          <Badge variant="outline" className="border-white/25 text-[#e8c782]">v{__APP_VERSION__}</Badge>
          {session && !shelter && <Button variant="secondary" onClick={() => { window.location.hash = 'shelter'; setShelter(true) }}>Enter the fort</Button>}
          <AuthPanel onSessionChange={handleSessionChange} language={session && shelter ? language : 'en'} />
        </header>
        {session && <Suspense fallback={<p role="status" className="py-10">Loading your journey…</p>}>{shelter
          ? <ShelterJourney key={session.uid} userId={session.uid} onLanguageChange={setLanguage} onLegacy={() => { window.location.hash = ''; setShelter(false) }}/>
          : <FocusJourney key={session.uid} userId={session.uid} />}</Suspense>}
      </div>
    </main></ScreenLayout>
  )
}
