/* oxlint-disable react/only-export-components -- Preview fixture exports discovery metadata. */
import HomePage from './home'
import { ToastPreview } from '@/dev/toast-preview'

function HomePreview() { return <HomePage onSignOut={() => {}}/> }

export default { Default: HomePreview, cases: {
  'Toast notification': () => <ToastPreview><HomePreview/></ToastPreview>,
  'Toast notification (Thai)': () => <ToastPreview thai><HomePreview/></ToastPreview>,
} }
