import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadFocusHistory } from '@/lib/focus-sessions'
import type { HistoryPeriod } from '@/lib/history'
import { supabase } from '@/lib/supabase'

export function FocusHistory({ userId, todayStart, refresh }: { userId: string; todayStart: string; refresh: number }) {
  const [period, setPeriod] = useState<HistoryPeriod>(7)
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<{
    period: HistoryPeriod; day: string; result: Awaited<ReturnType<typeof loadFocusHistory>> | null; error: string
  } | null>(null)
  const current = state?.period === period && state.day === todayStart ? state : null

  useEffect(() => {
    if (!supabase) return
    let active = true
    void (async () => {
      try {
        const result = await loadFocusHistory(supabase!, userId, period, Date.parse(todayStart))
        if (active) setState({ period, day: todayStart, result, error: '' })
      } catch {
        if (active) setState({ period, day: todayStart, result: null, error: 'Could not load your focus history. Check your connection and retry.' })
      }
    })()
    return () => { active = false }
  }, [userId, period, todayStart, refresh, retry])

  return (
    <Card className="mt-6 border-white/15 bg-white/5 text-[#f4eddc]">
      <CardHeader><CardTitle className="font-serif text-2xl">Focus history</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div role="group" aria-label="History period" className="flex flex-wrap gap-3">
          {([7, 30, 'all'] as const).map(value => <Button key={value} variant={period === value ? 'default' : 'secondary'} aria-pressed={period === value} onClick={() => setPeriod(value)}>
            {value === 'all' ? 'All time' : `${value} days`}
          </Button>)}
        </div>
        <p className="text-sm text-[#c3cec1]">Periods include today and follow this device’s local timezone. Older records stay saved. Days without saved focus sessions are omitted.</p>
        {!current ? <p role="status">Loading history…</p> : current.error ? <div role="alert" className="space-y-3 text-[#ffc3ab]">
          <p>{current.error}</p><Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Retry history</Button>
        </div> : current.result && <>
          <p role="status" className="text-[#e8c782]">{current.result.sessions} saved focus sessions · {current.result.minutes} minutes in {period === 'all' ? 'all time' : `the last ${period} days`}</p>
          {current.result.days.length === 0 ? <p>No saved focus sessions in this period yet.</p> : <div role="region" aria-label="Daily focus history" tabIndex={0} className="max-h-96 overflow-auto rounded-lg border border-white/15">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Saved focus sessions and minutes by local completion date</caption>
              <thead><tr className="border-b border-white/15"><th scope="col" className="p-3">Date</th><th scope="col" className="p-3 text-right">Sessions</th><th scope="col" className="p-3 text-right">Minutes</th></tr></thead>
              <tbody>{current.result.days.map(day => <tr key={day.date} className="border-b border-white/10 last:border-0">
                <th scope="row" className="p-3 font-normal"><time dateTime={day.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></th>
                <td className="p-3 text-right tabular-nums">{day.sessions}</td><td className="p-3 text-right tabular-nums">{day.minutes}</td>
              </tr>)}</tbody>
            </table>
          </div>}
          {current.result.entries.length > 0 && <details className="rounded-lg border border-white/15 p-3">
            <summary className="cursor-pointer font-medium">View individual sessions</summary>
            <div role="region" aria-label="Individual focus sessions" tabIndex={0} className="mt-3 max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Focus session names, local completion times, and durations</caption>
                <thead><tr><th scope="col" className="p-3">Session</th><th scope="col" className="p-3">Completed</th><th scope="col" className="p-3 text-right">Minutes</th></tr></thead>
                <tbody>{current.result.entries.map(entry => <tr key={entry.id} className="border-t border-white/10">
                  <th scope="row" className="max-w-xs break-words p-3 font-normal">{entry.title}</th>
                  <td className="p-3"><time dateTime={entry.finished_at}>{new Date(entry.finished_at).toLocaleString()}</time></td>
                  <td className="p-3 text-right tabular-nums">{Math.floor(entry.duration_seconds / 60)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>}
        </>}
        <Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Refresh history</Button>
      </CardContent>
    </Card>
  )
}
