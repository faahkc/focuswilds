import type { ReactNode } from 'react'
import { version } from '../../package.json'
import cat from '@/assets/cat.png'

export default function LoginPage({ children }: { children?: ReactNode }) {
  return <main className="login-page">
    <header><span className="eyebrow">A little focus. A little care.</span><h1>Focuswilds</h1></header>
    <img className="login-cat" src={cat} width="128" height="128" alt="A little black cat waiting to come home"/>
    <div className="login-intro"><h2>Make room for a little friend.</h2><p>Focus on what matters.<br/>Meet stray cats around the city.<br/>Make your apartment their home.</p></div>
    {children}
    <footer>A big city. A small apartment. Your cats.<span>v{version}</span></footer>
  </main>
}
