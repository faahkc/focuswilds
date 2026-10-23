import { useState, type RefObject } from 'react'
import { Button } from './button'
import { AppVersion } from './app-version'
import './game-menu.css'
import { FocusHistoryBrowser } from './focus-history-browser'
import type { LoadFocusHistory } from '@/lib/focus-history'

export function GameMenu({ menu, onSignOut, loadHistory }: { menu: RefObject<HTMLDialogElement | null>; onSignOut: () => void; loadHistory?: LoadFocusHistory }) {
  const [history, setHistory] = useState(false)
  return <dialog ref={menu} className={`game-menu pixel-frame${history ? ' history-menu' : ''}`} aria-label={history ? 'History' : 'Menu'} onClose={() => setHistory(false)}>
    {history && loadHistory ? <FocusHistoryBrowser load={loadHistory} onBack={() => { setHistory(false); requestAnimationFrame(() => { if (menu.current?.open) menu.current.querySelector<HTMLButtonElement>('[data-history]')?.focus() }) }}/>
    : <><h2 tabIndex={-1} autoFocus>Menu</h2>{loadHistory && <Button data-history onClick={() => setHistory(true)}>History</Button>}<Button onClick={onSignOut}>Sign out</Button>
    <Button onClick={() => menu.current?.close()}>Close</Button><AppVersion/></>}
  </dialog>
}
