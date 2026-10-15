import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, runTransaction, startAfter, where, type QueryConstraint, type QueryDocumentSnapshot } from 'firebase/firestore/lite'
import { app } from './firebase'
import type { FocusStore } from './focus-store'

const db = getFirestore(app)
const pending = new Map<string, Promise<unknown>>()

// Coalesce simultaneous reads (including React StrictMode); do not poll or subscribe.
function readOnce<T>(key: string, read: () => Promise<T>): Promise<T> {
  const existing = pending.get(key)
  if (existing) return existing as Promise<T>
  const promise = read().finally(() => pending.delete(key))
  pending.set(key, promise)
  return promise
}

export const focusStore: FocusStore = {
  get: path => readOnce(path, async () => {
    const snapshot = await getDoc(doc(db, path))
    return snapshot.exists() ? snapshot.data() : null
  }),
  list: (path, options) => readOnce(JSON.stringify([path, options.field, options.limit, options.start, options.end, options.cursor?.id]), async () => {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 30) throw new Error('History queries must have a bounded limit')
    const constraints: QueryConstraint[] = [orderBy(options.field, 'desc'), limit(options.limit)]
    if (options.start) constraints.push(where(options.field, '>=', options.start))
    if (options.end) constraints.push(where(options.field, '<', options.end))
    if (options.cursor) constraints.push(startAfter(options.cursor.snapshot as QueryDocumentSnapshot))
    const snapshot = await getDocs(query(collection(db, path), ...constraints))
    const last = snapshot.docs.at(-1)
    return { rows: snapshot.docs.map(row => ({ id: row.id, data: row.data() })), cursor: last ? { id: last.id, snapshot: last } : null }
  }),
  transaction: work => runTransaction(db, transaction => work({
    get: async path => {
      const snapshot = await transaction.get(doc(db, path))
      return snapshot.exists() ? snapshot.data() : null
    },
    set: (path, data) => { transaction.set(doc(db, path), data) },
  }), { maxAttempts: 3 }),
}
