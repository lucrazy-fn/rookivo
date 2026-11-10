import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGame,classify} from '../src/chess.mjs';
import {gameStatistics,moveRows,moveAccuracy,officialAccuracy} from '../src/statistics.mjs';

test('precisão oficial preserva cor e zero válido; rejeita valores ausentes/inválidos',()=>{
  const data={accuracies:{white:82.77,black:74.42}};
  assert.equal(officialAccuracy(data,'w'),82.77);assert.equal(officialAccuracy(data,'b'),74.42);
  assert.equal(officialAccuracy({accuracies:{white:0}},'w'),0);
  assert.equal(officialAccuracy({accuracies:{white:'98'}},'w'),null);
  assert.equal(officialAccuracy(null,'b'),null);
});
test('PGN começando pelas pretas mantém linhas, número e métricas corretos',()=>{
  const game=parseGame('[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 7"]\n\n7... e5 8. e4 *');
  assert.deepEqual(moveRows(game.moves),[{number:7,w:null,b:0},{number:8,w:1,b:null}]);
  const scores=[{cp:0,played:{cp:250}},{cp:250,best:'e2e4'},{cp:250}];
  const stats=gameStatistics(game,scores);
  assert.ok(stats.b.accuracy<stats.w.accuracy);assert.equal(stats.w.accuracy,100);
  assert.equal(stats.b.rating,null);assert.equal(stats.w.count,1);
  assert.equal(gameStatistics(game,scores.slice(0,2)).w.accuracy,null);
});
test('precisão e opções equivalentes têm limites explícitos',()=>{
  assert.equal(moveAccuracy(0),100);assert.equal(moveAccuracy(1),0);
  assert.ok(moveAccuracy(.01)>moveAccuracy(.1));
  const move={from:'a1',to:'a2',color:'w'};
  const root={cp:100,depth:16,best:'a1b1',played:{cp:95,depth:16}};
  assert.equal(classify(root,{cp:80},move).kind,'best');
  assert.notEqual(classify({...root,played:{cp:50,depth:16}},{cp:80},move).kind,'best');
});
