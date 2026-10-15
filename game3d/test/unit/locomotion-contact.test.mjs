// Recorded #587 contact, with the real post, traversal, ordinary Eric and mixer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
  load(u, c, next) {
    if (u.endsWith('/js/sfx.js')) return { format: 'module', source: 'export const sfx=()=>{}', shortCircuit: true };
    return next(u, c);
  },
});
globalThis.window = globalThis;
globalThis.location = { search: '', hostname: 'localhost', href: 'http://localhost/' };
globalThis.document = { body: { classList: { contains: () => false } }, activeElement: null };
globalThis.requestAnimationFrame = () => {};
globalThis.ProgressEvent = class { constructor(type, values) { Object.assign(this, { type }, values); } };
const THREE = await import('../../vendor/three/three.module.js');
const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
const { clone } = await import('../../vendor/utils/SkeletonUtils.js');
const { meshyFrom } = await import('../../js/avatar.js');
const { SmoothWalker } = await import('../../js/movement/walker.js');
const { Nav } = await import('../../js/movement/navigation.js');
const { lamps } = await import('../../js/scenes/outdoor/furniture.js');
const { createTraversal } = await import('../../js/movement/traversal.js');
const { startGaitCheck } = await import('../../js/movement/gait-watch.js');
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/lamp-gait-replay.json', import.meta.url)));
async function geometry(name) {
  const file = fs.readFileSync(new URL('../../assets/eric/' + name + '.glb', import.meta.url));
  const length = file.readUInt32LE(12), json = JSON.parse(file.subarray(20, 20 + length));
  for (const m of json.meshes) for (const p of m.primitives) delete p.material;
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + file.subarray(28 + length).toString('base64');
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}
const [walk, run, sit] = await Promise.all(['walk', 'run', 'sit'].map(geometry));
// Measure before constructing/posing a copy, as production does for cached source bodies.
walk.scene.updateMatrixWorld(true);
const size = new THREE.Box3().setFromObject(walk.scene).getSize(new THREE.Vector3()).y;
const idle = JSON.parse(fs.readFileSync(new URL('../../assets/characters/relaxed-idle-eric.json', import.meta.url)));
function actor() {
  const model = clone(walk.scene);
  model.traverse(o => { if (o.isMesh) o.material = o.material.clone(); });
  return meshyFrom('eric', [{ ...walk, scene: model }, run, THREE.AnimationClip.parse(idle), sit, new THREE.Texture(), null], { height: 1.2, size });
}
function setup(legacy = false) {
  const space = new THREE.Group();
  const p = {
    geo(c, g) { space.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial())); },
    box(c, w, h, d, x, y, z) { this.geo(c, new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z)); },
  };
  lamps({ glowParts: [], lit: [] }, p, [[4.120000000000011, -2.75]], { kind: 'post' });
  space.add(new THREE.Mesh(new THREE.BoxGeometry(30, .1, 80).translate(0, -.05, -20), new THREE.MeshStandardMaterial()));
  const place = { name: 'lamp regression', space, charScale: fixture.scale };
  const physical = createTraversal(place), nav = new Nav(-10, 20, -50, 10); nav.build();
  const rig = actor(), body = rig.root; body.scale.setScalar(fixture.scale); space.add(body); body.position.fromArray(fixture.position);
  const walker = new SmoothWalker(body, nav, { speed: fixture.speed, others: () => [] });
  walker.path = fixture.path.map(p => [...p]);
  walker.traversal = {
    collide: (x, z, ox, oz) => physical.collide(x, z, ox, oz, 0, fixture.scale, false),
    clear: (a, b) => physical.clear(a, b, 0, fixture.scale), route: (_a, path) => path,
  };
  walker.v = fixture.v;
  const direction = body.position.clone().sub(new THREE.Vector3(...[3.77, 0, -5.8]));
  walker.vx = -direction.x / direction.length(); walker.vz = -direction.z / direction.length();
  walker.facing = walker.targetFacing = Math.atan2(walker.vx, walker.vz); body.rotation.y = walker.facing;
  // Negative control: exactly the previous selector, with all physical/rig code unchanged.
  if (legacy) walker.locomotion.step = function ({ moving, v }, moved, dt) {
    const speed = moved / Math.max(dt, 1e-4);
    return this.travelMoving = moving ? speed > .04 && v > .04 : speed > .1 && v > .1;
  };
  const camera = new THREE.PerspectiveCamera(75, 1, .01, 100); camera.position.set(4, 10, 8); camera.lookAt(3, 0, -4); camera.updateMatrixWorld(true); place.camera = camera;
  const game = globalThis.__game = { place, busy: false, player: rig, walker, t: 0 };
  delete globalThis.__gaitCheck; const check = startGaitCheck(game);
  // Enter the obstruction from a settled walk, rather than a fresh idle pose.
  rig.setState('walk'); rig.setGait(fixture.v / fixture.scale, walker.gait);
  for (let n = 0; n < 30; n++) rig.update(1 / 60, 1.25);
  walker.moving = walker.locomotion.travelMoving = true;
  return { rig, body, walker, camera, game, check };
}
function replay(legacy) {
  const s = setup(legacy), samples = []; let changes = 0, last = true;
  for (const dt of fixture.dt) {
    s.game.t += dt;
    const moving = s.walker.update(dt, s.camera);
    // main.step's ordinary player sequence, including the live distance-driven gait.
    s.rig.setState(moving ? 'walk' : 'idle'); s.rig.setGait(s.walker.gait.v, s.walker.gait); s.rig.update(dt, 1.25);
    s.check.sample();
    if (moving !== last) { changes++; last = moving; }
    samples.push({ t: s.game.t, moving, at: s.body.position.toArray(), v: s.walker.v, path: s.walker.path?.map(p => [...p]), feet: s.rig._gaitFeet?.map(b => b.getWorldPosition(new THREE.Vector3()).toArray()) });
  }
  return { ...s, samples, changes, reports: s.check.reports(4) };
}
test('real lamp replay stops clip resets without changing a single physical step', () => {
  const old = replay(true), fixed = replay(false);
  console.log(JSON.stringify({ old: { changes: old.changes, reports: old.reports }, fixed: { changes: fixed.changes, reports: fixed.reports }, size, end: fixed.body.position.toArray() }));
  assert.ok(old.changes >= 25, 'recording reproduces the old single-step churn');
  assert.ok(old.reports.some(r => r.includes('on the spot')), 'real feet reproduce the gait failure');
  assert.equal(fixed.changes, 2, 'one genuine stop and one sustained restart');
  assert.deepEqual(fixed.reports, [], 'unchanged gait watcher sees no four-window failure');
  assert.deepEqual(fixed.samples.map(({ at, v, path }) => ({ at, v, path })), old.samples.map(({ at, v, path }) => ({ at, v, path })), 'animation selection never changes displacement, collision speed or route');
  assert.ok(fixed.body.position.z < -7, 'walk progresses past the lamp');
});

