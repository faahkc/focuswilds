import { useId, useRef, useState } from 'react'
import { Input } from './input'
import { GameKeyboard } from './game-keyboard'

type GameInputProps = {
  label: string
  optional?: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
  numeric?: boolean
  disabled?: boolean
  readOnly?: boolean
  search?: boolean
  validate?: (value: string) => string
}

export function GameInput({ label, optional = false, value, onChange, placeholder, numeric = false, disabled, readOnly, search, validate }: GameInputProps) {
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  function close() {
    setOpen(false)
    field.current?.focus({ preventScroll: true })
  }
  return <>
    <label className="game-field" htmlFor={id}>{`${label}${optional ? ' (optional)' : ''}`}<Input id={id} ref={field} type={search ? 'search' : 'text'} value={value} placeholder={placeholder} readOnly disabled={disabled} inputMode="none" aria-haspopup="dialog" aria-description={readOnly ? undefined : 'Press Enter or tap to edit.'} onClick={() => { if (!disabled && !readOnly) setOpen(true) }} onKeyDown={event => {
      if (!disabled && !readOnly && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setOpen(true) }
    }} onClear={search && !readOnly ? () => onChange('') : undefined} clearDisabled={disabled || readOnly || false} clearLabel="Clear search"/></label>
    {open && <GameKeyboard label={label} optional={optional} value={value} placeholder={placeholder} numeric={numeric} validate={validate} onCancel={close} onDone={next => { onChange(next); close() }}/>}
  </>
}
