import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
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
  const expanded = open && !disabled && options.length > 0
  const selected = options.findIndex(option => option.value === value)

  useEffect(() => {
    if (!expanded) return
    list.current?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [expanded])

  useEffect(() => {
    if (expanded) list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [expanded, active])

  function choose(index: number) {
    if (disabled || !options[index]) return
    setOpen(false)
    trigger.current?.focus()
    onChange(options[index].value)
  }

  function keyDown(event: KeyboardEvent) {
    if (disabled || !options.length) return
    const { key } = event
    if (key === 'Tab') { setOpen(false); return }
    if (key === 'Escape') {
      if (expanded) { event.preventDefault(); setOpen(false); trigger.current?.focus() }
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

  return <div className="pixel-select" ref={root} onKeyDown={keyDown} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <span id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="pixel-select-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-expanded={expanded} aria-invalid={invalid || undefined} aria-describedby={describedBy} disabled={disabled || !options.length} onClick={() => {
      setActive(Math.max(0, selected)); setOpen(!expanded)
    }}><span id={`${id}-value`}>{options[selected]?.label ?? 'Select…'}</span><span className="pixel-select-arrow" aria-hidden="true"/></button>
    {expanded && <div ref={list} id={`${id}-list`} className="pixel-select-options" role="listbox" aria-labelledby={`${id}-label`} tabIndex={-1} aria-activedescendant={options[active] ? `${id}-option-${active}` : undefined}>
      {options.map((option, index) => <button key={option.value} id={`${id}-option-${index}`} type="button" role="option" tabIndex={-1} aria-selected={option.value === value} data-active={index === active} onClick={() => choose(index)} onFocus={() => setActive(index)}>{option.label}</button>)}
    </div>}
  </div>
}
