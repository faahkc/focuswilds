import type { InputHTMLAttributes, Ref } from 'react'
import { PixelIcon } from './pixel-icon'
import '../form-controls.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement>; onClear?: () => void; clearLabel?: string; clearDisabled?: boolean }

export function Input({ className = '', onClear, clearLabel = 'Clear search', clearDisabled, ...props }: InputProps) {
  const input = <input {...props} className={`pixel-input ${className}`.trim()}/>
  const search = props.type === 'search' && onClear
  return <span className={`pixel-frame pixel-input-frame${search ? ' pixel-search' : ''}`} data-invalid={props['aria-invalid'] === true || props['aria-invalid'] === 'true' || undefined} data-disabled={props.disabled || undefined}>{input}{search && props.value !== '' && props.value != null && <button type="button" className="pixel-search-clear" aria-label={clearLabel} disabled={props.disabled || (clearDisabled ?? props.readOnly)} onMouseDown={event => event.preventDefault()} onClick={event => {
    (event.currentTarget.previousElementSibling as HTMLInputElement)?.focus({ preventScroll: true })
    onClear()
  }}><PixelIcon name="close"/></button>}</span>
}
