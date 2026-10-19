import { initializeApp } from 'firebase/app'
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check'
import { browserLocalPersistence, browserSessionPersistence, initializeAuth } from 'firebase/auth'

// Public web configuration; authorization is enforced by Firebase Auth and Firestore Rules.
export const app = initializeApp({
  apiKey: 'AIzaSyBuxWvVfIAvRNW4bL5amwy7eoTmeS7OH6c',
  authDomain: 'focuswilds.firebaseapp.com',
  projectId: 'focuswilds',
  appId: '1:472995132652:web:3ff047f721b26b21cf21c9',
})

const debugToken = import.meta.env.DEV ? import.meta.env.VITE_APPCHECK_DEBUG_TOKEN : undefined
let appCheck: AppCheck | undefined
if (debugToken) Object.assign(self, { FIREBASE_APPCHECK_DEBUG_TOKEN: debugToken })
if (import.meta.env.PROD || debugToken) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6Lck1fAtAAAAACOkQEGIe3mcEYdx6KTaWc8tsjQE'),
    // Reuse cached tokens; renew on demand instead of while the local timer is idle.
    isTokenAutoRefreshEnabled: false,
  })
}

export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence],
})

export async function authHeaders(): Promise<Record<string, string>> {
  return appCheck ? { 'X-Firebase-AppCheck': (await getToken(appCheck)).token } : {}
}
