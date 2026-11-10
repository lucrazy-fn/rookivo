import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { parseGame, DEMO, parseInfo, terminalScore, classify, formatScore, pvSan } from '../src/chess.mjs';

test('PGN completo: navegação, roque e mate', () => {
  const g = parseGame(DEMO);
  assert.equal(g.moves.length,33);
  assert.equal(g.fens.length,34);
  assert.equal(g.moves[22].san,'O-O-O');
  assert.ok(new Chess(g.fens.at(-1)).isCheckmate());
  assert.equal(formatScore(terminalScore(g.fens.at(-1))),'1–0');
  assert.throws(()=>parseGame('1. e4 e5 2. Ke5'));
});
test('PGN com posição inicial, promoção e empate material', () => {
  const g = parseGame('[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=N *');
  assert.equal(g.moves[0].promotion,'n');
  assert.equal(terminalScore(g.fens[1]).cp,0);
});
test('UCI normaliza cp e mate para as brancas',()=>{
  assert.equal(parseInfo('info depth 12 score cp 90 pv e7e5','b').cp,-90);
  assert.equal(parseInfo('info depth 12 score mate -3 pv e7e5','b').mate,3);
  assert.equal(parseInfo('info score cp 90 lowerbound','w'),null);
  assert.equal(parseInfo('info depth 14 score cp 42 wdl 300 600 100 pv e2e4','w').expected,.6);
  assert.equal(parseInfo('info depth 14 score cp 42 wdl 300 600 100 pv e7e5','b').expected,.4);
});
test('classificação usa perda de expectativa, cor e limites',()=>{
  const m={from:'e2',to:'e4',color:'w'};
  assert.equal(classify({cp:100,chance:.7},{cp:-101,chance:.49},m).kind,'blunder');
  assert.equal(classify({cp:100,chance:.7},{cp:80,chance:.68},m).kind,'excellent');
  assert.equal(classify({cp:100,chance:.7},{cp:50,chance:.65},m).kind,'good');
  assert.equal(classify({cp:100,chance:.7},{cp:0,chance:.6},m).kind,'inaccuracy');
  assert.equal(classify({cp:100,chance:.7},{cp:-100,chance:.5},m).kind,'mistake');
  assert.equal(classify({cp:0,chance:.3},{cp:250,chance:.6},{...m,color:'b'}).kind,'blunder');
  assert.equal(classify({cp:0,best:'e2e4'},{cp:0},m).kind,'best');
  assert.equal(classify(undefined,{cp:0},m),null);
});
test('continuação UCI é exibida em SAN',()=>assert.equal(pvSan(new Chess().fen(),'e2e4 e7e5 g1f3'),'e4  e5  Nf3'));

test('resultado da busca restrita prevalece sobre a posição seguinte',()=>{
  const move={from:'a1',to:'a2',color:'w'};
  assert.equal(classify({cp:100,chance:.7,played:{cp:90,chance:.69}},{cp:-500,chance:.05},move).kind,'excellent');
  assert.equal(classify({cp:1000,chance:1},{cp:700,chance:.999},move).kind,'excellent');
});

test('WDL saturado não esconde perdas materiais nem mates evitáveis',()=>{
 const m={from:'a1',to:'a2',color:'w'};
 assert.equal(classify({cp:-398,expected:0},{cp:-768,expected:0},m).kind,'mistake');
 assert.equal(classify({cp:-681,expected:0},{cp:-9998,mate:-2,expected:0},m).kind,'blunder');
 assert.equal(classify({cp:-9998,mate:-2},{cp:-639},{...m,color:'b'}).kind,'miss');
 assert.equal(classify({cp:681},{cp:9998,mate:2},{...m,color:'b'}).kind,'blunder');
 assert.notEqual(classify({cp:-9997,mate:-3},{cp:-9998,mate:-2},m).kind,'blunder');
});
