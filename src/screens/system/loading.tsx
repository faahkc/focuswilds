export default function PageLoading({ message, label = 'Loading…' }: { message?: string; label?: string } = {}) {
  return <div className="page-loading content-column" role="status" aria-label={message || label} aria-atomic="true">
    <span className="loading-cat" aria-hidden="true"/>
    <span className="message-copy">{message || label}</span>
  </div>
}
