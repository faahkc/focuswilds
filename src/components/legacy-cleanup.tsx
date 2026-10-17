import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cleanupLegacyChunk, type CleanupResult } from '@/lib/legacy-cleanup'
import { legacyCleanupStore } from '@/lib/legacy-cleanup-store'
import { shelterText } from '@/lib/shelter-text'
import type { Language } from '@/lib/shelter'

export function LegacyCleanup({ userId, language, disabled }: { userId: string; language: Language; disabled: boolean }) {
  const t = shelterText(language)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CleanupResult | null>(null)
  const [error, setError] = useState(false)
  async function run() {
    if (busy || disabled || (!result && !window.confirm(t.cleanupConfirm))) return
    setBusy(true); setError(false)
    try { setResult(await cleanupLegacyChunk(legacyCleanupStore, userId)) }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  return <section className="shelter-list">
    <h3>{t.cleanup}</h3><p>{t.cleanupHint}</p>
    <Button variant="secondary" disabled={disabled || busy || result?.done} onClick={() => void run()}>{busy ? t.saving : t.cleanup}</Button>
    {result && !error && <p role="status">{result.done ? t.cleanupDone : `${t.cleanupMore} (${result.processed})`}</p>}
    {error && <p role="alert">{t.cleanupError}</p>}
  </section>
}
