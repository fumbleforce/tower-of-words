import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSource } from '../../lib/source-data.mjs';
import { encodeSteps, encodeStep, quote } from '../encode.mjs';
import { moveStep, withSpeaker, withText, kindOf, textsOf } from '../web/model.js';

const source = `export default { nodes: {
    a: [
      { do: 'hold', who: 'mori' },   // stays with Mori
      // the greeting
      'mori: Hello.',
      { say: 'eric', text: 'Hi.' },
    ],
  } };
`;
const array = () => {
  const ast = parseSource(source);
  let found;
  const walk = n => { if (!n || typeof n !== 'object') return; if (n.type === 'ArrayExpression' && !found) found = n; for (const v of Object.values(n)) if (v && typeof v === 'object') Array.isArray(v) ? v.forEach(walk) : walk(v); };
  walk(ast.body);
  return { node: found, comments: ast.comments };
};
const original = [{ do: 'hold', who: 'mori' }, 'mori: Hello.', { say: 'eric', text: 'Hi.' }];

test('an unchanged list keeps its exact text', () => {
  const { node, comments } = array();
  assert.equal(encodeSteps(structuredClone(original), original, node, source, comments), source.slice(...node.range));
});

test('moved steps keep their text and comments; edits are written in house style', () => {
  const { node, comments } = array();
  const steps = [original[1], original[0], { say: 'eric', text: "It's fine." }];
  const out = encodeSteps(steps, original, node, source, comments);
  assert.equal(out, `[
      // the greeting
      'mori: Hello.',
      { do: 'hold', who: 'mori' },   // stays with Mori
      "eric: It's fine.",
    ]`);
});

test('house style: short lines, unquoted keys, wrapping', () => {
  assert.equal(encodeStep({ say: 'mio', text: 'Hi', emo: 'warm' }), "{ say: 'mio', text: 'Hi', emo: 'warm' }");
  assert.equal(encodeStep({ say: 'mio', text: 'Hi' }), "'mio: Hi'");
  assert.equal(quote('a\\b'), "'a\\\\b'");
  assert.match(encodeStep({ choice: [{ text: 'x'.repeat(80), go: 'a' }, { text: 'y', go: 'b' }] }), /^\{\n {2}choice: \[\n/);
});

test('moving beats within and between lists', () => {
  const steps = ['a: 1', 'a: 2', { if: 'x', then: ['a: 3'], else: [] }];
  assert.deepEqual(moveStep(steps, [0], [], 2), [1]);
  assert.deepEqual(steps.slice(0, 2), ['a: 2', 'a: 1']);
  assert.deepEqual(moveStep(steps, [0], [2, 'else'], 0), [1, 'else', 0]);
  assert.deepEqual(steps[1].else, ['a: 2']);
  assert.deepEqual(moveStep(steps, [1], [1, 'then'], 0), [1], 'a branch cannot go inside itself');
});

test('speaker and text changes keep the step shape', () => {
  assert.equal(withSpeaker('> Quiet.', 'mio'), 'mio: Quiet.');
  assert.equal(withSpeaker('mio: Hi', ''), '> Hi');
  assert.deepEqual(withSpeaker({ narration: 'Steam.' }, 'mio', true), { say: 'mio', text: 'Steam.', en: 'Steam.', ja: '' });
  assert.equal(withText('mio: Hi', 'main', 'Hello'), 'mio: Hello');
  assert.deepEqual(withText({ say: 'mio', text: '待って' }, 'second', 'Wait'), { say: 'mio', text: '待って', en: 'Wait' });
  assert.equal(kindOf({ shot: {}, narration: 'x' }), 'picture');
  assert.deepEqual(textsOf({ say: 'mio', text: 'x', en: 'Wait', ja: '待って' }, true), { main: 'Wait', second: '待って', recipe: true });
});
