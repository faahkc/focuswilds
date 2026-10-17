export function authErrorMessage(error: unknown, language: 'en' | 'th' = 'th') {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null
  if (language === 'en') {
    switch (code) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request': return 'GitHub sign-in was cancelled. Please try again.'
      case 'auth/popup-blocked': return 'Allow popups for this site, then try signing in again.'
      case 'auth/unauthorized-domain': return 'This website domain is not authorized for sign-in.'
      case 'auth/operation-not-allowed': return 'GitHub sign-in has not been enabled.'
      case 'auth/network-request-failed': return 'Could not connect. Check your connection and retry.'
      case 'auth/too-many-requests': return 'Too many sign-in attempts. Wait a moment and retry.'
      default: return 'Could not complete the account action. Please retry.'
    }
  }
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ยกเลิกการเข้าสู่ระบบด้วย GitHub แล้ว โปรดลองอีกครั้ง'
    case 'auth/popup-blocked':
      return 'โปรดอนุญาตหน้าต่างป๊อปอัปสำหรับเว็บไซต์นี้ แล้วลองเข้าสู่ระบบอีกครั้ง'
    case 'auth/unauthorized-domain':
      return 'โดเมนเว็บไซต์นี้ยังไม่ได้รับอนุญาตให้เข้าสู่ระบบ'
    case 'auth/operation-not-allowed':
      return 'ยังไม่ได้เปิดใช้งานการเข้าสู่ระบบด้วย GitHub'
    case 'auth/network-request-failed':
      return 'เชื่อมต่อไม่ได้ โปรดตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง'
    case 'auth/too-many-requests':
      return 'พยายามเข้าสู่ระบบหลายครั้งเกินไป โปรดรอสักครู่แล้วลองอีกครั้ง'
    default:
      return 'ดำเนินการกับบัญชีไม่ได้ โปรดลองอีกครั้ง'
  }
}
