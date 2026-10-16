// The B2 machine-room door must let the office-scaled player walk through it, in both camera modes. Before the fix,
// the aperture (1.25) and the header (1.24) stopped the physical capsule at the doorway, and the copier walk to Mio
// ended there.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    return next(
      s === 'three'
        ? new URL('../../vendor/three/three.module.js', import.meta.url).href
        : s.startsWith('three/addons/')
          ? new URL('../../vendor/' + s.slice(13), import.meta.url).href
          : s,
      c,
    );
  },
});
globalThis.location = { search: '' };
const T = await import('three');
const { officeWalls, machineDoorFrame, OFFICE_DOOR_HEIGHT } = await import('../../js/scenes/office-enclosure.js');
const { createTraversal } = await import('../../js/movement/traversal.js');

// Eric and Mio in the office: scale 1.18 (K in scenes/office.js), standing on the floor.
const SCALE = 1.18;
const FEET = 0.012;
// the north partition between the corridor and the machine room, as scenes/office.js builds it
const CN = 0.2;
const WALL = 0.16;
const WALL_H = 1.45;
const DOOR = [4.7, 5.5];

// the partition with its machine-room opening (to `aperture` high) and the scene's frame
function northPartition(aperture) {
  const space = new T.Group();
  const W = officeWalls(space, { x0: -7, x1: 7, z0: -6.4, z1: 6.4 });
  W('x', -7, 7, CN, WALL_H, WALL, { holes: [[DOOR[0], DOOR[1], 0, aperture]] });
  machineDoorFrame(space, DOOR, CN + WALL / 2, 0.06, new T.MeshStandardMaterial());
  return space;
}

// Walks the capsule straight through the opening at x, one 5 cm step at a time, from z `from` to z `to`.
function walk(traversal, x, from, to) {
  const step = Math.sign(to - from) * 0.05;
  for (let z = from; Math.abs(to - z) > 1e-9; z += step) {
    if (!traversal.free(x, z + step, x, z, FEET, SCALE, false)) return false;
  }
  return true;
}

for (const mode of ['overview', 'follow']) {
  test(`the machine-room doorway lets the office-scaled player through in ${mode}`, () => {
    const space = northPartition(OFFICE_DOOR_HEIGHT);
    space.getObjectByName('follow-interior').visible = mode === 'follow';
    const traversal = createTraversal({ space });
    for (const x of [4.95, 5.05, 5.15]) {
      assert.equal(walk(traversal, x, 0.7, -0.6), true, `into the room at x ${x}`);
      assert.equal(walk(traversal, x, -0.6, 0.7), true, `out of the room at x ${x}`);
    }
  });

  test(`the wall beside the doorway stays solid in ${mode}`, () => {
    const space = northPartition(OFFICE_DOOR_HEIGHT);
    space.getObjectByName('follow-interior').visible = mode === 'follow';
    const traversal = createTraversal({ space });
    assert.equal(walk(traversal, 4.5, 0.7, -0.6), false, 'through the wall at x 4.5');
    assert.equal(walk(traversal, 5.9, 0.7, -0.6), false, 'through the wall at x 5.9');
  });
}

test('a lintel below the head blocks the office-scaled player (the rule the doorway follows)', () => {
  const space = northPartition(1.25);
  const traversal = createTraversal({ space });
  assert.equal(walk(traversal, 5.05, 0.7, -0.6), false);
});
