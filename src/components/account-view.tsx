import { authErrorMessage } from '@/lib/auth-error'

export function AccountView({ signedIn, owner, busy, error, onAction }: {
  signedIn: boolean
  owner: boolean
  busy: boolean
  error: unknown
  onAction: () => void
}) {
  return <section className="login-account" aria-label="Account" aria-busy={busy}>
    {signedIn && (owner
      ? <p role="status">You are signed in.<br/>Your cat home is coming soon.</p>
      : <p role="alert">This account does not have access to Focuswilds.</p>)}
    <button disabled={busy} onClick={onAction}>{busy ? 'Please wait...' : signedIn ? 'Sign out' : 'Sign in with GitHub'}</button>
    {error !== null && <p role="alert">{authErrorMessage(error)}</p>}
  </section>
}
