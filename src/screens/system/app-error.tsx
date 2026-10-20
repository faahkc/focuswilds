import { Button } from '@/components/button'
import { AppVersion } from '@/components/app-version'

export default function AppRecovery() {
  return <main className="startup-recovery content-column" role="alert">
    <span className="recovery-cat" aria-hidden="true"/>
    <h1>Something went wrong</h1>
    <p>Please reload to try again.</p>
    <Button onClick={() => window.location.reload()}>Reload</Button>
    <AppVersion/>
  </main>
}
