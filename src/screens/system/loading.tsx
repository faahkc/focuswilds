export default function PageLoading({ message, label = 'Loading' }: { message?: string; label?: string } = {}) {
  return <div className="page-loading" role="status" aria-label={message || label} aria-atomic="true">
    <span className="loading-cat" aria-hidden="true"/>
    {message && <span>{message}</span>}
  </div>
}
