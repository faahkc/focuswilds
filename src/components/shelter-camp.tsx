import { useEffect, useRef, useState } from 'react'
import type { FocusStore } from '@/lib/focus-store'
import { applyShelterCommand, emptyInventory, FOCUS_PRESETS, inventorySlots, gearSlots, equippable, availableSkills, hasBlueprint, expeditionCapacity, items, jobs, previewEvent, previewReturn, type Shelter, type ShelterCommand, type Language, type PackSelection, type Job, type Skill } from '@/lib/shelter'
import { areas, type Approach, type AreaId } from '@/lib/shelter-content'
import { loadShelter, saveShelterOperation, loadShelterSessions, type ShelterOperation, type ShelterSession } from '@/lib/shelter-store'
import { newShelterTimer, restoreShelterTimer, timerRemaining, timerTabTitle, toggleShelterTimer, finishShelterTimer } from '@/lib/shelter-timer'
import { eventText, shelterText, survivorName } from '@/lib/shelter-text'
import { ShelterJournal } from '@/components/shelter-journal'
import { LegacyCleanup } from '@/components/legacy-cleanup'
import { Button } from '@/components/ui/button'
import { GameWindow } from '@/components/game-window'
import { FortStage } from '@/components/fort-stage'

type Panel = 'crew' | 'stores' | 'explore' | 'journal' | 'history' | 'settings'
const icons: Record<Panel, string> = { crew: '♙', stores: '▣', explore: '⚑', journal: '▤', history: '◷', settings: '⚙' }
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export function ShelterCamp({ initialState, userId, store, onLanguageChange }: { initialState: Shelter; userId: string; store: FocusStore; onLanguageChange: (language: Language) => void }) {
  const [state, setState] = useState(initialState)
  const [panel, setPanel] = useState<Panel | null>(null)
  const [error, setError] = useState<'save' | 'stale' | 'action' | ''>('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const timerKey = `focuswilds:shelter-timer:${userId}`, actionKey = `focuswilds:shelter-action:${userId}`
  const [storageError, setStorageError] = useState(false)
  const [timer, setTimer] = useState(() => {
    try { return restoreShelterTimer(sessionStorage.getItem(timerKey), crypto.randomUUID()) }
    catch { return null }
  })
  const [action, setAction] = useState<ShelterOperation | null>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(actionKey) ?? 'null')
      if (value !== null && (!value || typeof value.id !== 'string' || !/^[a-f0-9-]{36}$/.test(value.id) || !Number.isSafeInteger(value.revision) || value.revision < 0 || !value.command || typeof value.command.type !== 'string')) throw Error('Invalid action')
      return value
    }
    catch { return { id: '', revision: -1, command: { type: 'language', language: 'en' } } }
  })
  const [now, setNow] = useState(Date.now)
  const inFlight = useRef(false)
  const t = shelterText(state.language)
  const pending = timer?.pending ?? action
  const active = Boolean(timer?.startedAt && !timer.pending)
  const corruptAction = action?.id === ''
  const blocked = busy || Boolean(pending) || !timer || corruptAction
  const locked = blocked || active
  const expedition = state.expedition
  const [team, setTeam] = useState<string[]>([])
  const [provisions, setProvisions] = useState(3)
  const [area, setArea] = useState<AreaId>('border')
  const [actor, setActor] = useState('')
  const [approach, setApproach] = useState<Approach>('quiet')
  const acting = expedition?.team.includes(actor) ? actor : expedition?.team[0] ?? ''
  const [customPack, setCustomPack] = useState(false)
  const [pack, setPack] = useState<PackSelection>({ inventory: emptyInventory(), gearIds: [] })
  const [history, setHistory] = useState<ShelterSession[]>([])
  const [historyCursor, setHistoryCursor] = useState<Awaited<ReturnType<typeof loadShelterSessions>>['cursor']>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const historyRequest = useRef(false)
  const preview = expedition && expedition.event < areas[expedition.area].events.length ? previewEvent(state, acting, approach) : null

  useEffect(() => { onLanguageChange(state.language) }, [state.language, onLanguageChange])
  useEffect(() => {
    document.title = timerTabTitle(timer, now, t.paused)
    return () => { document.title = 'Focuswilds' }
  }, [timer, now, t.paused])
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    if (timer?.deadline !== null && timer && timerRemaining(timer, now) === 0 && !timer.pending && !action && !busy) {
      // oxlint-disable-next-line react/set-state-in-effect -- Capture deadline completion before the save effect.
      setTimer(current => current ? finishShelterTimer(current, now, state.revision) : current)
    }
  }, [now, timer, state.revision, action, busy])
  useEffect(() => {
    if (!timer) return
    try { sessionStorage.setItem(timerKey, JSON.stringify(timer)) }
    catch {
      // oxlint-disable-next-line react/set-state-in-effect -- Surface browser storage failures.
      setStorageError(true)
    }
  }, [timer, timerKey])
  useEffect(() => {
    if (!pending || inFlight.current || corruptAction) return
    inFlight.current = true
    // oxlint-disable-next-line react/set-state-in-effect -- An external transaction is starting.
    setBusy(true)
    void Promise.resolve().then(() => saveShelterOperation(store, userId, pending)).then(value => {
      setState(value); setError('')
      if (pending.command.type === 'focus') setTimer(current => newShelterTimer(crypto.randomUUID(), current?.targetSeconds))
      else {
        try { sessionStorage.removeItem(actionKey) } catch { setStorageError(true) }
        setAction(null)
      }
    }).catch(reason => { setError(reason instanceof Error && reason.message === 'Stale shelter revision' ? 'stale' : 'save') })
      .finally(() => { inFlight.current = false; setBusy(false) })
  }, [pending, retry, store, userId, actionKey, corruptAction])

  function send(command: ShelterCommand) {
    if (blocked) return
    try {
      applyShelterCommand(state, state.revision, command)
      const operation = { id: crypto.randomUUID(), revision: state.revision, command }
      sessionStorage.setItem(actionKey, JSON.stringify(operation))
      setError(''); setAction(operation)
    } catch { setError('action') }
  }
  async function refresh() {
    if (busy || active) return
    setBusy(true)
    try {
      const saved = await loadShelter(store, userId, true)
      if (!saved) throw Error('Missing shelter')
      setState(saved)
      // A stale non-focus command is known not to have committed; require a fresh user decision.
      if (error === 'stale' && !timer?.pending) { sessionStorage.removeItem(actionKey); setAction(null); setError('') }
    } catch { setError('save') }
    finally { setBusy(false) }
  }
  async function readHistory(refresh = false) {
    if (historyRequest.current) return
    historyRequest.current = true; setHistoryBusy(true); setHistoryError(false)
    try {
      const page = await loadShelterSessions(store, userId, refresh ? null : historyCursor)
      setHistory(current => refresh ? page.rows : [...current, ...page.rows]); setHistoryCursor(page.cursor); setHistoryLoaded(true)
    } catch { setHistoryError(true) }
    finally { historyRequest.current = false; setHistoryBusy(false) }
  }
  function choosePack() {
    const inventory = { ...(expedition?.inventory ?? emptyInventory()) }
    setPack({ inventory, gearIds: expedition?.gear.map(gear => gear.id) ?? [] }); setCustomPack(true)
  }
  function resetUnreadable() {
    if (!window.confirm(t.resetConfirm)) return
    try {
      sessionStorage.removeItem(timerKey); sessionStorage.removeItem(actionKey)
      setTimer(newShelterTimer(crypto.randomUUID())); setAction(null); setError('')
    } catch { setStorageError(true) }
  }
  const name = (id: string) => survivorName(id, state.language)
  const packControls = customPack && <fieldset className="shelter-pack"><legend>{t.leave}</legend><p>{t.packHint}</p>
    {items.map(item => <label key={item}>{t[item]}<input type="number" min="0" step="1" value={pack.inventory[item]} onChange={event => setPack(current => ({ ...current, inventory: { ...current.inventory, [item]: Number(event.target.value) } }))}/></label>)}
    {expedition?.gear.map(gear => <label key={gear.id}><input type="checkbox" checked={pack.gearIds.includes(gear.id)} onChange={event => setPack(current => ({ ...current, gearIds: event.target.checked ? [...current.gearIds, gear.id] : current.gearIds.filter(id => id !== gear.id) }))}/>{t[gear.kind]} · {gearSlots([gear])} {t.slots}</label>)}
  </fieldset>

  return <section className="shelter-camp">
    <div className="shelter-heading"><div><h1>{t.shelter}</h1><p>{t.safe}</p></div><span>{state.survivors.length}/{state.housing} {t.beds}</span></div>
    <div className="shelter-scene"><FortStage area={expedition?.area} people={expedition ? expedition.team.length : state.survivors.length}/><span className="shelter-scene-caption">{expedition ? `${t.explore} · ${t[expedition.area]}` : t.shelter}</span></div>
    <div className="shelter-console">
      <div className="shelter-timer">
        {timer ? <>
          <label>{t.title}<input maxLength={120} value={timer.title} disabled={active || blocked} onChange={event => setTimer({ ...timer, title: event.target.value })}/></label>
          <output aria-label={t.focus} className="shelter-clock">{clock(Math.ceil(timerRemaining(timer, now) / 1000))}</output>
          <div className="shelter-durations">{FOCUS_PRESETS.map(minutes => <Button key={minutes} variant="secondary" disabled={active || blocked} aria-pressed={timer.targetSeconds === minutes * 60} onClick={() => setTimer(newShelterTimer(crypto.randomUUID(), minutes * 60))}>{minutes}</Button>)}
            <label>{t.minutes}<input aria-label={t.minutes} type="number" min="1" max="180" step="1" disabled={active || blocked} value={timer.targetSeconds / 60} onChange={event => { const minutes = Number(event.target.value); if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 180) setTimer(newShelterTimer(crypto.randomUUID(), minutes * 60)) }}/></label></div>
          <div className="shelter-actions"><Button disabled={blocked || timerRemaining(timer, now) === 0} onClick={() => { const time = Date.now(); setNow(time); setTimer(timerRemaining(timer, time) === 0 ? finishShelterTimer(timer, time, state.revision) : toggleShelterTimer(timer, time)) }}>{timer.deadline ? t.pause : timer.startedAt ? t.resume : t.start}</Button>
            <Button variant="secondary" disabled={!timer.startedAt || blocked} onClick={() => setTimer(finishShelterTimer(timer, Date.now(), state.revision))}>{t.finish}</Button></div>
        </> : <div role="alert"><p>{t.corruptTimer}</p><Button onClick={resetUnreadable}>{t.resetTimer}</Button></div>}
        <p className="shelter-hint">{t.partial}</p>
      </div>
      <nav className="shelter-nav" aria-label={t.shelter}>{(Object.keys(icons) as Panel[]).map(key => <Button key={key} variant="secondary" aria-label={t[key]} onClick={() => { setPanel(key); if (key === 'history' && !historyLoaded && !historyRequest.current) void readHistory() }}><span aria-hidden="true">{icons[key]}</span><span>{t[key]}</span></Button>)}</nav>
    </div>
    <div className="shelter-status" role="status">{busy ? t.saving : pending ? t.pending : `${t.total}: ${Math.floor(state.focusSeconds / 60)} ${t.minutes} · ${t.sessions}: ${state.completedSessions}`}</div>
    {corruptAction && <div role="alert"><p>{t.corruptTimer}</p><Button onClick={resetUnreadable}>{t.resetTimer}</Button></div>}
    {(error || storageError) && <div className="shelter-error" role="alert"><p>{error === 'stale' ? t.stale : error === 'action' ? t.error : error ? t.saveError : t.timerStorage}</p>
      {pending && !busy && error !== 'stale' && <Button onClick={() => setRetry(value => value + 1)}>{t.retry}</Button>}
      {error === 'stale' && <Button disabled={busy} onClick={() => void refresh()}>{t.refresh}</Button>}
      {error === 'stale' && timer?.pending && state.revision > timer.pending.revision && <Button disabled={busy} onClick={() => {
        if (window.confirm(t.reviewConfirm)) { setTimer({ ...timer, pending: { ...timer.pending!, revision: state.revision } }); setError('') }
      }}>{t.reviewFocus}</Button>}
    </div>}
    {panel && <GameWindow title={t[panel]} open onClose={() => { setPanel(null); setCustomPack(false) }} closeLabel={t.close}>
      {locked && panel !== 'settings' && panel !== 'history' && panel !== 'journal' && <p>{active ? t.activeJobs : t.pending}</p>}
      {panel === 'settings' && <div className="shelter-list"><label>{t.language}<select value={state.language} disabled={blocked} onChange={event => send({ type: 'language', language: event.target.value as Language })}><option value="en">English</option><option value="th">ไทย</option></select></label><p>{t.languageHint}</p><Button disabled={blocked || active} onClick={() => void refresh()}>{t.refresh}</Button><LegacyCleanup userId={userId} language={state.language} disabled={locked}/></div>}
      {panel === 'crew' && <div className="shelter-list">{state.survivors.map(person => <article key={person.id} className="shelter-person">
        <h3>{name(person.id)} · {t.hp} {person.hp}/{person.maxHp}</h3><p>{t.personal}: {t[person.personalSkill]} · {t.general}: {t[person.generalSkill]}</p>
        <p>{person.job ? `${t[person.job.kind]} · ${person.job.seconds}/${jobs[person.job.kind].seconds}s` : expedition?.team.includes(person.id) ? t.outside : t.idle}</p>
        {!person.job && !expedition?.team.includes(person.id) && <label>{t.job}<select disabled={locked} value="" onChange={event => { if (event.target.value) send({ type: 'assign', survivor: person.id, job: event.target.value as Job }) }}><option value="">{t.job}</option>{(Object.keys(jobs) as Job[]).filter(job => job !== 'repair' && job !== 'train' && (job !== 'bulwark' || hasBlueprint(state))).map(job => <option value={job} key={job}>{t[job]} · {jobs[job].wood} {t.wood}, {jobs[job].stone} {t.stone}, {jobs[job].seconds / 60} {t.minutes}</option>)}</select></label>}
        {!person.job && !expedition?.team.includes(person.id) && <label>{t.train}<select disabled={locked} value="" onChange={event => { if (event.target.value) send({ type: 'assign', survivor: person.id, job: 'train', skill: event.target.value as Skill }) }}><option value="">{t.train} / 10 {t.minutes}</option>{availableSkills(state).filter(skill => skill !== person.generalSkill).map(skill => <option value={skill} key={skill}>{t[skill]}</option>)}</select></label>}
        {(['weapon', 'armor'] as const).map(slot => <label key={slot}>{t[slot]}<select disabled={locked || Boolean(person.job)} value={person.equipment[slot]?.id ?? ''} onChange={event => send({ type: 'equip', survivor: person.id, slot, gearId: event.target.value || null })}>
          <option value="">{t.none}</option>{person.equipment[slot] && <option value={person.equipment[slot]!.id}>{t[person.equipment[slot]!.kind]} · {person.equipment[slot]!.durability}/10</option>}
          {(expedition?.team.includes(person.id) ? expedition.gear : state.armory).filter(gear => equippable(gear.kind, slot)).map(gear => <option key={gear.id} value={gear.id}>{t[gear.kind]} · {gear.durability}/10</option>)}</select></label>)}
        <div className="shelter-actions"><Button disabled={locked || Boolean(person.job)} variant="secondary" onClick={() => send({ type: 'usable', survivor: person.id, equipped: !person.equipment.usable })}>{person.equipment.usable ? t.unequip : t.equip} · {t.medicine}</Button>
          <Button disabled={locked || !person.equipment.usable || person.hp === person.maxHp} variant="secondary" onClick={() => send({ type: 'heal', survivor: person.id })}>{t.heal}</Button></div>
      </article>)}</div>}
      {panel === 'stores' && <div className="shelter-list"><p>{inventorySlots(state.inventory) + gearSlots(state.armory)}/{state.storage} {t.slots}</p>{items.map(item => <div className="shelter-row" key={item}><span>{t[item]}: {state.inventory[item]}</span><Button variant="secondary" disabled={locked || !state.inventory[item]} onClick={() => send({ type: 'discard', item, quantity: 1 })}>{t.discard}</Button></div>)}
        {state.armory.map(gear => <div className="shelter-row" key={gear.id}><span>{t[gear.kind]} · {gearSlots([gear])} {t.slots}{equippable(gear.kind, 'weapon') || equippable(gear.kind, 'armor') ? ` · ${t.durability} ${gear.durability}/10` : ''}</span>{(equippable(gear.kind, 'weapon') || equippable(gear.kind, 'armor')) && <Button disabled={locked || gear.durability === 10 || !state.survivors.some(person => !person.job && !expedition?.team.includes(person.id))} variant="secondary" onClick={() => { const worker = state.survivors.find(person => !person.job && !expedition?.team.includes(person.id)); if (worker) send({ type: 'assign', survivor: worker.id, job: 'repair', gearId: gear.id }) }}>{t.repair} · 1 {t.wood}, 1 {t.stone}, 5 {t.minutes}</Button>}<Button disabled={locked || state.survivors.some(person => person.job?.gearId === gear.id) || gear.kind === 'blueprint' && state.armory.filter(item => item.kind === 'blueprint').length === 1 && state.survivors.some(person => person.job?.kind === 'bulwark')} variant="secondary" onClick={() => send({ type: 'discardGear', gearId: gear.id })}>{t.discard}</Button></div>)}
      </div>}
      {panel === 'explore' && <div className="shelter-list">{!expedition ? <>
        <label>{t.explore}<select value={area} disabled={locked} onChange={event => setArea(event.target.value as AreaId)}>{(Object.keys(areas) as AreaId[]).map(id => <option key={id} value={id} disabled={Boolean(areas[id].requires && !state.knowledge.includes(areas[id].requires!))}>{t[id]} · {areas[id].events.length} {t.event}</option>)}</select></label>
        <fieldset><legend>{t.team}</legend>{state.survivors.filter(person => !person.job).map(person => <label className="shelter-check" key={person.id}><input type="checkbox" disabled={locked || !team.includes(person.id) && team.length === 3} checked={team.includes(person.id)} onChange={event => setTeam(current => event.target.checked ? [...current, person.id] : current.filter(id => id !== person.id))}/>{name(person.id)} · {t.hp} {person.hp}/{person.maxHp}</label>)}</fieldset>
        <label>{t.supply}<input type="number" min="1" max={state.inventory.provisions} value={provisions} disabled={locked} onChange={event => setProvisions(Number(event.target.value))}/></label>
        <p>{t.slots}: {Math.min(10, team.length * 4)} · {inventorySlots(state.inventory) + gearSlots(state.armory)}/{state.storage} {t.stores}</p>
        <Button disabled={locked || !team.length} onClick={() => { send({ type: 'depart', team, provisions, area }); setCustomPack(false) }}>{t.depart}</Button>
      </> : <>
        <p>{t[expedition.area]} · {t.event} {Math.min(expedition.event + 1, areas[expedition.area].events.length)}/{areas[expedition.area].events.length}</p>
        <p>{inventorySlots(expedition.inventory) + gearSlots(expedition.gear)}/{expeditionCapacity(state)} {t.slots} · {items.map(item => `${t[item]} ${expedition.inventory[item]}`).join(' · ')}</p>
        <Button disabled={locked} variant="secondary" onClick={choosePack}>{t.leave}</Button>{packControls}
        {preview ? <><p>{eventText(preview.id, state.language)}</p><label>{t.actor}<select value={acting} disabled={locked} onChange={event => setActor(event.target.value)}>{expedition.team.map(id => <option key={id} value={id}>{name(id)}</option>)}</select></label>
          <label>{t.explore}<select value={approach} disabled={locked} onChange={event => setApproach(event.target.value as Approach)}>{(['quiet', 'force', 'observe'] as const).map(choice => <option value={choice} key={choice}>{t[choice]}</option>)}</select></label>
          <p>{t[preview.noise]} · {preview.provisions} {t.provisions} · {t.durability} −{preview.wear}</p>
          {preview.damage.map(damage => <p key={damage.survivor}>{name(damage.survivor)}: {t.damage} {damage.minimum}–{damage.maximum} {damage.possibleDeath && <strong>{t.death}</strong>}</p>)}
          <p>{t.specialLoot}: {preview.specialLoot.length ? preview.specialLoot.map(kind => `${t[kind]} (${gearSlots([{ id: kind, kind, durability: 0 }])} ${t.slots})`).join(' / ') : t.none}</p><p>{t.loot}: {items.filter(item => preview.loot[item]).map(item => `${t[item]} ${preview.loot[item]}`).join(' · ')}</p>
          <Button disabled={locked || expedition.inventory.provisions < preview.provisions} onClick={() => { send({ type: 'choose', event: expedition.event, actor: acting, approach, ...(customPack ? { pack } : {}) }); setCustomPack(false) }}>{t.confirm}</Button>
        </> : <p>{t.areaDone}</p>}
        {expedition.location && state.sites[expedition.location]?.survivors.map(person => <article key={person.id}><p>{t.waiting}</p><p>{t.escortHint}</p>{expedition.team.map(helper => <Button key={helper} disabled={locked || expedition.escorted.some(escort => escort.helper === helper)} variant="secondary" onClick={() => send({ type: 'rescue', survivor: person.id, helper, ...(customPack ? { pack } : {}) })}>{t.rescue} · {name(helper)}</Button>)}</article>)}
        {expedition.location && <article><h3>{t.collect}</h3>{items.filter(item => state.sites[expedition.location!]?.inventory[item]).map(item => <Button key={item} disabled={locked} variant="secondary" onClick={() => send({ type: 'collect', inventory: { ...emptyInventory(), [item]: 1 }, gearIds: [] })}>{t[item]}: {state.sites[expedition.location!].inventory[item]} · +1</Button>)}
          {state.sites[expedition.location]?.gear.map(gear => <Button key={gear.id} disabled={locked} onClick={() => send({ type: 'collect', inventory: emptyInventory(), gearIds: [gear.id] })}>{t[gear.kind]} · {gearSlots([gear])} {t.slots}</Button>)}</article>}
        <article><p>{t.returnHint}</p><p>{expedition.gear.filter(gear => previewReturn(state).gearIds.includes(gear.id)).map(gear => t[gear.kind]).join(' / ')}</p><p>{items.map(item => `${t[item]} ${previewReturn(state).inventory[item]}`).join(' · ')}</p><Button disabled={locked} onClick={() => { send({ type: 'return', ...(customPack ? { take: pack } : {}) }); setCustomPack(false); setTeam([]) }}>{t.return}</Button></article>
      </>}
        <h3>{t.location}</h3>{Object.entries(state.sites).filter(([, site]) => inventorySlots(site.inventory) || gearSlots(site.gear) || site.survivors.length).map(([location, site]) => <p key={location}>{t[location.split(':')[0] as AreaId]} · {t.event} {Number(location.split(':')[1]) + 1}: {inventorySlots(site.inventory) + gearSlots(site.gear)} {t.slots}, {site.survivors.length} {t.traveler}</p>)}<p>{t.resetRisk}</p>
      </div>}
      {panel === 'journal' && <ShelterJournal knowledge={state.knowledge} language={state.language}/>}
      {panel === 'history' && <div className="shelter-list"><p>{t.total}: {Math.floor(state.focusSeconds / 60)} {t.minutes} · {t.sessions}: {state.completedSessions}</p><Button disabled={historyBusy} variant="secondary" onClick={() => void readHistory(true)}>{t.refresh}</Button>{history.map(row => <article key={row.id}><h3>{row.title}</h3><p>{new Intl.DateTimeFormat(state.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(row.completedAt))} · {clock(row.seconds)} · {row.completed ? t.saved : t.partial}</p></article>)}
        {!history.length && historyLoaded && <p>{t.empty}</p>}{historyBusy && <p role="status">{t.loading}</p>}{historyError && <p role="alert">{t.loadError}</p>}{(historyError || historyCursor) && <Button disabled={historyBusy} onClick={() => void readHistory()}>{historyError ? t.retry : t.more}</Button>}
      </div>}
      {(error || busy) && <p role={error ? 'alert' : 'status'}>{busy ? t.saving : error === 'stale' ? t.stale : error === 'action' ? t.error : t.saveError}</p>}
      {error && pending && !busy && error !== 'stale' && <Button onClick={() => setRetry(value => value + 1)}>{t.retry}</Button>}
    </GameWindow>}
  </section>
}
