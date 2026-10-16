// Every doorway the player crosses clears his head plus a margin at that place's scale (movement/clearance.js). Each
// place's doorways are built by the code the place uses, then checked three ways: nothing hangs in the opening between
// a shoulder's height and the clear height (a lintel, a frame, a sign, a rod), a body at the margin's scale walks
// through where the room lets it, and each door's leaves (a swinging leaf, a lift's or a train's sliding ones) fill
// their opening up to its head, with no slot over them. A new doorway the player crosses goes in the cases below,
// and a new low one fails here. Scripted crossings (the lift, the roof's stair house, the gym's changing rooms) are in
// it too: the nav keeps a free walk out of some of them, but the player still walks through.
// Not listed, because the player never crosses them: the office stair door and fire exit, the commons' entrance (its
// leaf stays shut), the dorm bath (shut above its low wall), the gym's pool-corridor door (shut; the way to the pool
// is the changing room) and the neighbours' front doors.
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
const { officeWalls, OFFICE_LIFT_SITE } = await import('../../js/scenes/office-enclosure.js');
const { buildCar: buildLiftCar, LEAF_X, LEAF_RUN } = await import('../../js/places/lift-car.js');
const { core, liftLanding, FORECOURT_LIFT_SITE } = await import('../../js/scenes/head-office/core.js');
const headOffice = await import('../../js/scenes/head-office/frame.js');
const { buildKaraokeDesk, buildKaraokeBooth } = await import('../../js/scenes/rooms/karaoke.js');
const { buildDorms } = await import('../../js/scenes/dorms.js');
const { DOORWAY, DOORWAY_H, DOOR, NEAR, T, LEVEL_DX, RETURN } = await import('../../js/scenes/dorms/layout.js');
const { SHARED } = await import('../../js/scenes/dorms/shared.js');
const { ROOF } = await import('../../js/scenes/dorms/roof.js');
const { buildGym } = await import('../../js/scenes/rooms/gym.js');
const GYM = await import('../../js/scenes/rooms/gym-plan.js');
const { buildChangingRoom } = await import('../../js/scenes/sports/changing-room.js');
const { PAVILION, PAV_DOOR_Z } = await import('../../js/scenes/sports/plan.js');
const { MEN_X, WOMEN_X } = await import('../../js/scenes/sports/deck-plan.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const train = await import('../../js/train/car.js');
const { buildDoorSets, slideLeaves } = await import('../../js/train/doors.js');

const FEET = 0.012; // the floor under the body in the scenes (their floors are within 2 cm of it); the train's is 0
const SHOULDER = 0.9; // a solid below this is a sill, a counter or a stool, not a lintel over the opening
const RADIUS = 0.19; // the body's radius at this scale (movement/traversal.js), kept off each jamb
const STEP = 0.05;
const SLOT = 0.015; // the most a leaf may stop short of its opening's head
// the least clear height over a walkable doorway, and the body that must pass, at a place's scale and floor
const clearAt = (scale, feet) => feet + capsuleHeight(scale) + DOOR_MARGIN;
const marginScale = (scale) => (capsuleHeight(scale) + DOOR_MARGIN) / CAPSULE_HEIGHT;

// a mesh the player would meet: shown, or in a part of the scene the traversal counts while hidden (the follow
// camera's upper walls, the occluders: movement/traversal.js); cloth hung in a doorway (a noren) is pushed aside
function solid(o, root) {
  if (o.userData.surf === 'fabric' || o.material?.colorWrite === false) return false; // cloth, a shadow proxy
  for (let p = o; p && p !== root.parent; p = p.parent)
    if (!p.visible && !p.userData.occluder && !p.userData.followEnclosure) return false;
  return true;
}

// Every face of the scene that hangs between SHOULDER and the clear height into the opening's box [x0, x1, z0, z1]
// (the opening plus the wall's thickness), inside the body's width at each jamb. Upward faces are the tops of solids
// and don't count: whatever stands on them is checked itself. Returns the faces' names.
function hanging(root, [ax0, ax1, az0, az1], clear) {
  root.updateMatrixWorld(true);
  // the opening's width runs along its longer side; a jamb's own edge doesn't count, the body can't stand in it
  const along = ax1 - ax0 >= az1 - az0;
  const [x0, x1, z0, z1] = along
    ? [ax0 + RADIUS, ax1 - RADIUS, az0, az1]
    : [ax0, ax1, az0 + RADIUS, az1 - RADIUS];
  const found = new Set();
  const inside = new THREE.Box3(new THREE.Vector3(x0, SHOULDER, z0), new THREE.Vector3(x1, clear - 0.001, z1)),
    tri = new THREE.Triangle();
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const normal = new THREE.Vector3(),
    edge = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !solid(o, root)) return;
    const pos = o.geometry.attributes.position,
      idx = o.geometry.index,
      n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) {
      for (let j = 0; j < 3; j++) v[j].fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j).applyMatrix4(o.matrixWorld);
      const lo = Math.min(v[0].y, v[1].y, v[2].y);
      if (lo <= SHOULDER || lo >= clear - 0.001) continue; // a face at the clear height itself is clear
      normal.subVectors(v[1], v[0]).cross(edge.subVectors(v[2], v[0])).normalize();
      if (normal.y > 0.7) continue; // an upward face: the top of a solid
      if (!inside.intersectsTriangle(tri.set(...v))) continue; // the face itself, not its bounding box
      const tx0 = Math.min(v[0].x, v[1].x, v[2].x),
        tx1 = Math.max(v[0].x, v[1].x, v[2].x),
        tz0 = Math.min(v[0].z, v[1].z, v[2].z),
        tz1 = Math.max(v[0].z, v[1].z, v[2].z);
      const parent = o.parent?.name || '';
      found.add(
        `${o.name || 'mesh'}${parent ? ' in ' + parent : ''} at y ${lo.toFixed(3)}, x ${tx0.toFixed(2)}..${tx1.toFixed(2)}, z ${tz0.toFixed(2)}..${tz1.toFixed(2)}`,
      );
    }
  });
  return [...found];
}

