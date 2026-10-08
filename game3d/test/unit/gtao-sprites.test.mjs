import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === 'three' ? new URL('../../vendor/three/three.module.js', import.meta.url).href : specifier,
      context,
    );
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { GTAOPass } = await import('../../vendor/postprocessing/GTAOPass.js');
hooks.deregister();

function fixture() {
  const scene = new THREE.Scene();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  const hiddenSprite = sprite.clone();
  hiddenSprite.visible = false;
  const points = new THREE.Points();
  const line = new THREE.Line();
  const mesh = new THREE.Mesh();
  const hiddenMesh = new THREE.Mesh();
  hiddenMesh.visible = false;
  scene.add(sprite, hiddenSprite, points, line, mesh, hiddenMesh);
  const pass = new GTAOPass(scene, new THREE.PerspectiveCamera(), 4, 4);
  return { pass, sprite, hiddenSprite, points, line, mesh, hiddenMesh };
}

test('GTAO excludes steam sprites from normals, while preserving mesh and existing line/point handling', () => {
  const { pass, sprite, hiddenSprite, points, line, mesh, hiddenMesh } = fixture();
  try {
    pass._overrideVisibility();
    assert.equal(sprite.visible, false, 'steam must not become solid geometry in the AO buffer');
    assert.equal(hiddenSprite.visible, false);
    assert.equal(points.visible, false);
    assert.equal(line.visible, false);
    assert.equal(mesh.visible, true, 'opaque geometry still contributes ambient occlusion');
    assert.equal(hiddenMesh.visible, false);
  } finally {
    pass._restoreVisibility();
    pass.dispose();
  }
});

test('GTAO restores visible steam after each frame without revealing initially hidden objects', () => {
  const { pass, sprite, hiddenSprite, points, line, mesh, hiddenMesh } = fixture();
  try {
    for (let frame = 0; frame < 2; frame++) {
      pass._overrideVisibility();
      pass._restoreVisibility();
      assert.equal(sprite.visible, true, 'normal rendering must retain steam');
      assert.equal(hiddenSprite.visible, false);
      assert.equal(points.visible, true);
      assert.equal(line.visible, true);
      assert.equal(mesh.visible, true);
      assert.equal(hiddenMesh.visible, false);
      assert.equal(pass._visibilityCache.length, 0, 'a later frame starts with no stale visibility entries');
    }
  } finally {
    pass.dispose();
  }
});
