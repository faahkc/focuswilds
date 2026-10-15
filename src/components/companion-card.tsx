import { Bird, Rabbit, Squirrel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { companionProgress, mossForm, MOSS_EVOLUTION_LEVEL, type CompanionId } from '@/lib/companion'
import { creatures } from '@/lib/discoveries'

const icons = { rabbit: Rabbit, bird: Bird, squirrel: Squirrel }

export function CompanionCard({ completedSessions, error, onRetry, selected, selectionError, saving, onSelectMoss }: {
  completedSessions: number | null
  error: string
  onRetry: () => void
  selected: CompanionId | null
  selectionError: string
  saving: boolean
  onSelectMoss: () => void
}) {
  const progress = completedSessions === null ? null : companionProgress(completedSessions)
  const form = progress && !error ? mossForm(progress.level) : null
  const creature = creatures.find(creature => creature.icon === selected)
  const Icon = creature ? icons[creature.icon] : null

  return (
    <Card className="border-white/15 bg-white/5 text-inherit">
      <CardHeader><CardTitle className="font-serif text-2xl">Your companion</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {selected === 'moss' && form ? <svg role="img" aria-label={form.evolved ? 'Mossgrove, a green woodland guardian with golden leaves and branching antlers' : 'Moss, a small green woodland companion with a leaf on its head'} viewBox="0 0 160 144" className="mx-auto h-32 w-36">
          <ellipse cx="80" cy="131" rx="49" ry="8" fill="#0e1c17" />
          <path d="M78 38C50 36 45 12 47 6c24 0 36 10 31 32Z" fill="#8fba75" />
          <path d="M80 38C80 15 102 8 119 14c-1 23-17 30-39 24Z" fill="#b7ce88" />
          <path d="M49 65 34 35c20-1 30 14 31 23m30 0c1-9 11-24 31-23l-15 30" fill="#719760" />
          {form.evolved && <g>
            <path d="M47 59 31 27m8 18L19 37m16-2 2-20m76 44 16-32m-8 18 20-8m-16-2-2-20" fill="none" stroke="#bd9a68" strokeWidth="6" strokeLinecap="round" />
            <path d="M34 29C15 28 13 13 18 9c17 1 23 10 16 20Zm92 0c19-1 21-16 16-20-17 1-23 10-16 20Z" fill="#e8c782" />
          </g>}
          <rect x={form.evolved ? 29 : 35} y="46" width={form.evolved ? 102 : 90} height="83" rx="38" fill={form.evolved ? '#6c9666' : '#8fba75'} />
          <ellipse cx="80" cy="99" rx="31" ry="25" fill="#dae3b1" />
          <circle cx="60" cy="79" r="4" fill="#14251f" />
          <circle cx="100" cy="79" r="4" fill="#14251f" />
          <path d="M73 91q7 9 14 0" fill="none" stroke="#14251f" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="49" cy="88" rx="7" ry="4" fill="#d7a58a" />
          <ellipse cx="111" cy="88" rx="7" ry="4" fill="#d7a58a" />
          {form.evolved && <path d="m55 113 13 8 12-5 12 5 13-8" fill="none" stroke="#e8c782" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        </svg> : Icon && creature ? <Icon role="img" aria-label={creature.name} className="mx-auto size-32" style={{ color: creature.color }} /> : null}
        <div className="text-center">
          <h2 className="font-serif text-2xl">{selected === 'moss' ? form?.name ?? 'Your companion' : creature?.name ?? 'Your companion'}</h2>
          <p className="text-sm text-[#c3cec1]">{selected === 'moss' ? form?.description : creature?.description}</p>
        </div>
        {selectionError ? <div role="alert" className="space-y-3 text-sm text-[#ffc3ab]"><p>{selectionError}</p><Button variant="secondary" disabled={saving} onClick={onRetry}>Reload selection</Button></div>
          : selected === null ? <p role="status" className="text-sm">Loading your selected companion…</p> : null}
        {saving && <p role="status" className="text-sm text-[#e8c782]">Saving your companion…</p>}
        {selected !== null && selected !== 'moss' && <Button variant="secondary" disabled={saving} onClick={onSelectMoss}>Travel with {form?.name ?? 'Moss'}</Button>}
        {error ? <div role="alert" className="space-y-3 text-sm text-[#ffc3ab]">
          <p>{error}</p>
          <Button variant="secondary" onClick={onRetry}>Retry companion</Button>
        </div> : progress ? <div className="space-y-2" role="status">
          <div className="flex justify-between gap-3"><span>Level {progress.level}</span><span>{progress.levelXp} / 100 EXP</span></div>
          <progress aria-label="Experience toward next level" value={progress.levelXp} max={100} className="h-3 w-full accent-[#e8c782]" />
          <p className="text-sm text-[#c3cec1]">{progress.totalXp} total EXP · {100 - progress.levelXp} EXP to Level {progress.level + 1}</p>
        </div> : <p role="status" className="text-sm text-[#c3cec1]">Loading your companion…</p>}
        {selected === 'moss' && form && progress && <p role="status" className="text-sm text-[#e8c782]">
          {form.evolved ? `Moss evolved into Mossgrove at Level ${MOSS_EVOLUTION_LEVEL}.`
            : `Moss evolves into Mossgrove at Level ${MOSS_EVOLUTION_LEVEL}. ${((MOSS_EVOLUTION_LEVEL - 1) * 100 - progress.totalXp) / 25} saved focus sessions to go.`}
        </p>}
        <p className="text-sm text-[#c3cec1]">Each saved focus session earns 25 EXP. Breaks and unfinished sessions earn none.</p>
        <p className="text-sm text-[#c3cec1]">Level and EXP belong to your journey and stay the same when you switch companions.</p>
      </CardContent>
    </Card>
  )
}
