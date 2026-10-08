import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import {
  QUARTER_BEDS,
  QUARTER_TREES,
  BANK_FOUNDATIONS,
  BANK_APRON_DRAIN,
  quarterCover,
} from '../../js/scenes/campus/quarter-plan.js';
import { SOUTH_QUARTER_BEDS } from '../../js/scenes/forecourt/quarter-planting-plan.js';
import { CAMPUS_PATHS } from '../../js/scenes/island-campus.js';
import { insideGarden, CAMPUS_TREES } from '../../js/scenes/campus/landscape-plan.js';
import { BUILDINGS, CHUNKS } from '../../js/scenes/island-layout.js';
import { OFFICE_BELTS } from '../../js/scenes/office-quarter/planting-plan.js';
import { BANDS } from '../../js/scenes/bands-plan.js';
import { plantedTrees, officeRegions, drawPlanting } from '../../js/ui/map/terrain.js';

const inPath = (x, z) => CAMPUS_PATHS.some(({ rect: [a, b, c, d] }) => x >= a && x <= c && z >= b && z <= d);
test('quarter planting and bank drainage stay outside the canonical paths', () => {
  for (const bed of [...QUARTER_BEDS, ...SOUTH_QUARTER_BEDS]) {
    for (let x = -8; x <= 13; x += 0.08)
      for (let z = -51; z <= -18.1; z += 0.08)
        if (insideGarden(bed.poly, x, z)) {
          assert.equal(inPath(x, z), false, `${bed.id} intersects path at ${x},${z}`);
          assert.equal(
            BUILDINGS.filter((b) => b.rect).some(({ rect: [a, b, c, d] }) => x > a && x < c && z > b && z < d),
            false,
            `${bed.id} crosses building`,
          );
          assert.equal(
            OFFICE_BELTS.some(
              ([[a, c, b, d], , seed]) => seed !== 119 && x > a - 0.3 && x < c + 0.3 && z > b - 0.3 && z < d + 0.3,
            ),
            false,
            `${bed.id} stacks an existing belt`,
          );
        }
    for (const { x, z, r } of quarterCover(bed))
      for (let i = 0; i < 16; i++)
        assert.equal(
          inPath(x + Math.cos((i * Math.PI) / 8) * r * 1.04, z + Math.sin((i * Math.PI) / 8) * r * 1.04),
          false,
        );
  }
  assert(BANK_APRON_DRAIN[2] < 2.84, 'drain must clear campus west kerb');
  for (const [a, b, c, d] of BANK_FOUNDATIONS)
    for (const [x, z] of [
      [a, b],
      [c, d],
    ])
      assert.equal(inPath(x, z), false);
  assert.deepEqual(
    QUARTER_TREES.find((t) => t[4] === 838),
    CAMPUS_TREES.find((t) => t[4] === 838),
  );
  assert.equal(
    officeRegions.some((r) => r.rect[0] === -3.6 && r.rect[1] === -44),
    false,
  );
  for (const tree of QUARTER_TREES) assert.equal(plantedTrees.filter((t) => t[4] === tree[4]).length, 1);
  assert.equal(BANDS.office_quarter.find((b) => b.by === 'lawn').belts[1][3], 384, 'M6 keeps its original seed');
});

test('map draws the physical bed and drainage footprints', () => {
  const paths = [],
    rectangles = [];
  let points = [];
  const ctx = {
    beginPath() {
      points = [];
    },
    moveTo(x, z) {
      points.push([x, z]);
    },
    lineTo(x, z) {
      points.push([x, z]);
    },
    closePath() {},
    fill() {
      paths.push(points);
    },
    fillRect(x, z, w, h) {
      rectangles.push([x, z, x + w, z + h]);
    },
  };
  drawPlanting(ctx, false);
  for (const bed of [...QUARTER_BEDS, ...SOUTH_QUARTER_BEDS])
    assert(
      paths.some((p) => JSON.stringify(p) === JSON.stringify(bed.poly)),
      bed.id,
    );
  for (const rect of [...BANK_FOUNDATIONS, BANK_APRON_DRAIN])
    assert(rectangles.some((r) => r.every((v, i) => Math.abs(v - rect[i]) < 1e-9)));
});

