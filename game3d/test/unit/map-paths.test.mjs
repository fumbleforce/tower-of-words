import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_PATHS } from '../../js/ui/map/paths.js';
import { PATHS } from '../../js/scenes/island-layout.js';
import { drawBase, INK } from '../../js/ui/map/base.js';

const cross = MAP_PATHS.find((p) => p.id === 'tower_cross_street');
test('map connects quarter street to the unchanged physical tower cross street', () => {
  assert.deepEqual(MAP_PATHS.slice(0, -1), PATHS, 'all existing map paths remain intact');
  assert.equal(MAP_PATHS.length, PATHS.length + 1);
  [-20.75, -18.1, 12.8, -15.1].forEach((v, i) => assert(Math.abs(cross.rect[i] - v) < 1e-9));
  const quarter = MAP_PATHS.find((p) => p.id === 'quarter_street').rect;
  assert(Math.abs(quarter[3] - cross.rect[1]) < 1e-9, 'quarter street meets the cross-street edge without a gap');
  assert(quarter[0] >= cross.rect[0] && quarter[2] <= cross.rect[2], 'the full three-metre mouth connects');
});

test('map renderer fills the physical cross-street polygon as a lane', () => {
  const prior = globalThis.window;
  class Path {
    polygons = [];
    moveTo(x, z) {
      this.polygons.push([[x, z]]);
    }
    lineTo(x, z) {
      this.polygons.at(-1).push([x, z]);
    }
    closePath() {}
    arc() {}
  }
  const fills = [],
    target = {
      canvas: { width: 390, height: 844 },
      fill(p) {
        if (p instanceof Path) fills.push({ color: this.fillStyle, polygons: p.polygons });
      },
    };
  const ctx = new Proxy(target, { get: (o, k) => (k in o ? o[k] : () => {}) });
  globalThis.window = { Path2D: Path };
  try {
    drawBase(ctx, { cx: 4.5, cz: -21, w: 390, h: 844, scale: 5, dpr: 1, detail: false });
    const [x0, z0, x1, z1] = cross.rect,
      expected = [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ];
    assert(
      fills.some(
        ({ color, polygons }) =>
          color === INK.lane && polygons.some((p) => JSON.stringify(p) === JSON.stringify(expected)),
      ),
    );
  } finally {
    if (prior === undefined) delete globalThis.window;
    else globalThis.window = prior;
  }
});
