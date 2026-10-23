import './round-recovery-warning.css'

export function RoundRecoveryWarning({ kind = 'round' }: { kind?: 'round' | 'break' }) {
  return <p className="round-recovery-warning" role="alert">Reloading may lose this {kind}.<br/>Keep this tab open.</p>
}
