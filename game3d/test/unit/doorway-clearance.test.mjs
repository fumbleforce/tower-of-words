// Every walkable doorway clears the player's head plus a margin (movement/clearance.js). Each place's doorways are
// built by the code the place uses, then checked two ways: nothing hangs in the opening between a shoulder's height
// and the clear height (a lintel, a frame, a sign), and a body at the margin's scale walks through where the room lets
// it. A new walkable doorway goes in the cases below, and a new low one fails here.
// Not listed: the office lift and stair openings and the fire exit (the nav blocks them, or they end at the building's
// edge), the commons' entrance (its door leaf stays shut), and the dorm bath (it stays shut above its low wall).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
// the signs, posters and props draw on a canvas: a stand-in that takes every call (door-frames.test.mjs)
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'width' ? 10 : () => ctx2d), set: () => true });
Object.assign(globalThis, {
  location: { search: '' },
  window: globalThis.window || {},
  document: {
    body: { classList: { contains: () => false, add() {}, remove() {} } },
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {} }),
    getElementById: () => null,
    querySelector: () => null,
  },
  localStorage: { getItem: () => null, setItem() {} },
});

const THREE = await import('three');
const { createTraversal } = await import('../../js/movement/traversal.js');
const { CAPSULE_HEIGHT, DOOR_MARGIN, PEOPLE_SCALE, capsuleHeight, doorHeight } = await import(
  '../../js/movement/clearance.js'
);
const office = await import('../../js/scenes/office.js');
const { officeWalls } = await import('../../js/scenes/office-enclosure.js');
const { buildKaraokeDesk, buildKaraokeBooth } = await import('../../js/scenes/rooms/karaoke.js');
const { buildDorms } = await import('../../js/scenes/dorms.js');
const { DOORWAY, DOOR, NEAR, T } = await import('../../js/scenes/dorms/layout.js');
const { SHARED } = await import('../../js/scenes/dorms/shared.js');

const FEET = 0.012; // the floor under the body in these tests (the scenes' floors are within 2 cm of it)
const HEAD = FEET + capsuleHeight(PEOPLE_SCALE) + DOOR_MARGIN; // the least clear height over a walkable doorway
const MARGIN_SCALE = (capsuleHeight(PEOPLE_SCALE) + DOOR_MARGIN) / CAPSULE_HEIGHT; // the body that must pass
const SHOULDER = 0.9; // a solid below this is a sill, a counter or a stool, not a lintel over the opening
const RADIUS = 0.19; // the body's radius at this scale (movement/traversal.js), kept off each jamb
const STEP = 0.05;

// Every face of the scene that hangs between SHOULDER and the clear height over the opening's box [x0, x1, z0, z1]
// (the opening plus the wall's thickness), inside the body's width at each jamb. Upward faces are the tops of solids
// and don't count: whatever stands on them is checked itself. Returns the faces' names.
function hanging(root, [ax0, ax1, az0, az1], clear = HEAD) {
  root.updateMatrixWorld(true);
  // the opening's width runs along its longer side; a jamb's own edge doesn't count, the body can't stand in it
  const along = ax1 - ax0 >= az1 - az0;
  const [x0, x1, z0, z1] = along
    ? [ax0 + RADIUS, ax1 - RADIUS, az0, az1]
    : [ax0, ax1, az0 + RADIUS, az1 - RADIUS];
  const found = new Set();
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const normal = new THREE.Vector3(),
    edge = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    const pos = o.geometry.attributes.position,
      idx = o.geometry.index,
      n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) {
      for (let j = 0; j < 3; j++) v[j].fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j).applyMatrix4(o.matrixWorld);
      const lo = Math.min(v[0].y, v[1].y, v[2].y);
      if (lo <= SHOULDER || lo >= clear - 0.001) continue; // a face at the clear height itself is clear
      normal.subVectors(v[1], v[0]).cross(edge.subVectors(v[2], v[0])).normalize();
      if (normal.y > 0.7) continue; // an upward face: the top of a solid
      const tx0 = Math.min(v[0].x, v[1].x, v[2].x),
        tx1 = Math.max(v[0].x, v[1].x, v[2].x),
        tz0 = Math.min(v[0].z, v[1].z, v[2].z),
        tz1 = Math.max(v[0].z, v[1].z, v[2].z);
      if (tx1 < x0 || tx0 > x1 || tz1 < z0 || tz0 > z1) continue;
      const parent = o.parent?.name || '';
      found.add(
        `${o.name || 'mesh'}${parent ? ' in ' + parent : ''} at y ${lo.toFixed(3)}, x ${tx0.toFixed(2)}..${tx1.toFixed(2)}, z ${tz0.toFixed(2)}..${tz1.toFixed(2)}`,
      );
    }
  });
  return [...found];
}

