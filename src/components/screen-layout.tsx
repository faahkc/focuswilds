import type { ReactNode } from 'react'

export function ScreenLayout({ children }: { children: ReactNode }) {
  return <div className="landscape-screen">{children}</div>
}
