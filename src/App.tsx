import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function App() {
  return (
    <main className="min-h-screen bg-[#14251f] px-6 py-10 text-[#f4eddc] sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/15 pb-6">
          <span className="font-serif text-2xl tracking-wide">Focuswilds</span>
          <Badge variant="outline" className="border-white/25 text-[#e8c782]">v{__APP_VERSION__}</Badge>
        </header>
        <section className="max-w-3xl py-20 sm:py-28">
          <p className="mb-6 text-xs tracking-[0.25em] text-[#e8c782] uppercase">A little focus. A new discovery.</p>
          <h1 className="font-serif text-5xl leading-tight sm:text-7xl">Your focus grows<br />a living world.</h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#c3cec1]">Follow quiet trails, meet curious companions, and make room for rest. A small adventure, one focused session at a time.</p>
          <Button className="mt-8 bg-[#e8c782] text-[#14251f] hover:bg-[#f3dcae]" render={<a href="#journey" />}>Discover the journey</Button>
        </section>
        <section id="journey" aria-label="The journey ahead" className="grid gap-4 scroll-mt-8 sm:grid-cols-3">
          <Card className="border-white/15 bg-white/5 text-inherit">
            <CardHeader><CardTitle className="font-serif text-xl">Focus & explore</CardTitle></CardHeader>
            <CardContent className="leading-relaxed text-[#c3cec1]">Each stretch of focused work takes your companion farther into the wilds.</CardContent>
          </Card>
          <Card className="border-white/15 bg-white/5 text-inherit">
            <CardHeader><CardTitle className="font-serif text-xl">Rest & reconnect</CardTitle></CardHeader>
            <CardContent className="leading-relaxed text-[#c3cec1]">Step away while your companion settles into camp. Discoveries can wait.</CardContent>
          </Card>
          <Card className="border-white/15 bg-white/5 text-inherit">
            <CardHeader><CardTitle className="font-serif text-xl">Collect & grow</CardTitle></CardHeader>
            <CardContent className="leading-relaxed text-[#c3cec1]">Meet new creatures and watch your collection grow alongside your progress.</CardContent>
          </Card>
        </section>
        <footer className="mt-16 border-t border-white/15 pt-6 text-sm text-[#c3cec1]">The adventure is taking shape. Gameplay and cloud saves are coming later.</footer>
      </div>
    </main>
  )
}
