let request: Promise<string | null> | undefined

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
