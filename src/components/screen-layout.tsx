import type { ReactNode } from 'react'

export function ScreenLayout({ children }: { children: ReactNode }) {
  return <div className="app-screen">{children}</div>
}
