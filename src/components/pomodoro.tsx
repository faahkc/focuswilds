import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanionCard } from '@/components/companion-card'
import { DiscoveryJournal } from '@/components/discovery-journal'
import { FocusHistory } from '@/components/focus-history'
import { creatures, type DiscoveryJournal as Journal } from '@/lib/discoveries'
import { loadSelectedCompanion, saveSelectedCompanion, type CompanionId } from '@/lib/companion'
import { supabase } from '@/lib/supabase'
import { loadCompletedFocusCount, loadDiscoveryJournal, loadProgress, saveFocus } from '@/lib/focus-sessions'
import { advance, remaining, resetTimer, restoreTimer, todayBounds, toggleTimer, dailyGoalProgress, DAILY_FOCUS_GOAL, FOCUS_MS } from '@/lib/pomodoro'

export function Pomodoro({ userId }: { userId: string }) {
  const storageKey = `focuswilds:timer:${userId}`
  const [storageError, setStorageError] = useState('')
  const [timer, setTimer] = useState(() => {
    let raw = null
    try { raw = sessionStorage.getItem(storageKey) } catch { /* Storage status is reported by the persistence effect. */ }
    return advance(restoreTimer(raw, crypto.randomUUID()), Date.now())
  })
  const [now, setNow] = useState(Date.now)
  const [progress, setProgress] = useState<{ day: string; sessions: number; minutes: number; error: string } | null>(null)
  const [companion, setCompanion] = useState<{ sessions: number; error: string } | null>(null)
  const [journal, setJournal] = useState<{ data: Journal | null; error: string } | null>(null)
  const [selection, setSelection] = useState<{ value: CompanionId | null; error: string }>({ value: null, error: '' })
  const [savingSelection, setSavingSelection] = useState(false)
  const [selectionSaveError, setSelectionSaveError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [retry, setRetry] = useState(0)
  const { start, end } = todayBounds(now)
  const today = progress?.day === start ? progress : null
  const loadError = today?.error ?? ''
  const goal = today && !loadError ? dailyGoalProgress(today.sessions) : null

  useEffect(() => {
    const tick = () => {
      const timestamp = Date.now()
      setNow(timestamp)
      setTimer(current => advance(current, timestamp))
    }
    const sync = () => { tick(); setRefresh(value => value + 1) }
    const onVisible = () => { if (document.visibilityState === 'visible') sync() }
    const interval = window.setInterval(tick, 1000)
    window.addEventListener('focus', sync)
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(timer))
      // oxlint-disable-next-line react/set-state-in-effect -- Report the outcome of writing to external browser storage.
      setStorageError('')
    } catch {
      // oxlint-disable-next-line react/set-state-in-effect -- Storage failures must be visible before the user reloads.
      setStorageError('This browser cannot preserve your timer. Keep this page open until your focus session is saved.')
    }
  }, [storageKey, timer])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void (async () => {
      try {
        const result = await loadProgress(supabase!, userId, start, end)
        if (active) setProgress({ day: start, ...result, error: '' })
      } catch {
        if (active) setProgress({ day: start, sessions: 0, minutes: 0, error: 'Could not load today’s progress. Check your connection and database setup, then retry.' })
      }
    })()
    return () => { active = false }
  }, [userId, start, end, refresh])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void (async () => {
      try {
        const sessions = await loadCompletedFocusCount(supabase!, userId)
        if (active) setCompanion({ sessions, error: '' })
      } catch {
        if (active) setCompanion({ sessions: 0, error: 'Could not load your companion’s EXP. Please check your connection and retry.' })
      }
    })()
    return () => { active = false }
  }, [userId, refresh])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void (async () => {
      try {
        const data = await loadDiscoveryJournal(supabase!, userId)
        if (active) setJournal({ data, error: '' })
      } catch {
        if (active) setJournal({ data: null, error: 'Could not load your discoveries. Check your connection and retry.' })
      }
    })()
    return () => { active = false }
  }, [userId, refresh])

  useEffect(() => {
    if (!supabase || savingSelection) return
    let active = true
    void (async () => {
      try {
        const value = await loadSelectedCompanion(supabase!, userId)
        if (active) setSelection({ value, error: '' })
      } catch {
        if (active) setSelection(current => ({ ...current, error: 'Could not load your selected companion. Check your connection and reload the selection.' }))
      }
    })()
    return () => { active = false }
  }, [userId, refresh, savingSelection])

  async function selectCompanion(selected: CompanionId) {
    if (!supabase || savingSelection || selection.value === null) return
    if (selected !== 'moss' && !journal?.data?.encounters[creatures.findIndex(creature => creature.icon === selected)]) return
    setSavingSelection(true)
    setSelectionSaveError('')
    try {
      const value = await saveSelectedCompanion(supabase, userId, selected)
      setSelection({ value, error: '' })
    } catch {
      setSelectionSaveError('Could not confirm your selection was saved. Reload the selection or try choosing again when connected.')
    } finally {
      setSavingSelection(false)
    }
  }

  const pending = timer.pending
  useEffect(() => {
    if (!pending || !supabase) return
    let active = true
    void (async () => {
      try {
        await saveFocus(supabase!, userId, pending)
        if (active) {
          setSaveError('')
          setTimer(current => current.pending?.id === pending.id ? { ...current, pending: null } : current)
          setRefresh(value => value + 1)
        }
      } catch {
        if (active) setSaveError('Your completed session is waiting to save. Check your connection and account permissions, keep this tab open, and retry.')
      }
    })()
    return () => { active = false }
  }, [pending, userId, retry])

  const seconds = Math.ceil(remaining(timer, now) / 1000)
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  const isFocus = timer.phase === 'focus'

  function toggle() {
    const timestamp = Date.now()
    setNow(timestamp)
    const id = crypto.randomUUID()
    setTimer(current => toggleTimer(current, timestamp, id))
  }

  return (<>
    <section id="journey" aria-label="Focus timer" className="grid gap-6 py-12 sm:grid-cols-[2fr_1fr]">
      <Card className="border-white/15 bg-white/5 text-inherit">
        <CardHeader><CardTitle className="font-serif text-2xl">{isFocus ? 'Time to focus' : 'Rest at camp'}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <p className="text-[#c3cec1]">{isFocus ? 'One quiet stretch of work. Your journey starts here.' : 'Your focus session is complete. Stretch, get water, and rest.'}</p>
          <p role="timer" aria-label={`${isFocus ? 'Focus' : 'Break'} time remaining`} className="font-mono text-7xl tabular-nums sm:text-8xl">{time}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={toggle} disabled={isFocus && Boolean(pending)} className="bg-[#e8c782] text-[#14251f] hover:bg-[#f3dcae]">
              {timer.deadline !== null ? 'Pause' : `Start ${isFocus ? 'focus' : 'break'}`}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => {
              const timestamp = Date.now()
              setNow(timestamp)
              setTimer(current => resetTimer(current, timestamp))
            }}>Reset {isFocus ? 'focus' : 'break'}</Button>
          </div>
          <p className="text-sm text-[#c3cec1]">25 minutes of focus, then a 5-minute break. Each phase starts when you are ready. Reset discards unfinished time.</p>
          <p role="status" className="text-sm text-[#e8c782]">{pending ? (saveError ? 'One focus session is waiting to save.' : 'Saving your focus session…') : isFocus ? 'Only completed focus sessions count toward your progress.' : 'Focus complete. Your progress is saved.'}</p>
          {saveError && <div role="alert" className="space-y-3 text-sm text-[#ffc3ab]">
            <p>{saveError}</p>
            <Button variant="secondary" onClick={() => { setSaveError(''); setRetry(value => value + 1) }}>Retry save</Button>
          </div>}
          {storageError && <p role="alert" className="text-sm text-[#ffc3ab]">{storageError}</p>}
        </CardContent>
      </Card>
      <div className="space-y-6">
      <CompanionCard completedSessions={companion?.sessions ?? null} error={companion?.error ?? ''} onRetry={() => { setSelectionSaveError(''); setRefresh(value => value + 1) }}
        selected={selection.value} selectionError={selectionSaveError || selection.error} saving={savingSelection} onSelectMoss={() => void selectCompanion('moss')} />
      <Card className="border-white/15 bg-white/5 text-inherit">
        <CardHeader><CardTitle className="font-serif text-2xl">Today’s journey</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <dl className="space-y-5">
            <div><dt className="text-sm text-[#c3cec1]">Focus sessions</dt><dd className="mt-1 text-4xl">{today && !loadError ? today.sessions : '—'}</dd></div>
            <div><dt className="text-sm text-[#c3cec1]">Minutes focused</dt><dd className="mt-1 text-4xl">{today && !loadError ? today.minutes : '—'}</dd></div>
          </dl>
          <div className="space-y-2">
            <h2 className="font-serif text-xl">Daily goal</h2>
            <p className="text-sm text-[#c3cec1]">{DAILY_FOCUS_GOAL} focus sessions · {DAILY_FOCUS_GOAL * FOCUS_MS / 60000} minutes</p>
            {goal && <>
              <p className="text-sm">{goal.completed} / {DAILY_FOCUS_GOAL} saved focus sessions</p>
              <progress aria-label="Daily focus goal" value={goal.completed} max={DAILY_FOCUS_GOAL} className="h-3 w-full accent-[#e8c782]" />
              <p role="status" className="text-sm text-[#e8c782]">{goal.remaining === 0
                ? 'Daily goal complete. Well done! More focus is optional; rest when you need to.'
                : `${goal.remaining} more saved ${goal.remaining === 1 ? 'session' : 'sessions'} to reach today’s goal.`}</p>
            </>}
          </div>
          <p className="text-sm text-[#c3cec1]">Saved to your account. Today follows this device’s local timezone. Your active timer stays in this tab across reloads.</p>
          {!today && <p role="status" className="text-sm">Loading progress…</p>}
          {loadError && <p role="alert" className="text-sm text-[#ffc3ab]">{loadError}</p>}
          <Button variant="secondary" onClick={() => setRefresh(value => value + 1)}>Refresh progress</Button>
        </CardContent>
      </Card>
      </div>
    </section>
    <DiscoveryJournal journal={journal?.data ?? null} error={journal?.error ?? ''} onRetry={() => setRefresh(value => value + 1)}
      selected={selection.value} saving={savingSelection} onSelect={selected => void selectCompanion(selected)} />
    <FocusHistory userId={userId} todayStart={start} refresh={refresh} />
    </>
  )
}
