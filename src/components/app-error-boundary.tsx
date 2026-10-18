import { Component, type ReactNode } from 'react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    const thai = document.documentElement.lang === 'th'
    return <main className="startup-screen" role="alert">
      <h1>Focuswilds</h1>
      <p>{thai ? 'เปิดแอปไม่ได้ อาจมีเวอร์ชันใหม่ โปรดโหลดหน้าใหม่ ข้อมูลตัวจับเวลาที่เก็บไว้จะไม่ถูกล้าง' : 'The app could not open. A new version may be available. Reload this tab. Existing stored timer data is not cleared.'}</p>
      <button onClick={() => window.location.reload()}>{thai ? 'โหลดใหม่' : 'Reload'}</button>
    </main>
  }
}
