import { Component, type ReactNode } from 'react'
import AppRecovery from '@/screens/system/app-error'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <AppRecovery/>
  }
}
