export const OWNER_UID = '7FnLLAGqAFYO269Jl1j2I8lEQbx2'
export const SOURCE_OWNER_ID = '89ff1256-e1f3-4013-bd02-94d64cca8b27'
export const ACCOUNT_TIMEZONE = 'Asia/Bangkok'

export function userPath(userId: string) {
  if (userId !== OWNER_UID) throw new Error('This account is not allowed to access focus data')
  return `users/${userId}`
}

export function dayKey(timestamp: string | number) {
  return new Date(new Date(timestamp).getTime() + 7 * 3600000).toISOString().slice(0, 10)
}
