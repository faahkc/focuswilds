import type { InputHTMLAttributes } from 'react'
import '../form-controls.css'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`pixel-input ${className}`.trim()}/>
}
