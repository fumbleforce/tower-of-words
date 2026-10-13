import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
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
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { setStationModel, stationModel, approachGeometry } = await import('../../js/scenes/station-model.js');

test('station model prepares finite outward normals before any place uses its shadow receivers', () => {
  const geometry = new THREE.BoxGeometry(4, 2, 3);
  geometry.deleteAttribute('normal');
  setStationModel({ st_walls: geometry });
  const { position, normal } = stationModel().st_walls.attributes;
  assert.equal(normal.count, position.count);
  for (let i = 0; i < normal.count; i++) {
    const n = new THREE.Vector3().fromBufferAttribute(normal, i);
    const p = new THREE.Vector3().fromBufferAttribute(position, i);
    assert.ok(Number.isFinite(n.length()));
    assert.ok(Math.abs(n.length() - 1) < 1e-6);
    assert.ok(n.dot(p) > 0, 'normals must face out from every box face');
  }
  const authored = normal;
  setStationModel({ st_walls: geometry });
  assert.equal(geometry.attributes.normal, authored, 'preserve supplied normals');
  setStationModel(null);
});

test('coastal approach preserves the running top while fitting a clear beam and continuous grounded supports', async () => {
  const fs = await import('node:fs');
  const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
  const bytes = fs.readFileSync(new URL('../../assets/station/station.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const nodes = {};
  gltf.scene.traverse((object) => {
    if (object.isMesh) nodes[object.name] = object.geometry;
  });
  setStationModel(nodes);
  const beamH = 0.72,
    top = 2.34;
  const [beam, supports] = approachGeometry(
    [
      [0, 0],
      [0, 3],
    ],
    top,
    [0],
    beamH,
  );
  beam.computeBoundingBox();
  supports.computeBoundingBox();
  assert.ok(Math.abs(beam.boundingBox.max.y - top) < 1e-6, 'train running height stays fixed');
  assert.ok(Math.abs(beam.boundingBox.min.y - (top - beamH)) < 1e-6, 'beam underside clears the native player capsule');
  assert.ok(beam.boundingBox.min.y > 1.2 * 1.18 + 0.16, 'walking capsule and headroom fit under the approach');
  assert.ok(Math.abs(supports.boundingBox.min.y) < 1e-6, 'column remains grounded');
  assert.ok(Math.abs(supports.boundingBox.max.y - (top - beamH + 0.03)) < 1e-6, 'bearing pad meets the beam underside');
  assert.ok(supports.boundingBox.max.y > beam.boundingBox.min.y, 'no support gap');
  beam.dispose();
  supports.dispose();
  setStationModel(null);
});

test('the actual approach profile closes the outside of a bend without changing its running surface', async () => {
  const fs = await import('node:fs');
  const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
  const bytes = fs.readFileSync(new URL('../../assets/station/station.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const nodes = {};
  gltf.scene.traverse((object) => {
    if (object.isMesh) nodes[object.name] = object.geometry;
  });
  setStationModel(nodes);
  const [beam, supports] = approachGeometry(
    [
      [0, 0],
      [0, 3],
      [3, 3],
    ],
    2.34,
    [1],
    0.72,
  );
  const mesh = new THREE.Mesh(beam, new THREE.MeshBasicMaterial()),
    down = new THREE.Vector3(0, -1, 0);
  for (const [x, z] of [
    [-0.25, 3.25],
    [-0.1, 3.1],
    [0, 3],
    [0.25, 2.75],
  ]) {
    const hit = new THREE.Raycaster(new THREE.Vector3(x, 4, z), down, 0, 4).intersectObject(mesh)[0];
    assert.ok(hit, `continuous running surface at the curved outer joint ${x},${z}`);
    assert.ok(Math.abs(hit.point.y - 2.34) < 1e-6, 'the whole joint retains the train running top');
  }
  beam.computeBoundingBox();
  assert.ok(Math.abs(beam.boundingBox.min.y - 1.62) < 1e-6, 'joint keeps pedestrian headroom');
  beam.dispose();
  supports.dispose();
  mesh.material.dispose();
  setStationModel(null);
});
