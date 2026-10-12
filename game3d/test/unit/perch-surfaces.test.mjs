import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    return next(s === 'three' ? new URL('../../vendor/three/three.module.js', import.meta.url).href : s, c);
  },
});
const T = await import('three');
const { perchSolidHit } = await import('../../tools/lib/perch-solid.mjs');

test('bird survey rays land on opaque noLook paving and roofs below actors and scenery', () => {
  const scene = new T.Group();
  const add = (y, material = new T.MeshStandardMaterial()) => {
    const mesh = new T.Mesh(new T.BoxGeometry(2, 0.1, 2), material);
    mesh.position.y = y - 0.05;
    scene.add(mesh);
    return mesh;
  };
  const paving = add(0),
    roof = add(2),
    water = add(3),
    actor = add(4),
    far = add(5);
  paving.material.userData.noLook = roof.material.userData.noLook = true;
  water.userData.noTraversal = true;
  far.userData.farView = 'follow';
  const actors = new Set([actor]);
  const ray = new T.Raycaster(new T.Vector3(0, 10, 0), new T.Vector3(0, -1, 0));
  const top = () => {
    scene.updateMatrixWorld(true);
    return ray.intersectObject(scene, true).find((hit) => perchSolidHit(hit, actors));
  };
  assert.equal(top().object, roof);
  assert.ok(Math.abs(top().point.y - 2) < 1e-6);
  scene.remove(roof);
  assert.equal(top().object, paving);
  assert.ok(Math.abs(top().point.y) < 1e-6);
});

test('survey excludes whole creature groups, hidden meshes, transparent effects and non-solid materials', () => {
  const material = new T.MeshStandardMaterial();
  const mesh = new T.Mesh(new T.BoxGeometry(), material),
    group = new T.Group();
  group.add(mesh);
  const hit = { object: mesh };
  group.userData.creature = true;
  assert.equal(perchSolidHit(hit), false);
  delete group.userData.creature;
  mesh.visible = false;
  assert.equal(perchSolidHit(hit), false);
  mesh.visible = true;
  material.transparent = true;
  material.opacity = 0.3;
  assert.equal(perchSolidHit(hit), false);
  material.transparent = false;
  material.userData.noTraversal = true;
  assert.equal(perchSolidHit(hit), false);
});
