import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getAuthRedirect } from '@/lib/auth-config'

export function AuthPanel({ onSessionChange }: { onSessionChange: (session: Session | null) => void }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(() => {
    const url = new URL(window.location.href)
    const failed = url.searchParams.has('error') || new URLSearchParams(url.hash.slice(1)).has('error')
    return failed ? 'GitHub sign-in was cancelled or failed. Please try again.' : ''
  })

  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        onSessionChange(nextSession)
        setLoading(false)
      }
    })
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setSession(data.session)
      onSessionChange(data.session)
      if (sessionError) setError('Could not restore your session. Please sign in again.')
      setLoading(false)
    }).catch(() => {
      if (active) {
        setError('Could not connect. Check your connection and reload the page.')
        setLoading(false)
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [onSessionChange])

  async function signIn() {
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: getAuthRedirect(window.location.origin, import.meta.env.BASE_URL) },
      })
      if (signInError) setError('Could not start GitHub sign-in. Please try again.')
    } catch {
      setError('Could not connect to GitHub sign-in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) setError('Could not sign out. Please try again.')
      else setSession(null)
    } catch {
      setError('Could not sign out. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Account" className="flex flex-col items-start gap-2 sm:items-end">
      {!supabase ? <p className="text-sm text-[#c3cec1]">Sign-in is not configured yet.</p> : loading ? <p role="status" className="text-sm">Checking your session…</p> : session ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="max-w-48 truncate text-sm">{session.user.user_metadata.user_name || session.user.email || 'Signed in'}</span>
          <Button disabled={busy} onClick={() => void signOut()} variant="secondary">{busy ? 'Signing out…' : 'Sign out'}</Button>
        </div>
      ) : <Button disabled={busy} onClick={() => void signIn()} className="bg-[#e8c782] text-[#14251f] hover:bg-[#f3dcae]">{busy ? 'Connecting…' : 'Sign in with GitHub'}</Button>}
      {error && <p role="alert" className="max-w-sm text-sm text-[#ffc3ab]">{error}</p>}
    </section>
  )
}
