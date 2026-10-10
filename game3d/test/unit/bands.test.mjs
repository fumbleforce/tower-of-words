// The bands past the outdoor places' exits (scenes/bands.js, outdoor/band.js, #260): the clip keeps only what reaches
// into its rects, and the table (scenes/bands-plan.js) names real places, builders and blocks, its rects never overlap.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = () =>
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three')
        return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
      if (specifier.startsWith('three/addons/'))
        return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
      return next(specifier, context);
    },
  });

test('a band clips paving to its rects on the field origin and keeps only geometry and lamps that reach in', async () => {
  const h = hooks();
  try {
    const THREE = await import('../../vendor/three/three.module.js');
    const { band } = await import('../../js/scenes/outdoor/band.js');
    const b = band([
      [0, 10, 0, 10],
      [20, 30, 0, 10],
    ]);
    const laid = [];
    const pv = b.paver({ field: (r, o) => laid.push([r, o.origin]) });
    pv.field([-5, 25, 2, 4], { pattern: 'grid' });
    assert.deepEqual(laid, [
      [
        [0, 10, 2, 4],
        [-5, 2],
      ],
      [
        [20, 25, 2, 4],
        [-5, 2],
      ],
    ]);
    pv.field([12, 18, 0, 10], {});
    assert.equal(laid.length, 2, 'a field between the rects is not laid');

    const kept = [];
    const p = b.parts({ geo: (c, g) => kept.push(g), box: (...a) => kept.push(a) });
    p.geo('#fff', new THREE.BoxGeometry(1, 1, 1).translate(5, 0, 5));
    p.geo('#fff', new THREE.BoxGeometry(1, 1, 1).translate(15, 0, 5));
    p.box('#fff', 1, 1, 1, 25, 0, 5);
    p.box('#fff', 1, 1, 1, 15, 0, 5);
    assert.equal(kept.length, 2);

    const set = { glowParts: [], lit: [] };
    const l = b.lights(set);
    l.lit.push([5, 5, 1], [15, 5, 1]);
    l.glowParts.push(new THREE.BoxGeometry(0.2, 0.2, 0.2).translate(15, 2, 5));
    assert.deepEqual(set.lit, [[5, 5, 1]]);
    assert.equal(set.glowParts.length, 0);

    assert.ok(b.shift(-20, 0).has(5, 5));
    assert.ok(!b.shift(-20, 0).has(15, 5));
  } finally {
    h.deregister();
  }
});

test('the bands table names real places, builders and blocks, and no band covers a rect twice', async () => {
  const h = hooks();
  const saved = { location: globalThis.location };
  globalThis.location = { search: '' };
  try {
    const { BANDS } = await import('../../js/scenes/bands-plan.js');
    const { CHUNKS, BUILDINGS } = await import('../../js/scenes/island-layout.js');
    const { BLOCKS } = await import('../../js/scenes/plaza/east-plan.js');
    const builders = [
      'eastLane',
      'sportsGrounds',
      'coastWalk',
      'westCoast',
      'officeLawns',
      'lawn',
      'fronts',
      'quarterGrounds',
      'shedGarden',
      'canteenYard',
      'officeStreet',
      'officeRow',
    ];
    for (const [chunk, list] of Object.entries(BANDS)) {
      assert.ok(CHUNKS[chunk], `${chunk} is a place`);
      for (const b of list) {
        assert.ok(builders.includes(b.by), `${chunk}: ${b.by} is a builder`);
        for (const id of b.skip || [])
          assert.ok(
            BLOCKS.some((k) => k.id === id),
            `${chunk}: ${id} is an east lane block`,
          );
        for (const id of b.ids || [])
          assert.ok(
            BUILDINGS.some((x) => x.id === id),
            `${chunk}: ${id} is a building`,
          );
        for (const k of b.blocks || [])
          assert.ok(
            BUILDINGS.some((x) => x.id === k.id),
            `${chunk}: ${k.id} is a building`,
          );
        const rects = b.rects || [];
        for (const [i, r] of rects.entries()) {
          assert.ok(r[0] < r[1] && r[2] < r[3], `${chunk} ${b.by}: rect ${i} is [x0, x1, z0, z1]`);
          for (const q of rects.slice(i + 1))
            assert.ok(r[1] <= q[0] || q[1] <= r[0] || r[3] <= q[2] || q[3] <= r[2], `${chunk} ${b.by}: rects overlap`);
        }
      }
    }
  } finally {
    h.deregister();
    if (saved.location === undefined) delete globalThis.location;
    else globalThis.location = saved.location;
  }
});
