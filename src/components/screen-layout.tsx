import { useSyncExternalStore, type ReactNode } from 'react'

function subscribe(notify: () => void) {
  window.addEventListener('resize', notify)
  window.screen.orientation?.addEventListener('change', notify)
  return () => {
    window.removeEventListener('resize', notify)
    window.screen.orientation?.removeEventListener('change', notify)
  }
}

function phoneLandscape() {
  const { width, height } = window.screen
  return window.matchMedia('(pointer: coarse)').matches && Math.min(width, height) <= 600 && width > height
}

export function ScreenLayout({ children }: { children: ReactNode }) {
  const rotate = useSyncExternalStore(subscribe, phoneLandscape, () => false)
  return <>
    <div inert={rotate} aria-hidden={rotate || undefined}>{children}</div>
    {rotate && <div role="alert" className="fixed inset-0 z-50 grid place-content-center gap-4 bg-[#0d1317] p-8 text-center text-[#eee5d0]">
      <p className="font-serif text-3xl">Turn back to the trail.</p>
      <p>Rotate your phone upright to continue.</p>
      <p className="text-sm text-[#c5c8bd]">Your timer keeps its place.</p>
    </div>}
  </>
}
