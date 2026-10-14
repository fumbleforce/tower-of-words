import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  if (s.endsWith('/sim.js')) return { url: 'data:text/javascript,export const sim={day:17,period:"evening"}', shortCircuit: true };
  if (s.endsWith('/sfx.js')) return { url: 'data:text/javascript,export const sfx=()=>{}', shortCircuit: true };
  if (s.endsWith('/move.js')) return { url: 'data:text/javascript,export const walkRig=async(g,r,p)=>{r.root.position.set(p[0],0,p[1]);g.sample?.()};export const faceRig=async()=>{};export const glide=async(g,r,p)=>{r.position.x=p[0];r.position.z=p[1];g.sample?.()}', shortCircuit: true };
  return next(s, c);
} });
globalThis.location = { search: '' }; globalThis.window = {};
const THREE = await import('../../vendor/three/three.module.js');
const { RoomCam } = await import('../../js/cam.js');
const { flags } = await import('../../js/narrative/state.js');
const { poolClub } = await import('../../js/places/day3/swim.js');
function fixture() {
  const root = new THREE.Group(), cam = new RoomCam({ yaw: -.22, elev: 54, space: root });
  cam.camera.aspect = 390 / 844; cam.camera.updateProjectionMatrix();
  const rig = () => ({ root: new THREE.Group(), setState() {}, update() {} });
  const player = { ...rig(), seated: false, sitAt(x, y, z) { this.root.position.set(x, y, z); this.seated = true; } };
  const people = Object.fromEntries(['emi', 'kuro', 'attendant', 'member'].map(id => [id, rig()]));
  for (const r of [player, ...Object.values(people)]) root.add(r.root);
  const cast = { people, put(id, [x, z]) { people[id].root.position.set(x, 0, z); }, hide(id) { people[id].root.visible = false; }, seat(id, p) { people[id].root.position.set(p.x, p.top, p.z); people[id].seated = true; } };
  const game = { player, place: { cam, space: root, seats: { deck_bench_s: { x: 2.2, z: -10.9, top: .34, ry: Math.PI / 2, out: [2.8, -10.9] } } }, walker: { sync() {}, stop() {} }, hooks: { stand: async () => { player.seated = false; } }, tween: async (_seconds, apply) => { for (const k of [0,.5,1]) { apply(k); game.sample?.(); } }, wait: async () => {}, walkTo: async (x,z) => { player.root.position.set(x,0,z); game.sample?.(); } };
  globalThis.window.__game = { busy: true };
  const club = poolClub(game, { root, cast });
  return { game, club, cam, player };
}
for (const staySeated of [false, true]) test(`actual poolClub sit -> free -> save/restore -> stand, hold ${staySeated}`, async () => {
  const { game, club, cam, player } = fixture();
  flags.d3_player_swims = true;
  const samples = [];
  game.sample = () => { club.update(); samples.push(club.snapshot().camera); };
  await club.hooks.poolSession({ state: 'sit', staySeated });
  assert.equal(player.seated, true);
  await club.hooks.poolSession({ state: 'free', staySeated });
  const saved = structuredClone(club.snapshot());
  if (staySeated) {
    assert.ok(saved.camera?.shot.untilStanding, 'real free hook retains the saved bench shot');
    assert.ok(samples.some(s => s?.shot.span === 8.5), 'real relocation follows its moving group');
    club.restore(saved); club.update();
    assert.equal(club.snapshot().camera.shot.untilStanding, true);
    assert.ok(cam.close?.poolWaterShot);
    player.seated = false; club.update(); assert.equal(cam.close, null);
  } else assert.equal(saved.camera, null, 'original first-visit release remains unchanged');
  club.leave();
});
