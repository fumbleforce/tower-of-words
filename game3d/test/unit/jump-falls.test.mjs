// Jumping somewhere stupid (movement/fall-edges.js, places/dorm-falls.js): which jumps go over a parapet.
import assert from 'node:assert/strict';
import test from 'node:test';
import { edgeAhead } from '../../js/movement/fall-edges.js';
import { registerHooks } from 'node:module';

const wall = { a: [0, 2], b: [10, 2], out: [0, 1] };

test('a jump at a parapet goes over it only when heading out over it, close to it and along it', () => {
  assert.ok(edgeAhead([wall], [5, 1.8], [0, 1], 0.5));
  assert.equal(edgeAhead([wall], [5, 1.8], [1, 0], 0.5), null, 'along the corridor');
  assert.equal(edgeAhead([wall], [5, 1.8], [0, -1], 0.5), null, 'away from it');
  assert.equal(edgeAhead([wall], [5, 1.0], [0, 1], 0.5), null, 'too far from it');
  assert.equal(edgeAhead([wall], [11, 1.8], [0, 1], 0.5), null, 'past its end');
  assert.ok(edgeAhead([wall], [5, 1.8], [0.6, 0.8], 0.5), 'at an angle is still over');
});

test("his building's corridors and roof each have a fall edge where the walk stops at the parapet", async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three')
        return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
      if (specifier.startsWith('three/addons/'))
        return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
      return next(specifier, context);
    },
  });
  const had = 'location' in globalThis;
  if (!had) globalThis.location = new URL('http://127.0.0.1/game3d/index.html'); // the scene modules read the query
  const { dormFalls } = await import('../../js/places/dorm-falls.js');
  if (!had) delete globalThis.location;
  const { CORR, LEVEL_DX } = await import('../../js/scenes/dorms/layout.js');
  hooks.deregister();
  const edges = dormFalls();
  const z = CORR[1] - 0.12 - 0.15;
  for (const dx of [LEVEL_DX['2f'], LEVEL_DX['3f']]) assert.ok(edgeAhead(edges, [dx - 1, z], [0, 1], 0.4));
  assert.equal(edgeAhead(edges, [LEVEL_DX['2f'] - 1, z], [0, -1], 0.4), null, 'toward the flats is no fall');
  assert.ok(edges.some((e) => e.a[0] > LEVEL_DX.roof - 20 && e.out[0] === -1), 'the roof has its west edge');
});
