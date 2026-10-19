import { Button } from '@/components/button'

export function UpdateNotice({ version, onReload, onLater }: { version: string; onReload: () => void; onLater: () => void }) {
  return <aside className="update-notice" aria-label="App update">
    <p role="status">Version v{version} is available.<br/>Reload when you’re ready.</p>
    <div><Button onClick={onReload}>Reload</Button><Button onClick={onLater}>Later</Button></div>
  </aside>
}
