import type { User } from 'firebase/auth'
import { version } from '../../package.json'
import { app, authHeaders } from './firebase'
import { OWNER_UID } from './account'

const root = `projects/${app.options.projectId}/databases/(default)/documents`
const endpoint = `https://firestore.googleapis.com/v1/${root}`
const userPath = `${root}/users/${OWNER_UID}`
const historyPath = `${userPath}/logs/account`
const safeCodes = ['auth/invalid-redirect', 'auth/access-denied', 'auth/sign-in-cancelled', 'auth/network-request-failed', 'auth/too-many-requests', 'auth/restore-failed', 'auth/unknown']
type EventType = 'sign_in' | 'sign_out_requested' | 'account_error'
type Value = { stringValue?: string; integerValue?: string; timestampValue?: string; mapValue?: { fields: Record<string, Value> }; arrayValue?: { values?: Value[] } }
type Document = { fields: Record<string, Value>; updateTime: string }

async function conflict(response: Response) {
  if ([409, 412].includes(response.status)) return true
  if (response.status !== 400) return false
  return (await response.json()).error?.status === 'FAILED_PRECONDITION'
}

// One bounded history document avoids an unbounded collection or paid TTL cleanup.
async function withAccount(user: User | null, work: (request: (path: string, body?: object) => Promise<Response>) => Promise<void | boolean>) {
  if (user?.uid !== OWNER_UID) return false
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      (async () => {
        const [token, attestation] = await Promise.all([user.getIdToken(), authHeaders()])
        const request = (path: string, body?: object) => {
          controller.signal.throwIfAborted()
          return fetch(path, {
            method: body ? 'POST' : 'GET',
            headers: { ...attestation, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
          })
        }
        return work(request)
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(new Error('Account storage timeout')) }, 1500)
      }),
    ])
    return result !== false
  } catch {
    // Diagnostics must never prevent account access or sign-out.
    return false
  } finally {
    clearTimeout(timeout)
    controller.abort()
  }
}

let profileReady = false
let profilePending: Promise<boolean> | undefined
export function prepareOwnerAccount(user: User | null): Promise<boolean> {
  if (user?.uid !== OWNER_UID) return Promise.resolve(false)
  if (profileReady) return Promise.resolve(true)
  return profilePending ??= withAccount(user, async request => {
    const current = await request(`${endpoint}/users/${OWNER_UID}`)
    if (current.ok) return
    if (current.status !== 404) throw new Error('Profile unavailable')
    const result = await request(`${endpoint}:commit`, { writes: [{
      update: { name: userPath, fields: { schemaVersion: { integerValue: '1' }, language: { stringValue: 'en' }, timezone: { stringValue: 'Asia/Bangkok' } } },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
    }] })
    // A competing tab may have created the same profile; never overwrite it.
    if (!result.ok && !await conflict(result)) throw new Error('Profile unavailable')
  }).then(ok => { profileReady = ok; profilePending = undefined; return ok })
}

export function recordAccountEvent(user: User | null, type: EventType, code = 'none') {
  if (user?.uid !== OWNER_UID) return Promise.resolve(false)
  const event: Value = { mapValue: { fields: {
    id: { stringValue: crypto.randomUUID() }, type: { stringValue: type },
    occurredAt: { timestampValue: new Date().toISOString() }, version: { stringValue: version },
    mode: { stringValue: matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true) ? 'pwa' : 'browser' },
    environment: { stringValue: ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? 'local' : 'deployed' },
    code: { stringValue: type === 'account_error' ? safeCodes.includes(code) ? code : 'auth/unknown' : 'none' },
  } } }
  return withAccount(user, async request => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await request(`${endpoint}/users/${OWNER_UID}/logs/account`)
      if (!response.ok && response.status !== 404) throw new Error('History unavailable')
      const current: Document | null = response.ok ? await response.json() : null
      const events = current?.fields.events?.arrayValue?.values ?? []
      if (!Array.isArray(events) || events.length > 100) throw new Error('Invalid account history')
      if (events.some(value => value.mapValue?.fields.id?.stringValue === event.mapValue?.fields.id?.stringValue)) return
      const windowStart = current?.fields.windowStartedAt?.timestampValue
      const count = Number(current?.fields.windowCount?.integerValue ?? '0')
      if ((windowStart && (!Number.isFinite(Date.parse(windowStart)) || !Number.isInteger(count) || count < 1 || count > 10)) || (!windowStart && count !== 0)) throw new Error('Invalid account rate window')
      // Client time is only a hint; rules enforce the window using server time.
      const resetWindow = !windowStart || Date.now() >= Date.parse(windowStart) + 60000
      if (!resetWindow && count >= 10) return false
      const result = await request(`${endpoint}:commit`, { writes: [{
        update: { name: historyPath, fields: {
          events: { arrayValue: { values: [...events.slice(-99), event] } },
          windowCount: { integerValue: String(resetWindow ? 1 : count + 1) },
          ...(!resetWindow ? { windowStartedAt: { timestampValue: windowStart } } : {}),
        } },
        currentDocument: current ? { updateTime: current.updateTime } : { exists: false },
        updateTransforms: [
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          ...(resetWindow ? [{ fieldPath: 'windowStartedAt', setToServerValue: 'REQUEST_TIME' }] : []),
        ],
      }] })
      if (result.ok) return
      if (!await conflict(result)) throw new Error('History unavailable')
    }
    throw new Error('History contention')
  })
}

export function recordAccountError(user: User | null, error: unknown) {
  const supplied = error && typeof error === 'object' && 'code' in error ? error.code : null
  const code = typeof supplied === 'string' && safeCodes.includes(supplied) ? supplied : 'auth/unknown'
  if (user?.uid === OWNER_UID) return recordAccountEvent(user, 'account_error', code)
  try {
    const key = 'focuswilds.account-errors'
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]')
    const previous = Array.isArray(saved) ? saved.filter(item => item && safeCodes.includes(item.code) && typeof item.at === 'string').map(item => ({ code: item.code, at: item.at })) : []
    sessionStorage.setItem(key, JSON.stringify([...previous.slice(-19), { code, at: new Date().toISOString() }]))
  } catch { /* Storage may be unavailable in private browsing. */ }
  return Promise.resolve(false)
}
