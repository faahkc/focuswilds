import type { User } from 'firebase/auth'
import { app, authHeaders } from './firebase'
import { OWNER_UID } from './account'
import { historyCapacity, historyRate, historyRecord, historyPageSize, parseHistoryPage, validHistoryCursor, type HistoryCursor, type HistoryPage, type FocusSaveResult } from './focus-history'
import type { FocusRound } from './focus-round'

const root = `projects/${app.options.projectId}/databases/(default)/documents/users/${OWNER_UID}`
const endpoint = 'https://firestore.googleapis.com/v1/'
type Value = { stringValue?: string; integerValue?: string; timestampValue?: string }
type Document = { fields: Record<string, Value>; updateTime: string }
const pending = new Map<string, { record: string; promise: Promise<FocusSaveResult> }>()
const historyCache = new Map<string, { promise: Promise<HistoryPage>; expires: number }>()

export function saveFocusRound(user: User | null, round: FocusRound): Promise<FocusSaveResult> {
  if (user?.uid !== OWNER_UID) return Promise.resolve('unavailable')
  let record: ReturnType<typeof historyRecord>
  try { record = historyRecord(round) } catch { return Promise.resolve('invalid') }
  const existing = pending.get(round.id)
  if (existing) return existing.record === JSON.stringify(record) ? existing.promise : Promise.resolve('invalid')
  const work = save(user, record).then(result => { if (result === 'saved') historyCache.clear(); return result }).finally(() => pending.delete(record.roundId))
  pending.set(record.roundId, { record: JSON.stringify(record), promise: work })
  return work
}

export function readFocusHistory(user: User | null, cursor?: HistoryCursor, refresh = false): Promise<HistoryPage> {
  if (user?.uid !== OWNER_UID || (cursor !== undefined && !validHistoryCursor(cursor))) return Promise.reject(new Error('History unavailable'))
  const key = JSON.stringify(cursor ?? null)
  const cached = historyCache.get(key)
  if (cached && (cached.expires === Infinity || (!refresh && cached.expires > Date.now()))) return cached.promise
  const entry = { promise: queryHistory(user, cursor), expires: Infinity }
  historyCache.set(key, entry)
  if (historyCache.size > 20) historyCache.delete(historyCache.keys().next().value!)
  void entry.promise.then(() => { entry.expires = Date.now() + 60000 }, () => { if (historyCache.get(key) === entry) historyCache.delete(key) })
  return entry.promise
}

async function queryHistory(user: User, cursor?: HistoryCursor): Promise<HistoryPage> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async () => {
        const [token, attestation] = await Promise.all([user.getIdToken(), authHeaders()])
        controller.signal.throwIfAborted()
        const response = await fetch(`${endpoint}${root}:runQuery`, {
          method: 'POST', headers: { ...attestation, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: {
            from: [{ collectionId: 'focusRounds' }], limit: historyPageSize,
            orderBy: [{ field: { fieldPath: 'savedAt' }, direction: 'DESCENDING' }, { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }],
            ...(cursor ? { startAt: { values: [{ timestampValue: cursor.savedAt }, { referenceValue: `${root}/focusRounds/${cursor.id}` }], before: false } } : {}),
          } }), signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
        })
        if (!response.ok) throw new Error('History unavailable')
        return parseHistoryPage(await response.json(), root)
      })(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error('History timeout')) }, 8000) }),
    ])
  } finally { clearTimeout(timeout); controller.abort() }
}

async function save(user: User, record: ReturnType<typeof historyRecord>): Promise<FocusSaveResult> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async (): Promise<FocusSaveResult> => {
        const [token, attestation] = await Promise.all([user.getIdToken(), authHeaders()])
        const request = (path: string, body?: object) => {
          controller.signal.throwIfAborted()
          return fetch(endpoint + path, { method: body ? 'POST' : 'GET',
            headers: { ...attestation, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal,
            cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
          })
        }
        const roundPath = `${root}/focusRounds/${record.roundId}`
        const counterPath = `${root}/focus/history`
        for (let attempt = 0; attempt < 3; attempt++) {
          const receipt = await request(roundPath)
          if (receipt.ok) {
            const saved: Document = await receipt.json()
            return Object.entries(record).every(([key, value]) => typeof value === 'number'
              ? saved.fields[key]?.integerValue === String(value) : saved.fields[key]?.stringValue === value) ? 'saved' : 'invalid'
          }
          if (receipt.status !== 404) return 'unavailable'
          const response = await request(counterPath)
          if (!response.ok && response.status !== 404) return 'unavailable'
          const current: Document | null = response.ok ? await response.json() : null
          const count = Number(current?.fields.count?.integerValue ?? 0)
          const windowCount = Number(current?.fields.windowCount?.integerValue ?? 0)
          const windowStart = current?.fields.windowStartedAt?.timestampValue
          if (current && (!Number.isInteger(count) || count < 1 || count > historyCapacity || !Number.isInteger(windowCount) || windowCount < 1 || windowCount > historyRate || !windowStart || !Number.isFinite(Date.parse(windowStart)))) return 'invalid'
          if (count >= historyCapacity) return 'full'
          // Client time suggests a reset; request.time in rules decides whether it is allowed.
          const reset = !windowStart || Date.now() >= Date.parse(windowStart) + 60000
          if (!reset && windowCount >= historyRate) return 'limited'
          const fields = Object.fromEntries(Object.entries(record).map(([key, value]) => [key, typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]))
          const result = await request(`projects/${app.options.projectId}/databases/(default)/documents:commit`, { writes: [
            { update: { name: roundPath, fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'savedAt', setToServerValue: 'REQUEST_TIME' }] },
            { update: { name: counterPath, fields: {
              count: { integerValue: String(count + 1) }, windowCount: { integerValue: String(reset ? 1 : windowCount + 1) },
              lastRoundId: { stringValue: record.roundId }, ...(!reset ? { windowStartedAt: { timestampValue: windowStart } } : {}),
            } }, currentDocument: current ? { updateTime: current.updateTime } : { exists: false },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }, ...(reset ? [{ fieldPath: 'windowStartedAt', setToServerValue: 'REQUEST_TIME' }] : [])] },
          ] })
          if (result.ok) return 'saved'
          const status = (await result.json()).error?.status
          if (![409, 412].includes(result.status) && !['FAILED_PRECONDITION', 'ALREADY_EXISTS', 'ABORTED'].includes(status)) return 'unavailable'
        }
        return 'unavailable'
      })(),
      new Promise<FocusSaveResult>(resolve => {
        timeout = setTimeout(() => { controller.abort(); resolve('unavailable') }, 8000)
      }),
    ])
  } catch { return 'unavailable' }
  finally { clearTimeout(timeout); controller.abort() }
}
