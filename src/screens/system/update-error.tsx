import { Button } from '@/components/button'
import { AppVersion } from '@/components/app-version'

export default function UpdateRecovery({ onRetry, onContinue }: { onRetry: () => void; onContinue: () => void }) {
  return <main className="startup-recovery" role="alert">
    <span className="recovery-cat" aria-hidden="true"/>
    <h1>Update unavailable</h1>
    <p>Try again or continue with your current version.</p>
    <div className="recovery-actions"><Button onClick={onRetry}>Try again</Button><Button onClick={onContinue}>Continue with current version</Button></div>
    <AppVersion/>
  </main>
}
