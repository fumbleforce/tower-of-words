import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hook = registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
const context = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 20 }) : () => context) });
class Canvas {
  getContext() {
    return context;
  }
  toDataURL() {
    return 'data:image/png;base64,';
  }
}
Object.assign(globalThis, {
  HTMLCanvasElement: Canvas,
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null },
  document: {
    body: { classList: { contains: () => false } },
    documentElement: { style: { setProperty() {} } },
    createElement: () => new Canvas(),
  },
});
const THREE = await import('three');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { loadingShell, cargo, hutPane } = await import('../../js/scenes/harbour/loading-details.js');
const { apronDrain, bittFoot } = await import('../../js/scenes/harbour/quay-details.js');
const { yardView, yardSteps } = await import('../../js/scenes/harbour/yard.js');
const P = await import('../../js/scenes/harbour/plan.js');
const geometries = (p) => [...p.sets.values()].flatMap((s) => s.list);
const dispose = (p) => geometries(p).forEach((g) => g.dispose());

test('all loading timber and straps remain within the original cargo blockers', () => {
  let triangles = 0;
  P.CRATES.forEach((c, i) => {
    const p = new Parts();
    cargo(p, c, i);
    for (const g of geometries(p)) {
      const v = g.attributes.position;
      triangles += v.count / 3;
      for (let j = 0; j < v.count; j++) {
        assert.ok(Math.abs(v.getX(j) - c[0]) <= 0.65 + 1e-5);
        assert.ok(Math.abs(v.getZ(j) - c[1]) <= 0.65 + 1e-5);
        assert.ok(v.getY(j) >= -1e-6);
        const oldTop = c[2] === 'pallet' ? 0.16 + (1 + (i % 3)) * 0.36 : 0.9;
        assert.ok(v.getY(j) <= oldTop + 1e-5, 'original load height');
      }
    }
    dispose(p);
  });
  assert.ok(triangles < 5000, `${triangles} cargo triangles`);
});

test('pallet decks cross their runners and every cargo tier has physical support', () => {
  const parts = new Parts();
  cargo(parts, [0, 0, 'pallet'], 2);
  const boxes = geometries(parts).map((g) => {
    g.computeBoundingBox();
    return g.boundingBox;
  });
  const atHeight = (b, y) => Math.abs(b.min.y - y) < 1e-6;
  const overlap = (a, b) =>
    Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > 0.01 &&
    Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) > 0.01;
  for (const plank of boxes.filter((b) => atHeight(b, 0.09))) {
    const feet = boxes.filter((b) => atHeight(b, 0) && Math.abs(b.max.y - plank.min.y) < 1e-6 && overlap(plank, b));
    assert.equal(feet.length, 3, 'each deck board bears on all three runners');
  }
  for (const box of boxes.filter((b) => Math.abs(b.max.y - b.min.y - 0.35) < 1e-6))
    assert.ok(
      boxes.some((b) => Math.abs(b.max.y - box.min.y) < 1e-6 && overlap(box, b)),
      'each carton sits on the deck or previous tier',
    );
  dispose(parts);
});

test('warehouse rollers occupy real reveals with a bounded loading recess behind', () => {
  const p = new Parts(),
    [x0, x1, , z1] = P.SHED,
    cx = (x0 + x1) / 2;
  loadingShell(p, P.SHED, [x0 + 2.6, cx, x1 - 2.6], '#ccc');
  const meshes = geometries(p).map((g) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
  const ray = (x, y, far) =>
    new THREE.Raycaster(new THREE.Vector3(x, y, z1 + 0.05), new THREE.Vector3(0, 0, -1), 0, far).intersectObjects(
      meshes,
    );
  assert.equal(ray(cx, 1, 0.5).length, 0, 'half-raised opening has depth');
  assert.ok(ray(cx, 1, 0.9).length > 0, 'recess closes inside existing footprint');
  assert.ok(ray(cx + 1.7, 1, 0.5).length > 0, 'wall still supports the shutter sides');
  assert.ok(ray(cx, 3.7, 0.5).length > 0, 'wall supports shutter head');
  dispose(p);
});

test('shared Works cargo is identical to the same harbour loads', () => {
  const direct = new Parts(),
    shared = new Parts(),
    ignore = { geo() {}, box() {} },
    lights = { glowParts: [], lit: [] };
  P.CRATES.forEach((c, i) => c[0] > -80 && cargo(direct, c, i));
  yardView(ignore, shared, lights, -80);
  const snapshot = (p) => geometries(p).map((g) => Array.from(g.attributes.position.array));
  assert.deepEqual(snapshot(shared), snapshot(direct));
  dispose(shared);
  dispose(direct);
});

test('apron drainage is a flush crossing and mooring feet remain on the coping', () => {
  const p = new Parts();
  apronDrain(p, P.SHED);
  for (const g of geometries(p)) {
    const v = g.attributes.position;
    for (let i = 0; i < v.count; i++) assert.ok(v.getY(i) >= 0 && v.getY(i) < 0.035, 'no new walking blocker');
  }
  dispose(p);
  const foot = new Parts();
  bittFoot(foot, 0, 0);
  for (const g of geometries(foot)) {
    const v = g.attributes.position;
    for (let i = 0; i < v.count; i++)
      assert.ok(Math.abs(v.getX(i)) <= 0.22 && Math.abs(v.getZ(i)) <= 0.22, 'inside original cap width');
  }
  dispose(foot);
});

test('hut glazing lights after work and starts unlit on a fresh scene build', () => {
  const p = new Parts(),
    evening = hutPane(p, 0, 0),
    group = new THREE.Group();
  p.build(group);
  const glass = group.children.find((m) => m.material.userData.noLook).material;
  assert.equal(glass.emissiveIntensity, 0);
  evening();
  assert.equal(glass.emissiveIntensity, 0.45);
  const fresh = new Parts();
  hutPane(fresh, 0, 0);
  assert.equal(glass.emissiveIntensity, 0);
  dispose(fresh);
  const parts = new Parts(),
    small = new Parts(),
    lights = { glowParts: [], lit: [] },
    signs = { board() {} };
  const gen = yardSteps(parts, small, lights, signs);
  let result = gen.next();
  while (!result.done) result = gen.next();
  assert.equal(typeof result.value.evening, 'function');
  result.value.evening();
  dispose(parts);
  dispose(small);
});
process.on('exit', () => hook.deregister());
