import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PixelCompanion } from '@/components/pixel-companion'
import { companionProgress, mossForm, type CompanionId } from '@/lib/companion'
import woodland from '@/assets/woodland.webp'

export function JourneyScene({ phase, running, selected, sessions }: { phase: 'focus' | 'break'; running: boolean; selected: CompanionId; sessions: number }) {
  const [motion, setMotion] = useState(true)
  const resting = phase === 'break'
  return <figure className={`journey-scene ${resting ? 'is-resting' : 'is-focusing'} ${running && motion ? 'is-moving' : ''}`}>
    <img src={woodland} width="1536" height="1024" alt="" loading="lazy" decoding="async" className="journey-landscape" />
    <div className="journey-shade" aria-hidden="true" />
    <div className="journey-mist" aria-hidden="true" />
    <div className="journey-traveler">
      <PixelCompanion selected={selected} evolved={mossForm(companionProgress(sessions).level).evolved} />
    </div>
    {resting && <div className="journey-fire" aria-hidden="true"><span /><span /></div>}
    <figcaption className="journey-caption">
      <div><p className="text-xs uppercase tracking-[.22em] text-[#ceb77f]">{resting ? 'The quiet camp' : 'The old woodland'}</p>
        <p className="mt-2 font-serif text-2xl sm:text-3xl">{resting ? 'Let the embers keep watch.' : 'A little farther into the wilds.'}</p>
        <p className="mt-2 text-sm text-[#c5c8bd]">{resting ? 'Rest here. The trail can wait.' : 'One task. One quiet stretch of trail.'}</p>
      </div>
      <Button variant="secondary" size="sm" aria-pressed={motion} onClick={() => setMotion(value => !value)} className="min-h-11 shrink-0 border border-white/20 bg-[#101619]/90 text-[#e6dfcc] hover:bg-[#29302c]">Motion {motion ? 'on' : 'off'}</Button>
    </figcaption>
  </figure>
}
