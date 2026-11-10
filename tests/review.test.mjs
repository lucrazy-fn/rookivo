import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGame, DEMO, classify, bookMove, isSacrifice} from '../src/chess.mjs';
import {ReviewCache,reviewGame} from '../src/review.mjs';

test('livro vem de posição e lance registrados, não do número do lance',()=>{
  const known=parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 *');
  assert.ok(bookMove(known.moves[4]));
  assert.equal(classify(null,null,known.moves[4]).kind,'book');
  const novel=parseGame('1. a3 a6 2. Ra2 *');
  assert.equal(bookMove(novel.moves[2]),undefined);
  assert.equal(classify(null,null,novel.moves[2]),null);
});
test('brilhante exige sacrifício real, precisão e profundidade',()=>{
  const m=parseGame(DEMO).moves[18]; // Nxb5, offering a knight for a pawn.
  assert.ok(isSacrifice(m));
  const before={cp:200,depth:14,best:'c3b5',second:{cp:100,depth:14},verified:true};
  const after={cp:195,depth:14};
  assert.equal(classify(before,after,m).kind,'brilliant');
  assert.equal(classify({...before,chance:.99,second:{cp:0,chance:.5,depth:14}},after,m).kind,'brilliant');
  assert.notEqual(classify({...before,chance:.99,second:{cp:800,chance:.99,depth:14}},after,m).kind,'brilliant');
  assert.notEqual(classify({...before,depth:8},after,m).kind,'brilliant');
  assert.notEqual(classify({...before,played:{cp:-150,depth:14}},{cp:-150,depth:14},m).kind,'brilliant');
  // A queen won for a rook is profitable material, not a sacrifice.
  const capture=parseGame('[SetUp "1"]\n[FEN "4k3/8/8/3q4/2p5/8/8/3RK3 w - - 0 1"]\n\n1. Rxd5 *').moves[0];
  assert.equal(isSacrifice(capture),false);
});
test('excelente (!) compara alternativas; chance perdida considera erro anterior',()=>{
  const move={from:'e2',to:'e4',color:'w'};
  const before={cp:120,depth:14,best:'e2e4',second:{cp:-100,depth:14},verified:true};
  assert.equal(classify(before,{cp:120,depth:14},move).kind,'great');
  assert.notEqual(classify({...before,second:{cp:-100,depth:13}},{cp:120,depth:14},move).kind,'great');
  assert.equal(classify({cp:240,chance:.8},{cp:0,chance:.5},move,{cp:0}).kind,'miss');
  assert.notEqual(classify({cp:240,chance:.8},{cp:0,chance:.5},move,{cp:220,chance:.75}).kind,'miss');
  assert.equal(classify({cp:-240,chance:.2},{cp:0},{...move,color:'b'},{cp:0}).kind,'miss');
});

test('lance suspeito é reavaliado na mesma posição, com searchmoves',async()=>{
  const game=parseGame('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n\n1. e3 *');
  const cache=new ReviewCache(),calls=[];
  const engine={evaluate:async(fen,time,history,options)=>{
    calls.push({fen,time,options});
    if(options?.searchMoves)return {cp:10,chance:calls.filter(c=>c.options?.searchMoves).length===1?.3:.59,depth:14,pv:'e2e3'};
    return {cp:30,chance:calls.length===1?.8:.6,depth:14,best:'e2e4',pv:'e2e4'};
  }};
  const results=await reviewGame(engine,game,100,cache,()=>{},()=>false);
  assert.ok(results[0].verified);
  assert.equal(results[0].played.chance,.59);
  assert.equal(classify(results[0],results[1],game.moves[0]).kind,'excellent');
  assert.deepEqual(calls[1].options.searchMoves,['e2e3']);
  assert.equal(calls[1].fen,game.fens[0]);assert.equal(calls[3].fen,game.fens[0]);
});
test('cache retoma resultado parcial, separa qualidade e evita recálculo',async()=>{
  const game=parseGame('1. e4 e5 2. Nf3 *'),cache=new ReviewCache();
  let calls=0,cancelled=false;const contexts=[];
  const engine={evaluate:async(fen,time,history)=>{calls++;contexts.push(history);return {cp:20,depth:10};}};
  await reviewGame(engine,game,100,cache,()=>{cancelled=true;},()=>cancelled);
  assert.equal(calls,1);assert.equal(cache.get(game.pgn,100).length,1);
  cancelled=false;
  await reviewGame(engine,game,100,cache,()=>{},()=>false);
  assert.equal(calls,4);assert.equal(contexts[3].moves.length,3);
  assert.ok('terminal' in contexts[0]);
  await reviewGame(engine,game,100,cache,()=>{},()=>false);
  assert.equal(calls,4);
  await reviewGame(engine,game,350,cache,()=>{},()=>false);
  assert.equal(calls,8);
});
test('resultado cancelado durante cálculo não entra no cache',async()=>{
  const game=parseGame('1. e4 *'),cache=new ReviewCache();let cancelled=false;
  const engine={evaluate:async()=>{cancelled=true;return {cp:0};}};
  await reviewGame(engine,game,100,cache,()=>assert.fail('cancelled callback'),()=>cancelled);
  assert.equal(cache.get(game.pgn,100).length,0);
});

test('motores paralelos preservam ordem, retomada e exclusividade de cada worker',async()=>{
  const game=parseGame('1. e4 e5 2. Nf3 Nc6 *'),cache=new ReviewCache();
  const active=new Set(),callbacks=[];let overlap=false;
  const engines=[0,1].map(id=>({evaluate:async(fen,time,history)=>{
    assert.ok(!active.has(id),'worker nunca recebe duas buscas simultâneas');
    active.add(id);if(active.size===2)overlap=true;
    await new Promise(resolve=>setTimeout(resolve,id===0?12:1));
    active.delete(id);return {cp:history.moves.length,depth:12};
  }}));
  const result=await reviewGame({engines},game,100,cache,s=>callbacks.push(s.map(x=>x.cp)),()=>false);
  assert.ok(overlap);assert.deepEqual(result.map(x=>x.cp),[0,1,2,3,4]);
  callbacks.forEach(row=>assert.deepEqual(row,Array.from({length:row.length},(_,i)=>i)));
  assert.equal(cache.get(game.pgn,100).length,5);
});
