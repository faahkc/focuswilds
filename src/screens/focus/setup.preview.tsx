/* oxlint-disable react/only-export-components -- Preview fixture exports discovery metadata. */
import { useState } from 'react'
import OwnerGame from '@/components/owner-game'
import FocusSetupPage from './setup'
import ActiveFocusPage from './active'
import FocusSummaryPage from './summary'
import RestPage from './rest'
import { useFocusRound } from '@/hooks/use-focus-round'
import { initialFocusSetup, type FocusSetup } from '@/lib/focus-setup'

function SetupPreview({ initial = initialFocusSetup }: { initial?: FocusSetup }) {
  const [value, setValue] = useState(initial)
  const [home, setHome] = useState(false)
  const timer = useFocusRound(false)
  const rest = useFocusRound(false, 'rest')
  if (home) return <OwnerGame preview onSignOut={() => {}}/>
  if (rest.round) return <RestPage round={rest.round} now={rest.now} onAction={rest.action} onFocus={() => { rest.close(); timer.close() }} onHome={() => { rest.close(); timer.close(); setHome(true) }} onSignOut={() => rest.action('pause')}/>
  if (timer.round?.status === 'finished') return <FocusSummaryPage round={timer.round} onRest={minutes => rest.start({ title: '', mode: 'down', minutes })} onHome={() => { timer.close(); setHome(true) }}/>
  if (timer.round) return <ActiveFocusPage round={timer.round} now={timer.now} onAction={timer.action} onSignOut={() => {}}/>
  return <FocusSetupPage value={value} onChange={setValue} onBack={() => setValue(initialFocusSetup)} onStart={() => timer.start(value)}/>
}
export default { Default: SetupPreview, cases: {
  'Count up': () => <SetupPreview initial={{ ...initialFocusSetup, mode: 'up' }}/>,
  'Custom duration': () => <SetupPreview initial={{ ...initialFocusSetup, minutes: 75 }}/>,
  'Thai task': () => <SetupPreview initial={{ ...initialFocusSetup, title: 'อ่านหนังสือ เตรียมงานให้เสร็จ' }}/>,
} }
