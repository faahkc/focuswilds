import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/button'
import { GameMenu } from '@/components/game-menu'
import { elapsedTime, formatFocusTime, type FocusRound } from '@/lib/focus-round'
import PageLoading from '@/screens/system/loading'
import AppRecovery from '@/screens/system/app-error'
import portrait from '@/assets/city-walk-atlas.png'
import compact from '@/assets/city-walk-compact-atlas.png'
import player from '@/assets/player-walk-atlas.png'
import '@/assets/focus-city.css'
import './active.css'

let artwork: Promise<unknown> | undefined
function loadArtwork() {
  return artwork ??= Promise.all([portrait, compact, player].map(async url => {
    const image = new Image(); image.src = url; await image.decode()
  })).catch(error => { artwork = undefined; throw error })
}

export default function ActiveFocusPage({ round, now, recoverable = true, onAction, onHome, onSignOut }: {
  round: FocusRound; now: number; recoverable?: boolean
  onAction: (action: 'pause' | 'resume' | 'finish') => void; onHome: () => void; onSignOut: () => void
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const menu = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let active = true
    void loadArtwork().then(() => { if (active) setState('ready') }, () => { if (active) setState('error') })
    return () => { active = false }
  }, [])
  useEffect(() => { if (state === 'ready') heading.current?.focus({ preventScroll: true }) }, [state])
  const finished = round.status === 'finished'
  const elapsed = elapsedTime(round, now)
  const clock = formatFocusTime(!finished && round.setup.mode === 'down' ? Math.max(0, round.setup.minutes * 60_000 - elapsed + 999) : elapsed)
  if (state === 'loading') return <PageLoading message="Loading your walk…"/>
  if (state === 'error') return <AppRecovery/>
  return <main className="focus-active content-column" data-paused={round.status !== 'running'}>
    <header><h1 ref={heading} tabIndex={-1}>Focus</h1><Button onClick={() => menu.current?.showModal()}>Menu</Button></header>
    <section className="focus-timer" aria-label="Focus timer">
      <p className="focus-task" role="region" aria-label="Task" tabIndex={0}>{round.setup.title.trim() || 'Focus'}</p>
      <p className="focus-timer-label" role="status">{finished ? 'Time focused' : round.status === 'paused' ? 'Paused' : round.setup.mode === 'down' ? 'Time remaining' : 'Time focused'}</p>
      <p className="focus-clock" role="timer" aria-live="off">{clock}</p>
    </section>
    <div className="focus-city pixel-frame" role="img" aria-label="A quiet city street with a walking player, swaying leaves and a shop awning."><div className="focus-city-window"><div className="focus-city-art"><div className="focus-city-player"/></div></div></div>
    <p className="focus-round-note">{finished ? 'Round finished.' : 'One thing at a time.'}</p>
    {!recoverable && <p role="alert">Keep this tab open. Reloads may lose this round.</p>}
    <div className="focus-actions">{finished ? <Button onClick={onHome}>Back home</Button> : <><Button onClick={() => onAction(round.status === 'paused' ? 'resume' : 'pause')}>{round.status === 'paused' ? 'Resume' : 'Pause'}</Button><Button onClick={() => onAction('finish')}>Finish</Button></>}</div>
    <GameMenu menu={menu} onSignOut={onSignOut}/>
  </main>
}
