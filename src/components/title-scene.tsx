import { useEffect, useRef, useState } from 'react'
import fallbackUrl from '@/assets/title-fallback.webp'

export function TitleScene() {
  const host = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    void import('@/lib/fort-renderer').then(({ createFortRenderer }) => {
      if (cancelled || !host.current) return
      dispose = createFortRenderer(host.current, setStatus)
    }).catch(() => { if (!cancelled) setStatus('fallback') })
    return () => { cancelled = true; dispose?.() }
  }, [])
  return <>
    <div ref={host} className={`title-scene title-scene-${status}`} aria-hidden="true">
      <img className="title-fallback-image" src={fallbackUrl} alt="" decoding="async"/>
    </div>
    {status === 'loading' && <p className="title-loading" role="status"><span className="wilds-loading-mark" aria-hidden="true"/>Preparing the shelter…</p>}
  </>
}
