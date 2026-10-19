import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { startGitHubSignIn, finishGitHubSignIn } from '@/lib/github-sign-in'
import { OWNER_UID } from '@/lib/account'
import { AccountView } from '@/components/account-view'
import PageLoading from '@/screens/system/loading'

export function AuthPanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    let stop = () => {}
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
    return () => { active = false; stop() }
  }, [])

  async function updateAccount() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (user) await signOut(auth)
      else await startGitHubSignIn()
    } catch (accountError) {
      setError(accountError)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoading/>
  return <AccountView signedIn={user !== null} owner={user?.uid === OWNER_UID} busy={busy} error={error} onAction={() => void updateAccount()}/>
}