function continuous(kind, legacy) {
  const s = setup(legacy), physical = []; let changes = 0, last = true, replans = 0, lastPath = s.walker.path;
  s.walker.path = null;
  if (kind === 'steer') s.walker.steer = { x: 3.77, z: -5.8, run: false };
  else {
    s.walker.keys.add('KeyW');
    s.walker.keyFrame = new THREE.Vector3(3.77 - s.body.position.x, 0, -5.8 - s.body.position.z).normalize();
  }
  const intent = s.walker.steer || s.walker.keyFrame;
  for (const dt of fixture.dt) {
    s.game.t += dt;
    // installSteer retains the target object while smoothing its coordinates.
    if (kind === 'steer') s.walker.steer.x += Math.sin(s.game.t) * dt * .001;
    const moving = s.walker.update(dt, s.camera);
    s.rig.setState(moving ? 'walk' : 'idle'); s.rig.setGait(s.walker.gait.v, s.walker.gait); s.rig.update(dt, 1.25); s.check.sample();
    assert.equal(s.walker.steer || s.walker.keyFrame, intent, 'continuous input retains its intent');
    if (s.walker.path && s.walker.path !== lastPath) replans++;
    lastPath = s.walker.path;
    if (moving !== last) { changes++; last = moving; }
    physical.push({ at: s.body.position.toArray(), v: s.walker.v, path: s.walker.path?.map(p => [...p]), travel: s.walker.locomotion.travelMoving });
  }
  return { physical, changes, replans, reports: s.check.reports(4) };
}
for (const kind of ['steer', 'keys']) test(`${kind} contact keeps continuous intent and every physical decision`, () => {
  const old = continuous(kind, true), fixed = continuous(kind, false);
  console.log(kind, JSON.stringify({ old: { changes: old.changes, reports: old.reports }, fixed: { changes: fixed.changes, reports: fixed.reports }, replans: fixed.replans }));
  assert.deepEqual(fixed.physical, old.physical);
  assert.deepEqual(fixed.reports, []);
  if (kind === 'steer') assert.ok(fixed.replans > 1, 'real steering replaces its obstacle route repeatedly');
  else assert.ok(old.changes > fixed.changes, 'held keys also reproduce the repaired churn');
});

test('unblocked starts are immediate, contact restart is bounded, and handoffs clear it', () => {
  const s = setup(), w = s.walker;
  const free = { collide: (x, z) => [x, z], clear: () => true, route: (_a, path) => path };
  w.path = null; w.steer = null; w.keys.add('KeyW');
  w.keyFrame = new THREE.Vector3(0, 0, -1); w.facing = w.targetFacing = Math.PI; s.body.rotation.y = Math.PI;
  w.v = 0; w.vx = 0; w.vz = -1; w.moving = w.locomotion.travelMoving = false; w.traversal = free;
  assert.equal(w.update(.03, s.camera), true, 'ordinary first meaningful substep starts the walk');
  w.traversal = { ...free, collide: (_x, _z, ox, oz) => [ox, oz] };
  assert.equal(w.update(.05, s.camera), false); assert.equal(w.locomotion.contact, true);
  w.traversal = free;
  for (const n of [1, 2, 3]) assert.equal(w.update(.05, s.camera), n === 3, 'restarts after sustained .15s of free movement');
  function latch() {
    w.traversal = { ...free, collide: (_x, _z, ox, oz) => [ox, oz] };
    w.update(.05, s.camera); assert.equal(w.locomotion.contact, true); w.traversal = free;
  }
  latch(); w.stop(); assert.equal(w.locomotion.contact, false, 'explicit stop clears contact');
  assert.equal(w.update(.03, s.camera), true);
  latch(); w.keys.clear(); w.goTo(s.body.position.x, s.body.position.z - 3);
  assert.equal(w.update(.03, s.camera), true, 'new route starts without the previous contact delay');
  latch(); w.goTo(s.body.position.x, s.body.position.z - 3, null, { scripted: true });
  assert.equal(w.update(.03, s.camera), true, 'scripted handoff starts without the previous contact delay');
  w.path.scripted = false; latch(); w.sync(); assert.equal(w.locomotion.contact, false, 'place/pose sync clears contact');
  assert.equal(w.update(.03, s.camera), true);
});
