import type { InputHTMLAttributes } from 'react'
import '../form-controls.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void; clearLabel?: string }

export function Input({ className = '', onClear, clearLabel = 'Clear search', ...props }: InputProps) {
  const input = <input {...props} className={`pixel-input ${className}`.trim()}/>
  if (props.type !== 'search' || !onClear) return input
  return <span className="pixel-search">{input}{props.value !== '' && props.value != null && <button type="button" className="pixel-search-clear" aria-label={clearLabel} disabled={props.disabled || props.readOnly} onMouseDown={event => event.preventDefault()} onClick={event => {
    (event.currentTarget.previousElementSibling as HTMLInputElement)?.focus({ preventScroll: true })
    onClear()
  }}><span aria-hidden="true">×</span></button>}</span>
}
