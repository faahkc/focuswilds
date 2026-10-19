import type { ReactNode } from 'react'
import { AppVersion } from '@/components/app-version'
import './login-scene.css'

export default function LoginPage({ children, ownerSignedIn = false }: { children?: ReactNode; ownerSignedIn?: boolean }) {
  return <main className="login-page">
    <header><h1>Focuswilds</h1></header>
    <div className="login-scene" role="img" aria-label="A black cat sitting at an apartment window, with quiet city buildings and a small plant."/>
    {ownerSignedIn
      ? <p className="login-intro" role="status">You are signed in.<br/>Your cat home is coming soon.</p>
      : <p className="login-intro">A little focus.<br/>A home for cats.</p>}
    {children}
    <AppVersion/>
  </main>
}
