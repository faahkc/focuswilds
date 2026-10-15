import { lazy, Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/lib/focus-data'

const HistoryView = lazy(() => import('@/components/history-view').then(module => ({ default: module.HistoryView })))

export function FocusHistory({ userId, todayStart, profile }: { userId: string; todayStart: string; profile: Profile }) {
  const [open, setOpen] = useState(false)
  return <Card className="mt-6 border-white/15 bg-white/5 text-[#f4eddc]">
    <CardHeader><CardTitle className="font-serif text-2xl">Focus history</CardTitle></CardHeader>
    <CardContent>
      {!open ? <Button variant="secondary" onClick={() => setOpen(true)}>Open history</Button> : (
        <Suspense fallback={<p role="status">Loading history...</p>}>
          <HistoryView userId={userId} todayStart={todayStart} profile={profile} />
        </Suspense>
      )}
    </CardContent>
  </Card>
}
