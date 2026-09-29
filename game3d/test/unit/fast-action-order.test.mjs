import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

test('the fast driver finishes Say practice and voice before choosing another action', async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL?.includes('/js/testmode.js')) {
        const modules = {
          './ui.js': 'export const ui = {}; export function setMuted() {}',
          './lang.js': 'export const known = new Set(); export const SAYABLE = [];',
          './runner.js': 'export const flags = {};',
          './move.js': 'export function startMoveCheck() {}',
        };
        if (modules[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(modules[specifier]), shortCircuit: true };
      }
      return next(specifier, context);
    },
  });
  const oldWindow = globalThis.window, oldLocation = globalThis.location, oldInterval = globalThis.setInterval;
  let tick, actions = 0;
  globalThis.window = { addEventListener() {} };
  globalThis.location = { search: '?test=fast' };
  globalThis.setInterval = callback => { tick = callback; };
  try {
    const { start } = await import('../../js/testmode.js');
    const game = { saying: true, busy: false, place: { name: 'train' }, player: {}, walker: {},
      markers: { list: [{ id: 'mio', enabled: () => true, goal: () => true }] }, use: () => actions++ };
    start(game);
    await new Promise(resolve => setImmediate(resolve));
    tick(); tick();
    assert.equal(actions, 0, 'A word still in flight must not be replaced by another action');
    game.saying = false;
    tick();
    assert.equal(actions, 1, 'The waiting action should start after Say finishes');
  } finally {
    hooks.deregister();
    globalThis.window = oldWindow;
    globalThis.location = oldLocation;
    globalThis.setInterval = oldInterval;
  }
});
