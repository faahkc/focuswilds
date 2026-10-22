/* oxlint-disable react/only-export-components -- Preview fixtures export presentation cases. */
import FocusSummaryPage from './summary'
import { useFocusRound } from '@/components/use-focus-round'
import RestPage from './rest'
import { startRound, type FocusRound } from '@/lib/focus-round'
import { initialFocusSetup } from '@/lib/focus-setup'

const base: FocusRound = { ...startRound(initialFocusSetup, 0), status: 'finished', startedAt: null, elapsedMs: 1_500_000 }
function SummaryPreview({ round = base, recoverable = true }: { round?: FocusRound; recoverable?: boolean }) {
  const rest = useFocusRound(false, 'rest')
  if (rest.round) return <RestPage round={rest.round} now={rest.now} onAction={rest.action} onHome={rest.close} onFocus={rest.close} onSignOut={() => {}}/>
  return <FocusSummaryPage round={round} recoverable={recoverable} onRest={minutes => rest.start({ title: '', mode: 'down', minutes })} onHome={() => {}}/>
}
export default { Default: SummaryPreview, cases: {
  'Short round': () => <SummaryPreview round={{ ...base, elapsedMs: 12_000 }}/>,
  'Count up': () => <SummaryPreview round={{ ...base, setup: { ...base.setup, mode: 'up' }, elapsedMs: 3_723_000 }}/>,
  'Long Thai task': () => <SummaryPreview round={{ ...base, setup: { ...base.setup, title: 'อ่านหนังสือและเตรียมงานให้เสร็จ '.repeat(3) } }}/>,
  'Recovery unavailable': () => <SummaryPreview recoverable={false}/>,
} }
