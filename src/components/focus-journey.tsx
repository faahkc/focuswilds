import { useEffect, useState } from 'react'
import { OWNER_UID, dayKey } from '@/lib/account'
import { loadOverview } from '@/lib/focus-sessions'
import { focusStore } from '@/lib/firestore-store'
import { Button } from '@/components/ui/button'
import { Pomodoro } from '@/components/pomodoro'

export function FocusJourney({ userId }: { userId: string }) {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof loadOverview>> | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (userId !== OWNER_UID) return
    let active = true
    void loadOverview(focusStore, userId, dayKey(Date.now()), retry > 0).then(value => {
      if (active) { setOverview(value); setError('') }
    }).catch(() => { if (active) setError('Could not load your saved progress. Check your connection and account permissions, then retry.') })
    return () => { active = false }
  }, [userId, retry])

  if (userId !== OWNER_UID) return <p role="alert" className="py-10">This account does not have access to this journey.</p>
  if (error) return <div role="alert" className="space-y-3 py-10"><p>{error}</p><Button onClick={() => setRetry(value => value + 1)}>Retry loading progress</Button></div>
  if (!overview) return <p role="status" className="py-10">Loading your journey…</p>
  if (!overview.profile?.ready) return <p role="alert" className="py-10">Saved progress is unavailable. Check the account and database configuration.</p>
  return <Pomodoro userId={userId} initialOverview={{ profile: overview.profile, day: overview.day }} />
}
