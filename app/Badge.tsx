import {LABELS,SYMBOLS} from '../src/chess.mjs';
export default function Badge({kind,large=false}:{kind:string;large?:boolean}) {
  const labels:Record<string,string>=LABELS, symbols:Record<string,string>=SYMBOLS;
  return <span className={`move-badge ${kind} ${large?'large':''}`} title={labels[kind]} aria-label={labels[kind]}>
    {kind==='book'?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5C8 3 5 3 2 4v16c3-1 6-1 9 1V5Zm2 0c3-2 6-2 9-1v16c-3-1-6-1-9 1V5Z" fill="currentColor"/></svg>:
      kind==='excellent'?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h4v11H3zm6 0 4-8c2-1 3 1 2 4l-1 3h6c2 0 2 2 1 4l-2 7c0 1-1 1-2 1H9V10Z" fill="currentColor"/></svg>:
      kind==='good'?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>:
      kind==='best'?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1 3.3 7 7.7 1-5.6 5.4 1.4 7.6-6.8-3.8L5.2 22l1.4-7.6L1 9l7.7-1Z" fill="currentColor"/></svg>:
      kind==='miss'?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg>:symbols[kind]}
  </span>;
}
