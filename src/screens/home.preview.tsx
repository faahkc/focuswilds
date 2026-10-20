/* oxlint-disable react/only-export-components -- Preview fixture exports discovery metadata. */
import HomePage from './home'

function HomePreview() { return <HomePage onSignOut={() => {}}/> }

export default { Default: HomePreview }
