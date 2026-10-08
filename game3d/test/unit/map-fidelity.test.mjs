import test from 'node:test';
import assert from 'node:assert/strict';
import { GREEN } from '../../js/scenes/island-layout.js';
import { WEST_TREES } from '../../js/scenes/island-west.js';
import { SOUTH_TREES } from '../../js/scenes/island-south.js';
import { QUARTER_TREES } from '../../js/scenes/campus/quarter-plan.js';
import { OFFICE_BELTS } from '../../js/scenes/office-quarter/planting-plan.js';
import { CAMPUS_TREES } from '../../js/scenes/campus/landscape-plan.js';
import { coverMarks, polygonContains, plantedTrees, officeRegions } from '../../js/ui/map/terrain.js';
import { rectPts } from '../../js/ui/map/shapes.js';
import { scaleMetres, drawCartography } from '../../js/ui/map/cartography.js';
import { toView, fromView } from '../../js/ui/map/base.js';

test('map planting keeps exact world tree positions and irregular land cover inside its source regions', () => {
  assert.deepEqual(plantedTrees, [
    ...WEST_TREES,
    ...SOUTH_TREES,
    ...CAMPUS_TREES,
    ...QUARTER_TREES.filter((tree) => tree[4] !== 838),
  ]);
  const marks = coverMarks();
  assert.deepEqual(marks, coverMarks(), 'redraws must not change the geography');
  assert.ok(marks.length > 80 && marks.length < 1000);
  for (const m of marks) {
    const g = GREEN.find((g) => g.id === m.region);
    assert.ok(polygonContains(g.poly || rectPts(g.rect), m.x, m.z), m.region);
  }
});
test('scale ruler and cursor mapping retain the real 1.5 metre island frame at phone and desktop zooms', () => {
  for (const scale of [1.2, 1.42, 3.25, 5, 14]) {
    const v = { w: 390, h: 680, cx: 37.29, cz: -2.75, scale };
    const m = scaleMetres(scale),
      pixels = (m / 1.5) * scale;
    assert.ok(pixels >= 45 && pixels <= 120);
    const a = toView(v, 37.29, -2.75),
      b = toView(v, 37.29 + m / 1.5, -2.75);
    assert.ok(Math.abs(b[0] - a[0] - pixels) < 1e-9);
    assert.deepEqual(fromView(v, ...a), [37.29, -2.75]);
  }
});
test('geographic captions yield to real destination labels and controls', () => {
  const painted = [];
  const ctx = {
    save() {},
    restore() {},
    setTransform() {},
    measureText(t) {
      return { width: t.length * 7 };
    },
    strokeText() {},
    fillText(t) {
      painted.push(t);
    },
  };
  const v = { w: 1000, h: 800, cx: 0, cz: -40, scale: 3, dpr: 1 };
  drawCartography(ctx, v);
  assert.ok(painted.includes('OFFICE QUARTER'));
  painted.length = 0;
  drawCartography(ctx, v, [{ x0: 0, x1: 1000, y0: 0, y1: 800 }]);
  assert.deepEqual(painted, []);
});

test('office map beds retain the real belt rectangles outside the shared quarter beds', () => {
  assert.equal(officeRegions.length, 9);
  assert.deepEqual(
    officeRegions.map((region) => region.rect),
    OFFICE_BELTS.filter((belt) => belt[2] !== 119).map(([[x0, x1, z0, z1]]) => [x0, z0, x1, z1]),
  );
  assert.deepEqual(officeRegions[0].rect, [-26.9, -67, -24.6, -57.7]);
  assert.deepEqual(officeRegions[8].rect, [7.5, -48.9, 30.5, -45.9]);
  assert.ok(
    coverMarks(officeRegions).every((m) => {
      const g = officeRegions.find((g) => g.id === m.region);
      return polygonContains(rectPts(g.rect), m.x, m.z);
    }),
  );
});
