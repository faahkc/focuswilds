/* oxlint-disable react/only-export-components -- Preview fixtures export state metadata. */
import PageLoading from './loading'

export default { Default: PageLoading, cases: {
  'Updating app': () => <PageLoading message="Loading the latest version…"/>,
  'Signing in': () => <PageLoading message="Signing in…"/>,
  'Loading home': () => <PageLoading message="Loading your home…"/>,
  'Thai message': () => <PageLoading message="กำลังโหลด…"/>,
} }
