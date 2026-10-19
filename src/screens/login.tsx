import type { ReactNode } from 'react'
import { AppVersion } from '@/components/app-version'
import './login-scene.css'

export default function LoginPage({ children, ownerSignedIn = false, errorMessage = null, statusMessage = null }: { children?: ReactNode; ownerSignedIn?: boolean; errorMessage?: string | null; statusMessage?: string | null }) {
  return <main className="login-page">
    <header><h1>Focuswilds</h1></header>
    <div className="login-scene" role="img" aria-label="A black cat sitting at an apartment window, with quiet city buildings and a small plant."/>
    {errorMessage !== null
      ? <p className="login-intro login-error" role="alert">{errorMessage}</p>
      : statusMessage !== null
      ? <p className="login-intro" role="status">{statusMessage}<br/>Please wait a moment.</p>
      : ownerSignedIn
      ? <p className="login-intro" role="status">You are signed in.<br/>Your cat home is coming soon.</p>
      : <p className="login-intro">A little focus.<br/>A home for cats.</p>}
    {children}
    <AppVersion/>
  </main>
}
