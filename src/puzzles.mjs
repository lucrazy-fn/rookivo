import {Chess} from 'chess.js';

function uci(move){return move.from+move.to+(move.promotion||'');}
function puzzle(id,title,rating,fen,line,theme){
  const board=new Chess(fen),moves=[];
  for(const san of line){const move=board.move(san);if(!move)throw new Error(`Puzzle inválido: ${id}`);moves.push(uci(move));}
  return {id,title,rating,fen,line:moves,theme,finalFen:board.fen()};
}
function after(line){const board=new Chess();for(const san of line)board.move(san);return board.fen();}

const BASE_PUZZLES=[
  puzzle('rook-back-rank','Corredor da torre',450,'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',['Re8#'],'Mate em 1'),
  puzzle('queen-back-rank','Entrada da dama',500,'6k1/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1',['Qd8#'],'Mate em 1'),
  puzzle('fools-mate','Diagonal fatal',550,after(['f3','e5','g4']),['Qh4#'],'Mate em 1'),
  puzzle('scholars-mate','Ponto fraco em f7',600,after(['e4','e5','Bc4','Nc6','Qh5','Nf6']),['Qxf7#'],'Mate em 1'),
  puzzle('win-queen','Dama pendurada',650,'4k3/8/8/8/8/8/4q3/4R1K1 w - - 0 1',['Rxe2+'],'Ganhe material'),
  puzzle('capture-mate','Capture com mate',700,'3q2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',['Rxd8#'],'Mate em 1'),
  puzzle('knight-fork','Garfo real',850,'3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1',['Nf7+','Kg8','Nxd8'],'Garfo'),
  puzzle('legal-trap','Armadilha de Légal',1050,after(['e4','e5','Nf3','Nc6','Bc4','d6','Nc3','Bg4','h3','Bh5','Nxe5','Bxd1']),['Bxf7+','Ke7','Nd5#'],'Mate em 3'),
];

function mirrorFen(fen){
  const parts=fen.split(' ');
  parts[0]=parts[0].split('/').map(rank=>{
    const expanded=rank.replace(/[1-8]/g,n=>'1'.repeat(Number(n))).split('').reverse().join('');
    return expanded.replace(/1+/g,ones=>String(ones.length));
  }).join('/');
  if(parts[3]!=='-')parts[3]=String.fromCharCode(105-parts[3].charCodeAt(0))+parts[3][1];
  return parts.join(' ');
}
function mirrorSquare(square){return String.fromCharCode(201-square.charCodeAt(0))+square[1];}
function mirrorPuzzle(p){
  const fen=mirrorFen(p.fen),line=p.line.map(move=>mirrorSquare(move.slice(0,2))+mirrorSquare(move.slice(2,4))+(move[4]||''));
  let finalFen=fen;
  for(const move of line)finalFen=applyPuzzleMove(finalFen,move);
  return {...p,id:p.id+'-mirror',title:p.title+' · espelhado',fen,line,finalFen};
}
export const PUZZLES=[...BASE_PUZZLES,...BASE_PUZZLES.filter(p=>p.fen.split(' ')[2]==='-').map(mirrorPuzzle)];

export function puzzleMove(fen,from,to,promotion='q'){
  const board=new Chess(fen);
  try {const move=board.move({from,to,promotion});return move?{uci:uci(move),fen:board.fen(),san:move.san}:null;}
  catch {return null;}
}

export function applyPuzzleMove(fen,move){
  const board=new Chess(fen),played=board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  if(!played)throw new Error('Linha de puzzle inválida.');
  return board.fen();
}
