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
  document: { body: { classList: { contains: () => false } } },
});
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { TREES, hedge } = await import('../../js/scenes/outdoor/planting.js');
const { streetPlanting } = await import('../../js/scenes/diorama/planting.js');
const { clippedHedge } = await import('../../js/scenes/diorama/planting-shapes.js');
const digest = (p) => {
  const hash = createHash('sha256');
  for (const [key, set] of p.sets) {
    hash.update(key);
    for (const g of set.list)
      for (const [name, a] of Object.entries(g.attributes)) {
        hash.update(name);
        hash.update(Buffer.from(a.array.buffer));
      }
  }
  return hash.digest('hex');
};
test('default and declined strategies leave every species and hedge geometry identical', () => {
  const ordinary = new Parts(),
    declined = new Parts({ planting: { tree: () => false, hedge: () => false } });
  for (const p of [ordinary, declined]) {
    for (const build of Object.values(TREES)) build(p, 16, 5, 0.9, 7);
    hedge(p, [8, 3], [12, 3], { w: 0.5, h: 0.55, y: 0.1 });
  }
  assert.equal(digest(ordinary), digest(declined));
});
test('trial descriptors replace old bark and crowns once, preserving root and hedge gap positions', () => {
  const strategy = streetPlanting(),
    p = new Parts({ planting: strategy });
  TREES.sakura(p, 16.7, 4.8, 0.85, 3);
  hedge(p, [8, 3], [10, 3], { w: 0.5, h: 0.55 });
  hedge(p, [11, 3], [13, 3], { w: 0.5, h: 0.55 });
  assert.deepEqual(
    strategy.records.map((r) => r.kind),
    ['tree', 'hedge', 'hedge'],
  );
  assert.deepEqual([strategy.records[0].x, strategy.records[0].z], [16.7, 4.8]);
  assert.ok(![...p.sets.values()].some((set) => set.surf === 'foliage'), 'old crown geometry suppressed');
  const bark = [...p.sets.values()].find((set) => set.surf === 'bark');
  assert.equal(bark.list.length, 5, 'one root flare, one trunk and three forks');
  const hedgeSet = [...p.sets.values()].find((set) => set.surf === 'diorama-hedge');
  assert.equal(hedgeSet.list.length, 2, 'one core per authored run');
  for (const [i, g] of hedgeSet.list.entries()) {
    g.computeBoundingBox();
    assert.ok(g.boundingBox.min.x >= (i ? 11 : 8) - 1e-6);
    assert.ok(g.boundingBox.max.x <= (i ? 13 : 10) + 1e-6);
  }
});
test('clipped hedge has a flat upward top, bounded corners, and economical geometry', () => {
  const g = clippedHedge(4, 0.55, 0.5);
  g.computeBoundingBox();
  assert.ok(g.attributes.position.count / 3 <= 64);
  assert.ok(Math.abs(g.boundingBox.max.y - 0.55) < 1e-6);
  const p = g.attributes.position,
    n = g.attributes.normal;
  let top = 0;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - 0.55) < 1e-6 && n.getY(i) > 0.99) top++;
  assert.ok(top >= 24, 'flat clipped top has upward winding');
});

test('pane variation keeps source UVs and geometry intact while choosing multiple atlas interiors', async () => {
  const THREE = await import('three');
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  const { varyPanes } = await import('../../js/scenes/diorama/glazing.js');
  const boxes = Array.from({ length: 6 }, (_, i) => new THREE.BoxGeometry(1.2, 1.6, 0.05).translate(i * 2, 2, 3));
  const source = mergeGeometries(boxes),
    uvBefore = [...source.attributes.uv.array];
  const mesh = new THREE.Mesh(source, new THREE.MeshStandardMaterial());
  varyPanes(mesh);
  assert.notEqual(mesh.geometry, source);
  assert.deepEqual([...source.attributes.uv.array], uvBefore, 'shared source UVs remain unchanged');
  assert.deepEqual([...mesh.geometry.attributes.position.array], [...source.attributes.position.array]);
  assert.deepEqual([...mesh.geometry.index.array], [...source.index.array]);
  const uv = mesh.geometry.attributes.uv,
    cells = new Set();
  for (let start = 0; start < uv.count; start += 24) {
    const cell = `${Math.floor(uv.getX(start) * 4)}:${Math.floor(uv.getY(start) * 2)}`;
    cells.add(cell);
    for (let i = start; i < start + 24; i++) {
      assert.equal(`${Math.floor(uv.getX(i) * 4)}:${Math.floor(uv.getY(i) * 2)}`, cell);
      assert.ok(uv.getX(i) > 0 && uv.getX(i) < 1 && uv.getY(i) > 0 && uv.getY(i) < 1);
    }
  }
  assert.ok(cells.size > 2, 'neighboring windows have differentiated interiors');
});

test('tree base meets raised cover and groundcover leaves face upward', async () => {
  const { bed } = await import('../../js/scenes/outdoor/planting.js');
  const strategy = streetPlanting(),
    p = new Parts({ planting: strategy });
  bed(p, [15, 18, 3, 7], { y: 0.3 });
  TREES.sakura(p, 16.7, 4.8, 0.85, 3);
  assert.ok(strategy.records[0].baseY > 0.35 && strategy.records[0].baseY < 0.38);
  const cover = [...p.sets.values()].find((set) => set.surf === 'mulch-cover');
  assert.ok(cover);
  const normal = cover.list[0].attributes.normal;
  for (let i = 0; i < normal.count; i++) assert.ok(normal.getY(i) > 0.5, 'visible upward leaf');
});
