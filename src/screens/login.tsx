import type { ReactNode } from 'react'
import { version } from '../../package.json'
import './login-scene.css'

export default function LoginPage({ children }: { children?: ReactNode }) {
  return <main className="login-page">
    <header><h1>Focuswilds</h1></header>
    <div className="login-scene" role="img" aria-label="A black cat sitting at an apartment window, with quiet city buildings and a small plant."/>
    <p className="login-intro">A little focus.<br/>A home for cats.</p>
    {children}
    <footer>Your focus. Their home.<span>v{version}</span></footer>
  </main>
}
