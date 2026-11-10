import {bookMove,pointLoss,expectedScore,isSacrifice,mateOutcome} from './chess.mjs';
// Cache complete and partial reviews independently by PGN and search budget.
export class ReviewCache {
  entries = new Map();
  key(pgn,time) { return `parallel-pv-v5:${time}\n${pgn}`; }
  get(pgn,time) { return this.entries.get(this.key(pgn,time)) || []; }
  set(pgn,time,scores) {
    const key=this.key(pgn,time);
    this.entries.delete(key);this.entries.set(key,[...scores]);
    while(this.entries.size>8)this.entries.delete(this.entries.keys().next().value);
  }
}

export async function reviewGame(engine,game,time,cache,onProgress,isCancelled) {
  const scores=[...cache.get(game.pgn,time)];
  const ucis=game.moves.map(m=>m.from+m.to+(m.promotion||''));
  const workers=engine.engines || [engine];
  let next=scores.length, stopped=false;
  const completed=new Map();
  async function analyzePosition(engine,i) {
    const history={startFen:game.fens[0],moves:ucis.slice(0,i),terminal:game.terminals[i]};
    let score=await engine.evaluate(game.fens[i],time===100?80:time,history);
    if(isCancelled())return scores;
    const move=game.moves[i];
    if(move && !bookMove(move) && !history.terminal) {
      const pick=async(root,budget)=>{
        if(root.best===ucis[i])return {...root,second:undefined};
        if(root.second?.pv?.split(' ')[0]===ucis[i] && root.second.depth===root.depth)return root.second;
        return engine.evaluate(game.fens[i],budget,history,{searchMoves:[ucis[i]]});
      };
      let played=await pick(score,Math.max(45,Math.round(time*.5)));
      if(isCancelled())return scores;
      const loss=pointLoss(score,played,move.color);
      const candidateSacrifice=loss<=.02 && score.second && expectedScore(score.second,move.color)<.9 && expectedScore(played,move.color)>=.5 && isSacrifice(move);
      const critical=score.best===ucis[i] && score.second && pointLoss(score,score.second,move.color)>=.1;
      // Spend extra time where a short search could produce a misleading badge.
      const mateChanged=mateOutcome(score,move.color)!==mateOutcome(played,move.color);
      if(loss>.1 || candidateSacrifice || critical || mateChanged || (loss>.02 && Math.min(...[.05,.1,.2].map(t=>Math.abs(loss-t)))<.008)) {
        score=await engine.evaluate(game.fens[i],Math.max(180,Math.round(time*1.5)),history);
        if(isCancelled())return scores;
        played=await pick(score,Math.max(100,time));
        if(isCancelled())return scores;
        score.verified=true;
      }
      score.played=played;
    }
    return score;
  }
  async function lane(worker) {
    while(!stopped && !isCancelled() && next<game.fens.length) {
      const i=next++;
      const score=await analyzePosition(worker,i);
      if(stopped || isCancelled())return;
      completed.set(i,score);
      const previousLength=scores.length;
      while(completed.has(scores.length)){const j=scores.length;scores.push(completed.get(j));completed.delete(j);}
      if(scores.length!==previousLength){cache.set(game.pgn,time,scores);onProgress([...scores]);}
    }
  }
  try { await Promise.all(workers.map(lane)); } catch(error) { stopped=true;throw error; }
  return scores;
}
