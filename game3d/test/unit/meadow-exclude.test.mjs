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
const { meadowDetail } = await import('../../js/scenes/diorama/meadow.js');

test('meadow leaves a cutaway building floor clear even when lawn geometry continues below it', () => {
  const root = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial());
  lawn.userData.surf = 'grass';
  root.add(lawn);
  root.updateMatrixWorld(true);
  meadowDetail(root, null, { bounds: [-4, 4, -4, 4], exclude: [[-2, 2, -2, 2]], budget: 200 });
  const meadow = root.getObjectByName('diorama-meadow');
  assert.ok(meadow.count > 0, 'retain outdoor grass');
  const matrix = new THREE.Matrix4(),
    position = new THREE.Vector3();
  for (let i = 0; i < meadow.count; i++) {
    meadow.getMatrixAt(i, matrix);
    position.setFromMatrixPosition(matrix);
    assert.ok(Math.abs(position.x) > 2 || Math.abs(position.z) > 2, 'no grass roots under the floor');
  }
});
