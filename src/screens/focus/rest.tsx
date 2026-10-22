import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/button'
import { GameMenu } from '@/components/game-menu'
import { elapsedTime, formatFocusTime, type FocusRound } from '@/lib/focus-round'
import PageLoading from '@/screens/system/loading'
import AppRecovery from '@/screens/system/app-error'
import portrait from '@/assets/home-room-atlas.png'
import compact from '@/assets/home-room-compact-atlas.png'
import '@/assets/home-room.css'
import '../home.css'
import './active.css'
import './rest.css'

let artwork: Promise<unknown> | undefined
function loadArtwork() {
  return artwork ??= Promise.all([portrait, compact].map(async url => {
    const image = new Image(); image.src = url; await image.decode()
  })).catch(error => { artwork = undefined; throw error })
}

export default function RestPage({ round, now, recoverable = true, onAction, onFocus, onHome, onSignOut }: {
  round: FocusRound; now: number; recoverable?: boolean
  onAction: (action: 'pause' | 'resume' | 'finish') => void
  onFocus: () => void; onHome: () => void; onSignOut: () => void
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const heading = useRef<HTMLHeadingElement>(null)
  const menu = useRef<HTMLDialogElement>(null)
  const confirm = useRef<HTMLDialogElement>(null)
  const finished = round.status === 'finished'
  useEffect(() => {
    let active = true
    void loadArtwork().then(() => { if (active) setState('ready') }, () => { if (active) setState('error') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (state !== 'ready') return
    if (finished) { confirm.current?.close(); menu.current?.close() }
    heading.current?.focus({ preventScroll: true })
  }, [state, finished])
  const elapsed = elapsedTime(round, now)
  const clock = formatFocusTime(finished ? elapsed : Math.max(0, round.setup.minutes * 60_000 - elapsed + 999))
  if (state === 'loading') return <PageLoading message="Loading your room…"/>
  if (state === 'error') return <AppRecovery/>
  return <main className="focus-active rest-page content-column">
    <header><h1 ref={heading} tabIndex={-1}>{finished ? 'Break finished' : 'Take a break'}</h1><Button onClick={() => menu.current?.showModal()}>Menu</Button></header>
    <section className="focus-timer" aria-label="Break timer">
      <p className="focus-timer-label" role="status">{finished ? 'Time rested' : round.status === 'paused' ? 'Paused' : 'Time remaining'}</p>
      <p className="focus-clock" role="timer" aria-live="off">{clock}</p>
    </section>
    <div className="home-room pixel-frame" role="img" aria-label="Your black cat resting in the apartment."><div className="home-room-window"><div className="home-room-art"/></div></div>
    <p className="focus-round-note">A moment with your cat.</p>
    {!recoverable && <p role="alert">Keep this tab open. Reloads may lose this break.</p>}
    <div className="focus-actions">{finished ? <><Button onClick={onFocus}>Focus again</Button><Button onClick={onHome}>Back home</Button></> : <>
      <Button onClick={() => onAction(round.status === 'paused' ? 'resume' : 'pause')}>{round.status === 'paused' ? 'Resume' : 'Pause'}</Button>
      <Button onClick={() => confirm.current?.showModal()}>Finish break</Button>
    </>}</div>
    <dialog ref={confirm} className="game-menu focus-finish pixel-frame" aria-labelledby="finish-break-title" aria-describedby="finish-break-description">
      <h2 id="finish-break-title" tabIndex={-1} autoFocus>Finish break?</h2>
      <p id="finish-break-description">End this break now?</p>
      <Button onClick={() => confirm.current?.close()}>Go back</Button>
      <Button onClick={() => {
        if (!confirm.current?.open || finished) return
        confirm.current.close()
        onAction('finish')
      }}>Finish break</Button>
    </dialog>
    <GameMenu menu={menu} onSignOut={onSignOut}/>
  </main>
}
