/* oxlint-disable react/only-export-components -- Preview fixtures export state metadata, not a Fast Refresh boundary. */
import { AccountView } from '@/components/account-view'
import { UpdateNotice } from '@/components/update-notice'

function AccountPreview({ signedIn = false, owner = false, busy = false, error = null, update = false }: {
  signedIn?: boolean; owner?: boolean; busy?: boolean; error?: unknown; update?: boolean
}) {
  return <><AccountView signedIn={signedIn} owner={owner} busy={busy} error={error} onAction={() => {}}/>{update && <UpdateNotice version="0.2.0" onReload={() => {}} onLater={() => {}}/>}</>
}

function LoginPreview() { return <AccountPreview/> }

export default { Default: LoginPreview, cases: {
  'Owner signed in': () => <AccountPreview signedIn owner/>,
  'Access denied': () => <AccountPreview signedIn/>,
  'Signing in': () => <AccountPreview busy/>,
  'Account error': () => <AccountPreview error={{ code: 'auth/restore-failed' }}/>,
  'Update available': () => <AccountPreview update/>,
} }
