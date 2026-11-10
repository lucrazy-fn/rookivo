import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {explainLocal} from '../src/local-coach.mjs';
const grade={kind:'best',reason:'Primeira escolha do motor.'};
test('local coach identifies black mating move without flipping white evaluation',()=>{
  const c=new Chess();for(const san of ['f3','e5','g4'])c.move(san);
  const m=c.move('Qh4#');
  const result=explainLocal(m,{best:'d8h4',mate:-1,depth:18,pv:'d8h4'},{mate:0,winner:'b',depth:18},grade);
  assert.match(result.facts.join(' '),/As pretas movem a dama/);
  assert.match(result.facts.join(' '),/xeque-mate/);
  assert.match(result.facts.join(' '),/−M1/);
  assert.equal(result.bestLine,'Qh4#');
});
test('same-root played score and legal alternatives drive explanation',()=>{
  const c=new Chess(),m=c.move('f3');
  const result=explainLocal(m,{cp:30,depth:15,best:'e2e4',pv:'e2e4 e7e5',played:{cp:-70,depth:14,pv:'f2f3 e7e5'}},{cp:900,depth:20},grade);
  assert.match(result.facts.join(' '),/\+0.30 → -0.70/);
  assert.match(result.facts.join(' '),/prefere e4/);
  assert.equal(result.playedLine,'f3  e5');
  assert.equal(result.depth,14);
  assert.equal(explainLocal(m,null,null,null),null);
});
