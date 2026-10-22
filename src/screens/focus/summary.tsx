import { useEffect, useRef } from 'react'
import { Button } from '@/components/button'
import { formatFocusTime, type FocusRound } from '@/lib/focus-round'
import './summary.css'

export default function FocusSummaryPage({ round, recoverable = true, onHome }: {
  round: FocusRound; recoverable?: boolean; onHome: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  return <main className="focus-summary content-column">
    <header><h1 ref={heading} tabIndex={-1}>Well done</h1></header>
    <div className="focus-summary-content">
      <section className="focus-summary-time" aria-label="Time focused">
        {round.setup.title.trim() && <p className="focus-summary-task" role="region" aria-label="Task" tabIndex={0}>{round.setup.title.trim()}</p>}
        <p className="focus-summary-label">Time focused</p>
        <p className="focus-summary-clock">{formatFocusTime(round.elapsedMs)}</p>
      </section>
      <section className="focus-summary-results pixel-frame" aria-labelledby="results-title" aria-description="Rewards and city progress are coming soon.">
        <h2 id="results-title">Brought home</h2>
        <dl role="region" aria-label="Focus results" tabIndex={0}>{['Coins', 'Player XP', 'Items found', 'City walk'].map(label => <div key={label}>
          <dt>{label}</dt><dd aria-label="Not available yet">—</dd>
        </div>)}</dl>
      </section>
    </div>
    {!recoverable && <p className="focus-summary-warning" role="alert">Keep this tab open. Reloads may lose this round.</p>}
    <div className="focus-summary-actions">
      <Button disabled aria-description="Coming soon">Take a break</Button>
      <Button onClick={onHome}>Back home</Button>
    </div>
  </main>
}
