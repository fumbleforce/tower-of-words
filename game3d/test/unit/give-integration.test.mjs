// Exercise the actual gift callback (game.giveTo, used by the Interact menu's Give row and the Bag) and the menu's
// check for it (game.canGive), without booting the renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { format } from 'prettier';
import { parseModule } from '../../../tools/lib/place-source.mjs';
import { giveItem } from '../../js/gameplay/gifts.js';
import { ITEMS } from '../../js/gameplay/items.js';

const source = fs.readFileSync(new URL('../../js/gameplay/interactions.js', import.meta.url), 'utf8');
// the source of installInteractions' give function and the `game.<property> = ...` statement that connects it
function boundary(source, property) {
  const ast = parseModule(source);
  const body = ast.body.find(n => n.type === 'ExportNamedDeclaration'
    && n.declaration?.id?.name === 'installInteractions').declaration.body.body;
  const callback = body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'give');
  const binding = body.find(n => n.type === 'ExpressionStatement' &&
    n.expression.type === 'AssignmentExpression' && n.expression.left.object?.name === 'game' &&
    n.expression.left.property?.name === property);
  assert.ok(callback && binding, `interactions must connect ${property}`);
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
    const game = { busy: mode === 'busy', runner, beat: fn => fn() };
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
    new Function('game', 'sim', 'ui', 'ITEMS', 'flags', 'take', 'giveItem', boundary(source, 'giveTo'))
      (game, sim, ui, ITEMS, flags, take, delegate);
    await game.giveTo(mode === 'no-target' ? null : target);
    const expected = { accept: ['menu', 'delegate', 'take', 'give:coffee:mio'],
      keep: ['menu', 'delegate', 'give:coffee:mio'], unmatched: ['menu', 'delegate', 'fallback'],
      cancel: ['menu'], busy: [], empty: [], 'no-target': [] };
    assert.deepEqual(calls, expected[mode], mode);
    assert.deepEqual(flags, mode === 'accept' ? { gave_coffee_mio: true } : {}, mode);
    assert.deepEqual(inventory, ['accept', 'empty'].includes(mode) ? [] : ['coffee'], mode);
  }
}

test('gift delegates acceptance and refusal before changing inventory', async () => {
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

test('the Give row shows only while the bag holds something a person can take', () => {
  const canGive = (busy, inv) =>
    new Function('game', 'sim', 'ITEMS', `${boundary(source, 'canGive')}\nreturn game.canGive();`)({ busy }, { inv }, ITEMS);
  assert.equal(canGive(false, ['coffee']), true);
  assert.equal(canGive(false, ['milk', 'tea']), true);
  assert.equal(canGive(false, ['milk', 'riceball']), false, 'food that can\'t be given');
  assert.equal(canGive(false, ['card']), false, 'an id the item list doesn\'t know');
  assert.equal(canGive(false, []), false);
  assert.equal(canGive(true, ['coffee']), false, 'not while a scene runs');
});
