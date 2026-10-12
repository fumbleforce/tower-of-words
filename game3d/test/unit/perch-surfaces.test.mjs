import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
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
  window: {},
  location: { search: '' },
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const T = await import('three');
const { perchSolidHit, perchWaterHit, perchRayHit } = await import('../../tools/lib/perch-solid.mjs');
const { coastalSea } = await import('../../js/scenes/outdoor/sea.js');
const { buildSkyline } = await import('../../js/scenes/skyline.js');
const { quaySteps } = await import('../../js/scenes/harbour/quay.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { paver } = await import('../../js/scenes/outdoor/paving.js');
const { mergeStatic } = await import('../../js/scenes/merge-static.js');

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
    return perchRayHit(ray.intersectObject(scene, true), actors);
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

test('the actual sea is water habitat below foam, while paving and far proxies never become sea perches', () => {
  const scene = new T.Group();
  coastalSea(scene, new T.Vector3(0, 1, 0), { size: 4 });
  const sea = scene.children[0];
  sea.userData.noTraversal = true;
  const foam = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = -0.19;
  scene.add(foam);
  const far = new T.Mesh(new T.PlaneGeometry(4, 4), new T.MeshStandardMaterial({ color: '#287e96' }));
  far.rotation.x = -Math.PI / 2;
  far.userData.farView = 'follow';
  scene.add(far);
  scene.updateMatrixWorld(true);
  const ray = new T.Raycaster(new T.Vector3(0, 10, 0), new T.Vector3(0, -1, 0));
  const hit = perchRayHit(ray.intersectObject(scene, true));
  assert.equal(hit.object, sea);
  assert.equal(perchWaterHit(hit), true);
  assert.ok(Math.abs(hit.point.y + 0.195) < 1e-6);
  assert.equal(perchWaterHit({ object: foam }), false);
  assert.equal(perchWaterHit({ object: far }), false);
  const paving = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial({ color: '#287e96' }));
  assert.equal(perchSolidHit({ object: paving }), true);
  assert.equal(perchWaterHit({ object: paving }), false);
});

test('only canonical sea faces pass the far-model exclusion in a mixed skyline ground mesh', () => {
  const scene = new T.Group();
  buildSkyline(scene, 'coast', {
    tier: 1,
    layout: {
      CHUNKS: { coast: { at: [0, 0], walk: [-2, 2, -2, 2] } },
      toLocal: (_chunk, x, z) => [x, z],
      COAST: { rect: [-2, -2, 2, 2] },
    },
  });
  scene.updateMatrixWorld(true);
  const rayAt = (x) => new T.Raycaster(new T.Vector3(x, 10, 0), new T.Vector3(0, -1, 0)).intersectObject(scene, true);
  const sea = perchRayHit(rayAt(5));
  assert.equal(sea.object.name, 'skyline:ground');
  assert.ok(sea.object.userData.farModel);
  assert.equal(perchWaterHit(sea), true);
  assert.ok(Math.abs(sea.point.y + 0.2) < 1e-6);
  const land = rayAt(0)[0];
  assert.equal(land.object, sea.object);
  assert.ok(Math.abs(land.point.y + 0.16) < 1e-6);
  assert.equal(perchWaterHit(land), false);
  assert.equal(perchSolidHit(land), false);
  assert.equal(perchRayHit(rayAt(0)), null);
  coastalSea(scene, new T.Vector3(0, 1, 0), { size: 20 });
  scene.updateMatrixWorld(true);
  assert.equal(perchRayHit(rayAt(0)), null, 'land also covers a separate sea plane');
  assert.equal(perchWaterHit(perchRayHit(rayAt(5))), true);
  land.object.visible = false;
  assert.equal(perchWaterHit(perchRayHit(rayAt(0))), true, 'hidden land cannot occlude the real sea');
  const harbour = new T.Group();
  buildSkyline(harbour, 'coast', { sea: false, tier: 1, layout: {
    CHUNKS: { coast: { at: [0, 0], walk: [-2, 2, -2, 2] } },
    toLocal: (_chunk, x, z) => [x, z], COAST: { rect: [-2, -2, 2, 2] },
  } });
  coastalSea(harbour, new T.Vector3(0, 1, 0), { size: 20, y: -0.9 });
  harbour.updateMatrixWorld(true);
  const harbourRay = (x) => new T.Raycaster(new T.Vector3(x, 10, 0), new T.Vector3(0, -1, 0)).intersectObject(harbour, true);
  assert.equal(perchRayHit(harbourRay(0)), null, 'skyline without its own sea still occludes harbour water');
  assert.equal(perchWaterHit(perchRayHit(harbourRay(5))), true);
});

test('the canonical harbour sea keeps its explicit habitat identity through the static merge', () => {
  const scene = new T.Group(),
    water = new Parts();
  Array.from(quaySteps(paver(), new Parts(), water));
  for (const mesh of water.build(scene)) mesh.userData.noTraversal = true;
  // A second water copy forces the actual static merger to reconstruct the mesh.
  const original = scene.children[0],
    copy = original.clone();
  scene.add(copy);
  mergeStatic(scene);
  assert.ok(!scene.children.includes(original));
  scene.updateMatrixWorld(true);
  const hit = new T.Raycaster(new T.Vector3(-80, 10, -60), new T.Vector3(0, -1, 0))
    .intersectObject(scene, true)
    .find((h) => perchSolidHit(h));
  assert.ok(hit);
  assert.equal(perchWaterHit(hit), true);
  assert.ok(Math.abs(hit.point.y + 0.9) < 1e-6);
});
