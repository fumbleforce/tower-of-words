import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verdict, decide, GAP } from '../../js/bonds/register-react.js';
import { CAST, WORD_REGISTER } from '../../js/bonds/cast.js';
import REGISTER, { HANDLED, NOTES } from '../../story/conversations/register.js';

// a Say, with the counters kept the way the glue keeps them
function sayer() {
  const store = {};
  const get = (k) => store[k];
  return (o) => {
    const d = decide(get, { lines: 3, ...o });
    if (!o.peek) Object.assign(store, d.set);
    return d;
  };
}

test('verdict: too casual, too stiff, just right, or nothing', () => {
  assert.equal(verdict('polite', 'casual'), 'casual');
  assert.equal(verdict('casual', 'polite'), 'stiff');
  assert.equal(verdict('polite', 'polite'), 'right');
  assert.equal(verdict('casual', 'casual'), 'right');
  assert.equal(verdict(undefined, 'casual'), null);
  assert.equal(verdict('polite', undefined), null);
});

test('one reaction per person per day, lines in order, then quiet', () => {
  const say = sayer();
  assert.equal(say({ who: 'rei', kind: 'casual', day: 3 }).n, 1);
  assert.equal(say({ who: 'other', kind: null, day: 3 }).n, 0); // a Say in between
  assert.equal(say({ who: 'rei', kind: 'casual', day: 3 }).n, 0, 'same day');
  assert.equal(say({ who: 'rei', kind: 'casual', day: 4 }).n, 2);
  assert.equal(say({ who: 'rei', kind: 'casual', day: 5 }).n, 0, 'the Say right after a reaction');
  assert.equal(say({ who: 'rei', kind: 'casual', day: 5 }).n, 3);
  assert.equal(say({ who: 'other', kind: null, day: 6 }).n, 0);
  assert.equal(say({ who: 'rei', kind: 'casual', day: 6 }).n, 0, 'lines used up');
});

test('never on two Says in a row, even to different people', () => {
  const say = sayer();
  assert.equal(GAP, 1);
  assert.equal(say({ who: 'kenji', kind: 'stiff', day: 1 }).n, 1);
  assert.equal(say({ who: 'kuro', kind: 'casual', day: 1 }).n, 0);
  assert.equal(say({ who: 'kuro', kind: 'casual', day: 1 }).n, 1);
});

test('just right only every second time', () => {
  const say = sayer();
  assert.equal(say({ who: 'kuro', kind: 'right', day: 1 }).n, 0);
  assert.equal(say({ who: 'x', kind: null, day: 1 }).n, 0);
  assert.equal(say({ who: 'kuro', kind: 'right', day: 2 }).n, 1);
  assert.equal(say({ who: 'kuro', kind: 'right', day: 3 }).n, 0);
  assert.equal(say({ who: 'x', kind: null, day: 3 }).n, 0);
  assert.equal(say({ who: 'kuro', kind: 'right', day: 4 }).n, 2);
});

test('an authored answer that already reacts uses up the day without a line', () => {
  const say = sayer();
  const d = say({ who: 'mio', kind: 'stiff', day: 1, handled: true });
  assert.equal(d.n, 0);
  assert.ok(d.handled);
  assert.equal(say({ who: 'x', kind: null, day: 1 }).n, 0);
  assert.equal(say({ who: 'mio', kind: 'stiff', day: 1 }).n, 0, 'same day');
  assert.equal(say({ who: 'mio', kind: 'stiff', day: 2 }).n, 1, 'its own first line comes later');
});

test('peek neither counts nor waits for the gap or the second time', () => {
  const say = sayer();
  assert.equal(say({ who: 'kuro', kind: 'right', day: 1, peek: true }).n, 1);
  assert.equal(say({ who: 'kuro', kind: 'right', day: 1 }).n, 0, 'the peek was not counted');
  assert.equal(say({ who: 'kuro', kind: 'stiff', day: 1, lines: 0, peek: true }).n, 0, 'no lines');
});

test('the story has lines for every kind a known word can reach, and nothing else', () => {
  const nodes = REGISTER.nodes;
  const kinds = new Set(Object.values(WORD_REGISTER));
  for (const who of ['mio', 'kenji', 'kuro', 'rei']) {
    const want = CAST[who].register;
    for (const have of kinds) {
      const kind = verdict(want, have);
      assert.ok(nodes[`register_${who}_${kind}_1`], `${who} ${kind}`);
      assert.ok(NOTES[who][kind], `${who} ${kind} note`);
    }
  }
  for (const id of Object.keys(nodes)) assert.match(id, /^register_(mio|kenji|kuro|rei)_(casual|stiff|right)_\d$/);
  for (const id of HANDLED) assert.equal(typeof id, 'string');
});
