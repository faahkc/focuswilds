import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dayKey } from '@/lib/account'
import { parseBackup, type Backup, type Profile } from '@/lib/focus-data'
import { importBackup, loadOverview } from '@/lib/focus-sessions'
import { focusStore } from '@/lib/firestore-store'

export function BackupImport({ userId, migration, onImported }: { userId: string; migration: Profile['migration']; onImported: (overview: { profile: Profile; day: { day: string; sessions: number; seconds: number } }) => void }) {
  const [backup, setBackup] = useState<Backup | null>(null)
  const [busy, setBusy] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [error, setError] = useState('')

  async function choose(file: File | undefined) {
    setBackup(null)
    setError('')
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Backup is larger than 20 MB. Keep the file and ask for help importing it.')
      const parsed = await parseBackup(await file.text())
      if (migration && parsed.fingerprint !== migration.fingerprint) throw new Error('Choose the same backup used to start this import.')
      setBackup(parsed)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not read the backup file.')
    } finally { setBusy(false) }
  }

  async function importData() {
    if (!backup || busy) return
    setBusy(true)
    setError('')
    try {
      const profile = await importBackup(focusStore, userId, backup, setProcessed)
      const day = { day: dayKey(Date.now()), sessions: 0, seconds: 0 }
      for (const row of backup.sessions) if (dayKey(row.completedAt) === day.day) { day.sessions += 1; day.seconds += row.seconds }
      if (profile.sessions !== backup.summary.sessions) {
        const current = await loadOverview(focusStore, userId, day.day, true)
        if (!current.profile?.ready) throw new Error('Imported progress is not ready')
        onImported({ profile: current.profile, day: current.day })
      } else onImported({ profile, day })
    } catch {
      setError('Import could not be confirmed. Keep the backup and retry with the same file; saved chunks will not be counted twice.')
    } finally { setBusy(false) }
  }

  return <Card className="mt-10 border-white/15 bg-white/5 text-inherit">
    <CardHeader><CardTitle>Restore your journey</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p>Choose your saved JSON backup. Previewing the file stays on this device and does not write cloud data.</p>
      {migration && <p role="status">An import is in progress ({migration.processed} / {migration.total} sessions). Choose the same backup to continue.</p>}
      <label htmlFor="backup-file" className="block text-sm">Focuswilds backup</label>
      <input id="backup-file" type="file" accept=".json,application/json" disabled={busy} onChange={event => void choose(event.target.files?.[0])} className="block w-full text-sm" />
      {backup && <>
        <p>{backup.sessions.length} completed focus sessions · {Math.floor(backup.summary.seconds / 60)} minutes · {backup.sessions.length * 25} EXP</p>
        <p className="text-sm text-[#c3cec1]">{backup.skipped} break or unfinished records skipped. Companion: {backup.selected}. Keep your backup after importing.</p>
        <Button disabled={busy} onClick={() => void importData()}>{busy ? 'Importing…' : 'Import saved progress'}</Button>
      </>}
      {busy && backup && <p role="status">Confirmed {processed} / {backup.sessions.length} sessions</p>}
      {error && <p role="alert" className="text-[#ffc3ab]">{error}</p>}
    </CardContent>
  </Card>
}
