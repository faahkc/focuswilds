import { useEffect, useState } from 'react'
import PageLoading from '@/screens/system/loading'
import { AppErrorBoundary } from '@/components/app-error-boundary'
import { createCatalog, type ScreenModule, type PreviewModule } from './preview-catalog'
import './ui-preview.css'

const catalog = createCatalog(
  import.meta.glob<ScreenModule>(['../screens/**/*.tsx', '!../screens/**/*.preview.tsx']),
  import.meta.glob<PreviewModule>('../screens/**/*.preview.tsx'),
)
type LoadedScreen = Awaited<ReturnType<typeof catalog[number]['load']>>

export default function UIPreview() {
  const [selected, setSelected] = useState(catalog[0])
  const [variant, setVariant] = useState('')
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState<LoadedScreen | null>(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    if (selected) void selected.load().then(screen => { if (active) setLoaded(screen) }, () => { if (active) setFailed(true) })
    return () => { active = false }
  }, [selected, retry])
  const visible = catalog.filter(screen => `${screen.group} ${screen.name}`.toLowerCase().includes(query.trim().toLowerCase()))
  const groups = [...new Set(visible.map(screen => screen.group))]
  const Screen = loaded && (loaded.cases[variant] ?? loaded.Default)
  return <>
    <details className="ui-preview-tools">
      <summary>UI preview: {selected?.name ?? 'No screens'}{variant && ` / ${variant}`}</summary>
      <div className="ui-preview-menu">
        <label>Search screens<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or group"/></label>
        <p>{visible.length} / {catalog.length} screens</p>
        <nav className="ui-preview-list" aria-label="Preview screens">
          {groups.map(group => <section key={group}><h2>{group}</h2>{visible.filter(screen => screen.group === group).map(screen => <button key={screen.id} aria-pressed={selected?.id === screen.id} onClick={event => {
            setSelected(screen)
            setVariant('')
            setLoaded(null)
            setFailed(false)
            setRetry(value => value + 1)
            event.currentTarget.closest('details')?.removeAttribute('open')
          }}>{screen.name}</button>)}</section>)}
          {!visible.length && <p role="status">No matching screens.</p>}
        </nav>
        {loaded && <label>State<select aria-label="State" value={variant} onChange={event => {
          setVariant(event.target.value)
          event.currentTarget.closest('details')?.removeAttribute('open')
        }}><option value="">Default</option>{Object.keys(loaded.cases).map(name => <option key={name} value={name}>{name}</option>)}</select></label>}
        <p>Preview only. Account actions are simulated.</p>
        <a href={import.meta.env.BASE_URL}>Exit preview</a>
      </div>
    </details>
    {!selected ? <p>No screens found in src/screens/.</p> : failed ? <main className="startup-recovery" role="alert"><p>Unable to load preview.</p><button onClick={() => { setFailed(false); setRetry(value => value + 1) }}>Retry preview</button></main> : Screen ? <AppErrorBoundary key={`${selected.id}/${variant}/${retry}`}><Screen/></AppErrorBoundary> : <PageLoading/>}
  </>
}
