type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let prompt: InstallPrompt | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); prompt = event as InstallPrompt; notify()
  })
  window.addEventListener('appinstalled', () => { installed = true; prompt = null; notify() })
}
export function installState(): 'installed' | 'available' | 'unavailable' {
  if (installed || typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone)) return 'installed'
  return prompt ? 'available' : 'unavailable'
}
export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export async function installApp() {
  const request = prompt
  if (!request) return
  prompt = null; notify()
  try { await request.prompt(); await request.userChoice }
  finally { notify() }
}
