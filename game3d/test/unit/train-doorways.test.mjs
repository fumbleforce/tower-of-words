// Nothing of the train car's body may cross a doorway (Jørgen, 2026-09-29: "the doors have a metal bar crossing
// them so it looks like they are welded shut ... STOP having the frame from the cart overlap the doors").
// Builds the car in every framing the game uses (land: desktop play camera, port: phone play camera, closed: the
// car seen from outside and the neighbour cars) plus the train place's door sets, and checks every body triangle
// against each doorway's clear opening, through the wall and a hand's width either side of it.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

const vendor = new URL('../../vendor/', import.meta.url).href;
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(s, c, next) {
  if (s === 'three') return { url: '${vendor}three/three.module.js', shortCircuit: true };
  if (s.startsWith('three/addons/')) return { url: '${vendor}' + s.slice(13), shortCircuit: true };
  return next(s, c);
}`),
);
// the end-wall posters draw on a canvas; geometry is all this test needs
const noop = () => ({ addColorStop() {} });
globalThis.document ??= {
  createElement: () => ({
    getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop) }),
  }),
};

const THREE = await import('../../vendor/three/three.module.js');
const { buildCar, DOORWAYS, LZ, T } = await import('../../js/train/car.js');

// every triangle of `root` (except door leaves and invisible shadow casters) that enters a doorway's clear opening
function crossings(root) {
  root.updateMatrixWorld(true);
  const E = 0.004;
  const boxes = DOORWAYS.map(
    (d) =>
      new THREE.Box3(
        new THREE.Vector3(d.x0 + E, d.y0 + E, LZ - 0.06),
        new THREE.Vector3(d.x1 - E, d.y1 - E, LZ + T + 0.06),
      ),
  );
  const hits = new Map();
  const tri = new THREE.Triangle();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.doorLeaf || o.material.colorWrite === false) return;
    let leaf = false;
    for (let p = o; p; p = p.parent) leaf ||= !!p.userData.doorLeaf;
    if (leaf) return;
    const pos = o.geometry.attributes.position,
      idx = o.geometry.index;
    const n = idx ? idx.count : pos.count;
    const v = (i) => new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
    for (let i = 0; i < n; i += 3) {
      tri.set(v(i), v(i + 1), v(i + 2));
      boxes.forEach((b, k) => {
        if (!b.intersectsTriangle(tri)) return;
        const key = `${o.material.name || '#' + o.material.color?.getHexString()} (door at x ${DOORWAYS[k].x})`;
        const bb = new THREE.Box3().setFromObject(o);
        hits.set(
          key,
          `y ${bb.min.y.toFixed(3)}..${bb.max.y.toFixed(3)} z ${bb.min.z.toFixed(3)}..${bb.max.z.toFixed(3)}`,
        );
      });
    }
  });
  return [...hits].map(([k, b]) => `${k}: ${b}`);
}

for (const mode of ['land', 'port', 'closed'])
  test(`train car (${mode}): no part of the body crosses a doorway`, () => {
    const car = buildCar(mode);
    if (car.setClosed) car.setClosed(1); // the closed overlay faded in, as on departure
    assert.deepEqual(crossings(car.root), []);
  });

test('train door sets: frame posts, lamps and thresholds stay out of the doorways, the leaves fill them', async () => {
  const { buildDoorSets } = await import('../../js/train/doors.js');
  const doors = buildDoorSets();
  assert.deepEqual(crossings(doors.group), []);
  assert.equal(doors.leaves.length, 2 * DOORWAYS.length);
  for (const d of DOORWAYS) {
    const leaves = doors.leaves.filter((l) => Math.abs(l.x0 - d.x) < DOORWAYS[0].x1 - DOORWAYS[0].x0);
    const bb = new THREE.Box3();
    for (const l of leaves) bb.expandByObject(l.g);
    assert.ok(bb.min.x <= d.x0 + 0.01 && bb.max.x >= d.x1 - 0.01, `leaves span door at x ${d.x}`);
    assert.ok(bb.min.y <= d.y0 + 0.01 && bb.max.y >= d.y1 - 0.01, `leaves fill door at x ${d.x} top to bottom`);
  }
});
