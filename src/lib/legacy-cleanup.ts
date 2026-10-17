import { userPath } from './account.ts'
import { parseShelter } from './shelter-data.ts'

export type LegacyCleanupStore = {
  get(path: string): Promise<unknown | null>
  list(path: string, limit: number): Promise<string[]>
  remove(paths: string[]): Promise<void>
}
export type CleanupResult = { processed: number; done: boolean }
// One shelter rule lookup per delete stays within the 20-call batch limit without caching.
export const LEGACY_BATCH_SIZE = 20
const pending = new WeakMap<LegacyCleanupStore, Promise<CleanupResult>>()

export function validateLegacyPaths(userId: string, paths: string[]) {
  const base = userPath(userId)
  if (!paths.length || paths.length > LEGACY_BATCH_SIZE || new Set(paths).size !== paths.length
    || paths.some(path => path !== `${base}/state/progress`
      && !['sessions', 'days'].some(collection => path.startsWith(`${base}/${collection}/`)
        && path.slice(`${base}/${collection}/`.length).length > 0 && !path.slice(`${base}/${collection}/`.length).includes('/')))) {
    throw new Error('Invalid legacy cleanup paths')
  }
}

export function cleanupLegacyChunk(store: LegacyCleanupStore, userId: string): Promise<CleanupResult> {
  const base = userPath(userId)
  const existing = pending.get(store)
  if (existing) return existing
  const promise = (async () => {
    // Never delete old data to recover a missing or unreadable shelter.
    parseShelter(await store.get(`${base}/shelter/state`))
    for (const collection of ['sessions', 'days']) {
      const prefix = `${base}/${collection}/`
      const paths = await store.list(`${base}/${collection}`, LEGACY_BATCH_SIZE)
      if (!paths.length) continue
      validateLegacyPaths(userId, paths)
      if (paths.some(path => !path.startsWith(prefix))) throw new Error('Unexpected legacy collection')
      await store.remove(paths)
      return { processed: paths.length, done: false }
    }
    const progress = `${base}/state/progress`
    const exists = await store.get(progress) !== null
    if (exists) await store.remove([progress])
    return { processed: Number(exists), done: true }
  })().finally(() => pending.delete(store))
  pending.set(store, promise)
  return promise
}
