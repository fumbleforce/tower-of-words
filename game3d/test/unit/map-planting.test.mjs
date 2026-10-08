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
test('office planting preserves geometry, colours and normals outside the shared quarter belt', async () => {
  const p = new Parts(),
    it = planting(p);
  while (!it.next().done) {}
  const { belt } = await import('../../js/scenes/dorm-court/cluster-yards.js');
  const { TREES } = await import('../../js/scenes/outdoor/planting.js');
  const { tree } = await import('../../js/scenes/plaza/east-lane.js');
  // Original pre-extraction fixture, with only seed119's migrated quarter belt excluded.
  const reference = new Parts();
  for (const [r, names, seed] of [
    [[-26.9, -24.6, -67, -57.7], ['keyaki', 'sakura'], 101],
    [[-15.8, -10.8, -71, -57.7], ['sakura', 'maple', 'keyaki'], 103],
    [[1, 5.3, -70, -61.1], ['ginkgo', 'keyaki'], 105],
    [[-40, -28.5, -74, -63], ['pine', 'keyaki', 'maple'], 107],
    [[-9.5, 14.2, -77, -65], ['keyaki', 'sakura', 'pine'], 109],
    [[-23.5, -16.8, -80, -71.5], ['maple', 'sakura'], 111],
    [[-39.5, -22, -48.9, -45.9], ['keyaki', 'sakura', 'maple'], 113],
    [[-16.5, -8.4, -48.9, -42.5], ['ginkgo', 'keyaki'], 115],
    [[7.5, 30.5, -48.9, -45.9], ['sakura', 'keyaki', 'maple'], 117],
  ])
    for (const _ of belt(
      reference,
      r,
      names.map((n) => TREES[n]),
      { seed, pitch: 3.3 },
    ))
      void _;
  tree(reference, TREES.sakura, -22.4, -61.2, 0.95, 121);
  tree(reference, TREES.maple, -17.2, -60.4, 0.9, 122);
  function receipt(parts) {
    const hash = createHash('sha256');
    let geometries = 0,
      vertices = 0;
    for (const [key, set] of parts.sets) {
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
    return { geometries, vertices, hash: hash.digest('hex') };
  }
  const actual = receipt(p),
    expected = receipt(reference);
  assert.equal(actual.geometries, 951);
  assert.equal(actual.vertices, 92844);
  assert.equal(actual.hash, '7bb23010788277c1a262f6ba465d17d02f0e8b799226432c8c7a4202bb6751bd');
  assert.deepEqual(actual, expected);
});
