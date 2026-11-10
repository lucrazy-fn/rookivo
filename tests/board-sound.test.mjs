import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {moveSound,playCue} from '../src/board-sound.mjs';
function cue(c,san){const before=c.fen();c.move(san);return moveSound(before,c.fen());}
test('move, capture, en passant, check and mate have distinct priorities',()=>{
  const c=new Chess();assert.equal(cue(c,'e4'),'move');cue(c,'d5');assert.equal(cue(c,'exd5'),'capture');
  const ep=new Chess();for(const m of ['e4','a6','e5','d5'])ep.move(m);assert.equal(cue(ep,'exd6'),'capture');
  const check=new Chess('4k3/8/8/8/8/8/4p3/4R1K1 w - - 0 1');assert.equal(cue(check,'Rxe2+'),'check');
  const mate=new Chess();for(const m of ['f3','e5','g4'])mate.move(m);assert.equal(cue(mate,'Qh4#'),'mate');
  assert.equal(moveSound(c.fen(),c.fen()),null);
});
test('synthesized cues schedule distinct patterns and respect suspended audio',()=>{
  const notes=[];const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
  const ctx={state:'running',currentTime:0,destination:{},createOscillator(){const o={frequency:param,connect(){},disconnect(){},start(t){notes.push(t);},stop(){}};return o;},createGain(){return {gain:param,connect(){},disconnect(){}};}};
  for(const [kind,count] of [['move',1],['capture',2],['check',2],['mate',3]]){notes.length=0;playCue(ctx,kind);assert.equal(notes.length,count);}
  notes.length=0;ctx.state='suspended';playCue(ctx,'mate');assert.equal(notes.length,0);
});
