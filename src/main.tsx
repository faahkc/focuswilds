import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ScreenLayout } from './components/screen-layout'
import { AppErrorBoundary, AppRecovery } from './components/app-error-boundary'
import type { ReactNode } from 'react'

const root = createRoot(document.getElementById('root')!)
function render(page: ReactNode) {
  root.render(<StrictMode><ScreenLayout><AppErrorBoundary>{page}</AppErrorBoundary></ScreenLayout></StrictMode>)
}

async function start() {
  if (import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === 'ui') {
    const { default: Preview } = await import('./dev/ui-preview')
    render(<Preview/>)
  } else {
    const { default: App } = await import('./App')
    render(<App/>)
  }
}

void start().catch(() => render(<AppRecovery/>))