// the first point on the way from a to b (x, z) where the body at `scale` is blocked, or null
function blockedOn(traversal, a, b, scale, feet) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
  let [px, pz] = a;
  for (let i = 1; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n;
    const z = a[1] + ((b[1] - a[1]) * i) / n;
    if (!traversal.free(x, z, px, pz, feet, scale, false)) return [+x.toFixed(3), +z.toFixed(3)];
    [px, pz] = [x, z];
  }
  return null;
}

// what's wrong with a door's leaves against its opening `top` high over `feet`: a leaf that stops short of the head
// (a slot over it) or of the floor
function leafGaps(leaves, top, feet) {
  const out = [];
  for (const [i, leaf] of leaves.entries()) {
    leaf.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(leaf);
    if (b.max.y < feet + top - SLOT) out.push(`leaf ${i}: its top ${b.max.y.toFixed(3)} under the head ${top}`);
    if (b.min.y > feet + 0.05) out.push(`leaf ${i}: its foot ${b.min.y.toFixed(3)} over the floor`);
  }
  return out;
}

// One place: its root, its people's scale, its floor, and the doorways the player crosses. A door: box [x0, x1, z0,
// z1] around the opening and its wall; walk, the two ends of a walk through it (null where the place scripts the
// crossing through a painted or shut opening); leaves, its door's leaves; top, the opening's height for them.
function place(name, root, doors, { scale = PEOPLE_SCALE, feet = FEET } = {}) {
  return { name, root, doors, scale, feet };
}

// the lift car at a site, its doors open, in root (the car's leaves and the landing's are checked against DH)
function liftCar(root, site) {
  const car = buildLiftCar(site);
  car.leaves.forEach((l) => (l.position.x = l.userData.door.s * (LEAF_X[l.userData.door.i] + LEAF_RUN[l.userData.door.i])));
  root.add(car.g);
  return car;
}

