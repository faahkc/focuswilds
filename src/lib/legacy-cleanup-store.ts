import { collection, doc, documentId, getDoc, getDocs, getFirestore, limit, orderBy, query, writeBatch } from 'firebase/firestore/lite'
import { app } from './firebase'
import { OWNER_UID, userPath } from './account'
import { LEGACY_BATCH_SIZE, validateLegacyPaths, type LegacyCleanupStore } from './legacy-cleanup'

const db = getFirestore(app)
export const legacyCleanupStore: LegacyCleanupStore = {
  get: async path => {
    const base = userPath(OWNER_UID)
    if (path !== `${base}/shelter/state` && path !== `${base}/state/progress`) throw new Error('Invalid cleanup read')
    const snapshot = await getDoc(doc(db, path))
    return snapshot.exists() ? snapshot.data() : null
  },
  list: async (path, size) => {
    const base = userPath(OWNER_UID)
    if (![`${base}/sessions`, `${base}/days`].includes(path) || size !== LEGACY_BATCH_SIZE) throw new Error('Invalid cleanup query')
    const snapshot = await getDocs(query(collection(db, path), orderBy(documentId()), limit(size)))
    return snapshot.docs.map(row => `${path}/${row.id}`)
  },
  remove: async paths => {
    validateLegacyPaths(OWNER_UID, paths)
    const batch = writeBatch(db)
    for (const path of paths) batch.delete(doc(db, path))
    await batch.commit()
  },
}
