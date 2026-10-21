import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { PixelIcon } from './pixel-icon'
import { editText } from '@/lib/text-edit'
import './game-keyboard.css'

const english = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm,./']
const capitals = ['!@#$%^&*()', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM<>?']
const symbols = ['1234567890', '!@#$%^&*()', '-_+=[]{};:', '\'"\\|`~,./<>?']
const thai = ['ๅ/-ภถุึคตจขช', 'ๆไำพะัีรนยบลฃ', 'ฟหกดเ้่าสวง', 'ผปแอิืทมใฝ']
const thaiShift = ['+๑๒๓๔ู฿๕๖๗๘๙', '๐"ฎฑธํ๊ณฯญฐ,ฅ', 'ฤฆฏโฌ็๋ษศซ.', '()ฉฮฺ์?ฒฬฦ']

export function GameKeyboard({ label, value, numeric, maxLength, helpText, validate, onDone, onCancel }: {
  label: string; value: string; numeric: boolean; maxLength?: number; helpText?: string; validate?: (value: string) => string
  onDone: (value: string) => void; onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const number = useRef<HTMLOutputElement>(null)
  const replaceNumber = useRef(true)
  const [draft, setDraft] = useState(value)
  const [language, setLanguage] = useState<'en' | 'th'>('en')
  const [shift, setShift] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const [systemKeyboard, setSystemKeyboard] = useState(false)
  const id = useId()
  const validationError = validate?.(draft) ?? ''
  const error = numeric && draft === '' ? '' : validationError
  useEffect(() => {
    const element = dialog.current!
    const fullHeight = window.innerHeight
    element.showModal()
    if (numeric) number.current?.focus({ preventScroll: true })
    input.current?.focus({ preventScroll: true })
    input.current?.setSelectionRange(numeric ? 0 : value.length, value.length)
    const viewport = window.visualViewport
    const fit = () => {
      const height = viewport?.height ?? window.innerHeight
      element.style.setProperty('--editor-height', `${height}px`)
      element.style.setProperty('--editor-top', `${viewport?.offsetTop ?? 0}px`)
      setSystemKeyboard(height < (viewport ? window.innerHeight : fullHeight) - 100)
    }
    fit()
    viewport?.addEventListener('resize', fit)
    viewport?.addEventListener('scroll', fit)
    window.addEventListener('resize', fit)
    return () => { viewport?.removeEventListener('resize', fit); viewport?.removeEventListener('scroll', fit); window.removeEventListener('resize', fit); element.close() }
  }, [value, numeric])

  function type(text: string, backspace = false) {
    if (composing.current) return
    if (numeric) {
      if (text && !/^\d+$/.test(text)) return
      const next = backspace ? draft.slice(0, -1) : text ? replaceNumber.current ? text : draft + text : ''
      if (maxLength !== undefined && next.length > maxLength) return
      setDraft(next)
      replaceNumber.current = false
      return
    }
    const element = input.current!
    const next = editText(draft, element.selectionStart ?? draft.length, element.selectionEnd ?? draft.length, text, backspace)
    setDraft(next.value)
    requestAnimationFrame(() => { element.focus({ preventScroll: true }); element.setSelectionRange(next.caret, next.caret) })
  }
  function cancel() { dialog.current?.close(); onCancel() }
  function done() { if (!validationError && !composing.current) { dialog.current?.close(); onDone(draft) } }
  const rows = numeric ? ['123', '456', '789'] : showSymbols ? symbols : language === 'en' ? shift ? capitals : english : shift ? thaiShift : thai
  const columns = Math.max(...rows.map(row => [...row].length))
  return <dialog ref={dialog} className={`game-editor${numeric ? ' game-editor-numeric' : ''}`} aria-labelledby={`${id}-label`} onCancel={event => { event.preventDefault(); cancel() }} onKeyDown={event => {
    if (!numeric || event.nativeEvent.isComposing || event.ctrlKey || event.altKey || event.metaKey) return
    if (/^\d$/.test(event.key)) { event.preventDefault(); type(event.key) }
    else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); type('', event.key === 'Backspace') }
    else if (event.key === 'Enter' && !(event.target as HTMLElement).closest('button')) { event.preventDefault(); done() }
  }}>
    {numeric && <header className="game-number-header"><h2 id={`${id}-label`}>{label}</h2><Button onClick={cancel}>Back</Button></header>}
    <div className="game-editor-body" role="region" aria-label={numeric ? 'Number editor' : 'Text editor'} tabIndex={0}>
      {numeric ? <output ref={number} className="game-number" tabIndex={0} aria-label={label} aria-invalid={!!error} aria-describedby={error || helpText ? `${id}-message` : undefined}>{draft || '—'}</output> : <><h2 id={`${id}-label`}>{label}</h2>
      <Input ref={input} aria-label={label} value={draft} inputMode="none" autoComplete="off" spellCheck={false} aria-invalid={!!error} aria-describedby={error || helpText ? `${id}-message` : undefined} onChange={event => setDraft(event.target.value)} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }} onKeyDown={event => {
        if (event.key === 'Backspace' && !event.nativeEvent.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey) { event.preventDefault(); type('', true) }
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); done() }
      }}/></>}
      {(error || helpText) && <p className={error ? 'game-editor-error' : 'game-editor-help'} id={`${id}-message`} role="status">{error || helpText}</p>}
    </div>
    {(numeric || !systemKeyboard) && <div className={`game-keyboard${numeric ? ' numeric' : ''}`} aria-label={numeric ? 'Number keyboard' : showSymbols ? 'Symbol keyboard' : `${language === 'en' ? 'English' : 'Thai'} keyboard`}>
      {rows.map((row, index) => <div key={index} className="game-key-row">
        {[...row].map((key, i) => <Button key={i} className="game-key" style={{ flexBasis: `calc((100% - ${(columns - 1) * 2}px) / ${columns})` }} tabIndex={-1} aria-label={key} onPointerDown={event => event.preventDefault()} onClick={() => type(key)}>{key}</Button>)}
      </div>)}
      <div className={`game-key-tools${numeric ? ' numeric' : ''}`}>
        {numeric && <><Button className="game-key" aria-label="Clear number" onPointerDown={event => event.preventDefault()} onClick={() => type('')}><PixelIcon name="clear"/></Button><Button className="game-key" tabIndex={-1} onPointerDown={event => event.preventDefault()} onClick={() => type('0')}>0</Button></>}
        {!numeric && <><Button className="game-key" aria-label={showSymbols ? 'Return to letters' : 'Show symbols'} aria-pressed={showSymbols} onPointerDown={event => event.preventDefault()} onClick={() => setShowSymbols(!showSymbols)}>{showSymbols ? 'ABC' : '#+='}</Button><Button className="game-key" aria-label="Switch keyboard language" onPointerDown={event => event.preventDefault()} onClick={() => { setLanguage(language === 'en' ? 'th' : 'en'); setShowSymbols(false) }}>{language === 'en' ? 'ไทย' : 'EN'}</Button><Button className="game-key" aria-label="Space" onPointerDown={event => event.preventDefault()} onClick={() => type(' ')}>Space</Button><Button className="game-key" aria-label="Shift" aria-pressed={shift} disabled={showSymbols} onPointerDown={event => event.preventDefault()} onClick={() => setShift(!shift)}>Aa</Button></>}
        <Button className="game-key" aria-label={numeric ? 'Delete previous digit' : 'Delete previous character'} onPointerDown={event => event.preventDefault()} onClick={() => type('', true)}>{numeric ? <PixelIcon name="delete"/> : 'Del'}</Button>
      </div>
    </div>}
    <div className="game-editor-actions">{!numeric && <Button onClick={cancel}>Cancel</Button>}<Button disabled={!!validationError} onClick={done}>{numeric ? 'Set duration' : 'Done'}</Button></div>
  </dialog>
}
