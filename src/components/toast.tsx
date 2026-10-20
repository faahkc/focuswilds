import { useSyncExternalStore } from 'react'
import { clearToast, toastStore } from '@/lib/toast'
import './toast.css'

export function ToastHost() {
  const notice = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot)
  return <div className="toast-viewport content-column" role="status" aria-live="polite" aria-atomic="true">
    {notice && <div key={notice.id} className="toast-card pixel-frame" onAnimationEnd={event => {
      if (event.target === event.currentTarget) clearToast(notice.id)
    }}>
      <p className="toast-title">{notice.title}</p>
      <p>{notice.message}</p>
    </div>}
  </div>
}
