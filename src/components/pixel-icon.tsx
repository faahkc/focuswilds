import '../pixel-icon.css'

export function PixelIcon({ name, className = '' }: { name: 'check' | 'close' | 'down' | 'up' | 'clear' | 'delete' | 'shift' | 'enter' | 'keyboard-shift' | 'keyboard-delete' | 'keyboard-enter'; className?: string }) {
  return <span className={`pixel-icon pixel-icon-${name} ${className}`.trim()} aria-hidden="true"/>
}
