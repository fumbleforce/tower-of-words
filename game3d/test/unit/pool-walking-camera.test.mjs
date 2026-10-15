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
const THREE = await import('../../vendor/three/three.module.js');
const { Parts } = await import('../../js/kit/core/parts.js');
const { buildChangingRoom, changingPlan } = await import('../../js/scenes/sports/changing-room.js');
const { pt } = await import('../../js/scenes/sports/plan.js');
const D = await import('../../js/scenes/sports/deck-plan.js');
const { RoomCam } = await import('../../js/cam.js');
const { followFit } = await import('../../js/places/turning-cam.js');
const { poolFloodlights } = await import('../../js/scenes/sports/pool-lights.js');
const { poolDoorVisibility } = await import('../../js/places/day3/pool-door-visibility.js');
const { mergeStatic } = await import('../../js/scenes/merge-static.js');
globalThis.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }) };
for (const aspect of [390 / 844, 1366 / 860]) for (const gender of ['man', 'woman']) {
  test(`actual RoomCam corridor rays, cards restore, both directions ${aspect} ${gender}`, () => {
    const root = new THREE.Group(), island = new THREE.Group(), parts = new Parts(); root.add(island);
    const offset = pt([0, 0]); island.position.set(offset[0], 0, offset[1]);
    const { doorCards: cards, lockerRows } = buildChangingRoom(parts, { field() {} }, { card() {} }, { glowParts: [], lit: [] }, island);
    parts.build(island);
    const floodlights = poolFloodlights(island);
    const fixtures = island.children.filter(o => o.name.startsWith('pool:floodlight-fixture:'));
    assert.equal(fixtures.length, 4);
    const enclosure = root.getObjectByName('follow-interior'), upperMeshes = [...enclosure.children];
    mergeStatic(root);
    assert.ok(upperMeshes.every(mesh => mesh.parent === enclosure), 'hidden upper walls remain inside the overview cutaway after merge');
    for (const row of lockerRows) {
      assert.ok(row.children.some(mesh => mesh.name.startsWith('pool:lockers:')), 'build-time merge retains locker bodies in their fade group');
    }
    const meshes = []; root.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh); });
    const actor = new THREE.Group(); actor.add(new THREE.Mesh(new THREE.BoxGeometry(.68, 1.204, .824).translate(0, .608, 0), new THREE.MeshBasicMaterial())); root.add(actor);
    globalThis.window.__game = { player: { root: actor }, busy: false, markers: { list: [] } };
    root.updateMatrixWorld(true);
    const plan = changingPlan(gender), walks = [...D.WALKS, ...plan.walks];
    const nav = { x0: Math.min(...walks.map(r => r[0])) - .2, x1: Math.max(...walks.map(r => r[1])) + .2, z0: Math.min(...walks.map(r => r[2])) - .2, z1: Math.max(...walks.map(r => r[3])) + .2 };
    const look = { yaw: -.22, elev: 54 * Math.PI / 180 }, cam = new RoomCam({ ...look, elev: 54, fov: 24, space: root });
    followFit(cam, nav, aspect, look);
    const visibility = poolDoorVisibility(root, cam), ray = new THREE.Raycaster();
    const sample = (p, settle = false, levels = [.8, .9, 1, 1.1, 1.2]) => {
      actor.position.copy(p); actor.updateWorldMatrix(true, true);
      for (let frame = 0; frame < (settle ? 40 : 30); frame++) { cam.update(.05, p); visibility.update(p, .05); }
      root.updateMatrixWorld(true);
      for (const y of levels) {
        const target = p.clone().setY(y), eye = cam.camera.position;
        ray.set(eye, target.clone().sub(eye).normalize()); ray.far = eye.distanceTo(target) - .02;
        const opaque = meshes.filter(m => { for (let n = m; n; n = n.parent) if (!n.visible) return false; return m.material.opacity > .01; });
        assert.equal(ray.intersectObjects(opaque, false).length, 0, `${p.toArray()} body ${y}, cam ${cam.camera.position.toArray()} hits ${ray.intersectObjects(opaque, false).map(h=>h.object.name+":"+h.point.toArray()).join(";")}`);
      }
    };
    sample(new THREE.Vector3(11.85770478629641, 0, -34.73223874558539), true);
    sample(new THREE.Vector3(5.25, 0, -35.55), true);
    if (aspect < 1) assert.ok(cards.some(card => !card.visible), 'the genuine normal-lens corridor label clears neck and upper torso');
    sample(new THREE.Vector3(2.6537145975486394, 0, -28.880140993205522), true, [.2, .4, .8, 1, 1.2]);
    sample(new THREE.Vector3(3.1641517983400425, 0, -29.288700671357706), true, [.2, .4, .8, 1, 1.2]);
    visibility.reset();
    for (const object of [...cards, ...lockerRows, ...fixtures]) object.traverse(mesh => { if (mesh.isMesh) { assert.equal(mesh.visible, true); assert.equal(mesh.material.opacity, 1); } });
    sample(new THREE.Vector3(2.6537145975486394, 0, -28.880140993205522), true, [.2, .4, .8, 1, 1.2]);
    const points = [];
    for (const z of [plan.corridor[1] - .65, plan.corridor[1], -34.76]) for (let x = plan.bounds[0] + .6; x < plan.bounds[1] - .4; x += .24) points.push(new THREE.Vector3(x, 0, z));
    for (let z = plan.corridor[1]; z < plan.deck[1] + 2; z += .12) points.push(new THREE.Vector3(plan.deck[0], 0, z));
    for (const route of [points, [...points].reverse()]) for (const p of route) sample(p);
    sample(new THREE.Vector3(plan.deck[0], 0, plan.deck[1] + 3), true);
    floodlights.onPeriod('evening');
    assert.ok(floodlights.faces.every(face => face.material.emissiveIntensity === 3), 'cloned cutaway face materials still light at evening');
    for (const fixture of fixtures) fixture.traverse(mesh => { if (mesh.isMesh) assert.equal(mesh.material.opacity, 1, 'individual fixture restores after crossing'); });
    assert.ok(cards.every(card => card.visible && card.material.opacity === 1), 'door cards regain normal legibility after passing');
    for (const row of lockerRows) row.traverse(mesh => { if (mesh.isMesh) assert.ok(mesh.visible && mesh.material.opacity === 1, 'locker bodies and number cards restore together'); });
  });
}
