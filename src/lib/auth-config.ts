export function validateAuthConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') return null
    if (!key.startsWith('sb_publishable_') || /\s/.test(key)) return null
    return { url: parsed.origin, key }
  } catch {
    return null
  }
}

export function getAuthRedirect(origin: string, base: string) {
  return new URL(base, origin).href
}