test('shared geometry matches after chunk translation and preserves original belt trees', async () => {
  const hook = registerHooks({
    resolve(s, c, next) {
      if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
      if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
      return next(s, c);
    },
  });
  const globals = {
    location: globalThis.location,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    document: globalThis.document,
    addEventListener: globalThis.addEventListener,
  };
  Object.assign(globalThis, {
    location: { search: '' },
    window: {},
    addEventListener() {},
    localStorage: { getItem: () => null },
    document: {},
  });
  try {
    const { quarterGrounds } = await import('../../js/scenes/campus/quarter-grounds.js');
    const { southQuarterGrounds } = await import('../../js/scenes/forecourt/quarter-planting.js');
    const { belt } = await import('../../js/scenes/dorm-court/cluster-yards.js');
    const { sakura } = await import('../../js/scenes/outdoor/planting.js');
    const noop = { geo() {}, box() {} },
      trees = [];
    const kind = (name) => (p, x, z, size, seed) => trees.push([name, x, z, size, seed]);
    for (const _ of belt(noop, [-3.6, -0.4, -44, -36.5], [kind('maple'), kind('sakura')], { seed: 119, pitch: 3.3 }))
      void _;
    for (const _ of belt(noop, [3.6, 12.6, -45.4, -41], [kind('sakura'), kind('keyaki')], {
      seed: 377,
      pitch: 3.4,
      under: 1,
    }))
      void _;
    for (const old of trees) {
      const current = QUARTER_TREES.find((t) => t[4] === old[4]);
      assert(current);
      assert.equal(current[0], old[0]);
      for (let i = 1; i < 5; i++)
        if (!(old[4] === 377 && i === 1)) assert(Math.abs(current[i] - old[i]) < 1e-9, `${old[4]} field ${i}`);
    }
    let crownMin = Infinity;
    sakura(
      {
        geo(c, g) {
          g.computeBoundingBox();
          crownMin = Math.min(crownMin, g.boundingBox.min.x);
          g.dispose();
        },
      },
      7.7,
      -43.2,
      0.98,
      377,
    );
    assert(crownMin > 6.24, `relocated crown reaches ${crownMin}`);

    const THREE = await import('../../vendor/three/three.module.js');
    const { Parts } = await import('../../js/scenes/outdoor/parts.js');
    const { bandSteps } = await import('../../js/scenes/bands.js');
    const campus = new THREE.Group(),
      parts = new Parts(),
      offset = CHUNKS.campus.at.map((v) => -v);
    quarterGrounds(parts, offset);
    southQuarterGrounds(parts, offset);
    parts.build(campus);
    const office = new THREE.Group();
    for (const _ of bandSteps(office, 'office_quarter')) void _;
    const quarter = office.getObjectByName('bands').children[0];
    function receipt(group, shift) {
      const result = [];
      group.traverse((o) => {
        if (!o.isMesh) return;
        result.push({
          surf: o.userData.surf || '',
          cast: o.castShadow,
          receive: o.receiveShadow,
          positions: Array.from(
            o.geometry.attributes.position.array,
            (v, i) => v - (i % 3 === 0 ? shift[0] : i % 3 === 2 ? shift[1] : 0),
          ),
          colors: Array.from(o.geometry.attributes.color.array),
        });
      });
      return result.sort((a, b) => (a.surf + a.cast).localeCompare(b.surf + b.cast));
    }
    const a = receipt(campus, offset),
      b = receipt(quarter, [0, 0]);
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      assert.deepEqual(
        {
          surf: a[i].surf,
          cast: a[i].cast,
          receive: a[i].receive,
          colors: a[i].colors,
        },
        {
          surf: b[i].surf,
          cast: b[i].cast,
          receive: b[i].receive,
          colors: b[i].colors,
        },
      );
      assert.equal(a[i].positions.length, b[i].positions.length);
      a[i].positions.forEach((v, j) =>
        assert(
          Math.abs(v - b[i].positions[j]) < 0.00001,
          `chunk geometry differs at ${i}/${j}: ${v} vs ${b[i].positions[j]}`,
        ),
      );
    }
  } finally {
    hook.deregister();
    for (const [k, v] of Object.entries(globals))
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
  }
});
