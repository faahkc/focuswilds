import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanionCard } from '@/components/companion-card'
import { DiscoveryJournal } from '@/components/discovery-journal'
import { FocusHistory } from '@/components/focus-history'
import { JourneyScene } from '@/components/journey-scene'
import { GameWindow } from '@/components/game-window'
import { GameIcon } from '@/components/game-icon'
import { DEFAULT_FOCUS_TITLE, MAX_FOCUS_TITLE_LENGTH } from '@/lib/focus-title'
import { SOURCE_OWNER_ID, dayKey } from '@/lib/account'
import type { CompanionId } from '@/lib/companion'
import type { DayProgress, Profile } from '@/lib/focus-data'
import { focusStore } from '@/lib/firestore-store'
import { loadOverview, saveFocus, saveSelectedCompanion } from '@/lib/focus-sessions'
import { advance, remaining, resetTimer, restoreTimer, todayBounds, toggleTimer, dailyGoalProgress, DAILY_FOCUS_GOAL, FOCUS_MS } from '@/lib/pomodoro'

export function Pomodoro({ userId, initialOverview }: { userId: string; initialOverview: { profile: Profile; day: DayProgress } }) {
  const [activeWindow, setWindow] = useState<'companion' | 'journal' | 'history' | 'help' | null>(null)
  const [visitedWindows, setVisitedWindows] = useState<NonNullable<typeof activeWindow>[]>([])
  const storageKey = 'focuswilds:timer:' + userId
  const [storageError, setStorageError] = useState('')
  const [timer, setTimer] = useState(() => {
    let raw = null
    try { raw = sessionStorage.getItem(storageKey) ?? sessionStorage.getItem('focuswilds:timer:' + SOURCE_OWNER_ID) } catch { /* Report storage failures in the persistence effect. */ }
    return advance(restoreTimer(raw, crypto.randomUUID()), Date.now())
  })
  const [overview, setOverview] = useState(initialOverview)
  const [now, setNow] = useState(Date.now)
  const [loadError, setLoadError] = useState('')
  const [savingSelection, setSavingSelection] = useState(false)
  const [selectionSaveError, setSelectionSaveError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [retry, setRetry] = useState(0)
  const day = dayKey(now)
  const { start } = todayBounds(now)
  const previousLoad = useRef({ day: initialOverview.day.day, refresh: 0 })
  const loadVersion = useRef(0)
  const today = overview.day.day === day ? { sessions: overview.day.sessions, minutes: Math.floor(overview.day.seconds / 60) } : null
  const companion = { sessions: overview.profile.sessions, error: loadError }
  const journal = { data: { encounters: overview.profile.encounters, latest: overview.profile.latest }, error: loadError }
  const selection = { value: overview.profile.selected, error: loadError }
  const goal = today && !loadError ? dailyGoalProgress(today.sessions) : null

  useEffect(() => {
    const tick = () => {
      const timestamp = Date.now()
      setNow(timestamp)
      setTimer(current => advance(current, timestamp))
    }
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    const interval = window.setInterval(tick, 1000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(timer))
      // oxlint-disable-next-line react/set-state-in-effect -- Report the external storage write result.
      setStorageError('')
    } catch {
      // oxlint-disable-next-line react/set-state-in-effect -- Surface reload recovery failures.
      setStorageError('This browser cannot preserve your timer. Keep this page open until your focus session is saved.')
    }
  }, [storageKey, timer])

  useEffect(() => {
    if (previousLoad.current.day === day && previousLoad.current.refresh === refresh) return
    const version = ++loadVersion.current
    let active = true
    void loadOverview(focusStore, userId, day, true).then(value => {
      if (active && version === loadVersion.current) {
        if (!value.profile?.ready) throw new Error('Saved progress is not ready')
        previousLoad.current = { day, refresh }
        const profile = value.profile
        setOverview(current => ({ profile: profile.revision >= current.profile.revision ? profile : current.profile, day: value.day }))
        setLoadError('')
      }
    }).catch(() => { if (active && version === loadVersion.current) setLoadError('Could not refresh progress. Check your connection and retry.') })
    return () => { active = false }
  }, [userId, day, refresh])

  async function selectCompanion(selected: CompanionId) {
    if (savingSelection || selected === selection.value) return
    setSavingSelection(true)
    setSelectionSaveError('')
    try {
      const profile = await saveSelectedCompanion(focusStore, userId, selected)
      loadVersion.current += 1
      setOverview(current => ({ ...current, profile: profile.revision >= current.profile.revision ? profile : current.profile }))
    } catch {
      setSelectionSaveError('Could not confirm your selection was saved. Refresh progress or choose again when connected.')
    } finally { setSavingSelection(false) }
  }

  const pending = timer.pending
  useEffect(() => {
    if (!pending) return
    let active = true
    void saveFocus(focusStore, userId, pending).then(value => {
      if (active) {
        loadVersion.current += 1
        setOverview(current => ({
          profile: value.profile.revision >= current.profile.revision ? value.profile : current.profile,
          day: value.day.day === dayKey(Date.now()) && (current.day.day !== value.day.day || value.day.sessions >= current.day.sessions) ? value.day : current.day,
        }))
        setSaveError('')
        setTimer(current => current.pending?.id === pending.id ? { ...current, pending: null } : current)
        if (value.day.day !== dayKey(Date.now())) setRefresh(value => value + 1)
      }
    }).catch(() => { if (active) setSaveError('Your completed session is waiting to save. Keep this tab open, check your connection, and retry.') })
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
    <nav className="wilds-toolbar" aria-label="Journey menu"><div><p className="wilds-kicker">Your expedition</p><h1 className="font-serif text-2xl">Back to the wilds.</h1></div><div className="wilds-menu">
      {(['companion', 'journal', 'history', 'help'] as const).map(name => <Button key={name} variant="secondary" onClick={() => { setVisitedWindows(current => current.includes(name) ? current : [...current, name]); setWindow(name) }} aria-haspopup="dialog" aria-label={name === 'companion' ? 'Companion and progress' : name === 'journal' ? 'Creature journal' : name === 'history' ? 'Focus history' : 'Timer guide'} title={name === 'companion' ? 'Companion and progress' : name === 'journal' ? 'Creature journal' : name === 'history' ? 'Focus history' : 'Timer guide'}><GameIcon name={name} /><span className="wilds-menu-label">{name === 'companion' ? 'Companion' : name === 'journal' ? 'Creatures' : name === 'history' ? 'History' : 'Guide'}</span></Button>)}
    </div></nav>
    <div className="wilds-board">
    <JourneyScene phase={timer.phase} selected={selection.value} sessions={overview.profile.sessions} />
    <section id="journey" aria-label="Focus timer" className="wilds-panels">
      <Card className="wilds-timer border-white/15 bg-white/5 text-inherit">
        <CardHeader><CardTitle className="font-serif text-2xl">{isFocus ? 'Time to focus' : 'Rest at camp'}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <p className="wilds-timer-note text-[#c3cec1]">{isFocus ? 'One quiet stretch of work. Your journey starts here.' : 'Your focus session is complete. Stretch, get water, and rest.'}</p>
          {isFocus ? <div className="space-y-2">
            <label htmlFor="focus-title" className="block text-sm">What will you focus on?</label>
            <input id="focus-title" type="text" value={timer.title} maxLength={MAX_FOCUS_TITLE_LENGTH} placeholder={DEFAULT_FOCUS_TITLE}
              disabled={timer.startedAt !== null || Boolean(pending)}
              onChange={event => { const title = event.target.value; setTimer(current => ({ ...current, title })) }}
              aria-describedby="focus-title-hint" className="w-full rounded-lg border border-white/25 bg-[#14251f] px-3 py-2 text-base text-inherit focus-visible:outline-2 focus-visible:outline-[#e8c782] disabled:opacity-70" />
            <p id="focus-title-hint" className="sr-only">Optional, up to {MAX_FOCUS_TITLE_LENGTH} characters. Blank names use “{DEFAULT_FOCUS_TITLE}”. The name stays fixed once you start.</p>
          </div> : <p className="break-words text-sm text-[#e8c782]">Completed: {timer.title}</p>}
          <p role="timer" aria-label={`${isFocus ? 'Focus' : 'Break'} time remaining`} className="wilds-clock font-serif text-7xl tabular-nums sm:text-8xl">{time}</p>
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
          <p className="wilds-timer-note text-sm text-[#c3cec1]">25 minutes of focus, then a 5-minute break. Each phase starts when you are ready. Reset discards unfinished time.</p>
          <p role="status" className="text-sm text-[#e8c782]">{pending ? (saveError ? 'One focus session is waiting to save.' : 'Saving your focus session…') : isFocus ? 'Only completed focus sessions count toward your progress.' : 'Focus complete. Your progress is saved.'}</p>
          {saveError && <div role="alert" className="space-y-3 text-sm text-[#ffc3ab]">
            <p>{saveError}</p>
            <Button variant="secondary" onClick={() => { setSaveError(''); setRetry(value => value + 1) }}>Retry save</Button>
          </div>}
          {storageError && <p role="alert" className="text-sm text-[#ffc3ab]">{storageError}</p>}
        </CardContent>
      </Card>
    </section>
    </div>
    {visitedWindows.map(name => <GameWindow key={name} open={activeWindow === name} title={name === 'companion' ? 'Companion & progress' : name === 'journal' ? 'Creature journal' : name === 'history' ? 'Focus history' : 'Timer guide'} onClose={() => setWindow(null)}>
    {name === 'companion' && <>
      <div className="wilds-progress-panels">
      <CompanionCard completedSessions={companion?.sessions ?? null} error={companion?.error ?? ''} onRetry={() => { setSelectionSaveError(''); setRefresh(value => value + 1) }}
        selected={selection.value} selectionError={selectionSaveError || selection.error} saving={savingSelection} onSelectMoss={() => void selectCompanion('moss')} />
      <Card className="border-white/15 bg-white/5 text-inherit">
        <CardHeader><CardTitle className="font-serif text-2xl">Today’s journey</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <dl className="wilds-totals">
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
    </>}
    {name === 'journal' && <DiscoveryJournal journal={journal?.data ?? null} error={journal?.error ?? ''} onRetry={() => setRefresh(value => value + 1)}
      selected={selection.value} saving={savingSelection} onSelect={selected => void selectCompanion(selected)} />}
    {name === 'history' && <FocusHistory userId={userId} todayStart={start} profile={overview.profile} />}
    {name === 'help' && <div className="space-y-5"><p>25 minutes of focus, then a 5-minute break. Each phase starts when you are ready.</p><p>Pause keeps your remaining time. Reset discards unfinished time. Only completed focus sessions earn progress.</p><p>Give your session an optional name, up to {MAX_FOCUS_TITLE_LENGTH} characters. Blank names use “{DEFAULT_FOCUS_TITLE}”. The name stays fixed once you start.</p><p>Motion can be switched off in the scene. Your device’s reduced-motion setting is respected.</p></div>}
    </GameWindow>)}
    </>
  )
}
