import type { AreaId } from '@/lib/shelter-content'

function People({ count, traveling = false }: { count: number; traveling?: boolean }) {
  return <g className="fort-people">{Array.from({ length: Math.max(0, Math.min(8, count)) }, (_, index) => <g className="fort-person" key={index} transform={`translate(${traveling ? 270 + index * 25 : [260, 368, 280, 351, 233, 399, 304, 335][index]} ${traveling ? 283 - index * 5 : [253, 252, 294, 294, 275, 276, 222, 223][index]})`}>
    <ellipse cx="0" cy="18" rx="10" ry="3" fill="#10171c"/>
    <path d="M-4-9h9v9h-9z" fill="#bc9677"/><path d="M-5-11h10v5H-5z" fill="#302729"/>
    <path d="M-6 0H7v13H-6z" fill={index % 2 ? '#626c6b' : '#79654e'}/>
    {traveling && <path d="M-9 0h5v11h-5zM8-2h2v22H8z" fill="#9a8058"/>}
    <path d="M-5 13h4v6h-4zm7 0h4v6H2z" fill="#28282b"/>
  </g>)}</g>
}

function ExpeditionStage({ area, people }: { area: AreaId; people: number }) {
  return <svg className="fort-stage expedition-stage" data-area={area} viewBox="0 0 640 360" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
    <defs>
      <linearGradient id="trail-sky" x2="0" y2="1"><stop stopColor={area === 'barrow' ? '#1b1c2b' : '#17272c'}/><stop offset="1" stopColor="#596058"/></linearGradient>
      <radialGradient id="trail-light"><stop stopColor="#a6b8a0" stopOpacity=".16"/><stop offset="1" stopColor="#a6b8a0" stopOpacity="0"/></radialGradient>
    </defs>
    <path fill="url(#trail-sky)" d="M0 0h640v360H0z"/>
    <path d="M462 46h25v7h9v24h-9v7h-25v-7h-8V53h8z" fill="#b5b8a3"/>
    <path d="M0 142l81-64 67 54 92-75 76 90 83-60 90 45 87-63 64 61v230H0z" fill="#27363a"/>
    <path d="M0 213l125-37 112 29 135-40 130 27 138-22v190H0z" fill="#303d36"/>
    <path d="M290 360l55-130 44-28 18 4-37 37-10 117z" fill="#666253"/>
    {area === 'border' ? <g className="trail-border" transform="translate(-60 0)">
      <path d="M394 175h146v66H394zM402 163h20v19h-20zm36 0h20v19h-20zm36 0h20v19h-20zm36 0h20v19h-20z" fill="#444b47"/>
      <path d="M453 200h27v42h-27z" fill="#1b292b"/>
      <path d="M90 262l125-21v9L90 271zm10-13h5v38h-5zm35-8h5v40h-5zm37-7h5v40h-5zm35-7h5v40h-5z" fill="#7c7663"/>
      <path d="M204 260h29v5h-29zm8 9h22v5h-22z" fill="#182424"/>
    </g> : area === 'hollow' ? <g className="trail-hollow" transform="translate(-60 0)">
      <path d="M381 187h100v66H381z" fill="#4d5549"/><path d="M366 188l65-42 65 42z" fill="#6b7060"/>
      <path d="M415 200h31v53h-31z" fill="#182a29"/><path d="M427 210h7v24h-7zm-7 7h21v5h-21z" fill="#a5a47d"/>
      <path d="M380 258h109v7H380zm-8 10h124v7H372z" fill="#636753"/>
      <path d="M100 243q40-32 100-18m-76 34q20-25 67-20" fill="none" stroke="#484a37" strokeWidth="8"/>
    </g> : <g className="trail-barrow" transform="translate(-60 0)">
      <path d="M320 233l30-61 67-29 73 11 55 80z" fill="#42453f"/>
      <path d="M374 179h94v65h-94z" fill="#68695b"/><path d="M384 191h73v53h-73z" fill="#121d22"/>
      <path d="M369 174h104v12H369zm22-16h59v12h-59z" fill="#777668"/>
      <path d="M128 243v-42h18v42zm-10-28h38v8h-38zm399 52v-40h17v40zm-9-29h35v8h-35z" fill="#62665b"/>
      <path d="M397 218h5v16h-5zm19-9h5v15h-5zm19 8h5v17h-5z" fill="#756d53"/>
    </g>}
    <ellipse cx="340" cy="253" rx="169" ry="95" fill="url(#trail-light)"/>
    <People count={people} traveling/>
    <path d="M0 0h29v360H0zm51 0h18v190l-18 58zm520 0h23v251l-23-38zm40 0h29v360h-29z" fill="#101f23"/>
    <path d="M0 88l113-54-9-13L0 67zm52 68l99-61-9-12-90 45zm520-47L482 52l-8 12 98 64zm41 96l-85-55-8 12 93 64z" fill="#101f23"/>
    <path d="M0 324l145-18 108 54H0zm640-12l-123 8-99 40h222z" fill="#101c20"/>
  </svg>
}

