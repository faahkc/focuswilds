import { useEffect, type ReactNode } from 'react'
import { showToast } from '@/lib/toast'

export function ToastPreview({ children, thai = false }: { children: ReactNode; thai?: boolean }) {
  useEffect(() => {
    showToast(thai ? 'บันทึกประวัติถี่เกินไปชั่วคราว' : 'History limit reached', thai ? 'คุณยังใช้งานต่อได้ตามปกติ' : 'You can continue.')
  }, [thai])
  return children
}
