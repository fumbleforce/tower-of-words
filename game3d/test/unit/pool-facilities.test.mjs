import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
const hook = registerHooks({
  resolve(s, c, n) {
    return n(
      s === 'three'
        ? new URL('../../vendor/three/three.module.js', import.meta.url).href
        : s.startsWith('three/addons/')
          ? new URL('../../vendor/' + s.slice(13), import.meta.url).href
          : s,
      c,
    );
  },
});
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const { changingPlan, CHANGING_ENTRY } = await import('../../js/scenes/sports/changing-room.js');
const D = await import('../../js/scenes/sports/deck-plan.js');
const { boundsOf, inRect } = await import('../../js/scenes/sports/plan.js');
const { Nav } = await import('../../js/movement/navigation.js');
const { swimmerPose, faceSwimmer } = await import('../../js/places/day3/swim-pose.js');
const { poolSave } = await import('../../js/places/day3/pool-save.js');
const { creatureWorld } = await import('../../js/creatures/world.js');
const { PERCHES } = await import('../../js/creatures/perches.js');
const { poolHandling } = await import('../../js/places/day3/pool-handling.js');
const { poolAction } = await import('../../js/places/day3/pool-action.js');
const { poolCamera } = await import('../../js/places/day3/pool-camera.js');
const { poolFloodlights } = await import('../../js/scenes/sports/pool-lights.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const THREE = await import('../../vendor/three/three.module.js');
test('both changing routes connect entrance, locker, shower and deck on free floor', () => {
  for (const gender of ['man', 'woman']) {
    const c = changingPlan(gender),
      walks = [...D.WALKS, ...c.walks],
      b = boundsOf(walks),
      nav = new Nav(b[0] - 0.2, b[1] + 0.2, b[2] - 0.2, b[3] + 0.2, 0.12);
    nav.extra = (x, z) => walks.some((r) => inRect(x, z, r, -0.02));
    for (const r of [...D.BLOCKS, ...c.blocks]) nav.block(...r);
    nav.build();
    const points = [CHANGING_ENTRY.inside, c.corridor, c.locker, c.shower, c.deck];
    for (let i = 0; i < points.length; i++) {
      assert.ok(nav.free(...points[i]), `${gender} ${i} free`);
      if (i) assert.ok(nav.path(...points[i - 1], ...points[i])?.length, `${gender} route ${i}`);
    }
    const other = changingPlan(gender === 'man' ? 'woman' : 'man');
    assert.ok(!nav.free(...other.locker), `${gender} does not enter other changing room`);
  }
});
test('four actual floodlights illuminate at evening and switch off again in daylight', () => {
  const root = new THREE.Group(),
    p = new Parts(),
    f = poolFloodlights(root, p);
  p.build(root);
  assert.equal(f.lamps.length, 4);
  assert.ok(f.lamps.every((l) => l.isSpotLight && !l.castShadow && l.intensity === 0));
  f.onPeriod('evening');
  assert.ok(f.lamps.every((l) => l.intensity > 0 && l.target.parent === root));
  assert.ok(f.faces.every((f) => f.material.emissiveIntensity > 1));
  f.onPeriod('morning');
  assert.ok(f.lamps.every((l) => l.intensity === 0));
  root.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) o.material.dispose();
  });
});

test('swimmer waterline follows actual head height without cumulative drift and releases the pose', async () => {
  for (const height of [0.65, 0.95, 1.25]) {
    const parent = new THREE.Group(),
      root = new THREE.Group(),
      head = new THREE.Bone();
    head.name = 'Head';
    head.position.y = height;
    root.add(head);
    parent.add(root);
    root.rotation.x = 0.1;
    const rig = { root, model: root, update() {}, setState() {} };
    const original = rig.update,
      pose = swimmerPose(rig);
    pose.enter();
    for (let n = 0; n < 20; n++) rig.update(0.016);
    root.updateWorldMatrix(true, true);
    const p = new THREE.Vector3();
    head.getWorldPosition(p);
    assert.ok(p.y > 0.33 && p.y < 0.37);
    pose.enter('swim');
    for (let n = 0; n < 20; n++) rig.update(0.016);
    head.getWorldPosition(p);
    assert.ok(p.y > 0.33 && p.y < 0.37);
    pose.leave();
    assert.equal(root.position.y, 0);
    assert.ok(Math.abs(root.rotation.x - 0.1) < 1e-8);
    assert.ok(head.quaternion.angleTo(new THREE.Quaternion()) < 1e-8);
    root.rotation.x = 0.3;
    rig.update(0.016);
    assert.equal(root.rotation.x, 0.3, 'inactive overlay leaves other actions alone');
    pose.dispose();
    assert.equal(rig.update, original);
  }
});

test('a scripted swimmer turns toward their listener without the paused walking controller', async () => {
  const root = new THREE.Group(); root.position.set(2, -.3, 3); root.rotation.y = Math.PI;
  const game = { place: {}, player: { root, scripted: true }, walker: { faceTo() { throw Error('walker is paused'); } },
    tween: async (_, step) => step(1) };
  const action = poolAction(game);
  await action.run(() => faceSwimmer(game, action, { x: 3, z: 4 }));
  assert.ok(Math.abs(root.rotation.y - Math.PI / 4) < 1e-8);
  assert.equal(game.walker.facing, root.rotation.y);
});

