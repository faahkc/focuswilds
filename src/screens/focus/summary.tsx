import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/button'
import { formatFocusTime, restPresets, type FocusRound } from '@/lib/focus-round'
import type { FocusSaveState } from '@/lib/focus-history'
import '@/components/game-menu.css'
import './summary.css'

export default function FocusSummaryPage({ round, recoverable = true, onHome, onRest, saveState, onRetry }: {
  round: FocusRound; recoverable?: boolean; onHome: () => void; onRest?: (minutes: number) => void; saveState?: FocusSaveState; onRetry?: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const restDialog = useRef<HTMLDialogElement>(null)
  const [minutes, setMinutes] = useState(5)
  const pending = saveState !== undefined && saveState !== 'saved'
  const saveMessage = saveState === 'saving' ? 'Saving your round…' : saveState === 'saved' ? 'Round saved.'
    : saveState === 'limited' ? 'History is busy. Try again shortly.'
    : saveState === 'full' ? 'History is full. Keep this round here.'
    : saveState === 'invalid' ? 'This round needs checking. Keep it here.'
    : 'Could not save. Your round is kept here.'
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  return <main className="focus-summary content-column">
    <header><h1 ref={heading} tabIndex={-1}>Well done</h1>{saveState === 'saved' && <p role="status">Round saved.</p>}</header>
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
    {!recoverable && saveState !== 'saved' && <p className="focus-summary-warning" role="alert">Keep this tab open. Reloads may lose this round.</p>}
    <div className="focus-summary-actions">
      {saveState && saveState !== 'saved' && <p className="focus-summary-save" role="status" aria-live="polite">{saveMessage}</p>}
      {pending && saveState !== 'saving' && onRetry && <Button onClick={onRetry}>Try again</Button>}
      {!pending && <>
        <Button disabled={!onRest} aria-description={!onRest ? 'Coming soon' : undefined} onClick={() => restDialog.current?.showModal()}>Take a break</Button>
        <Button onClick={onHome}>Back home</Button>
      </>}
    </div>
    <dialog ref={restDialog} className="game-menu pixel-frame" aria-labelledby="break-title">
      <h2 id="break-title" tabIndex={-1} autoFocus>Take a break</h2>
      <section className="break-duration" aria-labelledby="break-minutes-label">
        <p id="break-minutes-label">Break minutes</p>
        <div className="break-presets">{restPresets.map(value => <Button key={value} className={minutes === value ? 'pixel-frame' : ''} aria-pressed={minutes === value} aria-label={`${value} minutes`} onClick={() => setMinutes(value)}>{value}</Button>)}</div>
      </section>
      <Button onClick={() => {
        if (!restDialog.current?.open || !onRest || pending) return
        restDialog.current.close()
        onRest(minutes)
      }}>Start break</Button>
      <Button onClick={() => restDialog.current?.close()}>Go back</Button>
    </dialog>
  </main>
}