function cases() {
  const out = [];
  {
    const world = office.buildOffice();
    world.machineDoor.rotation.y = -1.5; // the machine-room leaf open, as it stands when Eric walks through
    world.openLift(1);
    const s = OFFICE_LIFT_SITE,
      car = liftCar(world.root, s);
    out.push(
      place('office (B2)', world.root, [
        ...office.DOORWAYS.map((d) => {
          const zc = (d.z0 + d.z1) / 2,
            x = (d.x0 + d.x1) / 2;
          // from one side of the wall to the other; the south walk stops short of the copy room's shelf
          return { name: d.id, box: [d.x0, d.x1, zc - 0.25, zc + 0.25], walk: [[x, zc - 0.8], [x, zc + 0.4]] };
        }),
        {
          // into the car from the lobby: the landing's doors in the wall, the car's behind them
          name: 'lift',
          box: [...s.hole, s.zBack - 0.25, s.zFront],
          walk: [s.out, [s.x, s.zBack - 0.42]],
          leaves: [...world.leaves, ...car.leaves],
          top: doorHeight(PEOPLE_SCALE),
        },
      ]),
    );
  }
  {
    // the head office lobby's lift: its back wall, the landing's doors and the B2 car behind them
    const root = new THREE.Group(),
      g = new THREE.Group();
    g.position.set(headOffice.T.o[0], 0, headOffice.T.o[1]);
    root.add(g);
    core(root, g);
    const landing = liftLanding(root);
    landing.want = landing.k = 1;
    landing.update(1);
    const s = FORECOURT_LIFT_SITE,
      car = liftCar(root, s);
    out.push(
      place('head office lobby', root, [
        {
          name: 'lift',
          box: [...s.hole, s.zBack - 0.25, s.zFront],
          walk: [s.out, [s.x, s.zBack - 0.42]],
          leaves: [...landing.leaves, ...car.leaves],
          top: doorHeight(PEOPLE_SCALE),
        },
      ]),
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
    // the east wall's door (z -2.1 to -1.3), walked from inside the booth to the corridor; its leaf stands open
    out.push(
      place('karaoke booth', r.root, [
        {
          name: 'booth door',
          box: [2.2, 2.6, -2.1, -1.3],
          walk: [[1.8, -1.7], [2.9, -1.7]],
          leaves: [r.root.getObjectByName('booth-door-leaf')],
          top: doorHeight(PEOPLE_SCALE),
        },
      ]),
    );
  }
  {
    const r = buildDorms();
    const dx = (DOORWAY[0] + DOORWAY[1]) / 2,
      fx = (DOOR[0] + DOOR[1]) / 2,
      x3 = SHARED.door + LEVEL_DX['3f'],
      xr = RETURN + LEVEL_DX.roof,
      dz = ROOF.door[1],
      roofDoor = r.levels.roof.door;
    // the front door's leaves (the cut-low front's, the tall front's and the follow camera's copy of it) and the
    // stair house's swing out as he goes through (places/dorms.js, dorm-floors.js); here wide open, so the walk
    // measures the opening
    r.frontLeaf.rotation.y = r.followLeaf.rotation.y = r.door.rotation.y = -Math.PI / 2;
    roofDoor.rotation.y = -Math.PI / 2;
    const front = (x) => [x - 0.3, x + 0.3, NEAR - 0.2, NEAR + T + 0.2];
    out.push(
      place("Eric's dorm building", r.root, [
        { name: 'flat doorway', box: [DOORWAY[0], DOORWAY[1], -0.2, 0.2], walk: [[dx, -0.5], [dx, 0.5]] },
        // his own front door, from the doorstep into the genkan
        {
          name: 'front door',
          box: [DOOR[0], DOOR[1], NEAR - 0.2, NEAR + T + 0.2],
          walk: [r.doorstep, [fx, NEAR - 0.35]],
          leaves: [r.frontLeaf, r.followLeaf],
          top: DOORWAY_H,
        },
        // the corridor floors' shared rooms, open doorways: the kitchen on 2F, the laundry on 3F; the corridor's low
        // parapet (z 1.9) keeps a body off z 1.7 and beyond
        { name: 'shared room door', box: front(SHARED.door), walk: [[SHARED.door, NEAR + T + 0.4], [SHARED.door, NEAR - 0.5]] },
        { name: '3F laundry door', box: front(x3), walk: [[x3, NEAR + T + 0.4], [x3, NEAR - 0.5]] },
        // out of the roof's stair house onto the roof (the nav keeps the stair house; dorm-floors.js walks it)
        {
          name: 'roof stair house door',
          box: [xr - 0.2, xr + 0.25, dz - 0.3, dz + 0.3],
          walk: [r.levels.roof.in, r.levels.roof.out],
          leaves: [roofDoor],
          top: doorHeight(PEOPLE_SCALE),
        },
      ]),
    );
  }
  {
    const r = buildGym();
    const { w } = GYM.CHANGING,
      z = GYM.GLASS_Z;
    out.push(
      place('gym', r.root, [
        // the main doors in the cut-down front wall, and the hall's double doors in the glass wall
        { name: 'main doors', box: [...GYM.DOOR, -0.25, 0.45], walk: [[0, 0.6], [0, -0.9]] },
        { name: 'hall doors', box: [...GYM.HALL_DOOR, z - 0.2, z + 0.2], walk: [[0, z + 0.6], [0, z - 1.2]] },
        // the changing rooms' doors: he walks in under the noren and the place changes (places/gym.js walkOut)
        ...['men', 'women'].map((k) => ({
          name: `${k}'s changing room door`,
          box: [GYM.CHANGING[k] - w / 2, GYM.CHANGING[k] + w / 2, z - 0.15, z + 0.1],
          walk: null,
        })),
      ]),
    );
  }
  {
    // the pool pavilion: its doorways are 2.1 m high in the follow camera's upper walls, the walls below them cut
    // to 0.65 m for the camera, so the walk is what tells
    const root = new THREE.Group(),
      parts = new Parts();
    buildChangingRoom(parts, { field() {} }, { card() {} }, { glowParts: [], lit: [] }, root);
    parts.build(root);
    const [x0, x1, z0, z1] = PAVILION,
      split = (x0 + x1) / 2,
      corridorZ = z0 + 1.8,
      lobbyX = x0 + 1.25;
    const roomDoor = (woman) =>
      woman ? (split + 0.12 + x1 - 0.15) / 2 : (lobbyX + 0.12 + split - 0.12) / 2;
    out.push(
      place('pool pavilion', root, [
        {
          name: 'entrance',
          box: [x0 - 0.1, x0 + 0.1, PAV_DOOR_Z - 0.65, PAV_DOOR_Z + 0.65],
          walk: [[x0 - 0.6, PAV_DOOR_Z], [x0 + 0.6, PAV_DOOR_Z]],
        },
        ...[false, true].map((woman) => ({
          name: woman ? "women's room door" : "men's room door",
          box: [roomDoor(woman) - 0.6, roomDoor(woman) + 0.6, corridorZ - 0.1, corridorZ + 0.1],
          walk: [[roomDoor(woman), corridorZ - 0.5], [roomDoor(woman), corridorZ + 0.6]],
        })),
        ...[MEN_X, WOMEN_X].map((x, i) => ({
          name: i ? "women's deck door" : "men's deck door",
          box: [x - 0.6, x + 0.6, z1 - 0.1, z1 + 0.1],
          walk: [[x, z1 - 0.6], [x, z1 + 0.6]],
        })),
      ]),
    );
  }
  // the train's platform doors, in both framings of the car, leaves open; the car's people are at scale 1
  for (const mode of ['land', 'port']) {
    const car = train.buildCar(mode),
      doors = buildDoorSets();
    car.root.add(doors.group);
    slideLeaves(doors.leaves, 1);
    const { LZ, T: WT } = train;
    out.push(
      place(
        `train car (${mode})`,
        car.root,
        train.DOORWAYS.map((d) => ({
          name: `door at x ${d.x}`,
          box: [d.x0, d.x1, LZ - 0.15, LZ + WT + 0.1],
          walk: [[d.x, LZ - 0.45], [d.x, LZ + WT + 0.5]],
          leaves: doors.leaves.filter((l) => l.d === d).map((l) => l.g),
          top: d.y1,
        })),
        { scale: 1, feet: 0 },
      ),
    );
  }
  return out;
}

test('the walkable doorway height is the head plus the margin, rounded up to 5 cm', () => {
  assert.equal(doorHeight(PEOPLE_SCALE), 1.5);
  assert.equal(doorHeight(1), 1.25);
  assert.ok(doorHeight(PEOPLE_SCALE) >= clearAt(PEOPLE_SCALE, FEET), 'the design height clears the head and the margin');
});

test('a lintel 1.25 m high blocks the margin-sized body, so the walk below is a real check', () => {
  const space = new THREE.Group();
  const W = officeWalls(space, { x0: -7, x1: 7, z0: -6.4, z1: 6.4 });
  W('x', -4.2, 3.4, 0.2, 1.45, 0.16, { holes: [[-0.8, 0.3, 0, 1.25]] });
  const traversal = createTraversal({ space });
  const s = marginScale(PEOPLE_SCALE);
  assert.ok(blockedOn(traversal, [-0.25, -0.6], [-0.25, 0.6], s, FEET), 'a 1.25 m aperture blocks the margin');
  const clear = clearAt(PEOPLE_SCALE, FEET);
  assert.ok(hanging(space, [-0.8, 0.3, -0.4, 0.4], clear).length > 0, 'and its lintel hangs over the opening');
});

test('a leaf that stops 3 cm under its head, or a booth leaf at 1.18 m, is a slot', () => {
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.47, 0.03).translate(0, 0.735, 0));
  assert.equal(leafGaps([leaf], 1.5, 0).length, 1);
  leaf.scale.y = 1.18 / 1.47;
  assert.equal(leafGaps([leaf], 1.5, 0).length, 1);
  leaf.scale.y = 1.49 / 1.47;
  assert.deepEqual(leafGaps([leaf], 1.5, 0), []);
});

