import type { RefObject } from 'react'
import { Button } from './button'
import { AppVersion } from './app-version'
import './game-menu.css'

export function GameMenu({ menu, onSignOut }: { menu: RefObject<HTMLDialogElement | null>; onSignOut: () => void }) {
  return <dialog ref={menu} className="game-menu pixel-frame" aria-label="Menu">
    <h2>Menu</h2><Button onClick={onSignOut}>Sign out</Button>
    <Button onClick={() => menu.current?.close()}>Close</Button><AppVersion/>
  </dialog>
}
