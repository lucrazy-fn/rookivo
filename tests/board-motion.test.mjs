import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {boardMotion,pointerSquare,squarePoint} from '../src/board-motion.mjs';
test('animation maps a move and undo, and skips unrelated jumps',()=>{
  const c=new Chess(),start=c.fen();c.move('e4');const next=c.fen();
  assert.deepEqual(boardMotion(start,next),[{from:'e2',to:'e4'}]);
  assert.deepEqual(boardMotion(next,start),[{from:'e4',to:'e2'}]);
  c.move('e5');assert.deepEqual(boardMotion(start,c.fen()),[]);
});
test('castling moves both king and rook; promotion preserves trajectory',()=>{
  const c=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'),start=c.fen();c.move('O-O');
  assert.deepEqual(boardMotion(start,c.fen()),[{from:'e1',to:'g1'},{from:'h1',to:'f1'}]);
  const p=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1'),before=p.fen();p.move('a8=Q+');
  assert.deepEqual(boardMotion(before,p.fen()),[{from:'a7',to:'a8'}]);
});
test('pointer coordinates respect flipping and reject outside drops',()=>{
  const r={left:100,top:50,width:400,height:400};
  assert.equal(pointerSquare(125,75,r),'a8');assert.equal(pointerSquare(125,75,r,true),'h1');
  assert.equal(pointerSquare(500,75,r),null);assert.equal(pointerSquare(99,75,r),null);
  assert.deepEqual(squarePoint('a8'),[0,0]);assert.deepEqual(squarePoint('a8',true),[7,7]);
});
