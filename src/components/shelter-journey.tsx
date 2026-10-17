import { useEffect, useState } from 'react'
import { OWNER_UID } from '@/lib/account'
import { focusStore } from '@/lib/firestore-store'
import { initializeShelter, loadShelter } from '@/lib/shelter-store'
import type { Language, Shelter } from '@/lib/shelter'
import { shelterText } from '@/lib/shelter-text'
import { Button } from '@/components/ui/button'
import { ShelterCamp } from '@/components/shelter-camp'

export function ShelterJourney({ userId, onLanguageChange }: { userId: string; onLanguageChange: (language: Language) => void }) {
  const [state, setState] = useState<Shelter | null | undefined>(undefined)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const t = shelterText('en')
  useEffect(() => {
    if (userId !== OWNER_UID) return
    let active = true
    void loadShelter(focusStore, userId, retry > 0).then(value => { if (active) { setState(value); setError(false) } }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [userId, retry])
  async function start() {
    setBusy(true)
    try { setState(await initializeShelter(focusStore, userId)); setError(false) }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  if (userId !== OWNER_UID) return <p role="alert">This account does not have access to this shelter.</p>
  if (state) return <ShelterCamp initialState={state} userId={userId} store={focusStore} onLanguageChange={onLanguageChange}/>
  return <div className="shelter-welcome">
    {error ? <><p role="alert">{t.loadError}</p><Button disabled={busy} onClick={() => setRetry(value => value + 1)}>{t.retry}</Button></>
      : state === null ? <><h1>{t.shelter}</h1><p>{t.newGame}</p><Button disabled={busy} onClick={() => void start()}>{busy ? t.saving : t.startNew}</Button></>
        : <p role="status">{t.loading}</p>}
  </div>
}
