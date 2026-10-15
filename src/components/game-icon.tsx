export function GameIcon({ name }: { name: 'companion' | 'journal' | 'history' | 'help' }) {
  const paths = {
    companion: 'M3 3h3v4H3zm7 0h3v4h-3zM1 7h3v3H1zm11 0h3v3h-3zM6 7h4v2h2v5H4V9h2z',
    journal: 'M2 1h11v2H4v10h9v2H2zM5 4h9v8H5zm2 2v1h5V6zm0 3v1h4V9z',
    history: 'M3 1h10v2H3zm1 3h8v2h-2v2H6V6H4zm2 5h4v2h2v2H4v-2h2zm-3 5h10v2H3z',
    help: 'M5 1h6v2h2v4h-2v2H9v2H7V7h3V4H6v2H3V3h2zm2 12h3v3H7z',
  }
  return <svg aria-hidden="true" viewBox="0 0 16 16" width="24" height="24" shapeRendering="crispEdges"><path d={paths[name]} fill="currentColor" /></svg>
}
