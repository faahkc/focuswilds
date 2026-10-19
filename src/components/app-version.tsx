import { version } from '../../package.json'

export function AppVersion() {
  return <footer className="app-version">v{version}</footer>
}
