import { lazy, Suspense, useState } from 'react'
import type { User } from 'firebase/auth'
import { Badge } from '@/components/ui/badge'
import { AuthPanel } from '@/components/auth-panel'
import { ScreenLayout } from '@/components/screen-layout'
import woodland from '@/assets/woodland.webp'

const FocusJourney = lazy(() => import('@/components/focus-journey').then(module => ({ default: module.FocusJourney })))

export default function App() {
  const [session, setSession] = useState<User | null>(null)
  return (
    <ScreenLayout><main className={`wilds-shell ${session ? 'wilds-playing' : 'wilds-landing'} text-[#f4eddc]`}>
      {!session && <img src={woodland} alt="" width="1536" height="1024" className="wilds-title-backdrop" decoding="async" />}
      <div className="mx-auto max-w-7xl">
        <header className="wilds-header flex flex-wrap items-center justify-between gap-4 pb-6">
          {session ? <span className="flex items-center gap-3 font-serif text-2xl tracking-wide"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="32" height="32" className="size-8" />Focuswilds</span>
            : <h1 className="wilds-title"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="64" height="64" /><span>Focuswilds</span></h1>}
          <Badge variant="outline" className="border-white/25 text-[#e8c782]">v{__APP_VERSION__}</Badge>
          <AuthPanel onSessionChange={setSession} />
        </header>
        {session && <Suspense fallback={<p role="status" className="py-10">Loading your journey…</p>}><FocusJourney key={session.uid} userId={session.uid} /></Suspense>}
      </div>
    </main></ScreenLayout>
  )
}
