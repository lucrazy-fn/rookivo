import {test} from 'node:test';
import assert from 'node:assert/strict';
import {arrowPath,markStyle} from '../src/board-marks.mjs';

test('Chess.com-style modifier colors differ for arrows and square highlights',()=>{
  assert.equal(markStyle({},false).name,'yellow');
  assert.equal(markStyle({},true).name,'red');
  assert.equal(markStyle({ctrlKey:true},false).name,'red');
  assert.equal(markStyle({ctrlKey:true},true).name,'yellow');
  assert.equal(markStyle({altKey:true},false).name,'blue');
  assert.equal(markStyle({shiftKey:true},false).name,'green');
});

test('arrow path is a closed broad polygon and ignores a zero-length mark',()=>{
  assert.match(arrowPath({x:50,y:50},{x:350,y:50}),/^M .+ Z$/);
  assert.equal(arrowPath({x:50,y:50},{x:50,y:50}),'');
});
