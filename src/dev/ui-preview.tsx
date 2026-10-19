import { useEffect, useRef, useState } from 'react'
import PageLoading from '@/screens/system/loading'
import { AppErrorBoundary } from '@/components/app-error-boundary'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { createCatalog, type ScreenModule, type PreviewModule } from './preview-catalog'
import './ui-preview.css'

const catalog = createCatalog(
  import.meta.glob<ScreenModule>(['../screens/**/*.tsx', '!../screens/**/*.preview.tsx']),
  import.meta.glob<PreviewModule>('../screens/**/*.preview.tsx'),
)
type LoadedScreen = Awaited<ReturnType<typeof catalog[number]['load']>>

export default function UIPreview() {
  const tools = useRef<HTMLDetailsElement>(null)
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
    <details className="pixel-frame ui-preview-tools" ref={tools}>
      <summary>UI preview: {selected?.name ?? 'No screens'}{variant && ` / ${variant}`}</summary>
      <div className="ui-preview-menu" role="region" aria-label="Preview controls" tabIndex={0}>
        <label>Search screens<Input type="search" value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} placeholder="Name or group"/></label>
        <p>{visible.length} / {catalog.length} screens</p>
        <nav className="ui-preview-list" aria-label="Preview screens" tabIndex={0}>
          {groups.map(group => <section key={group}><h2>{group}</h2>{visible.filter(screen => screen.group === group).map(screen => <Button key={screen.id} aria-pressed={selected?.id === screen.id} onClick={event => {
            setSelected(screen)
            setVariant('')
            setLoaded(null)
            setFailed(false)
            setRetry(value => value + 1)
            event.currentTarget.closest('details')?.removeAttribute('open')
          }}><span>{screen.name}</span><span className="pixel-choice-mark" aria-hidden="true">{selected?.id === screen.id ? '✓' : ''}</span></Button>)}</section>)}
          {!visible.length && <p role="status">No matching screens.</p>}
        </nav>
        {loaded && <Select label="State" value={variant} options={[{ value: '', label: 'Default' }, ...Object.keys(loaded.cases).map(name => ({ value: name, label: name }))]} onChange={value => {
          setVariant(value)
          tools.current?.removeAttribute('open')
          tools.current?.querySelector('summary')?.focus()
        }}/>}
        <p>Preview only. Account actions are simulated.</p>
        <a href={import.meta.env.BASE_URL}>Exit preview</a>
      </div>
    </details>
    {!selected ? <p>No screens found in src/screens/.</p> : failed ? <main className="startup-recovery" role="alert"><p>Unable to load preview.</p><Button onClick={() => { setFailed(false); setRetry(value => value + 1) }}>Retry preview</Button></main> : Screen ? <AppErrorBoundary key={`${selected.id}/${variant}/${retry}`}><Screen/></AppErrorBoundary> : <PageLoading/>}
  </>
}
