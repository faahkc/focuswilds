import '../pixel-icon.css'

export function PixelIcon({ name, className = '' }: { name: 'check' | 'close' | 'down' | 'up' | 'clear' | 'delete' | 'shift'; className?: string }) {
  return <span className={`pixel-icon pixel-icon-${name} ${className}`.trim()} aria-hidden="true"/>
}
