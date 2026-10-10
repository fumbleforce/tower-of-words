import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
globalThis.location = { search: '' };
const ctx = new Proxy({}, { get: () => () => {} });
globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
const THREE = await import('../../vendor/three/three.module.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { terraceDetails, terraceVending, promenadeDetails } =
  await import('../../js/scenes/east-coast/terrace-details.js');
const C = await import('../../js/scenes/dorm-court/cluster-plan.js');
const P = await import('../../js/scenes/east-coast/plan.js');
function recorder() {
  const parts = new Parts(),
    boxes = [];
  const geo = parts.geo.bind(parts);
  parts.geo = (color, geometry, options) => {
    geometry.computeBoundingBox();
    boxes.push(geometry.boundingBox.clone());
    return geo(color, geometry, options);
  };
  return { parts, boxes };
}
const inside = (box, [x0, x1, z0, z1], pad = 0) =>
  box.min.x >= x0 - pad && box.max.x <= x1 + pad && box.min.z >= z0 - pad && box.max.z <= z1 + pad;
test('terrace finish stays within existing solid walls or below walking clearance', () => {
  const [x0, x1, z0, z1] = C.TERRACE,
    cx = (x0 + x1) / 2,
    cz = z0 + 1.6;
  const planter = [cx - 1, cx + 1, cz - 0.8, cz + 0.8],
    r = recorder();
  terraceDetails(r.parts, C.TERRACE, planter);
  for (const box of r.boxes) {
    if (box.max.y < 0.03) continue; // flush drainage does not introduce a foot obstruction
    assert.ok(
      inside(box, planter, 0.04) || inside(box, [x0, x1, z1 - 0.3, z1 + 0.1], 0.01),
      'raised finish remains in authored furniture',
    );
  }
  const root = new THREE.Group();
  r.parts.build(root);
  assert.ok(root.children.length <= 4, 'finishes retain material batching');
});
test('promenade planting does not enter a walk or a bench bay', () => {
  const r = recorder();
  promenadeDetails(r.parts, P.COAST_LEGS[1], P.BAYS);
  for (const box of r.boxes) {
    if (box.max.y < 0.03) continue;
    for (const [x, z] of [
      [box.min.x, box.min.z],
      [box.min.x, box.max.z],
      [box.max.x, box.min.z],
      [box.max.x, box.max.z],
    ]) {
      const local = P.pt([x, z]);
      assert.ok(!P.WALKS.some((w) => P.inRect(...local, w)), `plant in walking space: ${x},${z}`);
      assert.ok(!P.BAYS.some((b) => P.inRect(x, z, b)), 'plant in authored bench bay');
    }
  }
});
test('vending display fits the existing cabinet and remains static scenery', () => {
  const root = new THREE.Group(),
    r = recorder();
  terraceVending(root, r.parts, 0, 0);
  r.parts.build(root);
  const face = root.getObjectByName('coast-vending-display');
  assert.ok(face?.material.map);
  face.geometry.computeBoundingBox();
  assert.ok(face.geometry.boundingBox.max.x <= 0.375);
  assert.ok(face.geometry.boundingBox.max.y + face.position.y <= 1.8);
  assert.ok(face.position.z > 0.325 && face.position.z < 0.34);
  assert.equal(face.userData.interactive, undefined);
  assert.ok(root.children.length <= 3, 'one display and batched cabinet pieces');
});

test('real coast builder installs the promenade finishes', async () => {
  const { walkSteps } = await import('../../js/scenes/east-coast/walk.js');
  const actual = recorder(), expected = recorder();
  const steps = walkSteps({ parts: actual.parts, paver: { field() {} } },
    { lit: [], glowParts: [] }, new THREE.Group(), []);
  steps.next(); // paving
  steps.next(); // promenade, benches, lamps and signs
  promenadeDetails(expected.parts, P.COAST_LEGS[1], P.BAYS);
  assert.ok(expected.boxes.length > 30);
  for (const box of expected.boxes) {
    assert.ok(actual.boxes.some(b => b.equals(box)), 'fitted promenade geometry is present in the real build');
  }
});
