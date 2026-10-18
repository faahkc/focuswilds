import { useEffect, useState } from 'react'
import { GithubAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/firebase'
import { authErrorMessage } from '@/lib/auth-error'

export function AuthPanel({ onSessionChange, language = 'en' }: { onSessionChange: (user: User | null) => void; language?: 'en' | 'th' }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const text = language === 'th'
    ? { account: 'บัญชี', loading: 'กำลังตรวจสอบการเข้าสู่ระบบ…', signedIn: 'เข้าสู่ระบบแล้ว', out: 'ออกจากระบบ', leaving: 'กำลังออกจากระบบ…', wait: 'รอสักครู่…', enter: 'เข้าสู่ที่พักพิง' }
    : { account: 'Account', loading: 'Checking sign-in…', signedIn: 'Signed in', out: 'Sign out', leaving: 'Signing out…', wait: 'Please wait…', enter: 'Enter the shelter' }

  useEffect(() => onAuthStateChanged(auth, nextUser => {
    setUser(nextUser)
    onSessionChange(nextUser)
    setLoading(false)
  }, () => {
    setUser(null)
    onSessionChange(null)
    setError({ code: 'auth/restore-failed' })
    setLoading(false)
  }), [onSessionChange])

  async function updateAccount() {
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

  return (
    <section aria-label={text.account} aria-busy={loading || busy} className="wilds-account flex flex-col items-start gap-2 sm:items-end">
      {loading ? <p role="status" className="wilds-account-loading text-sm"><span className="wilds-loading-mark" aria-hidden="true"/>{text.loading}</p> : user ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="max-w-48 truncate text-sm">{user.displayName || user.email || text.signedIn}</span>
          <Button disabled={busy} onClick={() => void updateAccount()} variant="secondary">{busy && <span className="wilds-loading-mark" aria-hidden="true"/>}{busy ? text.leaving : text.out}</Button>
        </div>
      ) : <Button disabled={busy} onClick={() => void updateAccount()}>{busy && <span className="wilds-loading-mark" aria-hidden="true"/>}{busy ? text.wait : text.enter}</Button>}
      {error !== null && <p role="alert" className="max-w-sm text-sm text-[#ffc3ab]">{authErrorMessage(error, language)}</p>}
    </section>
  )
}
