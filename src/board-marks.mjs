const colors={yellow:'#f5c542',red:'#d95c59',blue:'#4d86d8',green:'#78a94f'};

export function markStyle(modifiers={},square=false){
  const name=modifiers.shiftKey?'green':modifiers.altKey?'blue':modifiers.ctrlKey?(square?'yellow':'red'):(square?'red':'yellow');
  return {name,color:colors[name]};
}

export function arrowPath(from,to,knight=false){
  if(knight){
    const dx=to.x-from.x,dy=to.y-from.y;
    const elbow=Math.abs(dx)>Math.abs(dy)?{x:to.x,y:from.y}:{x:from.x,y:to.y};
    const turn=Math.abs(dx)>Math.abs(dy)?{x:to.x-Math.sign(dx)*24,y:from.y}:{x:from.x,y:to.y-Math.sign(dy)*24};
    const near=Math.abs(dx)>Math.abs(dy)?{x:to.x,y:to.y-Math.sign(dy)*30}:{x:to.x-Math.sign(dx)*30,y:to.y};
    const tip=Math.abs(dx)>Math.abs(dy)?{x:to.x,y:to.y-Math.sign(dy)*8}:{x:to.x-Math.sign(dx)*8,y:to.y};
    const tail=`M ${from.x} ${from.y} L ${turn.x} ${turn.y} Q ${elbow.x} ${elbow.y} ${elbow.x} ${elbow.y} L ${near.x} ${near.y}`;
    const vertical=Math.abs(dx)>Math.abs(dy),direction=vertical?Math.sign(dy):Math.sign(dx);
    const triangle=vertical?`M ${tip.x} ${tip.y} L ${tip.x-38} ${tip.y-direction*36} L ${tip.x+38} ${tip.y-direction*36} Z`:`M ${tip.x} ${tip.y} L ${tip.x-direction*36} ${tip.y-38} L ${tip.x-direction*36} ${tip.y+38} Z`;
    return {tail,triangle};
  }
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
  if(length<1)return '';
  const ux=dx/length,uy=dy/length,px=-uy,py=ux;
  const head=Math.min(42,length*.34),shaft=14,headWidth=36,endX=to.x-ux*8,endY=to.y-uy*8,neckX=endX-ux*head,neckY=endY-uy*head;
  const point=(x,y)=>`${x.toFixed(1)} ${y.toFixed(1)}`;
  return `M ${point(from.x+px*shaft,from.y+py*shaft)} L ${point(neckX+px*shaft,neckY+py*shaft)} L ${point(neckX+px*headWidth,neckY+py*headWidth)} L ${point(endX,endY)} L ${point(neckX-px*headWidth,neckY-py*headWidth)} L ${point(neckX-px*shaft,neckY-py*shaft)} L ${point(from.x-px*shaft,from.y-py*shaft)} Z`;
}
