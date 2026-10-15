import { initializeApp } from 'firebase/app'
import { browserPopupRedirectResolver, browserSessionPersistence, initializeAuth } from 'firebase/auth'

// Public web configuration; authorization is enforced by Firebase Auth and Firestore Rules.
export const app = initializeApp({
  apiKey: 'AIzaSyBuxWvVfIAvRNW4bL5amwy7eoTmeS7OH6c',
  authDomain: 'focuswilds.firebaseapp.com',
  projectId: 'focuswilds',
  appId: '1:472995132652:web:3ff047f721b26b21cf21c9',
})

export const auth = initializeAuth(app, {
  persistence: browserSessionPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
})
