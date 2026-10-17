export function FortStage({ exterior = false, people = 5 }: { exterior?: boolean; people?: number }) {
  return <svg className={`fort-stage ${exterior ? 'fort-exterior' : ''}`} viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" aria-hidden="true">
    <defs><linearGradient id="fort-sky" x2="0" y2="1"><stop stopColor="#101921"/><stop offset="1" stopColor="#374046"/></linearGradient>
      <radialGradient id="fort-glow"><stop stopColor="#edaa51" stopOpacity=".35"/><stop offset="1" stopColor="#edaa51" stopOpacity="0"/></radialGradient>
      <pattern id="fort-stone" width="48" height="24" patternUnits="userSpaceOnUse"><path d="M0 0h48v24H0z" fill="#303335"/><path d="M0 0h48M0 24h48M24 0v12M0 12h48M12 12v12M40 12v12" stroke="#1e2428" strokeWidth="2"/></pattern>
    </defs>
    <path fill="url(#fort-sky)" d="M0 0h640v360H0z"/>
    <path fill="#18252b" d="M0 90l40-35 40 44 52-59 60 59 53-60 49 65 56-45 52 45 75-67 60 64 63-35 40 24v200H0z"/>
    <path fill="#101a20" d="M0 145l48-60 44 72 53-63 44 60 60-46 54 55 70-80 56 70 55-60 58 60 58-72 40 53v180H0z"/>
    <path d="M0 199l320-20 320 20v161H0z" fill="#333236"/>
    <path d="M40 112h560v121H40z" fill="url(#fort-stone)"/>
    <path d="M30 105h66v14H30zm90 0h50v14h-50zm74 0h50v14h-50zm74 0h50v14h-50zm74 0h50v14h-50zm74 0h50v14h-50zm74 0h55v14h-55zm79 0h50v14h-50z" fill="#3e4140"/>
    <path d="M22 80h90v184H22zm506 0h90v184h-90z" fill="url(#fort-stone)"/>
    <path d="M16 70h24v22H16zm36 0h24v22H52zm36 0h30v22H88zm434 0h24v22h-24zm36 0h24v22h-24zm36 0h30v22h-30z" fill="#454644"/>
    <path d="M58 120h17v45H58zm505 0h17v45h-17z" fill="#10181d"/>
    {exterior ? <><path d="M270 157h100v94H270zM284 143h72v20h-72z" fill="#10171b"/><path d="M286 167h68v84h-68z" fill="#352b27"/><path d="M318 167h4v84h-4z" fill="#0e1419"/><path d="M284 360l30-109h12l32 109z" fill="#49413b"/></>
      : <><path d="M150 174h130v78H150zm260-13h96v89h-96z" fill="#252525"/><path d="M139 174l75-37 80 37zm257-13l62-32 63 32z" fill="#453b36"/><path d="M175 205h25v47h-25zm255-15h22v24h-22z" fill="#aa713e"/><path d="M200 276l125-40 123 40-117 42z" fill="#393534"/>
        <ellipse cx="324" cy="275" rx="116" ry="65" fill="url(#fort-glow)"/>
        <path d="M295 280h58v8h-58zm9-9h42v8h-42z" fill="#161c20"/><path d="M308 278l27-13 5 7-28 12zm2-13l31 11-3 8-31-11z" fill="#604733"/>
        <g className="fort-flame"><path d="M314 272v-15h6v-15h7v-12h5v21h7v10h-3v12z" fill="#cf6935"/><path d="M321 273v-14h6v-11h5v15h3v10z" fill="#f4c16b"/></g>
        {Array.from({ length: Math.min(8, people) }, (_, index) => <g key={index} transform={`translate(${[260, 368, 280, 351, 233, 399, 304, 335][index]} ${[253, 252, 294, 294, 275, 276, 222, 223][index]})`}>
          <ellipse cx="0" cy="18" rx="10" ry="3" fill="#151b21"/><path d="M-4-9h9v9h-9z" fill="#bc9677"/><path d="M-5-11h10v5H-5z" fill="#302729"/><path d="M-6 0H7v13H-6z" fill={index % 2 ? '#626c6b' : '#79654e'}/><path d="M-5 13h4v6h-4zm7 0h4v6H2z" fill="#28282b"/>
        </g>)}</>}
    <path d="M0 315l85-13 82 28 98 30H0zm640-14l-90 8-72 31-55 20h217z" fill="#111a20"/>
  </svg>
}
