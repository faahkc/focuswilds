import { useEffect, useRef, useState } from 'react'
import fallbackUrl from '@/assets/title-fallback.webp'

export function TitleScene({ onStatusChange }: { onStatusChange?: (status: 'loading' | 'ready' | 'fallback') => void } = {}) {
  const host = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  useEffect(() => {
    let cancelled = false
    let dispose: (() => void) | undefined
    const updateStatus = (value: 'loading' | 'ready' | 'fallback') => {
      if (cancelled) return
      setStatus(value)
      onStatusChange?.(value)
    }
    updateStatus('loading')
    void import('@/lib/fort-renderer').then(({ createFortRenderer }) => {
      if (cancelled || !host.current) return
      dispose = createFortRenderer(host.current, updateStatus)
    }).catch(() => updateStatus('fallback'))
    return () => { cancelled = true; dispose?.() }
  }, [onStatusChange])
  return <>
    <div ref={host} className={`title-scene title-scene-${status}`} aria-hidden="true">
      {status === 'fallback' && <img className="title-fallback-image" src={fallbackUrl} alt="" decoding="async"/>}
    </div>
    {status === 'fallback' && <p className="title-loading" role="status">Scene animation could not load. You can still sign in.</p>}
  </>
}
