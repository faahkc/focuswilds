import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/button'
import { GameMenu } from '@/components/game-menu'
import { RoundRecoveryWarning } from '@/components/round-recovery-warning'
import type { LoadFocusHistory } from '@/lib/focus-history'
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

export default function ActiveFocusPage({ round, now, recoverable = true, onAction, onSignOut, loadHistory }: {
  round: FocusRound; now: number; recoverable?: boolean
  onAction: (action: 'pause' | 'resume' | 'finish') => void; onSignOut: () => void; loadHistory?: LoadFocusHistory
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const menu = useRef<HTMLDialogElement>(null)
  const finishDialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let active = true
    void loadArtwork().then(() => { if (active) setState('ready') }, () => { if (active) setState('error') })
    return () => { active = false }
  }, [])
  useEffect(() => { if (state === 'ready') heading.current?.focus({ preventScroll: true }) }, [state])
  const finished = round.status === 'finished'
  useEffect(() => {
    if (finished && finishDialog.current?.open) {
      finishDialog.current.close()
      heading.current?.focus({ preventScroll: true })
    }
  }, [finished])
  const elapsed = elapsedTime(round, now)
  const clock = formatFocusTime(!finished && round.setup.mode === 'down' ? Math.max(0, round.setup.minutes * 60_000 - elapsed + 999) : elapsed)
  if (state === 'loading') return <PageLoading message="Loading your walk…"/>
  if (state === 'error') return <AppRecovery/>
  return <main className="focus-active content-column" data-paused={round.status !== 'running'}>
    <header><h1 ref={heading} tabIndex={-1}>Focus</h1><Button onClick={() => menu.current?.showModal()}>Menu</Button></header>
    <section className="focus-timer" aria-label="Focus timer">
      {round.setup.title.trim() && <p className="focus-task" role="region" aria-label="Task" tabIndex={0}>{round.setup.title.trim()}</p>}
      <p className="focus-timer-label" role="status">{finished ? 'Time focused' : round.status === 'paused' ? 'Paused' : round.setup.mode === 'down' ? 'Time remaining' : 'Time focused'}</p>
      <p className="focus-clock" role="timer" aria-live="off">{clock}</p>
    </section>
    <div className="focus-city pixel-frame" role="img" aria-label="A quiet city street with a walking player, swaying leaves and a shop awning."><div className="focus-city-window"><div className="focus-city-art"><div className="focus-city-player"/></div></div></div>
    {recoverable ? <p className="focus-round-note">One thing at a time.</p> : <RoundRecoveryWarning/>}
    <div className="focus-actions"><Button onClick={() => onAction(round.status === 'paused' ? 'resume' : 'pause')}>{round.status === 'paused' ? 'Resume' : 'Pause'}</Button><Button onClick={() => finishDialog.current?.showModal()}>Finish</Button></div>
    <dialog ref={finishDialog} className="game-menu focus-finish pixel-frame" aria-labelledby="finish-title" aria-describedby="finish-description">
      <h2 id="finish-title" tabIndex={-1} autoFocus>Finish round?</h2>
      <p id="finish-description">End this focus round now?</p>
      <Button onClick={() => finishDialog.current?.close()}>Go back</Button>
      <Button onClick={() => {
        if (!finishDialog.current?.open || finished) return
        finishDialog.current.close()
        onAction('finish')
        heading.current?.focus({ preventScroll: true })
      }}>Finish round</Button>
    </dialog>
    <GameMenu menu={menu} onSignOut={onSignOut} loadHistory={loadHistory}/>
  </main>
}
