import { useState } from 'react'
import { LoginPage } from '@/components/login-page'
import { AccountView } from '@/components/account-view'
import { PageLoading } from '@/components/page-loading'
import { AppRecovery } from '@/components/app-error-boundary'
import './ui-preview.css'

const states = ['Login', 'Owner signed in', 'Access denied', 'Signing in', 'Account error', 'Loading', 'App error'] as const

export default function UIPreview() {
  const [state, setState] = useState<typeof states[number]>('Login')
  const [message, setMessage] = useState('Preview only. No account or database connection.')
  return <>
    <details className="ui-preview-tools">
      <summary>UI preview: {state}</summary>
      <nav aria-label="Preview states">
        {states.map(name => <button key={name} aria-pressed={state === name} onClick={event => {
          setState(name)
          setMessage('Preview only. No account or database connection.')
          event.currentTarget.closest('details')?.removeAttribute('open')
        }}>{name}</button>)}
        <a href={import.meta.env.BASE_URL}>Exit preview</a>
        <p role="status">{message}</p>
      </nav>
    </details>
    {state === 'Loading' ? <PageLoading/> : state === 'App error' ? <AppRecovery/> : <LoginPage>
      <AccountView signedIn={state === 'Owner signed in' || state === 'Access denied'} owner={state === 'Owner signed in'} busy={state === 'Signing in'} error={state === 'Account error' ? { code: 'auth/restore-failed' } : null} onAction={() => setMessage('Preview action only. No sign-in or sign-out was performed.')}/>
    </LoginPage>}
  </>
}
