/* oxlint-disable react/only-export-components -- Preview fixtures export presentation cases. */
import FocusSummaryPage from './summary'
import { startRound, type FocusRound } from '@/lib/focus-round'
import { initialFocusSetup } from '@/lib/focus-setup'

const base: FocusRound = { ...startRound(initialFocusSetup, 0), status: 'finished', startedAt: null, elapsedMs: 1_500_000 }
function SummaryPreview({ round = base, recoverable = true }: { round?: FocusRound; recoverable?: boolean }) {
  return <FocusSummaryPage round={round} recoverable={recoverable} onHome={() => {}}/>
}
export default { Default: SummaryPreview, cases: {
  'Short round': () => <SummaryPreview round={{ ...base, elapsedMs: 12_000 }}/>,
  'Count up': () => <SummaryPreview round={{ ...base, setup: { ...base.setup, mode: 'up' }, elapsedMs: 3_723_000 }}/>,
  'Long Thai task': () => <SummaryPreview round={{ ...base, setup: { ...base.setup, title: 'อ่านหนังสือและเตรียมงานให้เสร็จ '.repeat(3) } }}/>,
  'Recovery unavailable': () => <SummaryPreview recoverable={false}/>,
} }
