type Notice = { id: number; title: string; message: string }
let current: Notice | null = null
let nextId = 0
const listeners = new Set<() => void>()

export const toastStore = {
  getSnapshot: () => current,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
}

export function showToast(title: string, message: string) {
  current = { id: ++nextId, title, message }
  listeners.forEach(listener => listener())
}

export function clearToast(id: number) {
  if (current?.id !== id) return
  current = null
  listeners.forEach(listener => listener())
}
