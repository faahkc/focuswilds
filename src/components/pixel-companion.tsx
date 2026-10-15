import type { CompanionId } from '@/lib/companion'

export function PixelCompanion({ selected, evolved = false }: { selected: CompanionId; evolved?: boolean }) {
  const names = { moss: evolved ? 'Mossgrove' : 'Moss', rabbit: 'Fern Hare', bird: 'Dawn Finch', squirrel: 'Amber Squirrel' }
  const colors = { moss: '#65794f', rabbit: '#a59b7c', bird: '#b39357', squirrel: '#9a6545' }
  return <svg role="img" aria-label={names[selected]} viewBox="0 0 32 36" shapeRendering="crispEdges" className="pixel-companion">
    <path d="M5 32h22v2H5z" fill="#080d10" opacity=".7" />
    {selected === 'moss' && <g>
      <path d="M14 9V5h-4V3h6v2h3V3h6v3h-5v3z" fill="#8d9756" />
      {evolved && <path d="M7 13V7H4V3h2v3h3v5h2v3h10v-3h2V6h3V3h2v4h-3v6z" fill="#bc9b62" />}
    </g>}
    {selected === 'rabbit' && <path d="M9 13V2h4v11h5V1h4v14z" fill={colors[selected]} />}
    {selected === 'bird' && <path d="M14 12V7h3V4h2v4h3v5z" fill="#d1ad68" />}
    {selected === 'squirrel' && <path d="M23 30h6V15h-2v-4h-5v3h3v11h-4z" fill="#754b36" />}
    <path d="M9 11h14v3h3v15h-3v3h-5v-3h-4v3H9v-3H6V16h3z" fill="#17201d" />
    <path d="M10 12h12v3h3v13h-4v3h-3v-3h-5v3h-3v-4H7V17h3z" fill={colors[selected]} />
    <path d="M11 14h10v2H10v7H8v-6h3z" fill="#d0cc9c" opacity=".3" />
    <path d="M12 23h9v5h-9z" fill={selected === 'moss' ? '#a3a876' : '#d0bb8e'} />
    <path d="M11 18h3v3h-3zm9 0h3v3h-3z" fill="#101617" />
    <path d="M12 18h1v1h-1zm9 0h1v1h-1z" fill="#e9ce91" />
    <path d={selected === 'bird' ? 'M15 21h4v2h-2v1h-2z' : 'M15 22h3v2h-3z'} fill={selected === 'bird' ? '#d5a34d' : '#313c2b'} />
    {selected === 'bird' && <path d="M7 22h3v4H7zm16 0h3v4h-3z" fill="#66543c" />}
  </svg>
}
