/* oxlint-disable react/only-export-components -- Preview fixture exports discovery metadata. */
import { useState } from 'react'
import OwnerGame from '@/components/owner-game'
import FocusSetupPage from './setup'
import ActiveFocusPage from './active'
import FocusSummaryPage from './summary'
import { useFocusRound } from '@/components/use-focus-round'
import { initialFocusSetup, type FocusSetup } from '@/lib/focus-setup'

function SetupPreview({ initial = initialFocusSetup }: { initial?: FocusSetup }) {
  const [value, setValue] = useState(initial)
  const [home, setHome] = useState(false)
  const timer = useFocusRound(false)
  if (home) return <OwnerGame preview onSignOut={() => {}}/>
  if (timer.round?.status === 'finished') return <FocusSummaryPage round={timer.round} onHome={() => { timer.close(); setHome(true) }}/>
  if (timer.round) return <ActiveFocusPage round={timer.round} now={timer.now} onAction={timer.action} onSignOut={() => {}}/>
  return <FocusSetupPage value={value} onChange={setValue} onBack={() => setValue(initialFocusSetup)} onStart={() => timer.start(value)}/>
}
export default { Default: SetupPreview, cases: {
  'Count up': () => <SetupPreview initial={{ ...initialFocusSetup, mode: 'up' }}/>,
  'Custom duration': () => <SetupPreview initial={{ ...initialFocusSetup, minutes: 75 }}/>,
  'Thai task': () => <SetupPreview initial={{ ...initialFocusSetup, title: 'อ่านหนังสือ เตรียมงานให้เสร็จ' }}/>,
} }
