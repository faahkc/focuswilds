import { useState, useSyncExternalStore } from 'react'

function subscribe(notify: () => void) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  preference.addEventListener('change', notify)
  return () => preference.removeEventListener('change', notify)
}

export function useSceneMotion() {
  const [motion, setMotion] = useState(true)
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
  return { moving: motion && !reduced, reduced, toggle: () => setMotion(value => !value) }
}