for (const p of cases()) {
  const clear = clearAt(p.scale, p.feet);
  test(`${p.name}: no doorway he crosses has anything hanging over it below the clear height`, () => {
    for (const d of p.doors) assert.deepEqual(hanging(p.root, d.box, clear), [], d.name);
  });
  test(`${p.name}: a body at the margin's scale walks through each doorway, both ways`, () => {
    const traversal = createTraversal({ space: p.root }),
      s = marginScale(p.scale);
    for (const d of p.doors) {
      if (!d.walk) continue;
      assert.equal(blockedOn(traversal, d.walk[0], d.walk[1], s, p.feet), null, `${d.name}, out`);
      assert.equal(blockedOn(traversal, d.walk[1], d.walk[0], s, p.feet), null, `${d.name}, in`);
    }
  });
  test(`${p.name}: every door's leaves fill their opening up to its head`, () => {
    for (const d of p.doors) {
      if (!d.leaves) continue;
      assert.ok(d.leaves.length && d.leaves.every(Boolean), `${d.name}: its leaves are built`);
      assert.ok(d.top >= doorHeight(p.scale), `${d.name}: its opening is ${d.top} high`);
      assert.deepEqual(leafGaps(d.leaves, d.top, 0), [], d.name); // the leaves and the opening stand on the floor, y 0
    }
  });
}
