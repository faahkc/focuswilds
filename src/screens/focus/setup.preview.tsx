/* oxlint-disable react/only-export-components -- Preview fixture exports discovery metadata. */
import { useState } from 'react'
import FocusSetupPage from './setup'
import { initialFocusSetup, type FocusSetup } from '@/lib/focus-setup'

function SetupPreview({ initial = initialFocusSetup }: { initial?: FocusSetup }) {
  const [value, setValue] = useState(initial)
  return <FocusSetupPage value={value} onChange={setValue} onBack={() => setValue(initialFocusSetup)}/>
}
export default { Default: SetupPreview, cases: {
  'Count up': () => <SetupPreview initial={{ ...initialFocusSetup, mode: 'up' }}/>,
  'Custom duration': () => <SetupPreview initial={{ ...initialFocusSetup, minutes: 75 }}/>,
  'Thai task': () => <SetupPreview initial={{ ...initialFocusSetup, title: 'อ่านหนังสือ เตรียมงานให้เสร็จ' }}/>,
} }
