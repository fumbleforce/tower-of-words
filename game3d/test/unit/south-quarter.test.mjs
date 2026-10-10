import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { SOUTH_QUARTER_BEDS, JUNCTION_TREE, JUNCTION_SHRUB } from '../../js/scenes/forecourt/quarter-planting-plan.js';
import { plantedTrees } from '../../js/ui/map/terrain.js';
import { BED_WALKS } from '../../js/scenes/campus/bed-walks.js';

test('southern beds contain relocated roots and retain the lamp pocket', () => {
  assert.deepEqual(JUNCTION_TREE, ['keyaki', 0.65, -23.1, 1.08, 68]);
  assert.deepEqual(JUNCTION_SHRUB, {
    x: 8.4,
    z: -26.8,
    n: 4,
    r: 0.38,
    spread: 0.55,
    seed: 82,
  });
  // the relocated tree and shrub stand on the lawn beside the beds, which are strips along the street now
  // (outdoor/bed-layout.js); they stay off the street
  for (const [x, z] of [
    [0.65, -23.1],
    [8.4, -26.8],
  ])
    assert(!BED_WALKS.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1));
  assert(SOUTH_QUARTER_BEDS[1].gaps.some(([x, z, r]) => x === 7 && z === -24.3 && r >= 0.65));
  assert.deepEqual(
    plantedTrees.filter((tree) => tree[4] === 68),
    [JUNCTION_TREE],
  );
});

test('built north street preserves trees and opens both kerbs, hedge and groundcover', async () => {
  const hook = registerHooks({
    resolve(s, c, next) {
      if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
      if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
      return next(s, c);
    },
  });
  const globals = Object.fromEntries(
    ['location', 'window', 'localStorage', 'document', 'addEventListener'].map((k) => [k, globalThis[k]]),
  );
  Object.assign(globalThis, {
    location: { search: '' },
    window: {},
    localStorage: { getItem: () => null },
    document: {},
    addEventListener() {},
  });
  let restore;
  try {
    const THREE = await import('../../vendor/three/three.module.js');
    const { Parts } = await import('../../js/scenes/outdoor/parts.js');
    const { lightSet } = await import('../../js/scenes/outdoor/furniture.js');
    const { northSteps } = await import('../../js/scenes/forecourt/north.js');
    const { southQuarterGrounds } = await import('../../js/scenes/forecourt/quarter-planting.js');
    const { CHUNKS } = await import('../../js/scenes/island-layout.js');
    const physical = await import('../../js/scenes/forecourt/plan.js');
    const pure = await import('../../js/scenes/forecourt/cross-plan.js');
    assert.equal(physical.CROSS, pure.CROSS, 'physical builder uses the shared pure footprint');
    const baselineCross = [-6.8, 26.75, -17.45, -14.45]; // captured before extraction at 6b9600cd
    physical.CROSS.forEach((v, i) => assert(Math.abs(v - baselineCross[i]) < 1e-9));
    assert.equal(physical.CROSS[0], physical.X0);
    assert.equal(physical.CROSS[1], physical.E1[0]);
    assert.equal(physical.STREET_W, 3);
    const offset = CHUNKS.forecourt.at,
      records = [],
      crossings = [];
    const geo = Parts.prototype.geo;
    restore = () => {
      Parts.prototype.geo = geo;
    };
    Parts.prototype.geo = function (color, g, options) {
      g.computeBoundingBox();
      const b = g.boundingBox;
      if (
        b.max.y > 0.035 &&
        b.min.y < 0.65 &&
        b.min.x + offset[0] < 5.999 &&
        b.max.x + offset[0] > 3.001 &&
        b.min.z + offset[1] < -18.101 &&
        b.max.z + offset[1] > -19.199
      )
        crossings.push({ color, min: b.min.toArray(), max: b.max.toArray() });
      return geo.call(this, color, g, options);
    };
    const root = new THREE.Group();
    for (const _ of northSteps(root, lightSet(), {
      closed: false,
      planting: {
        hedge() {
          return false;
        },
        tree(p, tree) {
          records.push(tree);
          return false;
        },
      },
    }))
      void _;
    restore();
    assert.deepEqual(crossings, [], 'no bed, hedge or kerb may cross the quarter-street opening');
    const originals = [
      ['keyaki', -15.75, -20.2, 1, 63],
      ['keyaki', -11.75, -20.2, 1.04, 64],
      ['keyaki', -7.75, -20.2, 1.08, 65],
      ['keyaki', -3.75, -20.2, 1, 66],
      ['keyaki', 0.25, -20.2, 1.04, 67],
      ['keyaki', 8.25, -20.2, 1, 69],
      ['keyaki', -12.45, -23.8, 1.1, 70],
      ['sakura', -7.75, -25.6, 1, 71],
      ['ginkgo', -2.35, -23.6, 1, 72],
      ['keyaki', 2.85, -25, 1.15, 73],
      ['ginkgo', 8.65, -23.4, 0.95, 74],
      JUNCTION_TREE,
    ];
    for (const [species, x, z, scale, seed] of originals) {
      const matches = records.filter((t) => t.seed === seed && t.species === species);
      assert.equal(matches.length, 1, `${species}/${seed} built exactly once`);
      const tree = matches[0];
      assert.equal(tree.scale, scale);
      assert(Math.abs(tree.x + offset[0] - x) < 1e-9, `x seed ${seed}`);
      assert(Math.abs(tree.z + offset[1] - z) < 1e-9, `z seed ${seed}`);
    }
    // Every triangle in the southern detail stays off the pedestrian street, at every height.
    const meshes = new THREE.Group(),
      parts = new Parts();
    southQuarterGrounds(parts);
    parts.build(meshes);
    meshes.traverse((m) => {
      if (!m.isMesh) return;
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        assert(
          !(p.getX(i) > 3 && p.getX(i) < 6 && p.getZ(i) > -30 && p.getZ(i) < -18.1),
          'new geometry occupies street',
        );
    });
    const treeMeshes = [];
    root.traverse((m) => {
      if (!m.isMesh || m.userData.surf !== 'bark') return;
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        if (Math.hypot(p.getX(i) + offset[0] - 0.65, p.getZ(i) + offset[1] + 23.1) < 0.15) {
          treeMeshes.push(m);
          break;
        }
    });
    assert(treeMeshes.length > 0);
    assert(
      treeMeshes.every((m) => m.castShadow),
      'relocated tree retains shadows in actual northSteps',
    );
  } finally {
    restore?.();
    hook.deregister();
    for (const [k, v] of Object.entries(globals))
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
  }
});
