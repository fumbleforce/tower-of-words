import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
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
const { Nav } = await import('../../js/movement/navigation.js');
const garden = await import('../../js/scenes/station-garden/plan.js');
const shop = await import('../../js/scenes/shotengai/plan.js');
const { PATHS, CHUNKS } = await import('../../js/scenes/island-layout.js');
const nav = new Nav(-12.25, garden.BOUNDS[1], garden.BOUNDS[2], 11.6, 0.1);
nav.extra = (x, z) => shop.WALKS.some((r) => shop.inRect(x, z, r, -0.02)) || shop.inRect(x, z, shop.STREET_END);
shop.FURNITURE.forEach((r) => nav.block(...r));
nav.build();
test('both entrances and both actual bench approaches form one walkable garden loop', () => {
  const points = [
    [-4.25, 24.5],
    [-8.5, 24.5],
    [-14.45, 24.0],
    [-14.45, 26.5],
    [-14.45, 28.0],
    [-4.25, 28.0],
  ].map(garden.local);
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    assert.ok(nav.free(...a), `free ${a}`);
    assert.ok(nav.path(...a, ...b)?.length, `route ${a} to ${b}`);
  }
  for (const seat of Object.values(garden.BENCHES)) {
    assert.ok(Math.abs(Math.sin(seat.ry) - (seat.out[0] - seat.x) / 0.9) < 1e-8);
    assert.ok(Math.abs(Math.cos(seat.ry) - (seat.out[1] - seat.z) / 0.9) < 1e-8);
    assert.ok(!nav.free(seat.x, seat.z));
    assert.ok(nav.free(...seat.out));
    assert.ok(nav.path(...points[0], ...seat.out)?.length);
  }
});
test('canonical covered approach is reachable but the station and platform remain excluded', () => {
  const start = garden.PATCHES[0];
  for (const p of [
    [-14.45, 12.0],
    [-14.45, 16.6],
    [-27.8, 16.6],
  ]) {
    assert.ok(nav.path(...start, ...garden.local(p))?.length, p.join(','));
  }
  for (const p of [
    [-14.45, 10.9],
    [-28.6, 14.7],
    [-17, 20.0],
    [-10, 21],
  ])
    assert.ok(!nav.free(...garden.local(p)), p.join(','));
});
test('the map draws the same connector and every worker patch has free floor', () => {
  assert.deepEqual(PATHS.find((p) => p.id === 'garden_arcade').rect, [-11.45, 23.7, -5.5, 25.3]);
  garden.PATCHES.forEach((p) => assert.ok(nav.free(...p)));
  assert.equal(CHUNKS.shotengai.turn, 270);
});
test('southern bench return clears a 0.6-wide body and keeps every route in the expanded chunk', () => {
  const points = [
    [-10.9, 24.5],
    [-11.2, 25.95],
    [-12.1, 25.95],
    [-14.45, 25.95],
  ].map(garden.local);
  for (const point of points) {
    assert.ok(nav.free(...point, 0.3), `body clearance ${point}`);
    const b = CHUNKS.shotengai.walk;
    assert.ok(point[0] >= b[0] && point[0] <= b[1] && point[1] >= b[2] && point[1] <= b[3]);
  }
  for (let i = 1; i < points.length; i++) {
    assert.ok(nav.path(...points[i - 1], ...points[i])?.length);
    assert.ok(nav.path(...points[i], ...points[i - 1])?.length);
  }
});
test('moving tool meshes survive the actual static merge and remain anchored to a real hand', async () => {
  const THREE = await import('../../vendor/three/three.module.js');
  const { maintenanceProps } = await import('../../js/scenes/station-garden/props.js');
  const { mergeStatic } = await import('../../js/scenes/merge-static.js');
  const { gardenPoses } = await import('../../js/places/station-garden/poses.js');
  const { PEOPLE } = await import('../../js/cast.js');
  const root = new THREE.Group(),
    tools = maintenanceProps(root),
    worker = PEOPLE.worker(5);
  worker.root.scale.multiplyScalar(1.18);
  const count = tools.broom.children.length;
  mergeStatic(root);
  assert.equal(tools.broom.children.length, count);
  assert.ok(tools.broom.children.every((m) => m.name && m.userData.noBatch));
  root.add(worker.root);
  const poses = gardenPoses({ space: root }, worker, tools);
  for (const k of [0, 0.5, 1]) {
    const c = poses.sweep(0, 0, k),
      axis = new THREE.Vector3(0, 1, 0).applyQuaternion(tools.broom.quaternion);
    const grip = tools.broom.position.clone().addScaledVector(axis, c.grip);
    assert.ok(grip.distanceTo(new THREE.Vector3(...c.hand)) < 0.001);
    assert.ok(c.grip > 0.4 && c.grip < 1.15);
    assert.ok(Math.abs(c.floor[1] - 0.012) < 0.02);
  }
  poses.dispose();
});
test('cached place re-entry resumes its routine and evening/Continue retain completed collection', async () => {
  const THREE = await import('../../vendor/three/three.module.js');
  const { maintenanceProps } = await import('../../js/scenes/station-garden/props.js');
  const { gardenRoutine } = await import('../../js/places/station-garden/routine.js');
  const { PEOPLE } = await import('../../js/cast.js');
  const root = new THREE.Group(),
    tools = maintenanceProps(root),
    worker = PEOPLE.worker(5);
  worker.root.scale.multiplyScalar(1.18);
  root.add(worker.root);
  const player = new THREE.Group();
  player.position.set(99, 0, 99);
  const game = { player: { root: player }, busy: false, tween: async (_, step) => step(1) };
  const routine = gardenRoutine(game, { space: root, nav: { free: () => true } }, worker, tools);
  routine.period('morning');
  routine.update(0.5, 0.5);
  const time = routine.state.time;
  routine.leave();
  routine.update(2, 2);
  assert.equal(routine.state.time, time);
  routine.period('morning');
  routine.update(0.5, 3);
  assert.ok(routine.state.time > time);
  routine.restore({ day: 3, period: 'morning', patch: 1, phase: 'collect', time: 1.5, collected: [1, 0.5] });
  const saved = JSON.parse(JSON.stringify(routine.snapshot()));
  routine.period('evening');
  assert.equal(worker.root.visible, false);
  assert.ok(Math.abs(tools.broom.position.x - garden.TOOL_PARK[0]) < 1e-8);
  routine.restore(saved);
  routine.period('morning');
  assert.deepEqual(routine.state.collected, [1, 0.5]);
  assert.ok(tools.leaves[0].every((leaf) => !leaf.visible));
  assert.ok(tools.contents.some((leaf) => leaf.visible));
  routine.pause();
  const frozen = routine.snapshot();
  routine.update(4, 8);
  assert.deepEqual(routine.snapshot(), frozen);
  routine.resume();
  routine.restore({ day: 3, period: 'morning', phase: 'rest', collected: [1, 1] });
  routine.period('morning', 3);
  routine.update(18, 20);
  assert.equal(routine.state.phase, 'rest', 'completed garden stops collecting invisible litter');
  routine.period('evening', 3);
  routine.period('morning', 4);
  assert.deepEqual(routine.state.collected, [0, 0]);
  assert.equal(routine.state.phase, 'sweep');
  assert.ok(tools.leaves.every((patch) => patch.every((leaf) => leaf.visible)));
  routine.restore({ day: 4, period: 'morning', phase: 'rest', collected: [1, 1] });
  routine.period('morning', 4);
  assert.deepEqual(routine.state.collected, [1, 1], 'same-period Continue is not a new morning');
  routine.leave();
});

