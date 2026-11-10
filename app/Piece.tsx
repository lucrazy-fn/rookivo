// Original, scalable Staunton-inspired shapes; no remote image requests or font glyphs.
export default function Piece({type,color}:{type:string;color:string}) {
  const fill=color==='w'?'#fffdf4':'#393734';
  const stroke=color==='w'?'#484640':'#181817';
  const accent=color==='w'?'#c9c5b9':'#726e66';
  return <svg viewBox="0 0 100 100" className="chess-piece" aria-hidden="true" focusable="false">
    <g fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
      {type==='p'&&<><circle cx="50" cy="28" r="12"/><path d="M40 41h20l-4 9c-1 12 3 20 10 26H34c7-6 11-14 10-26z"/><path d="M37 43h26v6H37z"/></>}
      {type==='r'&&<><path d="M27 17h11v12h9V17h8v12h9V17h10v25l-9 8 2 26H33l2-26-8-8z"/><path d="M30 42h42M35 51h30" fill="none"/></>}
      {type==='n'&&<><path d="M29 76c2-15 8-24 22-33l-7-3-13 10-10-8 11-19 13-5 4-11 9 10c20 4 27 29 18 59z"/><path d="M51 23c11 8 13 19 10 29M32 39l8-4" fill="none" stroke={accent}/><circle cx="44" cy="29" r="2.5" fill={stroke} stroke="none"/><path d="M29 45l6 2" fill="none"/></>}
      {type==='b'&&<><circle cx="50" cy="14" r="5"/><path d="M50 19c-6 7-18 15-18 25 0 8 9 13 18 13s18-5 18-13c0-10-12-18-18-25z"/><path d="M53 29l-9 17" fill="none" stroke={stroke} strokeWidth="4"/><path d="M42 56h16c-1 9 3 15 9 20H33c6-5 10-11 9-20z"/><path d="M37 54h26v6H37z"/></>}
      {type==='q'&&<><path d="M25 27l12 13 3-21 10 19 10-19 3 21 12-13-8 30H33z"/><circle cx="24" cy="23" r="5"/><circle cx="39" cy="16" r="5"/><circle cx="50" cy="13" r="5"/><circle cx="61" cy="16" r="5"/><circle cx="76" cy="23" r="5"/><path d="M37 55h26l-4 10 8 11H33l8-11z"/><path d="M35 55h30v6H35z"/></>}
      {type==='k'&&<><path d="M46 10h8v8h8v7h-8v9h-8v-9h-8v-7h8z"/><path d="M50 37c-20-18-34 6-19 20l9 5h20l9-5c15-14 1-38-19-20z"/><path d="M50 35v23" fill="none"/><path d="M39 60h22l-3 6 9 10H33l9-10z"/><path d="M36 57h28v6H36z"/></>}
      <path d="M32 75h36l5 8H27z"/><path d="M25 83h50l4 8H21z"/>
      <path d="M30 86h40" fill="none" stroke={accent} strokeWidth="2"/>
    </g>
  </svg>;
}
