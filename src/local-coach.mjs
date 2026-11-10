import {Chess} from 'chess.js';
import {formatScore,pvSan,LABELS} from './chess.mjs';

const pieces={p:'peão',n:'cavalo',b:'bispo',r:'torre',q:'dama',k:'rei'};
// Deterministic commentary: board facts and engine evidence, never invented plans.
export function explainLocal(move,before,after,grade) {
  if(!move||!before||!after||!grade)return null;
  const played=before.played||(before.best===move.from+move.to+(move.promotion||'')?before:after);
  const side=move.color==='w'?'As brancas':'As pretas';
  const facts=[];
  if(move.san.startsWith('O-O'))facts.push(`${side} fazem o roque ${move.san.startsWith('O-O-O')?'grande':'pequeno'}, movendo o rei e a torre.`);
  else facts.push(`${side} movem ${['q','r'].includes(move.piece)?'a':'o'} ${pieces[move.piece]} de ${move.from} para ${move.to}${move.captured?`, capturando ${['q','r'].includes(move.captured)?'a':'o'} ${pieces[move.captured]}${move.flags?.includes('e')?' en passant':''}`:''}.`);
  if(move.promotion)facts.push(`O peão é promovido a ${pieces[move.promotion]}.`);
  const board=new Chess(move.after);
  if(board.isCheckmate())facts.push('É xeque-mate: o rei adversário não tem defesa legal.');
  else if(board.isStalemate())facts.push('A posição termina em empate por afogamento: não há lance legal, mas o rei não está em xeque.');
  else if(board.isCheck())facts.push('O lance dá xeque; o adversário precisa responder à ameaça ao rei.');
  facts.push(`${LABELS[grade.kind]}: ${grade.reason}`);
  facts.push(`Avaliação das brancas: ${formatScore(before)} → ${formatScore(played)}. Valores positivos favorecem as brancas; negativos, as pretas. M indica mate encontrado pelo motor.`);
  let best='';
  try {const c=new Chess(move.before),uci=before.best||'';best=c.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]})?.san||'';} catch {}
  if(best)facts.push(best===move.san?`${move.san} é a primeira escolha do Stockfish nesta busca.`:`O Stockfish prefere ${best} nesta posição. Compare a sequência abaixo com o lance jogado.`);
  const depth=Math.min(before.depth||0,played.depth||0);
  return {facts,bestLine:pvSan(move.before,before.pv||''),playedLine:before.played?pvSan(move.before,played.pv||''):[move.san,pvSan(move.after,after.pv||'')].filter(Boolean).join('  '),depth};
}
