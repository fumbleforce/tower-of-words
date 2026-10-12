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
const { setStationModel, stationModel } = await import('../../js/scenes/station-model.js');

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
