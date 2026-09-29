// Exercise the actual UI callback and its delegation without booting the renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { format } from 'prettier';
import { parseModule } from '../../../tools/lib/place-source.mjs';
import { giveItem } from '../../js/gameplay/gifts.js';
import { ITEMS } from '../../js/gameplay/items.js';

const source = fs.readFileSync(new URL('../../js/main.js', import.meta.url), 'utf8');
function boundary(source) {
  const ast = parseModule(source);
  const callback = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'give');
  const binding = ast.body.find(n => n.type === 'ExpressionStatement' &&
    n.expression.type === 'AssignmentExpression' && n.expression.left.object?.name === 'ui' &&
    n.expression.left.property?.name === 'onGive');
  assert.ok(callback && binding, 'main must connect its gift callback');
  return [callback, binding].map(n => source.slice(...n.range)).join('\n');
}

async function checkBoundary(source) {
  for (const mode of ['accept', 'keep', 'unmatched', 'cancel', 'busy', 'empty', 'no-target']) {
    const flags = {}, calls = [], inventory = mode === 'empty' ? [] : ['coffee'];
    const target = { id: 'mio', label: 'Mio' };
    const take = item => { calls.push('take'); inventory.splice(inventory.indexOf(item), 1); };
    const runner = {
      has: key => mode !== 'unmatched' && key === 'give:coffee:mio',
      entry: (_key, options) => { assert.deepEqual(options, { peek: true }); return { keep: mode === 'keep' }; },
      trigger: key => calls.push(key),
    };
    const game = { busy: mode === 'busy', sayTarget: mode === 'no-target' ? null : target, runner, beat: fn => fn() };
    const sim = { inv: inventory };
    const ui = {
      giveMenu: async (label, inv, items) => {
        calls.push('menu'); assert.equal(label, target.label); assert.equal(inv, inventory); assert.equal(items, ITEMS);
        return mode === 'cancel' ? null : 'coffee';
      },
      say: (_who, text) => { assert.match(text, /You keep it/); calls.push('fallback'); },
    };
    const delegate = (context, item, who) => {
      calls.push('delegate');
      assert.equal(context.runner, runner); assert.equal(context.flags, flags); assert.equal(context.take, take);
      assert.equal(item, 'coffee'); assert.equal(who, 'mio');
      return giveItem(context, item, who);
    };
    new Function('game', 'sim', 'ui', 'ITEMS', 'flags', 'take', 'giveItem', boundary(source))
      (game, sim, ui, ITEMS, flags, take, delegate);
    await ui.onGive();
    const expected = { accept: ['menu', 'delegate', 'take', 'give:coffee:mio'],
      keep: ['menu', 'delegate', 'give:coffee:mio'], unmatched: ['menu', 'delegate', 'fallback'],
      cancel: ['menu'], busy: [], empty: [], 'no-target': [] };
    assert.deepEqual(calls, expected[mode], mode);
    assert.deepEqual(flags, mode === 'accept' ? { gave_coffee_mio: true } : {}, mode);
    assert.deepEqual(inventory, ['accept', 'empty'].includes(mode) ? [] : ['coffee'], mode);
  }
}

test('main gift UI delegates acceptance and refusal before changing inventory', async () => {
  await checkBoundary(source);
  await checkBoundary(await format(source, { parser: 'babel' }));
});

test('gift integration catches bypassed delegation and a dropped successful return', async () => {
  for (const [before, after] of [
    ['if (giveItem({ runner: game.runner, flags, take }, item, target.id)) return;', 'take(item);'],
    ['if (giveItem({ runner: game.runner, flags, take }, item, target.id)) return;', 'giveItem({ runner: game.runner, flags, take }, item, target.id);'],
  ]) {
    assert.ok(source.includes(before));
    await assert.rejects(checkBoundary(source.replace(before, after)));
  }
});
