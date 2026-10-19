import { Button } from '@/components/button'

export default function AppRecovery() {
  return <main className="startup-recovery" role="alert"><h1>Focuswilds</h1><p>The app could not open. Please reload to try again.</p><Button onClick={() => window.location.reload()}>Reload</Button></main>
}
