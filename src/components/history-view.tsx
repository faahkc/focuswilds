import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { focusStore } from '@/lib/firestore-store'
import { loadHistoryDays, loadSessionPage } from '@/lib/focus-sessions'
import type { Profile } from '@/lib/focus-data'
import type { HistoryPeriod } from '@/lib/history'

function HistoryContent({ userId, todayStart, period, profile }: { userId: string; todayStart: string; period: HistoryPeriod; profile: Profile }) {
  const [days, setDays] = useState<Awaited<ReturnType<typeof loadHistoryDays>> | null>(null)
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof loadSessionPage>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const now = Date.parse(todayStart)

  useEffect(() => {
    let active = true
    void loadHistoryDays(focusStore, userId, period, now).then(value => {
      if (active) setDays(value)
    }).catch(() => { if (active) setError('Could not load history. Check your connection and refresh history.') })
    return () => { active = false }
  }, [userId, period, now])

  async function moreDays() {
    if (busy || !days?.cursor) return
    setBusy(true)
    setError('')
    try {
      const page = await loadHistoryDays(focusStore, userId, period, now, days.cursor)
      setDays({ days: [...days.days, ...page.days], cursor: page.cursor })
    } catch { setError('Could not load more days. Your displayed history is unchanged; try again.') }
    finally { setBusy(false) }
  }

  async function moreSessions() {
    if (busy || (sessions && !sessions.cursor)) return
    setBusy(true)
    setError('')
    try {
      const page = await loadSessionPage(focusStore, userId, period, now, sessions?.cursor)
      setSessions({ entries: [...sessions?.entries ?? [], ...page.entries], cursor: page.cursor })
    } catch { setError('Could not load sessions. Your displayed history is unchanged; try again.') }
    finally { setBusy(false) }
  }

  const total = period === 'all' ? profile : days?.days.reduce((sum, day) => ({ sessions: sum.sessions + day.sessions, seconds: sum.seconds + day.seconds }), { sessions: 0, seconds: 0 })
  return <div className="space-y-4">
    {error && <p role="alert" className="text-[#ffc3ab]">{error}</p>}
    {!days ? <p role="status">{error ? 'History unavailable.' : 'Loading history…'}</p> : <>
      {total && <p role="status" className="text-[#e8c782]">{total.sessions} saved focus sessions · {Math.floor(total.seconds / 60)} minutes in {period === 'all' ? 'all time' : `the last ${period} days`}</p>}
      {days.days.length === 0 ? <p>No saved sessions in this period yet.</p> : <div role="region" aria-label="Daily focus history" tabIndex={0} className="max-h-96 overflow-auto rounded-lg border border-white/15">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Saved sessions by date in Thailand time</caption>
          <thead><tr><th scope="col" className="p-3">Date</th><th scope="col" className="p-3 text-right">Sessions</th><th scope="col" className="p-3 text-right">Minutes</th></tr></thead>
          <tbody>{days.days.map(day => <tr key={day.day} className="border-t border-white/10">
            <th scope="row" className="p-3 font-normal"><time dateTime={day.day}>{day.day}</time></th>
            <td className="p-3 text-right">{day.sessions}</td><td className="p-3 text-right">{Math.floor(day.seconds / 60)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {days.cursor && <Button disabled={busy} variant="secondary" onClick={() => void moreDays()}>Load older days</Button>}
      {sessions && <div role="region" aria-label="Individual focus sessions" tabIndex={0} className="max-h-96 overflow-auto rounded-lg border border-white/15">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Focus session names and completion times in Thailand time</caption>
          <thead><tr><th scope="col" className="p-3">Session</th><th scope="col" className="p-3">Completed</th><th scope="col" className="p-3 text-right">Minutes</th></tr></thead>
          <tbody>{sessions.entries.map(entry => <tr key={entry.id} className="border-t border-white/10">
            <th scope="row" className="max-w-xs break-words p-3 font-normal">{entry.title}</th>
            <td className="p-3"><time dateTime={entry.completedAt}>{new Date(entry.completedAt).toLocaleString('en', { timeZone: 'Asia/Bangkok' })}</time></td>
            <td className="p-3 text-right">{Math.floor(entry.seconds / 60)}</td>
          </tr>)}</tbody>
        </table>
        {sessions.entries.length === 0 && <p className="p-3">No sessions in this period.</p>}
      </div>}
      {(!sessions || sessions.cursor) && <Button disabled={busy} variant="secondary" onClick={() => void moreSessions()}>{busy ? 'Loading…' : sessions ? 'Load 25 more sessions' : 'View individual sessions'}</Button>}
      <p className="text-xs text-[#c3cec1]">History loads on demand. Refresh to include recent saves or changes from another device.</p>
    </>}
  </div>
}

export function HistoryView({ userId, todayStart, profile }: { userId: string; todayStart: string; profile: Profile }) {
  const [period, setPeriod] = useState<HistoryPeriod>(7)
  const [revision, setRevision] = useState(0)
  return <div className="space-y-5">
    <div role="group" aria-label="History period" className="flex flex-wrap gap-3">
      {([7, 30, 'all'] as const).map(value => <Button key={value} variant={period === value ? 'default' : 'secondary'} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value === 'all' ? 'All time' : `${value} days`}</Button>)}
    </div>
    <p className="text-sm text-[#c3cec1]">Periods include today in Thailand time (Asia/Bangkok). Older records stay saved. Days without saved sessions are omitted.</p>
    <HistoryContent key={`${period}:${todayStart}:${revision}`} userId={userId} todayStart={todayStart} period={period} profile={profile} />
    <Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Refresh history</Button>
  </div>
}
