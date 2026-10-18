import { useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { installApp, installState, subscribeInstall } from '@/lib/pwa'
import { shelterText } from '@/lib/shelter-text'
import type { Language } from '@/lib/shelter'

export function PwaInstall({ language }: { language: Language }) {
  const t = shelterText(language)
  const state = useSyncExternalStore(subscribeInstall, installState, () => 'unavailable')
  const [error, setError] = useState(false)
  return <section className="shelter-list"><h3>{t.install}</h3>
    <p>{state === 'installed' ? t.installed : t.installHint}</p><p>{t.onlineRequired}</p>
    {state === 'available' && <Button variant="secondary" onClick={() => { setError(false); void installApp().catch(() => setError(true)) }}>{t.install}</Button>}
    {error && <p role="alert">{t.installError}</p>}
  </section>
}
