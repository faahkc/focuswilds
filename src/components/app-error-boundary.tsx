import { Component, type ReactNode } from 'react'

export function AppRecovery() {
  return <main className="startup-recovery" role="alert"><h1>Focuswilds</h1><p>The app could not open. Please reload to try again.</p><button onClick={() => window.location.reload()}>Reload</button></main>
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <AppRecovery/>
  }
}
