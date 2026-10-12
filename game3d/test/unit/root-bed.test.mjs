import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/')) return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { rootBed } = await import('../../js/scenes/diorama/root-bed.js');
process.on('exit', () => hooks.deregister());

test('a tree root surround and ground cover stay inside a narrow raised bed', () => {
  const parts = new Parts();
  parts.box('#514736', 3, 0.04, 0.7, 0, 0.29, 0, { surf: 'soil' });
  assert.ok(Math.abs(rootBed(parts, 0, 0, 1.03, 3, { codeTrunk: false }) - 0.33) < 1e-6);
  for (const set of parts.sets.values()) {
    if (!['mulch', 'stone', 'mulch-cover'].includes(set.surf)) continue;
    for (const geometry of set.list) {
      geometry.computeBoundingBox();
      assert.ok(geometry.boundingBox.min.z > -0.35, `${set.surf} crosses the north edge`);
      assert.ok(geometry.boundingBox.max.z < 0.35, `${set.surf} crosses the south edge`);
    }
  }
});
