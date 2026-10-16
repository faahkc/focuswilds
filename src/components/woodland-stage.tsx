import { useEffect, useRef } from 'react'
import { PixelCompanion } from '@/components/pixel-companion'
import type { CompanionId } from '@/lib/companion'
import type { createWoodland } from '@/lib/woodland-renderer'
import woodland from '@/assets/woodland.webp'

export function WoodlandStage({ selected, evolved, moving, resting }: { selected: CompanionId; evolved: boolean; moving: boolean; resting: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const sprites = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof createWoodland> | null>(null)
  const state = useRef({ moving, resting })
  useEffect(() => {
    state.current = { moving, resting }
    controller.current?.update(moving, resting)
  }, [moving, resting])
  useEffect(() => {
    const urls: string[] = []
    let active = true
    void import('@/lib/woodland-renderer').then(({ createWoodland }) => {
      if (!active) return
      for (const svg of sprites.current!.querySelectorAll('svg')) {
        urls.push(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`)
      }
      controller.current = createWoodland(canvas.current!, woodland, urls, state.current.moving, state.current.resting)
    }).catch(() => {
      // Keep the accessible HTML scene when WebGL is unavailable.
      controller.current?.dispose()
      controller.current = null
    })
    return () => { active = false; controller.current?.dispose(); controller.current = null }
  }, [selected, evolved])
  return <div className="woodland-stage">
    <canvas ref={canvas} aria-hidden="true" />
    <div className="journey-traveler"><PixelCompanion selected={selected} evolved={evolved} /></div>
    <div ref={sprites} hidden aria-hidden="true">{([0, 1, 2, 1] as const).map((frame, index) => <PixelCompanion key={index} selected={selected} evolved={evolved} frame={frame} />)}</div>
  </div>
}
