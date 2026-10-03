import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { cond, flags, Runner } = await import('../../js/runner.js');
const { known } = await import('../../js/lang.js');
const state = await import('../../js/narrative/state.js');

function reset() {
  for (const key of Object.keys(flags)) delete flags[key];
  known.clear();
}

test('Runner re-exports the same state object and bound evaluator', () => {
  assert.equal(flags, state.flags);
  assert.equal(cond, state.cond);
  reset();
  state.flags.shared = 1;
  assert.equal(cond('shared'), true);
  flags.shared = 0;
  assert.equal(state.cond('shared'), false);
});

test('condition facade retains JavaScript precedence, coercion and flag lookup rules', () => {
  reset();
  Object.assign(flags, { n: 2, off: false, empty: '', nil: null, title: 'Mio', null: 3, undefined: 4, NaN: 5 });
  const cases = [
    [undefined, true], [null, true], [true, true], [false, false],
    ['!n == 1', false], ['n + 1 > 2', true], ['-n < 0', true], ['1 < n < 3', true],
    ['n | 1', true], ['n << 1', true], ['1e3 > n', true], ['0xff > n', true],
    ['missing === 0', true], ['nil === 0', true], ['off === 0', false], ['empty === 0', false],
    ['off == 0', true], ['title == "Mio"', true], ["'n' === 'n'", true],
    ['true && !false', true], ['null === 3 && undefined === 4 && NaN === 5', true],
    ['constructor', true],
  ];
  for (const [expression, expected] of cases) assert.equal(cond(expression), expected, String(expression));
  assert.throws(() => cond(2), TypeError);
});

test('compiled expressions see later flag and canonical knowledge changes', () => {
  reset();
  flags.know_ohayo = true;
  assert.equal(cond('know_ohayo'), false);
  known.add('ohayo');
  assert.equal(cond('know_ohayo'), true);
  known.delete('ohayo');
  assert.equal(cond('know_ohayo'), false);
  assert.equal(cond('changing'), false);
  flags.changing = 1;
  assert.equal(cond('changing'), true);
  flags.changing = 0;
  assert.equal(cond('changing'), false);
});

test('invalid characters warn each time, invalid syntax once, and failed lookups return false', () => {
  reset();
  const warnings = [], original = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    for (let i = 0; i < 2; i++) assert.equal(cond('bad;chars'), false);
    for (let i = 0; i < 2; i++) assert.equal(cond('n &&'), false);
    assert.equal(cond(''), false);
    assert.equal(warnings.length, 4);
    assert.deepEqual(warnings.slice(0, 2), [['bad condition', 'bad;chars'], ['bad condition', 'bad;chars']]);
    assert(warnings[2][2] instanceof SyntaxError);
    const reads = [];
    Object.defineProperty(flags, 'broken', { configurable: true, get() { reads.push('broken'); throw new Error('lookup'); } });
    assert.equal(cond('true || broken'), true);
    assert.equal(cond('false && broken'), false);
    assert.deepEqual(reads, []);
    assert.equal(cond('broken'), false);
    assert.deepEqual(reads, ['broken']);
    assert.equal(warnings.length, 4);
  } finally { console.warn = original; delete flags.broken; }
});

test('ordered once resolution leaves peeks untouched and keeps keys independent', () => {
  reset();
  const runner = new Runner({});
  runner.use({ name: 'office' }, { nodes: { first: [], fallback: [] }, on: {
    'talk:mio': [{ node: 'first', if: 'eligible', once: true }, 'fallback'],
    'near:mio': { node: 'first', once: true },
  } });
  assert.equal(runner.entry('talk:mio', { peek: true }).node, 'fallback');
  flags.eligible = true;
  for (let i = 0; i < 2; i++) {
    assert.equal(runner.has('talk:mio'), true);
    assert.equal(runner.entry('talk:mio', { peek: true }).node, 'first');
  }
  assert.equal(runner.onceDone.size, 0);
  assert.equal(runner.entry('talk:mio').node, 'first');
  assert.equal(runner.entry('talk:mio').node, 'fallback');
  assert.equal(runner.entry('near:mio').node, 'first');
  assert.deepEqual([...runner.onceDone], ['talk:mio>first', 'near:mio>first']);
});
