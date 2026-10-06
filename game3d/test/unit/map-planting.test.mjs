import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
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
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { planting } = await import('../../js/scenes/office-quarter/grounds.js');
test('shared map planting plan preserves the actual pre-extraction office geometry, colours and normals', () => {
  const p = new Parts(),
    it = planting(p);
  while (!it.next().done) {}
  const hash = createHash('sha256');
  let geometries = 0,
    vertices = 0;
  for (const [key, set] of p.sets) {
    hash.update(key);
    for (const g of set.list) {
      geometries++;
      for (const [name, attribute] of Object.entries(g.attributes)) {
        hash.update(name);
        hash.update(Buffer.from(attribute.array.buffer));
        if (name === 'position') vertices += attribute.count;
      }
      g.dispose();
    }
  }
  assert.equal(geometries, 992);
  assert.equal(vertices, 97080);
  // Real builder capture from b8187146, before moving the belt plan out of grounds.js.
  assert.equal(hash.digest('hex'), '8feb166907732699e0b118c81590d44ce62b2b27233920eecefba833c1249681');
});
