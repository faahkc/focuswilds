/* oxlint-disable react/only-export-components -- Preview fixtures export state metadata, not a Fast Refresh boundary. */
import LoginPage from './login'
import { AccountView } from '@/components/account-view'

function AccountPreview({ signedIn = false, owner = false, busy = false, error = null }: {
  signedIn?: boolean; owner?: boolean; busy?: boolean; error?: unknown
}) {
  return <LoginPage><AccountView signedIn={signedIn} owner={owner} busy={busy} error={error} onAction={() => {}}/></LoginPage>
}

function LoginPreview() { return <AccountPreview/> }

export default { Default: LoginPreview, cases: {
  'Owner signed in': () => <AccountPreview signedIn owner/>,
  'Access denied': () => <AccountPreview signedIn/>,
  'Signing in': () => <AccountPreview busy/>,
  'Account error': () => <AccountPreview error={{ code: 'auth/restore-failed' }}/>,
} }
