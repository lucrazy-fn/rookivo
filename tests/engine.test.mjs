import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {Engine} from '../src/engine.mjs';
import {terminalScore} from '../src/chess.mjs';

test('protocolo UCI: inicialização, resultado e descarte durante análise',async()=>{
  const original=globalThis.Worker;
  class MockWorker {
    commands=[]; terminated=false; hold=false;
    postMessage(message) {
      this.commands.push(message);
      const reply = message==='uci'?'uciok':message==='isready'?'readyok':message.startsWith('go ')?'info depth 10 multipv 1 score cp 32 pv e2e4\ninfo depth 10 multipv 2 score cp -90 pv a2a3\nbestmove e2e4':null;
      if(reply&&!this.hold) queueMicrotask(()=>this.onmessage?.({data:reply}));
    }
    terminate(){this.terminated=true;}
  }
  globalThis.Worker=MockWorker;
  try {
    const e=new Engine();await e.init();
    const score=await e.evaluate(new Chess().fen(),20);
    assert.equal(score.cp,32);assert.equal(score.best,'e2e4');
    assert.equal(score.second.cp,-90);
    assert.ok(e.worker.commands.includes('setoption name MultiPV value 2'));
    e.worker.hold=true;
    const pending=e.evaluate(new Chess().fen(),20);
    e.dispose();await assert.rejects(pending,{name:'AbortError'});
    assert.equal(e.worker.terminated,true);
  } finally {globalThis.Worker=original;}
});

test('histórico completo reconhece repetição tripla',()=>{
  const c=new Chess();const startFen=c.fen();
  const moves=['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8'];
  for (const uci of moves)c.move({from:uci.slice(0,2),to:uci.slice(2)});
  assert.equal(terminalScore(c.fen(),{startFen,moves}).cp,0);
  assert.equal(terminalScore(c.fen()),null);
});
