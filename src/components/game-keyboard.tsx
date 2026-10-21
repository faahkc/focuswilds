import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { editText } from '@/lib/text-edit'
import './game-keyboard.css'

const english = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm,./']
const capitals = ['!@#$%^&*()', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM<>?']
const symbols = ['1234567890', '!@#$%^&*()', '-_+=[]{};:', '\'"\\|`~,./<>?']
const thai = ['ๅ/-ภถุึคตจขช', 'ๆไำพะัีรนยบลฃ', 'ฟหกดเ้่าสวง', 'ผปแอิืทมใฝ']
const thaiShift = ['+๑๒๓๔ู฿๕๖๗๘๙', '๐"ฎฑธํ๊ณฯญฐ,ฅ', 'ฤฆฏโฌ็๋ษศซ.', '()ฉฮฺ์?ฒฬฦ']

export function GameKeyboard({ label, value, numeric, validate, onDone, onCancel }: {
  label: string; value: string; numeric: boolean; validate?: (value: string) => string
  onDone: (value: string) => void; onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const composing = useRef(false)
  const [draft, setDraft] = useState(value)
  const [language, setLanguage] = useState<'en' | 'th'>('en')
  const [shift, setShift] = useState(false)
  const [showSymbols, setShowSymbols] = useState(false)
  const [systemKeyboard, setSystemKeyboard] = useState(false)
  const id = useId()
  const error = validate?.(draft) ?? ''
  useEffect(() => {
    const element = dialog.current!
    const fullHeight = window.innerHeight
    element.showModal()
    input.current?.focus({ preventScroll: true })
    input.current?.setSelectionRange(value.length, value.length)
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
  }, [value])

  function type(text: string, backspace = false) {
    if (composing.current) return
    const element = input.current!
    const next = editText(draft, element.selectionStart ?? draft.length, element.selectionEnd ?? draft.length, text, backspace)
    setDraft(next.value)
    requestAnimationFrame(() => { element.focus({ preventScroll: true }); element.setSelectionRange(next.caret, next.caret) })
  }
  function cancel() { dialog.current?.close(); onCancel() }
  function done() { if (!error && !composing.current) { dialog.current?.close(); onDone(draft) } }
  const rows = numeric ? ['123', '456', '789'] : showSymbols ? symbols : language === 'en' ? shift ? capitals : english : shift ? thaiShift : thai
  const columns = Math.max(...rows.map(row => [...row].length))
  return <dialog ref={dialog} className="game-editor" aria-labelledby={`${id}-label`} onCancel={event => { event.preventDefault(); cancel() }}>
    <div className="game-editor-body" role="region" aria-label="Text editor" tabIndex={0}>
      <h2 id={`${id}-label`}>{label}</h2>
      <Input ref={input} aria-label={label} value={draft} inputMode="none" autoComplete="off" spellCheck={false} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={event => setDraft(event.target.value)} onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }} onKeyDown={event => {
        if (event.key === 'Backspace' && !event.nativeEvent.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey) { event.preventDefault(); type('', true) }
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); done() }
      }}/>
      {error && <p className="game-editor-error" id={`${id}-error`} role="status">{error}</p>}
    </div>
    {!systemKeyboard && <div className={`game-keyboard${numeric ? ' numeric' : ''}`} aria-label={numeric ? 'Number keyboard' : showSymbols ? 'Symbol keyboard' : `${language === 'en' ? 'English' : 'Thai'} keyboard`}>
      {rows.map((row, index) => <div key={index} className="game-key-row">
        {[...row].map((key, i) => <Button key={i} className="game-key" style={{ flexBasis: `calc((100% - ${(columns - 1) * 2}px) / ${columns})` }} tabIndex={-1} aria-label={key} onPointerDown={event => event.preventDefault()} onClick={() => type(key)}>{key}</Button>)}
      </div>)}
      <div className={`game-key-tools${numeric ? ' numeric' : ''}`}>
        {numeric && <><Button className="game-key" aria-label="Clear number" onPointerDown={event => event.preventDefault()} onClick={() => { input.current?.setSelectionRange(0, draft.length); type('') }}>Clear</Button><Button className="game-key" tabIndex={-1} onPointerDown={event => event.preventDefault()} onClick={() => type('0')}>0</Button></>}
        {!numeric && <><Button className="game-key" aria-label={showSymbols ? 'Return to letters' : 'Show symbols'} aria-pressed={showSymbols} onPointerDown={event => event.preventDefault()} onClick={() => setShowSymbols(!showSymbols)}>{showSymbols ? 'ABC' : '#+='}</Button><Button className="game-key" aria-label="Switch keyboard language" onPointerDown={event => event.preventDefault()} onClick={() => { setLanguage(language === 'en' ? 'th' : 'en'); setShowSymbols(false) }}>{language === 'en' ? 'ไทย' : 'EN'}</Button><Button className="game-key" aria-label="Space" onPointerDown={event => event.preventDefault()} onClick={() => type(' ')}>Space</Button><Button className="game-key" aria-label="Shift" aria-pressed={shift} disabled={showSymbols} onPointerDown={event => event.preventDefault()} onClick={() => setShift(!shift)}>Aa</Button></>}
        <Button className="game-key" aria-label="Delete previous character" onPointerDown={event => event.preventDefault()} onClick={() => type('', true)}>Del</Button>
      </div>
    </div>}
    <div className="game-editor-actions"><Button onClick={cancel}>Cancel</Button><Button disabled={!!error} onClick={done}>Done</Button></div>
  </dialog>
}
