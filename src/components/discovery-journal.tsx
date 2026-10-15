import { Bird, Rabbit, Squirrel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { creatures, encounterIndex, type DiscoveryJournal as Journal } from '@/lib/discoveries'

const icons = { rabbit: Rabbit, bird: Bird, squirrel: Squirrel }

export function DiscoveryJournal({ journal, error, onRetry }: {
  journal: Journal | null
  error: string
  onRetry: () => void
}) {
  const latest = journal?.latest ? creatures[encounterIndex(journal.latest.id)] : null

  return (
    <Card className="border-white/15 bg-white/5 text-[#f4eddc]">
      <CardHeader><CardTitle className="font-serif text-2xl">Discovery journal</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <p className="text-[#c3cec1]">Each saved focus session reveals one woodland creature and adds it to your journal. Familiar faces may return.</p>
        {error ? <div role="alert" className="space-y-3 text-[#ffc3ab]">
          <p>{error}</p>
          <Button variant="secondary" onClick={onRetry}>Retry journal</Button>
        </div> : journal ? <>
          <div role="status" className="space-y-1 text-[#e8c782]">
            <p>{journal.encounters.filter(count => count > 0).length} / {creatures.length} species discovered</p>
            {latest && journal.latest ? <p>Latest encounter: {latest.name} · <time dateTime={journal.latest.finishedAt}>{new Date(journal.latest.finishedAt).toLocaleString()}</time></p>
              : <p>Finish your first focus session to discover who is waiting on the trail.</p>}
          </div>
          <ul aria-label="Discovered creatures" className="grid gap-4 sm:grid-cols-3">
            {creatures.map((creature, index) => {
              const count = journal.encounters[index]
              const Icon = icons[creature.icon]
              return <li key={creature.name} className="rounded-xl border border-white/15 p-5 text-center">
                {count > 0 ? <Icon aria-hidden="true" className="mx-auto mb-3 size-14" style={{ color: creature.color }} />
                  : <span aria-hidden="true" className="mb-3 block text-5xl text-[#c3cec1]">?</span>}
                <h2 className="font-serif text-xl">{count > 0 ? creature.name : 'Undiscovered'}</h2>
                <p className="mt-2 text-sm text-[#c3cec1]">{count > 0 ? creature.description : 'A new friend waits along the trail.'}</p>
                {count > 0 && <p className="mt-3 text-sm text-[#e8c782]">Encountered {count} {count === 1 ? 'time' : 'times'}</p>}
              </li>
            })}
          </ul>
        </> : <p role="status" className="text-[#c3cec1]">Loading your discoveries…</p>}
      </CardContent>
    </Card>
  )
}
