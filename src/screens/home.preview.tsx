/* oxlint-disable react/only-export-components -- Preview fixture exports discovery metadata. */
import OwnerGame from '@/components/owner-game'
import { ToastPreview } from '@/dev/toast-preview'

function HomePreview() { return <OwnerGame onSignOut={() => {}}/> }

export default { Default: HomePreview, cases: {
  'Toast notification': () => <ToastPreview><HomePreview/></ToastPreview>,
  'Toast notification (Thai)': () => <ToastPreview thai><HomePreview/></ToastPreview>,
} }
