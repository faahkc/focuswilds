import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export function GameWindow({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!open) return
    const dialog = ref.current
    const trigger = document.activeElement
    dialog?.showModal()
    return () => { dialog?.close(); if (trigger instanceof HTMLElement) trigger.focus() }
  }, [open])
  return <dialog ref={ref} className="wilds-window" aria-label={title} onCancel={onClose}>
    <header className="wilds-window-header"><h2 className="font-serif text-2xl">{title}</h2><Button variant="secondary" onClick={onClose} autoFocus aria-label={`Close ${title}`}>Close ×</Button></header>
    <div className="wilds-window-content" tabIndex={0}>{children}</div>
  </dialog>
}
