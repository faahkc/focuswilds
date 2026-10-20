import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ScreenLayout } from './components/screen-layout'
import { AppErrorBoundary } from './components/app-error-boundary'
import AppRecovery from './screens/system/app-error'
import UpdateRecovery from './screens/system/update-error'
import PageLoading from './screens/system/loading'
import { version } from '../package.json'
import { checkForUpdate, newerVersion, updateTarget, clearUpdateTarget, loadUpdate } from './lib/app-update'
import type { ReactNode } from 'react'

const root = createRoot(document.getElementById('root')!)
let updating = false
function render(page: ReactNode) {
  root.render(<StrictMode><ScreenLayout><AppErrorBoundary>{page}</AppErrorBoundary></ScreenLayout></StrictMode>)
}

async function openApp() {
  const { default: App } = await import('./App')
  render(<App/>)
}

function updateFailed(target: string) {
  render(<UpdateRecovery onRetry={() => void update(target)} onContinue={() => {
    clearUpdateTarget()
    void openApp().catch(() => render(<AppRecovery/>))
  }}/>)
}

async function update(target: string) {
  if (updating) return
  updating = true
  render(<PageLoading message="Loading the latest version…"/>)
  try {
    const url = await loadUpdate(window.location.href, target)
    window.location.replace(url)
  } catch {
    updating = false
    updateFailed(target)
  }
}

async function start() {
  if (import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === 'ui') {
    const { default: Preview } = await import('./dev/ui-preview')
    render(<Preview/>)
  } else {
    const target = updateTarget(window.location.href)
    render(<PageLoading message={target ? 'Loading the latest version…' : new URLSearchParams(window.location.search).has('focuswilds-auth') ? 'Signing in…' : undefined}/>)
    if (target) {
      if (newerVersion(target, version)) updateFailed(target)
      else { clearUpdateTarget(); await openApp() }
      return
    }
    const next = await checkForUpdate(import.meta.env.BASE_URL, version)
    if (next) await update(next)
    else await openApp()
  }
}

void start().catch(() => render(<AppRecovery/>))
