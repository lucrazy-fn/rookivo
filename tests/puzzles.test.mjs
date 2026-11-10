import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {PUZZLES,applyPuzzleMove,puzzleMove} from '../src/puzzles.mjs';

test('all puzzle lines are legal, alternate turns and finish at the declared position',()=>{
  assert.ok(PUZZLES.length>=8);
  for(const puzzle of PUZZLES){let fen=puzzle.fen;for(const move of puzzle.line)fen=applyPuzzleMove(fen,move);assert.equal(fen,puzzle.finalFen,puzzle.id);assert.equal(puzzle.line.length%2,1,puzzle.id);}
});

test('player move validation returns UCI and does not mutate a rejected position',()=>{
  const puzzle=PUZZLES[0],expected=puzzle.line[0];
  const played=puzzleMove(puzzle.fen,expected.slice(0,2),expected.slice(2,4));
  assert.equal(played.uci,expected);
  assert.equal(puzzleMove(puzzle.fen,'a1','a8'),null);
  assert.equal(new Chess(puzzle.fen).fen(),puzzle.fen);
});
