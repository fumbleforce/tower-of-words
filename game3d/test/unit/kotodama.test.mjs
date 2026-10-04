// Kotodama (game3d/minigames/kotodama): commands parse the way the particles say, play out
// literally, and score by the squared combo.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse, english, afterword } from '../../minigames/kotodama/grammar.js';
import { newRun, startShift, resolve } from '../../minigames/kotodama/sim.js';

const n = id => ({ t: 'n', id });
const p = x => ({ t: 'p', p: x });

function shift2() {
  const s = newRun(1);
  startShift(s);
  s.shift = 0;
  startShift(s); // shift 2: Kenji and Mori want coffee, Mio tea
  return s;
}

test('particles decide the roles, whatever the order', () => {
  const a = parse([n('kenji'), p('ni'), n('cola'), p('o')], 'vend');
  const b = parse([n('cola'), p('o'), n('kenji'), p('ni')], 'vend');
  assert.deepEqual([a.what, a.to], [['cola'], ['kenji']]);
  assert.deepEqual([b.what, b.to], [['cola'], ['kenji']]);
  assert.equal(english(a), 'Vending machine, put out a cola for Kenji.');
});

test('incomplete commands say what is missing', () => {
  assert.equal(parse([n('kenji')], 'vend').ok, false);
  assert.match(parse([n('kenji'), p('ni')], 'vend').need, /を/);
  assert.match(parse([n('cola'), p('o'), n('tea'), p('o')], 'vend').need, /One を/);
});

test('と serves two people in one command, scored 2 × 2', () => {
  const s = shift2();
  const cmd = parse([n('kenji'), p('to'), n('mori'), p('ni'), n('coffee'), p('o')], 'vend');
  assert.deepEqual(cmd.to, ['kenji', 'mori']);
  const res = resolve(s, cmd);
  assert.equal(res.served, 2);
  assert.equal(res.points, 40);
  assert.ok(!s.tickets.kenji && !s.tickets.mori);
});

test('a swapped particle puts the person out of the machine', () => {
  const s = shift2();
  const cmd = parse([n('coffee'), p('ni'), n('kenji'), p('o')], 'vend');
  const res = resolve(s, cmd);
  assert.equal(res.deliveries[0].kind, 'launch');
  assert.equal(res.points, 0);
  assert.match(afterword(cmd, res), /を marks what comes out: Kenji/);
});

test('にも repeats the last command for someone else, free, and grows the combo', () => {
  const s = shift2();
  s.powers.add('mo');
  resolve(s, parse([n('kenji'), p('ni'), n('coffee'), p('o')], 'vend'));
  s.tickets.mio = { item: 'coffee', patience: 3, max: 3 };
  const turn = s.turn;
  const mo = parse([n('mio'), p('nimo')], 'vend', { last: s.last, moReady: s.moReady });
  assert.ok(mo.ok);
  const res = resolve(s, mo);
  assert.equal(res.free, true);
  assert.equal(s.turn, turn);
  assert.equal(res.n, 2);
});
