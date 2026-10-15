import { lazy, Suspense, useState } from 'react'
import type { User } from 'firebase/auth'
import { Badge } from '@/components/ui/badge'
import { AuthPanel } from '@/components/auth-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScreenLayout } from '@/components/screen-layout'
import { PixelCompanion } from '@/components/pixel-companion'

const FocusJourney = lazy(() => import('@/components/focus-journey').then(module => ({ default: module.FocusJourney })))

export default function App() {
  const [session, setSession] = useState<User | null>(null)
  return (
    <ScreenLayout><main className={`wilds-shell ${session ? 'wilds-playing' : 'wilds-landing'} text-[#f4eddc]`}>
      <div className="mx-auto max-w-7xl">
        <header className="wilds-header flex flex-wrap items-center justify-between gap-4 pb-6">
          <span className="flex items-center gap-3 font-serif text-2xl tracking-wide"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" width="32" height="32" className="size-8" />Focuswilds</span>
          <Badge variant="outline" className="border-white/25 text-[#e8c782]">v{__APP_VERSION__}</Badge>
          <AuthPanel onSessionChange={setSession} />
        </header>
        {session ? <Suspense fallback={<p role="status" className="py-10">Loading your journey…</p>}><FocusJourney key={session.uid} userId={session.uid} /></Suspense> : <>
        <section className="wilds-welcome">
          <div className="wilds-introduction">
          <p className="mb-6 text-xs tracking-[0.25em] text-[#e8c782] uppercase">A little focus. A new discovery.</p>
          <h1 className="font-serif text-5xl leading-tight sm:text-7xl">Your focus grows<br />a living world.</h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#c3cec1]">Follow quiet trails, meet curious companions, and make room for rest. A small adventure, one focused session at a time.</p>
          <Button className="mt-8 bg-[#e8c782] text-[#14251f] hover:bg-[#f3dcae]" nativeButton={false} render={<a href="#journey" />}>Discover the journey</Button>
          </div>
          <div className="wilds-emblem" aria-hidden="true">
            <span className="wilds-emblem-label">A light along the trail</span>
            <img src={`${import.meta.env.BASE_URL}app-icon.webp`} alt="" width="512" height="512" decoding="async" />
            <div className="wilds-party"><PixelCompanion selected="rabbit" /><PixelCompanion selected="moss" /><PixelCompanion selected="bird" /></div>
            <span className="wilds-emblem-label">Small steps. Wilder stories.</span>
          </div>
        </section>
        <section id="journey" aria-label="The journey ahead" className="wilds-chapters grid gap-5 scroll-mt-8 sm:grid-cols-3">
          <Card className="border-white/15 bg-white/5 text-inherit">
            <CardHeader><p className="wilds-kicker">I · The trail</p><CardTitle className="font-serif text-xl">Focus & explore</CardTitle></CardHeader>
            <CardContent className="leading-relaxed text-[#c3cec1]">Each stretch of focused work takes your companion farther into the wilds.</CardContent>
          </Card>
          <Card className="border-white/15 bg-white/5 text-inherit">
            <CardHeader><p className="wilds-kicker">II · The camp</p><CardTitle className="font-serif text-xl">Rest & reconnect</CardTitle></CardHeader>
            <CardContent className="leading-relaxed text-[#c3cec1]">Step away while your companion settles into camp. Discoveries can wait.</CardContent>
          </Card>
          <Card className="border-white/15 bg-white/5 text-inherit">
            <CardHeader><p className="wilds-kicker">III · The companions</p><CardTitle className="font-serif text-xl">Collect & grow</CardTitle></CardHeader>
            <CardContent className="leading-relaxed text-[#c3cec1]">Meet new creatures and watch your collection grow alongside your progress.</CardContent>
          </Card>
        </section>
        </>}
        {!session && <footer className="wilds-footer text-sm text-[#c3cec1]">One focused session at a time. Grow with your companion.</footer>}
      </div>
    </main></ScreenLayout>
  )
}
