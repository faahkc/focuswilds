import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { startGitHubSignIn, finishGitHubSignIn } from '@/lib/github-sign-in'
import { OWNER_UID } from '@/lib/account'
import { prepareOwnerAccount, recordAccountEvent, recordAccountError } from '@/lib/account-records'
import { AccountView } from '@/components/account-view'
import PageLoading from '@/screens/system/loading'
import { saveFocusRound } from '@/lib/focus-records'

const OwnerGame = lazy(() => import('@/components/owner-game'))

export function AuthPanel() {
  const inFlight = useRef(false)
  const [returning] = useState(() => new URLSearchParams(location.search).has('focuswilds-auth'))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let active = true
    let callbackSucceeded = false
    let recordedSignIn = false
    let stop = () => {}
    const resume = (event: PageTransitionEvent) => {
      if (event.persisted) { inFlight.current = false; setBusy(false) }
    }
    window.addEventListener('pageshow', resume)
    void finishGitHubSignIn().then(() => { callbackSucceeded = true }).catch(accountError => {
      void recordAccountError(null, accountError)
      if (active) setError(accountError)
    }).then(() => {
      if (!active) return
      stop = onAuthStateChanged(auth, next => {
        if (!active) return
        if (next?.uid === OWNER_UID) {
          void prepareOwnerAccount(next)
          if (returning && callbackSucceeded && !recordedSignIn) {
            recordedSignIn = true
            void recordAccountEvent(next, 'sign_in')
          }
        }
        setUser(next)
        setLoading(false)
      }, () => {
        if (!active) return
        void recordAccountError(null, { code: 'auth/restore-failed' })
        setLoading(false)
        setError({ code: 'auth/restore-failed' })
      })
    })
    return () => { active = false; stop(); window.removeEventListener('pageshow', resume) }
  }, [returning])

  async function updateAccount() {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    try {
      if (user) {
        await recordAccountEvent(user, 'sign_out_requested')
        await signOut(auth)
      }
      else await startGitHubSignIn()
    } catch (accountError) {
      void recordAccountError(user, accountError)
      setError(accountError)
      inFlight.current = false
      setBusy(false)
    } finally {
      // Sign-in stays busy until navigation; a bfcache return restores the action.
      if (user) { inFlight.current = false; setBusy(false) }
    }
  }

  if (loading) return <PageLoading message={returning ? 'Signing in…' : undefined}/>
  if (user?.uid === OWNER_UID && !busy && error === null) return <Suspense fallback={<PageLoading message="Loading your home…"/>}><OwnerGame onSignOut={() => void updateAccount()} onSaveRound={round => saveFocusRound(user, round)}/></Suspense>
  return <AccountView signedIn={user !== null} owner={user?.uid === OWNER_UID} busy={busy} error={error} onAction={() => void updateAccount()}/>
}
