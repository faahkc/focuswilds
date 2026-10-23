import { useEffect, useRef } from 'react'
import { Button } from '@/components/button'
import { formatFocusTime } from '@/lib/focus-round'
import type { HistoryEntry } from '@/lib/focus-history'
import PageLoading from './system/loading'
import './history.css'

const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false })

export default function HistoryPage({ state = 'ready', entries = [], page = 1, hasPrevious = false, hasNext = false, onBack, onPrevious, onNext, onRetry, onRefresh }: {
  state?: 'loading' | 'ready' | 'error'; entries?: HistoryEntry[]; page?: number; hasPrevious?: boolean; hasNext?: boolean
  onBack?: () => void; onPrevious?: () => void; onNext?: () => void; onRetry?: () => void; onRefresh?: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => { if (state === 'ready') { list.current?.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }) } }, [state, page])
  return <section className="focus-history" aria-label="Focus history">
    <header><h2 ref={heading} tabIndex={-1} autoFocus>History</h2><Button onClick={onBack}>Back</Button></header>
    <div className="focus-history-body">
      {state === 'loading' ? <PageLoading message="Loading history…"/> : state === 'error' ? <div className="focus-history-message"><p className="message-copy" role="alert">Could not load history.</p><Button onClick={onRetry}>Try again</Button></div>
      : entries.length === 0 ? <p className="focus-history-empty message-copy" role="status">No rounds saved yet.</p>
      : <ol ref={list} tabIndex={0} role="region" aria-label="Saved focus rounds">{entries.map(entry => <li key={entry.roundId} className="pixel-frame">
        <p className="focus-history-task">{entry.task || 'Focus'}</p>
        <p>{formatFocusTime(entry.elapsedMs)} · {entry.mode === 'up' ? 'Count up' : entry.completion === 'completed' ? 'Completed' : 'Ended early'}</p>
        <time dateTime={entry.savedAt} aria-label={`Saved ${dateFormat.format(new Date(entry.savedAt))} at ${timeFormat.format(new Date(entry.savedAt))}, Bangkok time`}><span>{dateFormat.format(new Date(entry.savedAt))}</span><span>{timeFormat.format(new Date(entry.savedAt))}</span></time>
      </li>)}</ol>}
    </div>
    {state === 'ready' && <footer>
      {entries.length > 0 && <><p className="focus-history-page message-copy">Page {page} · Saved in Bangkok time</p><nav aria-label="History pages"><Button disabled={!hasPrevious} onClick={onPrevious}>Newer</Button><Button disabled={!hasNext} onClick={onNext}>Older</Button></nav></>}
      <Button onClick={onRefresh}>Refresh</Button>
    </footer>}
  </section>
}
