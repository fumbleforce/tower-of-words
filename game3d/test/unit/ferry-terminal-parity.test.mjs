import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const ctx = new Proxy(
  {
    measureText: (t) => ({ width: String(t).length * 8 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
  },
  { get: (o, k) => o[k] || (() => {}) },
);
globalThis.document.createElement = () => ({ width: 128, height: 128, getContext: () => ctx, style: {} });
import { createHash } from 'node:crypto';
const { shipsSteps } = await import('../../js/scenes/harbour/ships.js');
const { quaySteps, ferryLandingSteps } = await import('../../js/scenes/harbour/quay.js');
function capture(ships, quay) {
  const rows = { ship: [], glass: [], lit: [], board: [], quay: [], water: [], paving: [] };
  const record = (name, ...args) => rows[name].push(JSON.stringify(args));
  const parts = (name) => ({
    box(...args) {
      record(name, 'box', args);
    },
    geo(color, geometry, options) {
      const hash = createHash('sha256');
      for (const key of Object.keys(geometry.attributes)) {
        hash.update(key);
        hash.update(Buffer.from(geometry.attributes[key].array.buffer));
      }
      if (geometry.index) hash.update(Buffer.from(geometry.index.array.buffer));
      record(name, 'geo', color, options, hash.digest('hex'));
      geometry.dispose();
    },
  });
  if (ships)
    for (const _ of ships(
      { p: parts('ship'), glass: parts('glass'), lit: parts('lit') },
      { board: (...args) => record('board', args) },
    ))
      void _;
  for (const _ of quay({ field: (...args) => record('paving', args) }, parts('quay'), parts('water'))) void _;
  return rows;
}
// These ship/water/paving fingerprints come from main aff7bc8d before the harbour detail pass.
// Quay details may evolve, but the room must use exact canonical exterior primitives.
const original = capture(shipsSteps, quaySteps);
const digest = (...groups) => createHash('sha256').update(JSON.stringify(groups)).digest('hex');
test('harbour details preserve original ship, water and paving construction', () => {
  assert.equal(
    digest(original.ship, original.glass, original.lit, original.board),
    '275c9f69f65be42cf7b0374d90337656c43bc1d939bfe616db84553245564d0c',
  );
  assert.equal(digest(original.water), '390b7143034761676192bd7993c8868004a83322ea703bcdd46cd59c0d335695');
  assert.equal(digest(original.paving), '591a05f98328ed1173e5caec8067ded1190d186c91830fd9cee0801dac861498');
});

test('every terminal quay primitive and paving call occurs unchanged in the harbour exterior', () => {
  const terminal = capture(null, ferryLandingSteps);
  for (const key of ['quay', 'paving']) {
    const remaining = new Map();
    for (const row of original[key]) remaining.set(row, (remaining.get(row) || 0) + 1);
    assert.ok(terminal[key].length > 0, `nonempty terminal ${key}`);
    for (const row of terminal[key]) {
      assert.ok(remaining.get(row) > 0, `${key} primitive differs or is duplicated: ${row}`);
      remaining.set(row, remaining.get(row) - 1);
    }
  }
});
process.on('exit', () => hooks.deregister());
