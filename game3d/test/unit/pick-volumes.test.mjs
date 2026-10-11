// Picking the whole visible person or doorway (#440; Jørgen 2026-10-10: "things that have interaction should be
// clickable, not just the marker, the whole object/person"). Real gameplay/pick-volumes.js on a small fake place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    return next(specifier, context);
  },
});
const THREE = await import('three');
const { installPicking, makePickable, pickablesOf } = await import('../../js/gameplay/pick-volumes.js');

function person(x, z) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 0.3), new THREE.MeshBasicMaterial());
  body.position.y = 0.85;
  root.add(body);
  root.position.set(x, 0, z);
  return root;
}
function world(ids) {
  const space = new THREE.Group(),
    holder = new THREE.Group();
  space.add(holder);
  const roots = {},
    list = [];
  for (const [id, x, z] of ids) {
    roots[id] = person(x, z);
    holder.add(roots[id]);
    list.push({ id, kind: 'person', enabled: () => true });
  }
  const game = { place: { name: 't', space, people: {}, things: {} }, markers: { list } };
  const objsOf = (m) => [roots[m.id], ...pickablesOf(game, m.id)];
  const { modelAt } = installPicking(game, objsOf);
  space.updateMatrixWorld(true);
  const ray = (x, y, z) => new THREE.Raycaster(new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, -1));
  return { game, space, holder, roots, modelAt, ray };
}

test('a background person is picked anywhere on its body once made pickable', () => {
  const w = world([['worker_a', 0, 0]]);
  makePickable(w.roots.worker_a, 'worker_a');
  for (const y of [0.1, 0.85, 1.65]) assert.equal(w.modelAt(w.ray(0.1, y, 5))?.id, 'worker_a', 'height ' + y);
  assert.equal(w.modelAt(w.ray(2, 0.85, 5)), null);
});

test('a hidden person, or one under a hidden parent, never picks', () => {
  const w = world([['a', 0, 0]]);
  makePickable(w.roots.a, 'a');
  assert.equal(w.modelAt(w.ray(0, 0.85, 5))?.id, 'a');
  w.holder.visible = false;
  assert.equal(w.modelAt(w.ray(0, 0.85, 5)), null, 'mesh and volume pass both skip it');
  w.holder.visible = true;
  w.roots.a.visible = false;
  assert.equal(w.modelAt(w.ray(0, 0.85, 5)), null);
});

test('a disabled target never picks', () => {
  const w = world([['a', 0, 0]]);
  w.game.markers.list[0].enabled = () => false;
  assert.equal(w.modelAt(w.ray(0, 0.85, 5)), null);
});

test('overlapping people: the nearest wins', () => {
  const w = world([
    ['far', 0, -1],
    ['near', 0, 1],
  ]);
  assert.equal(w.modelAt(w.ray(0, 0.85, 5))?.id, 'near');
});

test('a registered object is picked only while it hangs in the current place', () => {
  const w = world([['a', 0, 0]]);
  const stray = person(0, 0);
  makePickable(stray, 'a');
  assert.equal(pickablesOf(w.game, 'a').length, 0, 'not in this place');
  w.space.add(stray);
  assert.equal(pickablesOf(w.game, 'a').length, 1);
  const off = makePickable(stray, 'b');
  off();
  assert.equal(pickablesOf(w.game, 'b').length, 0);
});
