'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Chess} from 'chess.js';
import Piece from './Piece';
import Badge from './Badge';
import {boardMotion,pointerSquare,squarePoint} from '../src/board-motion.mjs';

import {moveSound,playCue} from '../src/board-sound.mjs';
import {arrowPath,markStyle} from '../src/board-marks.mjs';

const names:Record<string,string>={k:'rei',q:'dama',r:'torre',b:'bispo',n:'cavalo',p:'peão'};
type Props={sound:boolean;clearMarks:number;fen:string;flipped:boolean;selected:string;setSelected:(s:string)=>void;move:(from:string,to:string)=>void;last:any;classification:any};
export default function Board({sound,clearMarks,fen,flipped,selected,setSelected,move,last,classification}:Props){
  const audio=useRef<AudioContext|null>(null),enabled=useRef(sound);
  enabled.current=sound;
  const [arrows,setArrows]=useState<{from:string;to:string;color:string;name:string}[]>([]),[draft,setDraft]=useState<{from:string;to:string;color:string;name:string}|null>(null);
  useEffect(()=>{setArrows([]);setDraft(null);},[fen,clearMarks]);
  useEffect(()=>{
    const unlock=()=>{if(!enabled.current)return;try{audio.current??=new AudioContext();if(audio.current.state==='suspended')void audio.current.resume().catch(()=>{});}catch{}};
    document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
    return ()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);void audio.current?.close().catch(()=>{});audio.current=null;};
  },[]);
  const root=useRef<HTMLDivElement>(null),previous=useRef({fen,flipped});
  const active=useRef<any>(null),skipClick=useRef(false),dropped=useRef('');
  const [drag,setDrag]=useState<any>(null);
  const chess=new Chess(fen),legal=selected?chess.moves({square:selected as any,verbose:true}):[];
  const files=(flipped?'hgfedcba':'abcdefgh').split(''),ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
  useLayoutEffect(()=>{
    active.current=null;setDrag(null);
    const old=previous.current;previous.current={fen,flipped};
    const animations:Animation[]=[];
    if(sound&&audio.current&&old.fen!==fen){const cue=moveSound(old.fen,fen);if(cue)playCue(audio.current,cue);}
    if(old.flipped===flipped&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      const size=(root.current?.getBoundingClientRect().width||0)/8;
      for(const path of boardMotion(old.fen,fen)){
        if(path.to===dropped.current)continue;
        const el=root.current?.querySelector(`[data-piece-square="${path.to}"]`);
        const [x,y]=squarePoint(path.from,flipped),[nx,ny]=squarePoint(path.to,flipped);
        if(el)animations.push(el.animate([{transform:`translate(${(x-nx)*size}px, ${(y-ny)*size}px)`,zIndex:4},{transform:'translate(0,0)',zIndex:4}],{duration:190,easing:'cubic-bezier(.2,.75,.25,1)'}));
      }
    }
    dropped.current='';
    return ()=>animations.forEach(a=>a.cancel());
  },[fen,flipped]);
  function cancel(){active.current=null;setDrag(null);setDraft(null);}
  return <div ref={root} className={`board interactive-board ${drag?'is-dragging':''}`} aria-label="Tabuleiro de xadrez" onContextMenu={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()}
    onPointerMove={e=>{const a=active.current;if(!a||a.id!==e.pointerId)return;if(a.arrow){const to=pointerSquare(e.clientX,e.clientY,root.current!.getBoundingClientRect(),flipped),style=markStyle(a,false);setDraft(to?{from:a.from,to,...style}:null);return;}if(!a.moved&&Math.hypot(e.clientX-a.startX,e.clientY-a.startY)<5)return;root.current?.setPointerCapture(e.pointerId);a.moved=true;setSelected(a.from);const rect=root.current!.getBoundingClientRect();setDrag({...a,x:e.clientX-rect.left,y:e.clientY-rect.top,target:pointerSquare(e.clientX,e.clientY,rect,flipped)});}}
    onPointerUp={e=>{const a=active.current;if(!a||a.id!==e.pointerId)return;active.current=null;setDrag(null);if(a.arrow){const to=pointerSquare(e.clientX,e.clientY,root.current!.getBoundingClientRect(),flipped);setDraft(null);if(to){const style=markStyle(a,to===a.from);setArrows(items=>items.some(item=>item.from===a.from&&item.to===to&&item.name===style.name)?items.filter(item=>item.from!==a.from||item.to!==to||item.name!==style.name):[...items,{from:a.from,to,...style}]);}if(root.current?.hasPointerCapture(e.pointerId))root.current.releasePointerCapture(e.pointerId);return;}if(a.moved){skipClick.current=true;const target=pointerSquare(e.clientX,e.clientY,root.current!.getBoundingClientRect(),flipped);if(target){dropped.current=target;move(a.from,target);}else setSelected('');}if(root.current?.hasPointerCapture(e.pointerId))root.current.releasePointerCapture(e.pointerId);}}
    onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={e=>{if(e.key==='Escape'){cancel();setSelected('');setArrows([]);}}}>
    {ranks.flatMap((rank,ri)=>files.map((file,fi)=>{
      const square=file+rank,p=chess.get(square as any),target=legal.some(m=>m.to===square),check=p?.type==='k'&&p.color===chess.turn()&&chess.isCheck(),marks=[...arrows,...(draft?[draft]:[])].filter(a=>a.from===square&&a.to===square);
      return <button key={square} className={`square ${(file.charCodeAt(0)-97+rank)%2===1?'dark':'light'} ${selected===square?'selected':''} ${last&&[last.from,last.to].includes(square)?'last':''} ${check?'check':''} ${drag?.target===square?'drop-hover':''}`}
        aria-label={`${square}${p?`, ${names[p.type]} ${p.color==='w'?'branco':'preto'}`:''}${target?', destino possível':''}`} draggable={false}
        onPointerDown={e=>{skipClick.current=false;if(e.button===2){e.preventDefault();const style=markStyle(e,true);active.current={arrow:true,from:square,id:e.pointerId,shiftKey:e.shiftKey,altKey:e.altKey,ctrlKey:e.ctrlKey,...style};setDraft({from:square,to:square,...style});root.current?.setPointerCapture(e.pointerId);return;}if(e.button===0)setArrows([]);if(e.button!==0||!e.isPrimary||!p||p.color!==chess.turn())return;active.current={from:square,piece:p,id:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};}}
        onClick={()=>{if(skipClick.current){skipClick.current=false;return;}selected?move(selected,square):setSelected(p?.color===chess.turn()?square:'');}}>
        {marks.map((mark,i)=><span key={i} className="square-mark" style={{background:mark.color}}/>)}
        {fi===0&&<span className="rank">{rank}</span>}{ri===7&&<span className="file">{file}</span>}
        {target&&<span className={p?'capture-target':'target'}/>}
        
      </button>;
    }))}
    <div className="piece-layer" aria-hidden="true">{chess.board().flat().filter(Boolean).map((p:any)=>{const [x,y]=squarePoint(p.square,flipped);return <div key={p.square} data-piece-square={p.square} className="board-piece" style={{left:`${x*12.5}%`,top:`${y*12.5}%`,visibility:drag?.from===p.square?'hidden':'visible'}}><Piece type={p.type} color={p.color}/>{chess.isCheckmate()&&p.type==='k'&&p.color===chess.turn()&&<span className="mate-symbol">#</span>}{classification&&last?.to===p.square&&<span className="board-badge"><Badge kind={classification.kind} large/></span>}</div>;})}</div>
    <svg className="board-arrows" viewBox="0 0 800 800" aria-label={arrows.length?arrows.map(a=>a.from===a.to?'Casa '+a.from+' marcada em '+a.name:'Seta '+a.name+' de '+a.from+' para '+a.to).join('; '):'Sem marcações'} role="img">
      {[...arrows,...(draft?[draft]:[])].map((a,i)=>{const [x,y]=squarePoint(a.from,flipped),[tx,ty]=squarePoint(a.to,flipped),knight=(Math.abs(x-tx)===1&&Math.abs(y-ty)===2)||(Math.abs(x-tx)===2&&Math.abs(y-ty)===1);if(a.from===a.to)return null;if(knight){const shape=arrowPath({x:x*100+50,y:y*100+50},{x:tx*100+50,y:ty*100+50},true) as any;return <g key={i} fill={a.color} opacity=".78"><path d={shape.tail} fill="none" stroke={a.color} strokeWidth="31" strokeLinejoin="miter"/><path d={shape.triangle}/></g>;}return <path key={i} d={arrowPath({x:x*100+50,y:y*100+50},{x:tx*100+50,y:ty*100+50}) as string} fill={a.color} opacity=".78"/>;})}
    </svg>
    {drag&&<div className="drag-piece" aria-hidden="true" style={{left:drag.x,top:drag.y}}><Piece type={drag.piece.type} color={drag.piece.color}/></div>}
  </div>;
}
