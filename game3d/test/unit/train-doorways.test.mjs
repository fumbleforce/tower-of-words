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

// the same with the Blender-built outside (train/models.js, game3d/assets/train/monorail.glb) when the asset is here
const glb = new URL('../../assets/train/monorail.glb', import.meta.url);
const fs = await import('node:fs');
if (fs.existsSync(glb)) {
  const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
  const { partsFrom, setMonorail } = await import('../../js/train/models.js');
  const buf = fs.readFileSync(glb);
  const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
  const parts = partsFrom(gltf.scene);
  test('monorail.glb has every part the car and the world use', () => assert.ok(parts));
  for (const mode of ['land', 'port', 'closed'])
    test(`train car with the Blender outside (${mode}): no part of the body crosses a doorway`, () => {
      setMonorail(parts);
      try {
        const car = buildCar(mode);
        if (car.setClosed) car.setClosed(1);
        assert.ok(car.root.getObjectByName('car_under'), 'the skirt is on');
        if (mode === 'closed') assert.ok(car.root.getObjectByName('car_skin'), 'the skin is on');
        assert.deepEqual(crossings(car.root), []);
      } finally {
        setMonorail(null);
      }
    });
}

test('train door sets: pockets, header, lamps and thresholds stay out of the doorways, the leaves fill them', async () => {
  const { buildDoorSets } = await import('../../js/train/doors.js');
  const doors = buildDoorSets();
  assert.deepEqual(crossings(doors.group), []);
  assert.equal(doors.leaves.length, 2 * DOORWAYS.length);
  for (const d of DOORWAYS) {
    const leaves = doors.leaves.filter((l) => l.d === d);
    const bb = new THREE.Box3();
    for (const l of leaves) bb.expandByObject(l.g);
    assert.ok(bb.min.x <= d.x0 + 0.01 && bb.max.x >= d.x1 - 0.01, `leaves span door at x ${d.x}`);
    assert.ok(bb.min.y <= d.y0 + 0.01 && bb.max.y >= d.y1 - 0.01, `leaves fill door at x ${d.x} top to bottom`);
  }
});

// Jørgen, 2026-10-09: the doors "slide into the windows and outside the cart when opening ... they should have the
// space to slide". At every point of the open/close cycle each leaf stays inside the wall's thickness, on the straight
// wall short of the rounded corners, inside its own opening and pockets, and clear of every near-side window.
test('train door leaves slide inside the wall into their pockets, never across a window or out of the car', async () => {
  const { buildDoorSets, slideLeaves, pocketEnd } = await import('../../js/train/doors.js');
  const { WIN, LX, RI } = await import('../../js/train/car.js');
  const doors = buildDoorSets();
  const box = (g) => (doors.group.updateMatrixWorld(true), new THREE.Box3().setFromObject(g));
  for (let i = 0; i <= 40; i++) {
    const k = i / 40;
    slideLeaves(doors.leaves, k);
    for (const { g, d, s } of doors.leaves) {
      const bb = box(g),
        at = `door at x ${d.x}, leaf ${s}, k ${k}`;
      assert.ok(bb.min.z >= LZ - 0.013 && bb.max.z <= LZ + T, `${at}: inside the wall`);
      assert.ok(bb.min.x >= -(LX - RI) && bb.max.x <= LX - RI, `${at}: on the straight wall`);
      assert.ok(bb.min.x >= pocketEnd(d, -1) - 1e-6 && bb.max.x <= pocketEnd(d, 1) + 1e-6, `${at}: in its pockets`);
      for (const [x, w] of WIN.near)
        assert.ok(bb.max.x < x - w / 2 - 0.05 || bb.min.x > x + w / 2 + 0.05, `${at}: clear of the window at x ${x}`);
    }
  }
  slideLeaves(doors.leaves, 1);
  for (const { g, d } of doors.leaves) {
    const bb = box(g);
    assert.ok(bb.max.x <= d.x0 + 0.02 || bb.min.x >= d.x1 - 0.02, `open, the leaves leave the door at x ${d.x} clear`);
  }
});
