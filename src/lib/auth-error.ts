export function authErrorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'GitHub sign-in was cancelled. Please try again.'
    case 'auth/popup-blocked':
      return 'Allow pop-ups for this website, then try signing in again.'
    case 'auth/unauthorized-domain':
      return 'This website domain is not authorized for sign-in yet.'
    case 'auth/operation-not-allowed':
      return 'GitHub sign-in is not enabled in Firebase yet.'
    case 'auth/network-request-failed':
      return 'Could not connect. Check your connection and try again.'
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait before trying again.'
    default:
      return 'Could not complete the account action. Please try again.'
  }
}
