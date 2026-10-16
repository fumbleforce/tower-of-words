// The ticket app's labels (js/ui/ticket-words.js, #638): a tap explains, a successful typed attempt teaches.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const { createLabelLessons } = await import('../../js/ui/ticket-words.js');

function setup(practiceResult) {
  const knownSet = new Set();
  const calls = { practice: [], learn: [] };
  const lessons = createLabelLessons({
    practice: async (id) => (calls.practice.push(id), practiceResult),
    learn: (id) => (calls.learn.push(id), !knownSet.has(id) && !!knownSet.add(id)),
    isKnown: (id) => knownSet.has(id),
  });
  return { lessons, calls, knownSet };
}

test('explaining a label teaches nothing and asks for no attempt', () => {
  const { lessons, calls, knownSet } = setup(true);
  assert.deepEqual(lessons.explain('kenmei'), { id: 'kenmei', known: false });
  assert.equal(knownSet.size, 0);
  assert.deepEqual(calls, { practice: [], learn: [] });
});

test('a word is learned only after a successful attempt', async () => {
  const { lessons, calls, knownSet } = setup(true);
  assert.equal(await lessons.attempt('kenmei'), true);
  assert.ok(knownSet.has('kenmei'));
  assert.deepEqual(calls.practice, ['kenmei']);
  assert.deepEqual(lessons.explain('kenmei'), { id: 'kenmei', known: true });
  assert.equal(await lessons.attempt('kenmei'), false, 'a known word asks for no second attempt');
  assert.deepEqual(calls.practice, ['kenmei']);
});

test('backing out of the attempt learns nothing', async () => {
  const { lessons, calls, knownSet } = setup(false);
  assert.equal(await lessons.attempt('kenmei'), false);
  assert.equal(knownSet.size, 0);
  assert.deepEqual(calls.learn, []);
});

test('Back, Close and Take ticket never teach: the view has no learning call on its buttons', () => {
  const src = readFileSync(new URL('../../js/ui/tickets-view.js', import.meta.url), 'utf8');
  assert.ok(!/\bteach\(/.test(src), 'no teach() on a tap or a button');
  assert.ok(!/\blearn\(/.test(src.replace(/^\s*\/\/.*$/gm, '').replace(/learn = \(\) => false/, '')), 'the view never calls learn itself');
  for (const w of ['tojiru', 'modoru', 'tanto']) {
    assert.match(src, new RegExp(`data-w="${w}">\\$\\{lab\\('${w}', \\{ tap: false \\}\\)`), `${w} is a plain button label`);
  }
});
