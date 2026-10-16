import { lazy, Suspense, useState } from 'react'
import type { User } from 'firebase/auth'
import { Badge } from '@/components/ui/badge'
import { AuthPanel } from '@/components/auth-panel'
import { Button } from '@/components/ui/button'
import { GameWindow } from '@/components/game-window'
import { useSceneMotion } from '@/lib/scene-motion'
import { ScreenLayout } from '@/components/screen-layout'
import { PixelCompanion } from '@/components/pixel-companion'

const FocusJourney = lazy(() => import('@/components/focus-journey').then(module => ({ default: module.FocusJourney })))

export default function App() {
  const [session, setSession] = useState<User | null>(null)
  const [guide, setGuide] = useState(false)
  const { moving, reduced, toggle } = useSceneMotion()
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
          <p className="mb-6 text-xs tracking-[0.25em] text-[#e8c782] uppercase">A quiet ritual in a restless world</p>
          <h1 className="font-serif text-5xl leading-tight sm:text-7xl">Keep a light<br /><span>in the dark.</span></h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#c3cec1]">One task. Twenty-five minutes. A companion at your side.<br className="hidden sm:block" /> Leave the noise behind and take the next step into the wilds.</p>
          <Button className="mt-8 bg-[#e8c782] text-[#14251f] hover:bg-[#f3dcae]" onClick={() => setGuide(true)}>How the journey works <span aria-hidden="true">↗</span></Button>
          <p className="wilds-signin-hint">Sign in above to return to your journey.</p>
          </div>
          <div className={`wilds-emblem ${moving ? 'is-moving' : ''}`}>
            <span className="wilds-emblem-label">The wilds are waiting</span>
            <div className="wilds-lantern-aura" aria-hidden="true" />
            <img src={`${import.meta.env.BASE_URL}app-icon.webp`} alt="" width="512" height="512" decoding="async" />
            <div className="wilds-party" aria-label="Your companions"><PixelCompanion selected="rabbit" /><PixelCompanion selected="moss" /><PixelCompanion selected="bird" /></div>
            <span className="wilds-emblem-label">You never walk alone</span>
            <Button variant="secondary" size="sm" className="wilds-landing-motion" aria-pressed={moving} disabled={reduced} onClick={toggle}>Motion {reduced ? 'reduced' : moving ? 'on' : 'off'}</Button>
          </div>
        </section>
        <section id="journey" aria-label="The journey ahead" className="wilds-chapters grid gap-5 scroll-mt-8 sm:grid-cols-3">
          <div><span className="wilds-chapter-number" aria-hidden="true">I</span><div><p className="wilds-kicker">25 minutes</p><h2 className="font-serif">Walk the trail</h2><p>Give one task your full attention.</p></div></div>
          <div><span className="wilds-chapter-number" aria-hidden="true">II</span><div><p className="wilds-kicker">5 minutes</p><h2 className="font-serif">Rest by the fire</h2><p>A moment of stillness. Then onward.</p></div></div>
          <div><span className="wilds-chapter-number" aria-hidden="true">III</span><div><p className="wilds-kicker">Every journey</p><h2 className="font-serif">Find the unexpected</h2><p>Meet creatures. Grow together.</p></div></div>
        </section>
        </>}
        {!session && <footer className="wilds-footer text-sm text-[#c3cec1]">A small light. A little farther.</footer>}
      </div>
    </main><GameWindow title="Your first steps" open={guide} onClose={() => setGuide(false)}><div className="space-y-5"><p>Sign in with your GitHub account to continue your saved journey.</p><p>Name one task and start a 25-minute focus session. Pause when needed; reset discards unfinished time.</p><p>Each completed focus session earns 25 EXP and one creature encounter. Then take a 5-minute rest by the fire.</p><p>Use the icons to open your companion, creature journal, history, or timer guide. Your timer keeps running while you look around.</p></div></GameWindow></ScreenLayout>
  )
}
