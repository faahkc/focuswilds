let request: Promise<string | null> | undefined

export function updateTarget(href: string) {
  const target = new URL(href).searchParams.get('focuswilds-update')
  return newerVersion(target, '0.0.0') ? target : null
}

export function clearUpdateTarget() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('focuswilds-update') && !url.searchParams.has('focuswilds-refresh')) return
  url.searchParams.delete('focuswilds-update')
  url.searchParams.delete('focuswilds-refresh')
  window.history.replaceState(window.history.state, '', url)
}

export async function loadUpdate(href: string, target: string) {
  if (!newerVersion(target, '0.0.0')) throw new Error('Invalid update version')
  const url = new URL(href)
  url.searchParams.set('focuswilds-update', target)
  url.searchParams.set('focuswilds-refresh', String(Date.now()))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    // Preflight fresh HTML so offline or an incomplete deployment can recover in-app.
    const response = await fetch(url.href, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal })
    if (!response.ok) throw new Error('Update unavailable')
    const html = await response.text()
    const found = html.match(/<meta name="application-version" content="(\d+\.\d+\.\d+)"\s*\/?>/)?.[1]
    if (!newerVersion(found, '0.0.0') || newerVersion(target, found)) throw new Error('Update not published yet')
    return url.href
  } finally {
    clearTimeout(timeout)
  }
}

export function newerVersion(candidate: unknown, current: string): candidate is string {
  if (typeof candidate !== 'string' || candidate.length > 50 || !/^\d+\.\d+\.\d+$/.test(candidate)) return false
  const next = candidate.split('.').map(Number)
  const previous = current.split('.').map(Number)
  if (!next.every(Number.isSafeInteger)) return false
  for (let i = 0; i < 3; i++) {
    if (next[i] !== previous[i]) return next[i] > previous[i]
  }
  return false
}

export function checkForUpdate(base: string, current: string) {
  // One check per page load, shared across StrictMode mounts; no background polling.
  return request ??= (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const response = await fetch(`${base}version.json`, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal })
      if (!response.ok) return null
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('version' in data)) return null
      return newerVersion(data.version, current) ? data.version : null
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  })()
}
