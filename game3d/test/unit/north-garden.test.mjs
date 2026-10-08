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
const { northGarden } = await import('../../js/scenes/campus/north-garden.js');
const { NORTH_GARDENS } = await import('../../js/scenes/campus/north-garden-plan.js');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { drawPlanting } = await import('../../js/ui/map/terrain.js');
const P = await import('../../js/scenes/campus/plan.js');

test('northern approach clears paths, buildings and the existing lamp at every vertex', () => {
  const parts = new Parts();
  northGarden(parts, P.pt([0, 0]));
  const lamp = P.pt([-22, -46.6]);
  let triangles = 0;
  for (const { list } of parts.sets.values())
    for (const geo of list) {
      const pos = geo.attributes.position;
      triangles += pos.count / 3;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i),
          z = pos.getZ(i);
        assert.ok(!P.WALKS.some((r) => P.inRect(x, z, r)), `path intrusion ${x},${z}`);
        assert.ok(!P.SOLIDS.some((r) => P.inRect(x, z, r)), `building intrusion ${x},${z}`);
        assert.ok(Math.hypot(x - lamp[0], z - lamp[1]) > 0.5, 'lamp pocket');
        assert.ok(pos.getY(i) >= -0.15 && pos.getY(i) < 0.95, 'low grounded planting');
      }
      geo.dispose();
    }
  assert.ok(triangles < 4100, `${triangles} approach triangles`);
});

test('every northern soil outline appears on the map and physical ground', () => {
  const parts = new Parts();
  northGarden(parts);
  const soil = [...parts.sets.values()].find((s) => s.surf === 'soil').list;
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
  for (const bed of NORTH_GARDENS)
    for (const [x, z] of bed.poly) {
      assert.ok(
        paths.some((path) => path.some((v) => v[0] === x && v[1] === z)),
        bed.id,
      );
      assert.ok(
        soil.some((g) => {
          const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) if (Math.hypot(p.getX(i) - x, p.getZ(i) - z) < 1e-5) return true;
          return false;
        }),
        bed.id,
      );
    }
  for (const { list } of parts.sets.values()) list.forEach((g) => g.dispose());
});
process.on('exit', () => hooks.deregister());
