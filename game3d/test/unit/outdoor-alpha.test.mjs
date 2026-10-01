import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

test('outdoor parts preserve indexed vertex opacity and separate RGB and RGBA batches', async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three')
        return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
      if (specifier.startsWith('three/addons/'))
        return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
      return next(specifier, context);
    },
  });
  const saved = {
    location: globalThis.location,
    window: globalThis.window,
    document: globalThis.document,
  };
  Object.assign(globalThis, {
    location: { search: '' },
    window: {},
    document: { body: { classList: { contains: () => false } } },
  });
  try {
    const THREE = await import('../../vendor/three/three.module.js');
    const { Parts } = await import('../../js/scenes/outdoor/parts.js');
    const root = new THREE.Group(),
      parts = new Parts();
    const geometry = new THREE.PlaneGeometry(1, 1),
      alpha = [0, 0.25, 0.5, 1];
    const expanded = Array.from(geometry.index.array, (i) => alpha[i]);
    parts.geo('#ffffff', geometry, { alpha });
    parts.geo('#ffffff', new THREE.PlaneGeometry(1, 1));
    const meshes = parts.build(root);
    assert.equal(meshes.length, 2);
    const rgba = meshes.find((m) => m.geometry.attributes.color.itemSize === 4);
    assert.ok(rgba);
    assert.deepEqual(
      Array.from({ length: expanded.length }, (_, i) => rgba.geometry.attributes.color.getW(i)),
      expanded,
    );
    assert.ok(meshes.some((m) => m.geometry.attributes.color.itemSize === 3));
    assert.throws(() => parts.geo('#ffffff', new THREE.PlaneGeometry(1, 1), { alpha: [1] }), /one value per vertex/);
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  } finally {
    hooks.deregister();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
