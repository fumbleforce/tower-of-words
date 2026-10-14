import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({ resolve(id, context, next) {
  if (id === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
  if (id.endsWith('/sfx.js')) return { url: 'data:text/javascript,export const sfx=()=>{}', shortCircuit: true };
  return next(id, context);
} });
globalThis.window = { __game: { busy: true } };
const THREE = await import('../../vendor/three/three.module.js');
const { RoomCam } = await import('../../js/cam.js');
const { poolCamera } = await import('../../js/places/day3/pool-camera.js');
const { poolLengths } = await import('../../js/places/day3/pool-length.js');
for (const aspect of [390 / 844, 1366 / 860]) for (const withPlayer of [false, true]) {
  test(`recurring length follows every swimmer in both directions, ${aspect} player ${withPlayer}`, async () => {
    const root = new THREE.Group(); root.position.set(12, 0, -8); root.rotation.y = .4;
    const cam = new RoomCam({ space: root, yaw: -.22, elev: 56 });
    cam.camera.aspect = aspect; cam.camera.updateProjectionMatrix();
    const people = Object.fromEntries(['eric', 'emi', 'kuro'].map(id => {
      const group = new THREE.Group(); root.add(group); group.position.set(0, -.2, 8);
      return [id, { root: group }];
    }));
    const game = { place: { cam }, player: people.eric }; const camera = poolCamera(game);
    const sampled = [];
    const action = { wait: p => p, async tween(_seconds, apply) {
      for (let frame = 0; frame <= 160; frame++) {
        const k = frame / 160;
        apply(k); camera.update(); cam.update(.05, people.eric.root.position);
        const visible = withPlayer ? Object.values(people) : [people.emi, people.kuro];
        for (const person of visible) {
          const p = root.localToWorld(new THREE.Vector3(person.root.position.x, .35, person.root.position.z)).project(cam.camera);
          assert.ok(Math.abs(p.x) < .85 && Math.abs(p.y) < .85, `${JSON.stringify(p)} at ${k}`);
        }
        const view = root.worldToLocal(cam.camera.position.clone());
        assert.ok(view.x > 1.43, 'east sightline cannot cross the west lifeguard chair');
        sampled.push(structuredClone(camera.snapshot()));
      }
    } };
    const run = poolLengths(game, { action, camera, who: id => people[id], inWater(id, [x, z]) { people[id].root.position.set(x, -.2, z); }, waterPose: () => ({ enter() {} }),
      LANE: 0, LANE2: 1.43, WX0: -.7, WX1: 7.9, WZ0: -8, WZ1: 10, laneWidth: 1.43 });
    await run(withPlayer, { track: true });
    assert.equal(sampled.length, 322);
    assert.ok(sampled[0].shot.point[1] > sampled[160].shot.point[1]);
    assert.ok(sampled[161].shot.point[1] < sampled[321].shot.point[1]);
    const saved = sampled[2]; camera.dispose(); camera.restore(saved);
    assert.deepEqual(camera.snapshot(), saved, 'Continue retains the tracked point and camera home');
    cam.release(); assert.deepEqual([cam.yaw, cam.elev], [-.22, 56 * Math.PI / 180]);
    camera.dispose();
  });
}
test('the first authored visit retains its existing wide length framing', async () => {
  const people = Object.fromEntries(['eric', 'emi', 'kuro'].map(id => [id, { root: new THREE.Group() }]));
  for (const p of Object.values(people)) p.root.position.z = 8;
  const shots = [], game = { place: { cam: { closeOn: (...args) => shots.push(args) } } };
  const action = { wait: p => p, tween: async (_t, f) => f(1) };
  const run = poolLengths(game, { action, camera: { clear() {}, frame() { throw new Error('Unexpected first-visit tracking'); } },
    who: id => people[id], inWater() {}, waterPose: () => ({ enter() {} }), LANE: 0, LANE2: 1, WX0: -1, WX1: 8, WZ0: -8, WZ1: 10, laneWidth: 1 });
  await run(false);
  assert.deepEqual(shots, [[[3.5, 1], .9]]);
});

test('recurring bench shot survives free play and Continue, then releases when the player stands', () => {
  const cam = new RoomCam({ yaw: -.22, elev: 54 });
  const game = { place: { cam }, player: { root: new THREE.Group(), seated: true } };
  const camera = poolCamera(game);
  camera.frame([2, -8], { span: 2.8, y: .65, yaw: 1.2, elev: .42, untilStanding: true });
  const saved = structuredClone(camera.snapshot()); camera.update();
  assert.ok(cam.close?.poolWaterShot, 'the free seated ending retains its authored group view');
  camera.dispose(); camera.restore(saved); camera.update();
  assert.ok(cam.close?.poolWaterShot, 'Continue retains the bench view');
  game.player.seated = false; camera.update();
  assert.equal(cam.close, null); assert.equal(camera.snapshot(), null);
  assert.equal(cam.elev, 54 * Math.PI / 180); camera.dispose();
});
