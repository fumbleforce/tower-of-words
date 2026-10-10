// A scripted walk that goes round and round one way ends, even while it creeps nearer each lap (#195: Mio circled
// the corner by her chair 1.5 times); an ordinary route's turns, and a turn-around at the start, don't end it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stuck } from '../../js/movement/navigation.js';

const DT = 0.05;
const fresh = () => ({ best: Infinity, noGain: 0, spun: 0, net: 0 });

test('circling at the turn rate while creeping nearer ends well short of the day test\'s 1.5 turns', () => {
  const prog = fresh();
  let remain = 1.0,
    turned = 0,
    ended = false;
  for (let i = 0; i < 400 && !ended; i++) {
    remain -= 0.003; // a little nearer each step: every 2 cm of progress resets the full-turn count
    const turn = -9 * DT; // TURN, one way
    ended = stuck(prog, remain, DT, 0, turn);
    turned += turn;
  }
  assert.ok(ended, 'the walk ended');
  assert.ok(Math.abs(turned) < 1.25 * 2 * Math.PI, `ended after ${(Math.abs(turned) / (2 * Math.PI)).toFixed(2)} turns`);
});

test('a turn-around at the start, then corners both ways, walks on', () => {
  const prog = fresh();
  let remain = 6;
  const turns = [];
  for (let i = 0; i < 7; i++) turns.push(9 * DT); // half a turn on the spot (moving off slowly)
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < 12; i++) turns.push(0); // a straight leg
    for (let i = 0; i < 4; i++) turns.push((k % 2 ? -1 : 1) * 9 * DT); // a corner, a little over a quarter turn
  }
  for (const turn of turns) {
    remain -= 0.05;
    assert.equal(stuck(prog, remain, DT, 0, turn), false);
  }
});

test('a walk round a block, a quarter turn one way at each corner, walks on', () => {
  const prog = fresh();
  let remain = 20;
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < 30; i++) assert.equal(stuck(prog, (remain -= 0.06), DT, 0, 0), false);
    for (let i = 0; i < 4; i++) assert.equal(stuck(prog, (remain -= 0.03), DT, 0, (Math.PI / 2) / 4), false);
  }
});
