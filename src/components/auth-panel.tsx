import { useEffect, useState } from 'react'
import { GithubAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { OWNER_UID } from '@/lib/account'
import { authErrorMessage } from '@/lib/auth-error'
import { PageLoading } from '@/components/page-loading'

export function AuthPanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => onAuthStateChanged(auth, next => {
    setUser(next)
    setLoading(false)
  }, () => {
    setLoading(false)
    setError({ code: 'auth/restore-failed' })
  }), [])

  async function updateAccount() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (user) await signOut(auth)
      else await signInWithPopup(auth, new GithubAuthProvider())
    } catch (accountError) {
      setError(accountError)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoading/>
  return <section className="login-account" aria-label="Account" aria-busy={busy}>
    {user && (user.uid === OWNER_UID
      ? <p role="status">You are signed in.<br/>Your cat home is coming soon.</p>
      : <p role="alert">This account does not have access to Focuswilds.</p>)}
    <button disabled={busy} onClick={() => void updateAccount()}>{busy ? 'Please wait...' : user ? 'Sign out' : 'Sign in with GitHub'}</button>
    {error !== null && <p role="alert">{authErrorMessage(error)}</p>}
  </section>
}
