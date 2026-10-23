/* oxlint-disable react/only-export-components -- Preview fixtures export state metadata, not a Fast Refresh boundary. */
import { AccountView } from '@/components/account-view'
import { ToastPreview } from '@/dev/toast-preview'

function AccountPreview({ signedIn = false, owner = false, busy = false, error = null, toast = false, thai = false }: {
  signedIn?: boolean; owner?: boolean; busy?: boolean; error?: unknown; toast?: boolean; thai?: boolean
}) {
  const view = <AccountView signedIn={signedIn} owner={owner} busy={busy} error={error} onAction={() => {}}/>
  return toast ? <ToastPreview thai={thai}>{view}</ToastPreview> : view
}

function LoginPreview() { return <AccountPreview/> }

export default { Default: LoginPreview, cases: {
  'Access denied': () => <AccountPreview signedIn/>,
  'Signing in': () => <AccountPreview busy/>,
  'Signing out': () => <AccountPreview signedIn owner busy/>,
  'Account error': () => <AccountPreview error={{ code: 'auth/restore-failed' }}/>,
  'Connection error': () => <AccountPreview error={{ code: 'auth/network-request-failed' }}/>,
  'Sign-in expired': () => <AccountPreview error={{ code: 'auth/invalid-redirect' }}/>,
  'Sign-in limited': () => <AccountPreview error={{ code: 'auth/too-many-requests' }}/>,
  'Sign-in cancelled': () => <AccountPreview error={{ code: 'auth/sign-in-cancelled' }}/>,
  'Toast notification': () => <AccountPreview toast/>,
  'Toast notification (Thai)': () => <AccountPreview toast thai/>,
} }
