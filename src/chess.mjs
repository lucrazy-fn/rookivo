import { Chess } from 'chess.js';
import book from './book.json' with {type:'json'};

export const DEMO = `[Event "Partida da Ópera"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duque & Conde"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

export function parseGame(pgn) {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const moves = chess.history({ verbose: true });
  const headers = chess.getHeaders();
  if (headers.Variant && !['standard', 'chess', 'normal'].includes(headers.Variant.toLowerCase())) throw new Error('Variante não suportada');
  const fens = [moves[0]?.before || chess.fen(), ...moves.map(m => m.after)];
  const replay = new Chess(fens[0]);
  const terminals = [terminalFromBoard(replay)];
  for (const m of moves) { replay.move(m.san); terminals.push(terminalFromBoard(replay)); }
  return { pgn, headers, moves, fens, terminals };
}

export function terminalScore(fen, history) {
  const c = new Chess(history?.startFen || fen);
  if (history) for (const uci of history.moves) c.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
  return terminalFromBoard(c);
}

function terminalFromBoard(c) {
  if (c.isCheckmate()) return { cp: c.turn() === 'w' ? -10000 : 10000, mate: 0, winner: c.turn() === 'w' ? 'b' : 'w', depth: 0, pv: '', best: '' };
  if (c.isDraw()) return { cp: 0, depth: 0, pv: '', best: '' };
  return null;
}

export function parseInfo(line, turn) {
  const match = line.match(/score (cp|mate) (-?\d+)/);
  if (!match || /lowerbound|upperbound/.test(line)) return null;
  const value = Number(match[2]);
  const sign = turn === 'w' ? 1 : -1;
  const wdl=line.match(/wdl (\d+) (\d+) (\d+)/);
  const rawExpected=wdl ? (Number(wdl[1])+Number(wdl[2])/2)/1000 : undefined;
  return { cp: match[1] === 'cp' ? value * sign : Math.sign(value || -1) * sign * (10000 - Math.abs(value)),
    expected:rawExpected===undefined?undefined:turn==='w'?rawExpected:1-rawExpected,
    mate: match[1] === 'mate' ? value * sign : undefined,
    depth: Number(line.match(/depth (\d+)/)?.[1] || 0), multipv: Number(line.match(/multipv (\d+)/)?.[1] || 1), pv: line.split(' pv ')[1] || '' };
}

export function bookMove(move) {
  return move.before ? book[move.before.split(' ').slice(0,4).join(' ')+' '+move.from+move.to+(move.promotion||'')] : undefined;
}

const values={p:1,n:3,b:3,r:5,q:9,k:0};
// Legal capture/recapture tree on one square, bounded to keep the UI responsive.
function exchangeGain(c,square,depth=0) {
  if(depth>=5)return 0;
  let gain=0;
  for(const m of c.moves({verbose:true}).filter(m=>m.to===square&&m.captured)) {
    c.move(m.san);
    const value=values[m.captured] + (m.promotion ? values[m.promotion]-1 : 0) - exchangeGain(c,square,depth+1);
    c.undo();gain=Math.max(gain,value);
  }
  return gain;
}

const sacrificeCache = new WeakMap();
export function isSacrifice(move) {
  if(sacrificeCache.has(move))return sacrificeCache.get(move);
  const result=detectSacrifice(move);sacrificeCache.set(move,result);return result;
}
function detectSacrifice(move) {
  if(!move.before||!move.after||move.piece==='k'||move.promotion)return false;
  const c=new Chess(move.after), old=new Chess(move.before);
  const targets=new Set(c.moves({verbose:true}).filter(m=>m.captured && values[m.captured]>=3).map(m=>m.to));
  for(const square of targets) {
    // A moved piece or a newly exposed piece; an already hanging bystander is not a sacrifice.
    if(square!==move.to && old.isAttacked(square,c.turn()))continue;
    if(exchangeGain(c,square)-(values[move.captured]||0)>=1)return true;
  }
  return false;
}

export function expectedScore(score,color='w') {
  if(!score)return .5;
  // Practical winning-chance mapping published by Lichess, based on human games.
  // Raw Stockfish WDL is retained in `expected` for diagnostics, never used for badges.
  const white=score.mate===0 ? (score.winner==='w'?1:0) : score.mate!==undefined ? (score.mate>0?1:0) : score.chance ?? 1/(1+Math.exp(-.00368208*score.cp));
  return color==='w'?white:1-white;
}

export function mateOutcome(score,color) {
  if(score?.mate===undefined)return 0;
  const winner=score.mate===0?score.winner:score.mate>0?'w':'b';
  return winner===color?1:-1;
}

export function pointLoss(before,played,color) {
  return Math.max(0,Math.round((expectedScore(before,color)-expectedScore(played,color))*1000000)/1000000);
}

export function classify(before, after, move, previous) {
  const opening=bookMove(move);
  if(opening)return {kind:'book',loss:0,reason:opening};
  if (!before || !after) return null;
  const uci = move.from + move.to + (move.promotion || '');
  const engineBest=before.best===uci;
  // Prefer a constrained search from the SAME root, not the next position's changing horizon.
  const played=before.played || (engineBest?before:after);
  const loss = Math.max(0,(before.cp-played.cp)*(move.color==='w'?1:-1));
  const equivalent=!engineBest && before.played && before.mate===undefined && played.mate===undefined && Math.min(before.depth||0,played.depth||0)>=12 && Math.abs(before.cp-played.cp)<=8;
  const best=engineBest || equivalent;
  const points=best?0:pointLoss(before,played,move.color);
  const current=expectedScore(before,move.color), result=expectedScore(played,move.color);
  const stable=before.verified && Math.min(before.depth||0,played.depth||0)>=12;
  const second=before.second;
  const gap=second ? pointLoss(before,second,move.color) : 0;
  // A lost position is not the same as allowing an avoidable forced mate.
  if(!best && mateOutcome(played,move.color)===-1 && mateOutcome(before,move.color)!==-1)
    return {kind:'blunder',loss,points,reason:`Permite um mate forçado${played.mate?` em ${Math.abs(played.mate)}`:''}, que podia ser evitado.`};
  if(!best && mateOutcome(before,move.color)===1 && mateOutcome(played,move.color)!==1)
    return {kind:'miss',loss,points,reason:'Deixa escapar uma sequência de mate forçado encontrada pelo motor.'};
  if(stable && points<=.02 && result>=.5 && second && second.depth===before.depth && expectedScore(second,move.color)<.9 && isSacrifice(move))
    return {kind:'brilliant',loss,points,reason:'Sacrifício favorável, conferido em uma busca adicional. Detecção aproximada.'};
  if(best && stable && second && second.depth===before.depth && gap>=.1 && expectedScore(second,move.color)<.65 && result>=.5)
    return {kind:'great',loss,points,reason:'Escolha crítica: as alternativas avaliadas perdem muito mais da posição.'};
  if(previous && expectedScore(previous,move.color)<.65 && current>=.75 && result<.65 && points>=.1)
    return {kind:'miss',loss,points,reason:'A oportunidade de vencer criada pelo erro anterior não foi aproveitada.'};
  const kind=best?'best':points<=.02?'excellent':points<=.05?'good':points<=.10?'inaccuracy':points<=.20?'mistake':'blunder';
  return {kind,loss,points,reason:best?(equivalent?'Lance equivalente à melhor opção, dentro de 0,08 peão na busca atual.':'A primeira escolha do motor nesta posição.'):`Queda de ${(points*100).toFixed(1)} pontos na chance prática estimada.${before.verified?' Lance conferido.':''}`};
}

export const LABELS = {brilliant:'Brilhante',great:'Excelente',book:'Livro',best:'Melhor',excellent:'Ótimo',good:'Bom',inaccuracy:'Imprecisão',mistake:'Erro',miss:'Chance Perdida',blunder:'Capivarada'};
export const SYMBOLS = {brilliant:'!!',great:'!',best:'★',excellent:'',good:'✓',book:'',inaccuracy:'?!',mistake:'?',miss:'×',blunder:'??'};
export function formatScore(s) {
  if (!s) return '—';
  if (s.mate === 0) return s.winner === 'w' ? '1–0' : '0–1';
  if (s.mate !== undefined) return `${s.mate > 0 ? '+' : '−'}M${Math.abs(s.mate)}`;
  return `${s.cp >= 0 ? '+' : ''}${(s.cp / 100).toFixed(2)}`;
}

export function pvSan(fen, pv) {
  const c = new Chess(fen); const result = [];
  for (const uci of pv.split(' ').slice(0, 8)) {
    try { const m = c.move({from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4]}); if (m) result.push(m.san); } catch { break; }
  }
  return result.join('  ');
}
