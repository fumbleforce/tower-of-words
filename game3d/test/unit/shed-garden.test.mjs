import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({
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
  localStorage: { getItem: () => null },
  document: {
    body: { classList: { contains: () => false } },
    documentElement: { style: { setProperty() {} } },
  },
});
const { shedGarden } = await import('../../js/scenes/campus/shed-garden.js');
const { SHED_GARDENS } = await import('../../js/scenes/campus/shed-garden-plan.js');
const { quarterBeds } = await import('../../js/scenes/campus/quarter-grounds.js');
const { QUARTER_BEDS, quarterCover } = await import('../../js/scenes/campus/quarter-plan.js');
const { insideGarden } = await import('../../js/scenes/campus/landscape-plan.js');
const { drawPlanting } = await import('../../js/ui/map/terrain.js');
const P = await import('../../js/scenes/campus/plan.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
function collect(build) {
  const parts = new Parts();
  build(parts);
  let triangles = 0;
  const verts = [];
  for (const { list } of parts.sets.values())
    for (const g of list) {
      const pos = g.attributes.position;
      triangles += pos.count / 3;
      for (let i = 0; i < pos.count; i++) verts.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
      g.dispose();
    }
  return { triangles, verts };
}
test('shed garden physical geometry stays outside every campus path and building', () => {
  const { triangles, verts } = collect((p) => shedGarden(p, P.pt([0, 0])));
  assert.ok(triangles > 10000 && triangles < 17000, `${triangles} triangles`);
  for (const [x, , z] of verts) {
    assert.ok(!P.WALKS.some((r) => P.inRect(x, z, r)), `path intrusion ${x},${z}`);
    assert.ok(!P.SOLIDS.some((r) => P.inRect(x, z, r)), `building intrusion ${x},${z}`);
  }
});
test('shed garden map uses every physical planted outline', () => {
  const paths = [];
  let active;
  const ctx = new Proxy(
    {
      beginPath() {
        active = [];
      },
      moveTo(x, z) {
        active.push([x, z]);
      },
      lineTo(x, z) {
        active.push([x, z]);
      },
      fill() {
        if (active?.length) paths.push(active);
        active = null;
      },
    },
    { get: (o, k) => o[k] || (() => {}) },
  );
  drawPlanting(ctx, false);
  const model = collect((p) => shedGarden(p));
  for (const bed of SHED_GARDENS)
    for (const [x, z] of bed.poly) {
      assert.ok(
        paths.some((path) => path.some((v) => v[0] === x && v[1] === z)),
        bed.id,
      );
      assert.ok(
        model.verts.some((v) => Math.hypot(v[0] - x, v[2] - z) < 1e-5),
        bed.id,
      );
    }
});
test('shed understory is deterministic and keeps its full cover footprint within beds', () => {
  for (const bed of SHED_GARDENS) {
    const plants = quarterCover(bed);
    assert.deepEqual(plants, quarterCover(bed));
    assert.ok(plants.length > 10, bed.id);
    for (const p of plants)
      for (let i = 0; i < 16; i++)
        assert.ok(
          insideGarden(bed.poly, p.x + Math.cos((i * Math.PI) / 8) * p.r, p.z + Math.sin((i * Math.PI) / 8) * p.r),
          bed.id,
        );
  }
});
test('optional shed cover height does not change existing quarter geometry', () => {
  const actual = collect((p) => quarterBeds(p, QUARTER_BEDS));
  const explicitDefault = QUARTER_BEDS.map((b) => ({ ...b, cover: undefined }));
  assert.deepEqual(
    collect((p) => quarterBeds(p, explicitDefault)),
    actual,
  );
  const bed = SHED_GARDENS[0],
    low = collect((p) => quarterBeds(p, [bed])),
    high = collect((p) => quarterBeds(p, [{ ...bed, cover: { ...bed.cover, squash: 1 } }]));
  assert.equal(low.triangles, high.triangles);
  assert.notDeepEqual(low.verts, high.verts);
});
process.on('exit', () => hooks.deregister());