test('worker yields to both residents and ambient people before continuing its actual patch route', async () => {
  const THREE = await import('../../vendor/three/three.module.js');
  const { maintenanceProps } = await import('../../js/scenes/station-garden/props.js');
  const { gardenRoutine } = await import('../../js/places/station-garden/routine.js');
  const { PEOPLE } = await import('../../js/cast.js');
  const root = new THREE.Group(),
    worker = PEOPLE.worker(5),
    blocker = { root: new THREE.Group() };
  root.add(worker.root);
  worker.root.scale.multiplyScalar(1.18);
  const player = { root: new THREE.Group() };
  player.root.position.set(99, 0, 99);
  const P = { space: root, nav, people: { station_worker: worker }, crowd: [] };
  const routine = gardenRoutine({ player, busy: false }, P, worker, maintenanceProps(root));
  for (const source of ['resident', 'crowd']) {
    routine.restore({ phase: 'walk', patch: 1, at: garden.PATCHES[0] });
    const before = worker.root.position.clone();
    blocker.root.position.copy(before).add(new THREE.Vector3(0.3, 0, 0));
    if (source === 'resident') P.people.blocker = blocker;
    else P.crowd = [blocker];
    routine.update(0.1, 0);
    assert.equal(worker.root.position.distanceTo(before), 0, source);
    delete P.people.blocker;
    P.crowd = [];
    routine.update(0.1, 0);
    assert.ok(worker.root.position.distanceTo(before) > 0);
  }
  routine.leave();
});
