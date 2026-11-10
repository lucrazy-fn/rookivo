import {Chess} from 'chess.js';

export function squarePoint(square,flipped=false) {
  const x=square.charCodeAt(0)-97,y=8-Number(square[1]);
  return flipped?[7-x,7-y]:[x,y];
}
export function pointerSquare(x,y,rect,flipped=false) {
  if(x<rect.left||y<rect.top||x>=rect.left+rect.width||y>=rect.top+rect.height)return null;
  let file=Math.floor((x-rect.left)/rect.width*8),rank=Math.floor((y-rect.top)/rect.height*8);
  if(flipped){file=7-file;rank=7-rank;}
  return 'abcdefgh'[file]+(8-rank);
}
// Animate only a legal adjacent move (or its undo), never guess across game jumps.
export function boardMotion(previous,next) {
  if(!previous||previous===next)return [];
  for(const reverse of [false,true]) {
    const from=reverse?next:previous,to=reverse?previous:next;
    const match=new Chess(from).moves({verbose:true}).find(m=>m.after.split(' ').slice(0,4).join(' ')===to.split(' ').slice(0,4).join(' '));
    if(!match)continue;
    const paths=[{from:match.from,to:match.to}];
    if(match.flags.includes('k'))paths.push({from:'h'+match.from[1],to:'f'+match.from[1]});
    if(match.flags.includes('q'))paths.push({from:'a'+match.from[1],to:'d'+match.from[1]});
    return reverse?paths.map(p=>({from:p.to,to:p.from})):paths;
  }
  return [];
}
