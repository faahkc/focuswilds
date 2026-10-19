import { useEffect, useState } from 'react'
import { version } from '../../package.json'
import { checkForUpdate } from '@/lib/app-update'
import { UpdateNotice } from '@/components/update-notice'

export function AppUpdate() {
  const [available, setAvailable] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void checkForUpdate(import.meta.env.BASE_URL, version).then(next => { if (active) setAvailable(next) })
    return () => { active = false }
  }, [])
  return available && <UpdateNotice version={available} onReload={() => window.location.reload()} onLater={() => setAvailable(null)}/>
}
