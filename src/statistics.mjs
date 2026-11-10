import {expectedScore,pointLoss,bookMove} from './chess.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function moveAccuracy(loss) {
  if(loss<=0)return 100;
  return clamp(103.1668*Math.exp(-.04354*loss*100)-3.1669,0,100);
}

// Lichess move formula, with a volatility-weighted and harmonic game aggregate.
// Comparisons use the same-root played score when available, not a moving horizon.
export function gameStatistics(game,scores) {
  const complete=scores.length===game.fens.length;
  const wins=scores.map(s=>expectedScore(s)*100);
  const windowSize=clamp(Math.floor(game.moves.length/10),2,8);
  const stats={w:[],b:[]};
  game.moves.forEach((m,i)=>{
    const before=scores[i],after=scores[i+1];
    if(!before||!after)return;
    const best=before.best===m.from+m.to+(m.promotion||'');
    const loss=best?0:pointLoss(before,before.played||after,m.color);
    const start=Math.max(0,i-windowSize+2),slice=wins.slice(start,start+windowSize);
    const average=slice.reduce((a,b)=>a+b,0)/slice.length;
    const weight=clamp(Math.sqrt(slice.reduce((s,w)=>s+(w-average)**2,0)/slice.length),.5,12);
    stats[m.color].push({accuracy:moveAccuracy(loss),weight,book:!!bookMove(m)});
  });
  return Object.fromEntries(['w','b'].map(color=>{
    const entries=stats[color],count=entries.length;
    if(!complete||!count)return [color,{accuracy:null,rating:null,count,complete}];
    const weighted=entries.reduce((s,e)=>s+e.accuracy*e.weight,0)/entries.reduce((s,e)=>s+e.weight,0);
    const harmonic=entries.some(e=>e.accuracy===0)?0:count/entries.reduce((s,e)=>s+1/e.accuracy,0);
    const accuracy=(weighted+harmonic)/2;
    const elo=Number(game.headers[color==='w'?'WhiteElo':'BlackElo']);
    // Deliberately labeled an uncalibrated heuristic, not an Elo measurement.
    const rating=Number.isFinite(elo)&&elo>0&&entries.filter(e=>!e.book).length>=8
      ? Math.round(clamp(elo+(accuracy-clamp(55+elo*.012,55,90))*20,100,3200)/50)*50 : null;
    return [color,{accuracy,rating,count,complete}];
  }));
}

export function officialAccuracy(metadata,color) {
  const value=metadata?.accuracies?.[color==='w'?'white':'black'];
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?value:null;
}

// PGNs may begin with Black, or with a full-move number other than 1.
export function moveRows(moves) {
  const rows=[];
  moves.forEach((move,index)=>{
    const number=Number(move.before.split(' ')[5]);
    let row=rows.at(-1);
    if(!row||row.number!==number){row={number,w:null,b:null};rows.push(row);}
    row[move.color]=index;
  });
  return rows;
}
