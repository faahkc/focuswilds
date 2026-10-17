export const OWNER_UID = '7FnLLAGqAFYO269Jl1j2I8lEQbx2'
export const ACCOUNT_TIMEZONE = 'Asia/Bangkok'

export function userPath(userId: string) {
  if (userId !== OWNER_UID) throw new Error('This account is not allowed to access focus data')
  return `users/${userId}`
}

export function dayKey(timestamp: string | number) {
  return new Date(new Date(timestamp).getTime() + 7 * 3600000).toISOString().slice(0, 10)
}

export function todayBounds(now: number) {
  const start = new Date(`${dayKey(now)}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 86400000)
  return { start: start.toISOString(), end: end.toISOString() }
}
