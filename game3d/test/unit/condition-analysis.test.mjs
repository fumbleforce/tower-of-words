import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedConditionCharacters, compileCondition, createConditionEvaluator } from '../../js/narrative/conditions.js';
import { parseCond, condFlags, buildGraph } from '../../../bible/story-graph.js';

test('compiler and graph validation accept runtime expressions beyond the analysis subset', () => {
  assert.equal(typeof window, 'undefined');
  const lookup = key => ({ n: 2, label: 'Mio' })[key] ?? 0;
  const evaluate = createConditionEvaluator(lookup);
  for (const source of ['n + 1 > 2', '-n < 0', '1 < n < 3', 'n | 1', 'n << 1', '1e3 > n', '0xff > n']) {
    const compiled = compileCondition(source);
    assert.equal(compiled.error, undefined, source);
    assert.equal(!!compiled.evaluate(lookup), evaluate(source), source);
    const ast = parseCond(source);
    assert.equal(ast.k, 'opaque', source);
    assert.deepEqual([...condFlags(ast)], ['n'], source);
  }
  assert.deepEqual([...condFlags(parseCond(`label === 'Mio' && n > 1`))], ['label', 'n']);
});

test('analysis binds unary negation before comparisons and preserves explicit parentheses', () => {
  const flag = { k: 'flag', v: 'n' }, one = { k: 'lit', v: 1 };
  assert.deepEqual(parseCond('!n == 1'), { k: 'cmp', op: '==', a: { k: 'not', a: flag }, b: one });
  assert.deepEqual(parseCond('!(n == 1)'), { k: 'not', a: { k: 'cmp', op: '==', a: flag, b: one } });
});

test('analysis never accepts expressions rejected by shared character or compilation checks', () => {
  for (const source of ['n;', 'n % 2', 'n &&', '', 'n n', 'n ===']) {
    assert(!allowedConditionCharacters(source) || compileCondition(source).error, source);
    assert.throws(() => parseCond(source), undefined, source);
  }
  // The compiler reports identifiers, leaving literals intact.
  assert.deepEqual(compileCondition(`name == 'Mio' && true || know_ohayo`).flags, ['name', 'know_ohayo']);
});

test('opaque trigger expressions retain reads without inventing missing prerequisites', () => {
  const graph = buildGraph({ mods: { train: {
    on: { 'talk:mio': { node: 'sample', if: 'n | 1' } }, nodes: { sample: ['Hello.'] },
  }, gate: { nodes: {} }, forecourt: { nodes: {} }, office: { nodes: {} } } });
  const node = graph.nodes.get('train:sample');
  assert(node, 'fixture node must be present');
  assert.equal(node.entries[0].req.size, 0);
  assert.equal(node.entries[0].ok, true);
  assert.equal(node.reachable, true);
  assert(graph.flags.get('n').read.length > 0);
  assert(!graph.drift.unreachable.some(entry => entry.node === node.id));
});
