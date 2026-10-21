import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/button'
import { Select } from '@/components/select'
import { GameInput } from '@/components/game-input'
import { GameKeyboard } from '@/components/game-keyboard'
import { durationError, durationPresets, titleError, type FocusSetup } from '@/lib/focus-setup'
import './setup.css'

export default function FocusSetupPage({ value, onChange, onBack }: {
  value: FocusSetup; onChange: (value: FocusSetup) => void; onBack: () => void
}) {
  const customButton = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [custom, setCustom] = useState(!durationPresets.some(minutes => minutes === value.minutes))
  const [editing, setEditing] = useState(false)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  function close() { setEditing(false); customButton.current?.focus({ preventScroll: true }) }
  return <main className="focus-setup content-column">
    <header><h1 ref={heading} tabIndex={-1}>Focus</h1><Button onClick={onBack}>Back</Button></header>
    <div className="focus-setup-fields">
      <GameInput label="Task (optional)" value={value.title} placeholder="Name your task" validate={titleError} onChange={title => onChange({ ...value, title })}/>
      <Select label="Timer mode" value={value.mode} options={[{ value: 'down', label: 'Count down' }, { value: 'up', label: 'Count up' }]} onChange={mode => onChange({ ...value, mode: mode as FocusSetup['mode'] })}/>
      <div className="focus-timer-details">
      {value.mode === 'down' ? <section className="game-field" aria-labelledby="duration-label"><span id="duration-label">Duration preset</span><div className="focus-duration-options">
        {durationPresets.map(minutes => <Button key={minutes} className={!custom && value.minutes === minutes ? 'pixel-frame' : ''} aria-pressed={!custom && value.minutes === minutes} onClick={() => { setCustom(false); onChange({ ...value, minutes }) }}>{minutes} min</Button>)}
        <Button ref={customButton} className={custom ? 'pixel-frame' : ''} aria-label={custom ? `Custom duration, ${value.minutes} minutes` : 'Custom duration'} aria-pressed={custom} onClick={() => setEditing(true)}>{custom ? `${value.minutes} min` : 'Custom'}</Button>
      </div></section> : <section className="focus-count-up" aria-label="Count up timing"><p>Start at 00:00</p><p>Finish whenever you’re ready.</p></section>}
      </div>
    </div>
    <Button disabled aria-description="Coming soon. Timer sessions are not available yet.">Start focus</Button>
    {editing && <GameKeyboard label="Focus minutes" value={String(value.minutes)} numeric validate={durationError} onCancel={close} onDone={minutes => { setCustom(true); onChange({ ...value, minutes: Number(minutes) }); close() }}/>}
  </main>
}
