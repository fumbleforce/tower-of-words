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
const THREE = await import('../../vendor/three/three.module.js');
const { Nav } = await import('../../js/movement/navigation.js');
const { bodies } = await import('../../js/movement/shared.js');
const { catLanding } = await import('../../js/places/train-cat.js');
function fixture(x = -0.8, z = -0.15) {
  const space = new THREE.Group(),
    player = { root: new THREE.Group() },
    tama = { root: new THREE.Group() };
  space.add(player.root, tama.root);
  player.root.position.set(x, 0, z);
  tama.root.position.set(-0.85, 0.55, -0.98);
  const nav = new Nav(-4, 4, -2, 3);
  nav.block(-4, 4, -2, -0.74);
  return { player, place: { space, nav, people: { tama } } };
}
test('the recorded petting position gets a clear hop instead of the colliding fixed landing', () => {
  const game = fixture(),
    cat = game.place.people.tama;
  assert.ok(Math.hypot(game.player.root.position.x + 0.85, game.player.root.position.z + 0.539) < 0.4);
  const landing = catLanding(game, cat);
  assert.ok(landing);
  assert.ok(game.place.nav.free(...landing));
  const person = bodies(game).find((b) => b.root === game.player.root);
  for (let i = 0; i <= 100; i++) {
    const t = i / 100,
      x = -0.85 + (landing[0] + 0.85) * t,
      z = -0.98 + (landing[1] + 0.98) * t;
    assert.ok(Math.hypot(x - person.x, z - person.z) >= person.r + 0.18, 'entire hop clears the player');
  }
});
test('an unoccupied landing stays put; an occupied aisle never returns an unsafe fallback', () => {
  const game = fixture(3, 2),
    cat = game.place.people.tama;
  assert.deepEqual(catLanding(game, cat), [-0.85, -0.98 * 0.55]);
  game.place.nav.block(-4, 4, -2, 3);
  assert.equal(catLanding(game, cat), null);
});
hook.deregister();
