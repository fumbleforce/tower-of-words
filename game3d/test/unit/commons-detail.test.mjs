import test from 'node:test';
import assert from 'node:assert/strict';
import { commonsCounter, commonsDetails } from '../../js/scenes/rooms/commons-detail.js';

function recorder() {
  const parts = [];
  return {
    parts,
    box(color, w, h, d, x, y, z, opts = {}) { parts.push({ color, w, h, d, x, y, z, opts, shape: 'box' }); },
    cyl(color, rt, rb, h, x, y, z, opts = {}) { parts.push({ color, w: 2 * Math.max(rt, rb), h, d: 2 * Math.max(rt, rb), x, y, z, opts, shape: 'cyl' }); },
  };
}
const room = { x0: -4, x1: 4, z0: -4.7, z1: 0 };
const over = (part, x, z) => Math.abs(x - part.x) < part.w / 2 - 1e-8 && Math.abs(z - part.z) < part.d / 2 - 1e-8;

test('common-room sink has an open well below the worktop and a drain in its bottom', () => {
  const kit = recorder();
  commonsCounter(kit, room);
  // Rays through the real interior must first hit the recessed bottom, never the cabinet or a countertop plate.
  for (const x of [1.54, 1.7, 1.86]) for (const z of [-4.54, -4.45, -4.36]) {
    const surfaces = kit.parts.filter(part => over(part, x, z)).map(part => part.y + part.h);
    const first = Math.max(...surfaces);
    assert.ok(first >= .329 && first <= .34, `basin ray (${x},${z}) hit ${first}`);
  }
  assert.ok(kit.parts.some(part => part.color === '#40555d' && part.shape === 'cyl' && part.y === .333), 'drain is below the rim');
  assert.ok(kit.parts.some(part => part.shape === 'box' && part.h === .1 && part.y === .33), 'basin has inner walls');
  const outside = kit.parts.filter(part => over(part, 1.33, -4.45));
  assert.ok(Math.abs(Math.max(...outside.map(part => part.y + part.h)) - .43) < 1e-10, 'surrounding worktop retains its height');
});

test('bookcase game boxes fit the existing gaps without touching spines or end panels', () => {
  const kit = recorder();
  commonsDetails(kit, room, { block() {} });
  const games = kit.parts.filter(part => ['#698c91', '#ad6965', '#627aa1'].includes(part.color));
  assert.equal(games.length, 3);
  for (const [row, game] of games.entries()) {
    assert.ok(game.z - game.d / 2 > -1.76 && game.z + game.d / 2 < -.84, 'inside shelf end panels');
    for (let i = 0; i < 9; i++) {
      if ((i + row) % 5 === 0) continue;
      const spine = -1.7 + i * .1;
      assert.ok(Math.abs(spine - game.z) >= (.07 + game.d) / 2, `row ${row}: game intersects book ${i}`);
    }
  }
});
