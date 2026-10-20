import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { startGitHubSignIn, finishGitHubSignIn } from '@/lib/github-sign-in'
import { OWNER_UID } from '@/lib/account'
import { AccountView } from '@/components/account-view'
import PageLoading from '@/screens/system/loading'

export function AuthPanel() {
  const inFlight = useRef(false)
  const [returning] = useState(() => new URLSearchParams(location.search).has('focuswilds-auth'))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    let stop = () => {}
    const resume = (event: PageTransitionEvent) => {
      if (event.persisted) { inFlight.current = false; setBusy(false) }
    }
    window.addEventListener('pageshow', resume)
    void finishGitHubSignIn().catch(accountError => {
      if (active) setError(accountError)
    }).then(() => {
      if (!active) return
      stop = onAuthStateChanged(auth, next => {
        setUser(next)
        setLoading(false)
      }, () => {
        if (!active) return
        setLoading(false)
        setError({ code: 'auth/restore-failed' })
      })
    })
    return () => { active = false; stop(); window.removeEventListener('pageshow', resume) }
  }, [])

  async function updateAccount() {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      if (user) await signOut(auth)
      else await startGitHubSignIn()
    } catch (accountError) {
      setError(accountError)
      inFlight.current = false
      setBusy(false)
    } finally {
      // Sign-in stays busy until navigation; a bfcache return restores the action.
      if (user) { inFlight.current = false; setBusy(false) }
    }
  }

  if (loading) return <PageLoading message={returning ? 'Signing in…' : undefined}/>
  return <AccountView signedIn={user !== null} owner={user?.uid === OWNER_UID} busy={busy} error={error} onAction={() => void updateAccount()}/>
}