test('leaving a pool action cancels pending waits and late tween frames', async () => {
  let step, finish, continued = false;
  const game = { place: {}, tween: (_, f) => { step = f; return new Promise(r => { finish = r; }); } };
  const action = poolAction(game);
  let x = 0;
  const pending = action.run(async () => {
    await action.wait(action.tween(100, k => { x = k; }));
    continued = true;
  });
  step(.25);
  assert.equal(x, .25);
  action.cancel();
  game.place = {};
  await pending;
  step(1); finish();
  await Promise.resolve();
  assert.equal(x, .25);
  assert.equal(continued, false);
});

test('Continue preserves water and valid benches, but safely retires old submerged saves', () => {
  const player = {
    root: new THREE.Group(), seated: false, setState(s) { this.state = s; },
    sitAt(x, top, z, ry) { this.root.position.set(x, top, z); this.root.rotation.y = ry; this.setState('sit'); },
  };
  const game = { player, walker: { sync() {} } };
  const place = { start: [0, 0], nav: { free: (x, z) => x >= 0 && z >= 0 }, cam: { snap() {} },
    seats: { bench: { x: -1, z: 1, top: .4, ry: 1, out: [0, 1] } } };
  let water = false;
  const club = { snapshot: () => ({ eric: water ? 'tread' : null }),
    restore(s = {}) { water = s.eric === 'tread'; if (water) player.scripted = true; }, playerInWater: () => water };
  const save = poolSave(game, place, club);
  player.root.position.set(-3, -.5, -4); water = true;
  const wet = { world: save.snapshot() };
  water = false; save.restore(wet);
  assert.deepEqual(player.root.position.toArray(), [-3, -.5, -4]);
  assert.equal(player.scripted, true);
  player.sitAt(-1, .4, 1, 1); player.seated = true; water = false;
  const seated = { world: save.snapshot() };
  player.root.position.set(0, 0, 0); player.seated = false;
  save.restore(seated);
  assert.equal(player.seated, true);
  assert.deepEqual(player.seatOut, [0, 1]);
  assert.deepEqual(player.root.position.toArray(), [-1, .4, 1]);
  delete wet.world.swim;
  save.restore(wet);
  assert.equal(player.scripted, false);
  assert.equal(player.seated, false);
  assert.deepEqual(player.root.position.toArray(), [0, 0, 0]);
});

test('repeated pool visits restore the persistent actor update and held props follow its real hand', () => {
  const space = new THREE.Group(), root = new THREE.Group(), hand = new THREE.Bone();
  hand.name = 'RightHand'; hand.position.set(.2, .6, .1); root.add(hand); space.add(root);
  const rig = { root, model: root, update() {}, setState() {} }, original = rig.update;
  const bag = new THREE.Group(); space.add(bag);
  for (let n = 0; n < 4; n++) {
    const handling = poolHandling(space);
    handling.hold(rig, bag, .22);
    root.position.x += 1; rig.update(.016);
    assert.ok(Math.abs(bag.position.x - (root.position.x + .2)) < 1e-8);
    assert.ok(Math.abs(bag.position.y - .38) < 1e-8);
    const swim = swimmerPose(rig);
    swim.enter(); swim.dispose(); handling.dispose();
    assert.equal(rig.update, original);
    assert.equal(root.position.y, 0);
  }
});

test('pool crows cannot select the removed pavilion roof or any interior perch', () => {
  const bounds = changingPlan('woman').bounds;
  const place = { charScale: 1, creatureExclusions: [bounds], space: new THREE.Group(), camera: new THREE.PerspectiveCamera(), nav: {} };
  const world = creatureWorld({ player: { root: new THREE.Group() } }, place, PERCHES.pool, { sound() {}, blobs: {} });
  assert.equal(world.pick('high'), null, 'old roof points are all inside the cutaway pavilion');
  assert.ok(world.pick('tree'), 'outdoor tree perches remain available');
});

test('water dialogue framing survives Continue and restores walking angles on release and leave', () => {
  function makeCam(aspect) {
    return { yaw: -.22, elev: .94, fitDist: 30, camera: { aspect, fov: 22 },
      closeOn(point, zoom, y) { this.close = { point, zoom, y }; },
      release() { this.close = null; } };
  }
  for (const aspect of [.46, 1.59]) {
    const cam = makeCam(aspect), original = cam.release, game = { place: { cam } }, helper = poolCamera(game);
    helper.frame([2, 3]);
    assert.ok(cam.elev < .5);
    assert.ok(cam.close.zoom > 0);
    const saved = structuredClone(helper.snapshot());
    helper.dispose();
    assert.equal(cam.release, original);
    assert.deepEqual([cam.yaw, cam.elev], [-.22, .94]);
    helper.restore(saved);
    assert.deepEqual(cam.close.point, [2, 3]);
    assert.equal(cam.elev, .48);
    cam.release();
    assert.deepEqual([cam.yaw, cam.elev], [-.22, .94]);
    assert.equal(helper.snapshot(), null);
    helper.frame([2, 3]);
    cam.closeOn([8, 9], 1.2, 1);
    helper.update();
    assert.deepEqual([cam.yaw, cam.elev], [-.22, .94], 'an authored later camera shot owns its angle again');
    assert.deepEqual(cam.close, { point: [8, 9], zoom: 1.2, y: 1 });
    assert.equal(helper.snapshot(), null);
    helper.dispose();
    assert.equal(cam.release, original);
  }
});

hook.deregister();
