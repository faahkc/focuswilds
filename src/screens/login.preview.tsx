/* oxlint-disable react/only-export-components -- Preview fixtures export state metadata, not a Fast Refresh boundary. */
import { AccountView } from '@/components/account-view'

function AccountPreview({ signedIn = false, owner = false, busy = false, error = null }: {
  signedIn?: boolean; owner?: boolean; busy?: boolean; error?: unknown
}) {
  return <AccountView signedIn={signedIn} owner={owner} busy={busy} error={error} onAction={() => {}}/>
}

function LoginPreview() { return <AccountPreview/> }

export default { Default: LoginPreview, cases: {
  'Owner signed in': () => <AccountPreview signedIn owner/>,
  'Access denied': () => <AccountPreview signedIn/>,
  'Signing in': () => <AccountPreview busy/>,
  'Signing out': () => <AccountPreview signedIn owner busy/>,
  'Account error': () => <AccountPreview error={{ code: 'auth/restore-failed' }}/>,
} }