// the first point on the way from a to b (x, z) where the body at `scale` is blocked, or null
function blockedOn(traversal, a, b, scale) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
  let [px, pz] = a;
  for (let i = 1; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n;
    const z = a[1] + ((b[1] - a[1]) * i) / n;
    if (!traversal.free(x, z, px, pz, FEET, scale, false)) return [+x.toFixed(3), +z.toFixed(3)];
    [px, pz] = [x, z];
  }
  return null;
}

// One place: its root, and its walkable doorways. box: [x0, x1, z0, z1] around the opening; walk: the two ends of
// the walk through it (null when the room's own furniture or a shut leaf makes a walk meaningless).
function place(name, root, doors) {
  return { name, root, doors };
}
function cases() {
  const out = [];
  {
    const world = office.buildOffice();
    world.machineDoor.rotation.y = -1.5; // the machine-room leaf open, as it stands when Eric walks through
    out.push(
      place(
        'office (B2)',
        world.root,
        office.DOORWAYS.map((d) => {
          const zc = (d.z0 + d.z1) / 2,
            x = (d.x0 + d.x1) / 2;
          // from one side of the wall to the other; the south walk stops short of the copy room's shelf
          return { name: d.id, box: [d.x0, d.x1, zc - 0.25, zc + 0.25], walk: [[x, zc - 0.8], [x, zc + 0.4]] };
        }),
      ),
    );
  }
  {
    const r = buildKaraokeDesk();
    out.push(
      place('karaoke box', r.root, [
        { name: 'glass door', box: [-0.55, 0.55, -0.2, 0.35], walk: [[0, -0.6], [0, 0.5]] },
      ]),
    );
  }
  {
    const r = buildKaraokeBooth();
    // the east wall's door (z -2.1 to -1.3), walked from inside the booth to the corridor
    out.push(
      place('karaoke booth', r.root, [
        { name: 'booth door', box: [2.2, 2.6, -2.1, -1.3], walk: [[1.8, -1.7], [2.9, -1.7]] },
      ]),
    );
  }
  {
    const r = buildDorms();
    const dx = (DOORWAY[0] + DOORWAY[1]) / 2;
    out.push(
      place("Eric's dorm flat, the shared room", r.root, [
        { name: 'flat doorway', box: [DOORWAY[0], DOORWAY[1], -0.2, 0.2], walk: [[dx, -0.5], [dx, 0.5]] },
        // the own front door's leaf is shut until the trip in swings it, so only its lintel and frame are checked
        { name: 'front door', box: [DOOR[0], DOOR[1], NEAR - 0.2, NEAR + T + 0.2], walk: null },
        // the corridor floor's shared room, its door open from the corridor
        {
          name: 'shared room door',
          box: [SHARED.door - 0.3, SHARED.door + 0.3, NEAR - 0.2, NEAR + T + 0.2],
          // the corridor's low parapet (z 1.9) keeps a body off z 1.7 and beyond
          walk: [
            [SHARED.door, NEAR + T + 0.4],
            [SHARED.door, NEAR - 0.5],
          ],
        },
      ]),
    );
  }
  return out;
}

test('the walkable doorway height is the head plus the margin, rounded up to 5 cm', () => {
  assert.equal(doorHeight(PEOPLE_SCALE), 1.5);
  assert.equal(doorHeight(1), 1.25);
  assert.ok(doorHeight(PEOPLE_SCALE) >= HEAD, 'the design height clears the head and the margin');
});

test('a lintel 1.25 m high blocks the margin-sized body, so the walk below is a real check', () => {
  const space = new THREE.Group();
  const W = officeWalls(space, { x0: -7, x1: 7, z0: -6.4, z1: 6.4 });
  W('x', -4.2, 3.4, 0.2, 1.45, 0.16, { holes: [[-0.8, 0.3, 0, 1.25]] });
  const traversal = createTraversal({ space });
  assert.ok(blockedOn(traversal, [-0.25, -0.6], [-0.25, 0.6], MARGIN_SCALE), 'a 1.25 m aperture blocks the margin');
  assert.ok(hanging(space, [-0.8, 0.3, -0.4, 0.4]).length > 0, 'and its lintel hangs over the opening');
});

for (const p of cases()) {
  test(`${p.name}: no walkable doorway has anything hanging over it below the clear height`, () => {
    for (const d of p.doors) assert.deepEqual(hanging(p.root, d.box), [], d.name);
  });
  test(`${p.name}: the walkable doorways let a body at the margin's scale through, both ways`, () => {
    const traversal = createTraversal({ space: p.root });
    for (const d of p.doors) {
      if (!d.walk) continue;
      assert.equal(blockedOn(traversal, d.walk[0], d.walk[1], MARGIN_SCALE), null, `${d.name}, out`);
      assert.equal(blockedOn(traversal, d.walk[1], d.walk[0], MARGIN_SCALE), null, `${d.name}, in`);
    }
  });
}
