export function authErrorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null
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
