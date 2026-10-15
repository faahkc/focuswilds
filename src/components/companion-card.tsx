import { PixelCompanion } from '@/components/pixel-companion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { companionProgress, mossForm, MOSS_EVOLUTION_LEVEL, type CompanionId } from '@/lib/companion'
import { creatures } from '@/lib/discoveries'

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

  return (
    <Card className="border-white/15 bg-white/5 text-inherit">
      <CardHeader><CardTitle className="font-serif text-2xl">Your companion</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {selected && (selected !== 'moss' || form) && <div className="mx-auto h-36 w-32"><PixelCompanion selected={selected} evolved={form?.evolved} /></div>}
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
