import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
globalThis.location = { search: '' };
globalThis.window = {};
const { poolWalkingCamera } = await import('../../js/places/day3/pool-walking-camera.js');
const { changingPlan } = await import('../../js/scenes/sports/changing-room.js');
for (const gender of ['man', 'woman']) test(`pool corridor shows the actor above lockers without changing deck or held shots: ${gender}`, () => {
  const look = { yaw: -.22, elev: 54 * Math.PI / 180 };
  const cam = { ...look }, walk = poolWalkingCamera(cam, look, gender);
  const { bounds: [x0, x1, , z1], corridor, deck } = changingPlan(gender);
  // A ray from a 1 m torso to the camera clears a 1.65 m locker less than 0.2 m ahead.
  for (let x = x0 + .4; x < x1 - .4; x += .5) {
    const p = { x, z: corridor[1] };
    walk.update(p, 1);
    assert.ok(1 + .2 * Math.tan(cam.elev) > 1.65);
    assert.equal(cam.yaw, look.yaw);
  }
  walk.update({ x: 10.556155122038238, z: -30.332565043504808 }, 1);
  assert.ok(cam.elev > 1.3, 'the actual hidden foreground-wall pose keeps the higher view');
  walk.update({ x: corridor[0], z: z1 + .3 }, 1);
  assert.ok(cam.elev > 1.3, 'pavilion doorway retains its readable view');
  cam.close = { poolWaterShot: true }; cam.elev = .48;
  walk.update({ x: corridor[0], z: corridor[1] }, 1);
  assert.equal(cam.elev, .48, 'authored water shot unchanged');
  cam.close = null; walk.update({ x: deck[0], z: deck[1] + 2 }, 1);
  assert.equal(cam.elev, look.elev, 'normal deck camera restored');
});


const THREE = await import('../../vendor/three/three.module.js');
const { Parts } = await import('../../js/kit/core/parts.js');
const { buildChangingRoom } = await import('../../js/scenes/sports/changing-room.js');
const { pt } = await import('../../js/scenes/sports/plan.js');
const D = await import('../../js/scenes/sports/deck-plan.js');
const { RoomCam } = await import('../../js/cam.js');
const { followFit } = await import('../../js/places/turning-cam.js');
const { poolDoorVisibility } = await import('../../js/places/day3/pool-door-visibility.js');
globalThis.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }) };
for (const aspect of [390 / 844, 1366 / 860]) for (const gender of ['man', 'woman']) {
  test(`actual RoomCam corridor rays, cards restore, both directions ${aspect} ${gender}`, () => {
    const root = new THREE.Group(), island = new THREE.Group(), parts = new Parts(); root.add(island);
    const offset = pt([0, 0]); island.position.set(offset[0], 0, offset[1]);
    const { doorCards: cards, lockerRows } = buildChangingRoom(parts, { field() {} }, { card() {} }, { glowParts: [], lit: [] }, island);
    const meshes = [...parts.build(island), ...cards];
    for (const row of lockerRows) row.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh); });
    const actor = new THREE.Group(); actor.add(new THREE.Mesh(new THREE.BoxGeometry(.68, 1.204, .824).translate(0, .608, 0), new THREE.MeshBasicMaterial())); root.add(actor);
    globalThis.window.__game = { player: { root: actor }, busy: false, markers: { list: [] } };
    root.updateMatrixWorld(true);
    const plan = changingPlan(gender), walks = [...D.WALKS, ...plan.walks];
    const nav = { x0: Math.min(...walks.map(r => r[0])) - .2, x1: Math.max(...walks.map(r => r[1])) + .2, z0: Math.min(...walks.map(r => r[2])) - .2, z1: Math.max(...walks.map(r => r[3])) + .2 };
    const look = { yaw: -.22, elev: 54 * Math.PI / 180 }, cam = new RoomCam({ ...look, elev: 54, fov: 24, space: root });
    followFit(cam, nav, aspect, look);
    const walking = poolWalkingCamera(cam, look, gender), visibility = poolDoorVisibility(root, cam), ray = new THREE.Raycaster();
    const sample = (p, settle = false) => {
      actor.position.copy(p); actor.updateWorldMatrix(true, true);
      for (let frame = 0; frame < (settle ? 40 : 30); frame++) { walking.update(p, .05); cam.update(.05, p); visibility.update(p, .05); }
      root.updateMatrixWorld(true);
      for (const y of [.8, 1.2]) {
        const target = p.clone().setY(y), eye = cam.camera.position;
        ray.set(eye, target.clone().sub(eye).normalize()); ray.far = eye.distanceTo(target) - .02;
        const opaque = meshes.filter(m => m.visible && m.material.opacity > .01);
        assert.equal(ray.intersectObjects(opaque, false).length, 0, `${p.toArray()} body ${y}, cam ${cam.camera.position.toArray()}`);
      }
    };
    sample(new THREE.Vector3(11.85770478629641, 0, -34.73223874558539), true);
    if (aspect < 1) assert.ok(cards.some(card => !card.visible), `actual saved phone doorway head occluder fades ${cam.camera.position.toArray()} target${cam.target.toArray()}`);
    const points = [];
    for (const z of [plan.corridor[1] - .65, plan.corridor[1], -34.76]) for (let x = plan.bounds[0] + .6; x < plan.bounds[1] - .4; x += .24) points.push(new THREE.Vector3(x, 0, z));
    for (let z = plan.corridor[1]; z < plan.deck[1] + 2; z += .12) points.push(new THREE.Vector3(plan.deck[0], 0, z));
    for (const route of [points, [...points].reverse()]) for (const p of route) sample(p);
    sample(new THREE.Vector3(plan.deck[0], 0, plan.deck[1] + 3), true);
    assert.ok(cards.every(card => card.visible && card.material.opacity === 1), 'door cards regain normal legibility after passing');
    for (const row of lockerRows) row.traverse(mesh => { if (mesh.isMesh) assert.ok(mesh.visible && mesh.material.opacity === 1, 'locker bodies and number cards restore together'); });
  });
}
