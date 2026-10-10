import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
  if (specifier.startsWith('three/addons/')) return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
  return next(specifier, context);
} });
const THREE = await import('../../vendor/three/three.module.js');
const { updateInstanceBounds } = await import('../../js/perf/instance-bounds.js');
const { BirdMeshes } = await import('../../js/creatures/meshes.js');
process.on('exit', () => hooks.deregister());

function containsVertices(mesh) {
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    if (matrix.determinant() === 0) continue;
    for (let j = 0; j < mesh.geometry.attributes.position.count; j++) {
      point.fromBufferAttribute(mesh.geometry.attributes.position, j).applyMatrix4(matrix);
      assert.ok(point.distanceTo(mesh.boundingSphere.center) <= mesh.boundingSphere.radius + 1e-5);
    }
  }
}

test('moving instance bounds exclude empty slots and follow departure, return, rotation and scale', () => {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1, 3), new THREE.MeshBasicMaterial(), 3);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < 3; i++) mesh.setMatrixAt(i, zero);
  assert.equal(updateInstanceBounds(mesh), false);
  for (const x of [100, -100, 0, 40]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, 10, 20),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0.8, 0.4)), new THREE.Vector3(2, 0.4, 1));
    mesh.setMatrixAt(1, matrix);
    assert.equal(updateInstanceBounds(mesh), true);
    containsVertices(mesh);
    assert.ok(mesh.boundingSphere.center.distanceTo(new THREE.Vector3(x, 10, 20)) < 1e-5);
    assert.ok(mesh.boundingSphere.radius < 5);
  }
  mesh.setMatrixAt(1, zero);
  assert.equal(updateInstanceBounds(mesh), false);
});

test('posed birds retain every wing vertex at camera edges across repeated flap and fold cycles', () => {
  const flock = new BirdMeshes('pigeon', 3, 1);
  flock.group.position.set(3, 2, -4);
  flock.group.rotation.y = 0.7;
  flock.group.scale.setScalar(0.4);
  for (let step = 0; step < 100; step++) {
    const phase = step * Math.PI / 8;
    flock.pose(1, { p: new THREE.Vector3(50 + step, 2, 30), yaw: phase, pitch: 0.4, roll: 0.2,
      flap: Math.sin(phase), fold: (1 + Math.cos(phase / 2)) / 2, size: 1.3 });
    flock.commit(true);
    flock.group.updateMatrixWorld(true);
    flock.batch.mesh.skeleton.update();
    const mesh = flock.batch.mesh, matrix = new THREE.Matrix4();
    const expected = new THREE.Vector3(), actual = new THREE.Vector3();
    let offset = 0;
    for (const part of [flock.body, flock.left, flock.right]) {
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
      for (let i = 0; i < part.count; i++) {
        part.getMatrixAt(i, matrix);
        for (let vertex = 0; vertex < geometry.attributes.position.count; vertex++) {
          expected.fromBufferAttribute(geometry.attributes.position, vertex).applyMatrix4(matrix);
          mesh.getVertexPosition(offset++, actual);
          assert.ok(expected.distanceTo(actual) < 1e-5, 'batch preserves the original rigid vertex transform');
        }
      }
    }
    for (const mesh of [flock.body, flock.left, flock.right]) {
      assert.equal(mesh.frustumCulled, true);
      containsVertices(mesh);
      assert.ok(mesh.boundingSphere.center.x > 45);
    }
  }
  flock.hide(1);
  flock.commit(false);
  assert.equal(flock.group.visible, false);
});
