import type { ReactNode } from 'react'
import { ToastHost } from './toast'

export function ScreenLayout({ children }: { children: ReactNode }) {
  return <div className="app-screen">{children}<ToastHost/></div>
}
