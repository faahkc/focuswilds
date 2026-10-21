import type { ButtonHTMLAttributes, Ref } from 'react'

export function Button({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }) {
  return <button {...props} type={type} className={`pixel-button ${className}`.trim()}/>
}
