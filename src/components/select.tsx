import { useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import '../form-controls.css'

type SelectProps = {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

export function Select({ label, value, options, onChange, disabled = false, invalid = false, describedBy }: SelectProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const search = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<CSSProperties>({})
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)
  const expanded = open && !disabled && options.length > 0
  const selected = options.findIndex(option => option.value === value)

  useLayoutEffect(() => {
    if (root.current) setPortalTarget(root.current.closest('.app-screen') ?? root.current.ownerDocument.body)
    if (!expanded) return
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - 8
      const above = rect.top - 8
      const upwards = below < 180 && above > below
      setPosition({ left: rect.left, width: rect.width, maxHeight: Math.max(0, Math.min(240, upwards ? above - 8 : below - 8)), ...(upwards ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    list.current?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !list.current?.parentElement?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [expanded])

  useEffect(() => {
    const menu = list.current
    const option = menu?.children[active]
    if (!expanded || !menu || !option) return
    const bounds = menu.getBoundingClientRect()
    const item = option.getBoundingClientRect()
    // Scroll only the options, never the page or its containing dialog.
    if (item.top < bounds.top + 6) menu.scrollTop -= bounds.top + 6 - item.top
    else if (item.bottom > bounds.bottom - 6) menu.scrollTop += item.bottom - bounds.bottom + 6
  }, [expanded, active])

  function choose(index: number) {
    if (disabled || !options[index]) return
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
    onChange(options[index].value)
  }

  function keyDown(event: KeyboardEvent) {
    if (disabled || !options.length) return
    const { key } = event
    if (key === 'Tab') {
      if (expanded) { trigger.current?.focus({ preventScroll: true }); if (event.shiftKey) event.preventDefault() }
      setOpen(false); return
    }
    if (key === 'Escape') {
      if (expanded) { event.preventDefault(); setOpen(false); trigger.current?.focus({ preventScroll: true }) }
      return
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      if (expanded) choose(active)
      else { setActive(Math.max(0, selected)); setOpen(true) }
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault()
      setActive(key === 'Home' ? 0 : key === 'End' ? options.length - 1 : !expanded ? Math.max(0, selected) : (active + (key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
      setOpen(true)
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const now = event.timeStamp
      search.current = { text: (now - search.current.time < 700 ? search.current.text : '') + key.toLocaleLowerCase(), time: now }
      const index = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(search.current.text))
      if (index >= 0) { setActive(index); setOpen(true) }
    }
  }

  function blur(event: FocusEvent) {
    if (!root.current?.contains(event.relatedTarget) && !list.current?.contains(event.relatedTarget)) setOpen(false)
  }

  const popup = expanded && <div className="pixel-frame pixel-select-popup" style={position} onPointerDown={event => { if (event.target === event.currentTarget) event.preventDefault() }}><div ref={list} id={`${id}-list`} className="pixel-select-options" role="listbox" aria-labelledby={`${id}-label`} tabIndex={-1} aria-activedescendant={options[active] ? `${id}-option-${active}` : undefined} onKeyDown={event => { event.stopPropagation(); keyDown(event) }} onBlur={blur}>
    {options.map((option, index) => <button key={option.value} id={`${id}-option-${index}`} type="button" role="option" tabIndex={-1} aria-selected={option.value === value} data-active={index === active} onClick={() => choose(index)} onFocus={() => setActive(index)}><span>{option.label}</span><span className="pixel-choice-mark" aria-hidden="true">{option.value === value ? '✓' : ''}</span></button>)}
  </div></div>

  return <div className="pixel-select" ref={root} onKeyDown={keyDown} onBlur={blur}>
    <span id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="pixel-frame pixel-select-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-expanded={expanded} aria-invalid={invalid || undefined} aria-describedby={describedBy} disabled={disabled || !options.length} onClick={() => {
      setActive(Math.max(0, selected)); setOpen(!expanded)
    }}><span id={`${id}-value`}>{options[selected]?.label ?? 'Select…'}</span><span className="pixel-select-arrow" aria-hidden="true"/></button>
    {portalTarget && popup ? createPortal(popup, portalTarget) : popup}
  </div>
}