export function FortStage({ exterior = false, people = 5, area }: { exterior?: boolean; people?: number; area?: AreaId }) {
  if (area && !exterior) return <ExpeditionStage area={area} people={people}/>
  return <svg className={`fort-stage ${exterior ? 'fort-exterior' : ''}`} viewBox="0 0 640 360" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
    <defs><linearGradient id="fort-sky" x2="0" y2="1"><stop stopColor="#101921"/><stop offset="1" stopColor="#374046"/></linearGradient>
      <radialGradient id="fort-glow"><stop stopColor="#edaa51" stopOpacity=".35"/><stop offset="1" stopColor="#edaa51" stopOpacity="0"/></radialGradient>
      <pattern id="fort-stone" width="48" height="24" patternUnits="userSpaceOnUse"><path d="M0 0h48v24H0z" fill="#303335"/><path d="M0 0h48M0 24h48M24 0v12M0 12h48M12 12v12M40 12v12" stroke="#1e2428" strokeWidth="2"/></pattern>
    </defs>
    <path fill="url(#fort-sky)" d="M0 0h640v360H0z"/>
    <path d="M449 27h25v6h8v23h-8v7h-25v-7h-7V33h7z" fill="#9aaba9"/>
    <path d="M60 46h103v5H60zm334 37h119v4H394z" fill="#536368" opacity=".35"/>
    <path fill="#18252b" d="M0 90l40-35 40 44 52-59 60 59 53-60 49 65 56-45 52 45 75-67 60 64 63-35 40 24v200H0z"/>
    <path fill="#101a20" d="M0 145l48-60 44 72 53-63 44 60 60-46 54 55 70-80 56 70 55-60 58 60 58-72 40 53v180H0z"/>
    <path d="M0 199l320-20 320 20v161H0z" fill="#333236"/>
    <path d="M40 112h560v121H40z" fill="url(#fort-stone)"/>
    <path d="M30 105h66v14H30zm90 0h50v14h-50zm74 0h50v14h-50zm74 0h50v14h-50zm74 0h50v14h-50zm74 0h50v14h-50zm74 0h55v14h-55zm79 0h50v14h-50z" fill="#3e4140"/>
    <path d="M22 80h90v184H22zm506 0h90v184h-90z" fill="url(#fort-stone)"/>
    <path d="M16 70h24v22H16zm36 0h24v22H52zm36 0h30v22H88zm434 0h24v22h-24zm36 0h24v22h-24zm36 0h30v22h-30z" fill="#454644"/>
    <path d="M58 120h17v45H58zm505 0h17v45h-17z" fill="#10181d"/>
    <path d="M49 179h35v4H49zm505 0h35v4h-35zM126 194h26v5h-26zm351-65h30v4h-30z" fill="#596055"/>
    <path d="M100 206h26v8h-26zm-9 9h32v6H91zm434 13h30v7h-30z" fill="#444b3d"/>
    {exterior ? <><path d="M270 157h100v94H270zM284 143h72v20h-72z" fill="#10171b"/><path d="M286 167h68v84h-68z" fill="#352b27"/><path d="M318 167h4v84h-4z" fill="#0e1419"/><path d="M284 360l30-109h12l32 109z" fill="#49413b"/></>
      : <><path d="M150 174h130v78H150zm260-13h96v89h-96z" fill="#252525"/><path d="M139 174l75-37 80 37zm257-13l62-32 63 32z" fill="#453b36"/><path d="M175 205h25v47h-25zm255-15h22v24h-22z" fill="#aa713e"/><path d="M200 276l125-40 123 40-117 42z" fill="#393534"/>
        <ellipse cx="324" cy="275" rx="116" ry="65" fill="url(#fort-glow)"/>
        <path d="M295 280h58v8h-58zm9-9h42v8h-42z" fill="#161c20"/><path d="M308 278l27-13 5 7-28 12zm2-13l31 11-3 8-31-11z" fill="#604733"/>
        <g className="fort-flame"><path d="M314 272v-15h6v-15h7v-12h5v21h7v10h-3v12z" fill="#cf6935"/><path d="M321 273v-14h6v-11h5v15h3v10z" fill="#f4c16b"/></g>
        <path d="M114 267h52v25h-52z" fill="#574537"/><path d="M118 271h44v3h-44zm0 13h44v3h-44z" fill="#796149"/>
        <path d="M461 270h44v21h-44z" fill="#403c2e"/><path d="M467 269v-11m12 11v-17m13 17v-12" stroke="#73794e" strokeWidth="5"/>
        <path d="M227 188h8v37h-8z" fill="#877054"/><path d="M235 188h23v23l-11-6-12 6z" fill="#705447"/>
        <path d="M182 306h21v4h-21zm228-8h24v4h-24zm-58 29h21v3h-21z" fill="#585046"/>
        <People count={people}/></>}
    <path d="M0 315l85-13 82 28 98 30H0zm640-14l-90 8-72 31-55 20h217z" fill="#111a20"/>
  </svg>
}
