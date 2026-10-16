// What a thing with no object of its own is outlined by (gameplay/highlight.js meshesNear, issue #579). A stool next to
// a table, two floor tiles and a merged batch used to take the table top, the table's centre leg and the tiles too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const loader = registerHooks({
  resolve(specifier, context, next) {
    return specifier === 'three'
      ? next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context)
      : next(specifier, context);
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { meshesNear, outlineMeshes, peopleRoots } = await import('../../js/gameplay/highlight.js');
loader.deregister();

// a box of size (w, h, d) with its centre at (x, y, z), in a group of its own
function box(scene, name, [w, h, d], [x, y, z], props = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
  m.name = name;
  m.position.set(x, y, z);
  Object.assign(m, props);
  scene.add(m);
  return m;
}
const names = (list) => list.map((m) => m.name).sort();

// the huddle corner of the office: a pedestal table with two stools, floor tiles under and beside them
function corner() {
  const scene = new THREE.Group();
  box(scene, 'floor', [10, 0.1, 10], [0, -0.05, 0]);
  box(scene, 'tile a', [0.49, 0.012, 0.49], [0.35, 0.006, -5]);
  box(scene, 'tile b', [0.49, 0.012, 0.49], [0.85, 0.006, -4.5]);
  box(scene, 'table top', [0.9, 0.04, 0.6], [1.1, 0.42, -5.3]);
  box(scene, 'table leg', [0.08, 0.4, 0.08], [1.1, 0.2, -5.3]);
  box(scene, 'stool seat', [0.26, 0.04, 0.26], [0.8, 0.28, -4.85]);
  box(scene, 'stool leg', [0.03, 0.26, 0.03], [0.8, 0.13, -4.85]);
  box(scene, 'other seat', [0.26, 0.04, 0.26], [1.4, 0.28, -4.85]);
  box(scene, 'other leg', [0.03, 0.26, 0.03], [1.4, 0.13, -4.85]);
  return scene;
}
const STOOL = new THREE.Vector3(0.8, 0.54, -4.85);

test('a stool takes its own seat and legs, not the table top, its centre leg or the floor tiles beside it', () => {
  const scene = corner();
  assert.deepEqual(names(meshesNear(scene, STOOL, new Set())), ['stool leg', 'stool seat']);
});

test('a merged batch is never the thing: its parts are found where they are', () => {
  const scene = corner();
  // one batch holding the stool's own parts and the table's, drawn in place of them (the parts stay in the scene)
  box(scene, 'perf-batch', [1.2, 0.5, 1.0], [0.9, 0.3, -4.9], { userData: { perfBatch: true } });
  assert.deepEqual(names(meshesNear(scene, STOOL, new Set())), ['stool leg', 'stool seat']);
});

test('a flat top the anchor stands on is the thing: a desk and its parts, not the chair beside it', () => {
  const scene = new THREE.Group();
  box(scene, 'desk top', [1.12, 0.04, 0.7], [0, 0.72, 0]);
  box(scene, 'monitor', [0.4, 0.3, 0.05], [0, 0.89, -0.2]);
  box(scene, 'chair hub', [0.08, 0.05, 0.08], [0, 0.06, 0.6]);
  box(scene, 'chair seat', [0.4, 0.04, 0.4], [0, 0.46, 0.6]);
  const desk = new THREE.Vector3(0, 0.9, 0);
  assert.deepEqual(names(meshesNear(scene, desk, new Set())), ['desk top', 'monitor']);
});

test('two desk tops that touch are two things: each desk takes its own top', () => {
  const scene = new THREE.Group();
  box(scene, 'desk a top', [1.12, 0.04, 0.7], [0, 0.72, 0]);
  box(scene, 'desk b top', [1.12, 0.04, 0.7], [0, 0.72, 0.72]);
  box(scene, 'desk a leg', [0.05, 0.7, 0.05], [0.4, 0.35, -0.25]);
  assert.deepEqual(names(meshesNear(scene, new THREE.Vector3(0, 0.9, 0), new Set())), ['desk a leg', 'desk a top']);
});

test('a flat piece on the floor is the thing when the anchor is down there on it (a photo lying on the floor)', () => {
  const scene = new THREE.Group();
  box(scene, 'floor', [10, 0.1, 10], [0, -0.05, 0]);
  box(scene, 'photo', [0.3, 0.002, 0.4], [0, 0.001, 0]);
  box(scene, 'tile', [0.49, 0.012, 0.49], [0.05, 0.006, 0.05]);
  // the tile's centre is further from the anchor than the photo's, so the tile stays the floor
  assert.deepEqual(names(meshesNear(scene, new THREE.Vector3(0, 0.01, 0), new Set())), ['photo']);
  // a thing hung higher (a stool) over a tile does not take the tile
  assert.deepEqual(names(meshesNear(scene, new THREE.Vector3(0, 0.54, 0), new Set())), []);
});

test('a thing with nothing close takes its nearest part', () => {
  const scene = new THREE.Group();
  box(scene, 'lamp', [0.1, 0.2, 0.1], [0.4, 1.5, 0]);
  assert.deepEqual(names(meshesNear(scene, new THREE.Vector3(0, 1.5, 0), new Set())), ['lamp']);
});

test('the outline of a thing with an object of its own is its visible model meshes', () => {
  const root = new THREE.Group();
  const a = box(root, 'a', [0.2, 0.2, 0.2], [0, 0, 0]);
  const b = box(root, 'b', [0.2, 0.2, 0.2], [0.5, 0, 0]);
  b.visible = false;
  assert.deepEqual(
    outlineMeshes([root]).map((m) => m.name),
    [a.name],
  );
});

test('a passer-by in reach of a thing is not its part: the people, workers and commuters are skipped', () => {
  const scene = new THREE.Group();
  box(scene, 'reader', [0.12, 0.2, 0.06], [0, 1.0, 0]);
  // a commuter's arm, touching the reader, in the commuter's own group
  const commuter = new THREE.Group();
  scene.add(commuter);
  box(commuter, 'commuter arm', [0.2, 0.5, 0.2], [0.14, 1.0, 0]);
  const anchor = new THREE.Vector3(0, 1.0, 0);
  assert.deepEqual(names(meshesNear(scene, anchor, new Set())), ['commuter arm', 'reader']);
  const P = { people: {}, extras: { commuter_1: { root: commuter } }, crowd: [{ root: new THREE.Group() }] };
  assert.deepEqual(names(meshesNear(scene, anchor, peopleRoots(P))), ['reader']);
  assert.equal(peopleRoots({}).size, 0);
});
