import { useEffect, useState } from 'react'
import { GithubAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/firebase'
import { authErrorMessage } from '@/lib/auth-error'

export function AuthPanel({ onSessionChange }: { onSessionChange: (user: User | null) => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(auth, nextUser => {
    setUser(nextUser)
    onSessionChange(nextUser)
    setLoading(false)
  }, () => {
    setUser(null)
    onSessionChange(null)
    setError('Could not restore your session. Reload the page to try again.')
    setLoading(false)
  }), [onSessionChange])

  async function updateAccount() {
    setBusy(true)
    setError('')
    try {
      if (user) await signOut(auth)
      else await signInWithPopup(auth, new GithubAuthProvider())
    } catch (accountError) {
      setError(authErrorMessage(accountError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Account" className="flex flex-col items-start gap-2 sm:items-end">
      {loading ? <p role="status" className="text-sm">Checking your session…</p> : user ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="max-w-48 truncate text-sm">{user.displayName || user.email || 'Signed in'}</span>
          <Button disabled={busy} onClick={() => void updateAccount()} variant="secondary">{busy ? 'Signing out…' : 'Sign out'}</Button>
        </div>
      ) : <Button disabled={busy} onClick={() => void updateAccount()} className="bg-[#e8c782] text-[#14251f] hover:bg-[#f3dcae]">{busy ? 'Connecting…' : 'Sign in with GitHub'}</Button>}
      {error && <p role="alert" className="max-w-sm text-sm text-[#ffc3ab]">{error}</p>}
    </section>
  )
}
