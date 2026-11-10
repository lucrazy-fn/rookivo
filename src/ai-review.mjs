import {LABELS,expectedScore,pointLoss,isSacrifice,mateOutcome,pvSan} from './chess.mjs';

// The AI may judge borderline and special cases, not contradict clear engine evidence.
export function reviewEvidence(game,scores,grades) {
  return game.moves.map((move,index)=>{
    const before=scores[index],next=scores[index+1],grade=grades[index];
    if(!before||!next||!grade)return null;
    const uci=move.from+move.to+(move.promotion||'');
    const best=before.best===uci,played=before.played||(best?before:next);
    const loss=best?0:pointLoss(before,played,move.color);
    const result=expectedScore(played,move.color),current=expectedScore(before,move.color);
    const depth=Math.min(before.depth||0,played.depth||0);
    const allowed=new Set([grade.kind]);
    const sacrifice=loss<=.03&&result>=.5&&depth>=12&&isSacrifice(move);
    const second=before.second;
    const gap=second?pointLoss(before,second,move.color):0;
    if(grade.kind!=='book') {
      // Small tolerance around published cutoffs reflects finite search uncertainty.
      for(const [kind,low,high] of [['excellent',0,.02],['good',.02,.05],['inaccuracy',.05,.1],['mistake',.1,.2],['blunder',.2,1]]) {
        if(loss>=Math.max(0,low-.01)&&loss<=high+.01)allowed.add(kind);
      }
      if(best||(depth>=12&&before.mate===undefined&&played.mate===undefined&&Math.abs(before.cp-played.cp)<=8))allowed.add('best');
      if(sacrifice&&second&&second.depth===before.depth&&expectedScore(second,move.color)<.9)allowed.add('brilliant');
      if(loss<=.02&&depth>=12&&second&&second.depth===before.depth&&gap>=.07&&result>=.5&&expectedScore(second,move.color)<.65)allowed.add('great');
      const previous=scores[index-1];
      if(previous&&expectedScore(previous,move.color)<.65&&current>=.7&&result<.65&&loss>=.08)allowed.add('miss');
      // Mate transitions are hard constraints, not language-model opinions.
      if(!best&&mateOutcome(played,move.color)===-1&&mateOutcome(before,move.color)!==-1){allowed.clear();allowed.add('blunder');}
      if(!best&&mateOutcome(before,move.color)===1&&mateOutcome(played,move.color)!==1){allowed.clear();allowed.add('miss');}
    }
    return {ply:index+1,move:move.san,color:move.color==='w'?'brancas':'pretas',number:Number(move.before.split(' ')[5]),beforeFen:move.before,afterFen:move.after,
      engineKind:grade.kind,engineReason:grade.reason,allowedKinds:[...allowed],lossPoints:Number((loss*100).toFixed(2)),depth,rootDepth:before.depth||0,playedDepth:played.depth||0,engineBest:before.best,previousWhiteCp:scores[index-1]?.cp,previousWhiteMate:scores[index-1]?.mate,
      beforeWhiteCp:before.cp,playedWhiteCp:played.cp,beforeWhiteMate:before.mate,playedWhiteMate:played.mate,
      sacrifice,alternativeGapPoints:Number((gap*100).toFixed(2)),bestLine:pvSan(move.before,before.pv||''),playedLine:before.played?pvSan(move.before,played.pv||''):move.san};
  });
}

export function validateReview(text,moves) {
  const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const data=JSON.parse(clean);
  if(!Array.isArray(data.moves)||data.moves.length!==moves.length)throw new Error('Revisão incompleta.');
  const expected=new Map(moves.map(m=>[m.ply,m])),seen=new Set();
  return data.moves.map(item=>{
    const evidence=expected.get(item.ply);
    if(!Number.isInteger(item.ply)||!evidence||seen.has(item.ply)||!Object.hasOwn(LABELS,item.kind)||!evidence.allowedKinds.includes(item.kind)||typeof item.reason!=='string'||item.reason.trim().length<8||item.reason.length>600)throw new Error('Classificação inconsistente.');
    seen.add(item.ply);
    return {ply:item.ply,kind:item.kind,reason:item.reason.trim(),fingerprint:JSON.stringify(evidence)};
  });
}

export function mergeReviews(grades,evidence,reviews,enabled=true) {
  return grades.map((grade,index)=>{
    const suggestion=reviews[index];
    if(!enabled||!grade||!evidence[index]||!suggestion||suggestion.fingerprint!==JSON.stringify(evidence[index])||!evidence[index].allowedKinds.includes(suggestion.kind))return grade;
    return {...grade,kind:suggestion.kind,reason:suggestion.reason,source:'ai',engineKind:grade.kind,provider:suggestion.provider,model:suggestion.model};
  });
}
