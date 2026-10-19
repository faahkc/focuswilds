import { authErrorMessage } from '@/lib/auth-error'
import { Button } from '@/components/button'
import LoginPage from '@/screens/login'

export function AccountView({ signedIn, owner, busy, error, onAction }: {
  signedIn: boolean
  owner: boolean
  busy: boolean
  error: unknown
  onAction: () => void
}) {
  const problem = error !== null ? authErrorMessage(error) : signedIn && !owner ? 'This account does not have access to Focuswilds.' : null
  return <LoginPage ownerSignedIn={signedIn && owner}><section className="login-account" aria-label="Account" aria-busy={busy}>
    <Button disabled={busy} aria-busy={busy} onClick={onAction}>{busy ? signedIn ? 'Signing out…' : 'Signing in…' : signedIn ? 'Sign out' : 'Sign in'}</Button>
    {problem !== null && <p role="alert">{problem}</p>}
  </section></LoginPage>
}
