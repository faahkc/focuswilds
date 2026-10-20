import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/button'
import { AppVersion } from '@/components/app-version'
import PageLoading from './system/loading'
import AppRecovery from './system/app-error'
import portrait from '@/assets/home-room-atlas.png'
import compact from '@/assets/home-room-compact-atlas.png'
import '@/assets/home-room.css'
import './home.css'

let artwork: Promise<unknown> | undefined
function loadArtwork() {
  return artwork ??= Promise.all([portrait, compact].map(async url => {
    const image = new Image()
    image.src = url
    await image.decode()
  }))
}

export default function HomePage({ onSignOut }: { onSignOut: () => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const menu = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    let active = true
    void loadArtwork().then(() => { if (active) setState('ready') }, () => { if (active) setState('error') })
    return () => { active = false }
  }, [])

  if (state === 'loading') return <PageLoading message="Loading your home…"/>
  if (state === 'error') return <AppRecovery/>
  return <main className="home-page">
    <header className="home-header"><h1>Your home</h1><Button onClick={() => menu.current?.showModal()}>Menu</Button></header>
    <div className="home-stats" aria-label="Player progress"><span>Lv. 1</span><span>0 coins</span></div>
    <div className="home-room pixel-frame" role="img" aria-label="Your black cat resting on a rug in a warm apartment, with a city view through the window.">
      <div className="home-room-window"><div className="home-room-art"/></div>
    </div>
    <section className="home-cat pixel-frame" aria-label="Cats at home"><p>Your black cat</p><p className="home-cat-count">1 cat at home</p></section>
    <Button className="home-unavailable" disabled aria-description="Coming soon">Start focus</Button>
    <nav className="home-nav" aria-label="Game menus">
      <Button className="home-unavailable" disabled aria-description="Coming soon">Cats</Button>
      <Button className="home-unavailable" disabled aria-description="Coming soon">City</Button>
      <Button className="home-unavailable" disabled aria-description="Coming soon">Shop</Button>
    </nav>
    <dialog ref={menu} className="home-menu pixel-frame" aria-labelledby="home-menu-title">
      <h2 id="home-menu-title">Menu</h2>
      <Button onClick={onSignOut}>Sign out</Button>
      <Button onClick={() => menu.current?.close()}>Close</Button>
      <AppVersion/>
    </dialog>
  </main>
}
