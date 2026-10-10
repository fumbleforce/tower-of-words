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
    createElement: () => ({
      getContext: () => ({ createLinearGradient: () => ({ addColorStop() {} }), fillRect() {} }),
    }),
  },
});
const THREE = await import('three');
const { Parts } = await import('../../js/scenes/outdoor/parts.js');
const { arrivalGardens } = await import('../../js/scenes/sports/arrival-gardens.js');
const { gymShell } = await import('../../js/scenes/sports/gym-facade.js');
const { northFront } = await import('../../js/scenes/sports/north-front.js');
const { lightUp } = await import('../../js/kit/light/glow.js');
const P = await import('../../js/scenes/sports/plan.js');
const { BUILDINGS } = await import('../../js/scenes/island-layout.js');
const { BLOCKS } = await import('../../js/scenes/plaza/east-plan.js');
const { ARRIVAL_GARDENS } = await import('../../js/scenes/sports/arrival-garden-plan.js');
const { drawPlanting } = await import('../../js/ui/map/terrain.js');
const { BED_FLUSH } = await import('../../js/scenes/outdoor/walk-edges.js');
const geometries = (p) => [...p.sets.values()].flatMap((s) => s.list);

test('sports arrival planting keeps every vertex off native paths and buildings', () => {
  const p = new Parts();
  arrivalGardens(p);
  arrivalGardens(p, { foundations: true });
  arrivalGardens(p, { northStreet: true });
  let triangles = 0;
  for (const g of geometries(p)) {
    const v = g.attributes.position;
    triangles += v.count / 3;
    for (let i = 0; i < v.count; i++) {
      const [x, z] = P.pt([v.getX(i), v.getZ(i)]);
      assert.ok(!P.WALKS.some((r) => P.inRect(x, z, r)), `walk intrusion ${v.getX(i)},${v.getZ(i)}`);
      assert.ok(
        !BUILDINGS.some(({ rect: r }) => r && P.inRect(v.getX(i), v.getZ(i), [r[0], r[2], r[1], r[3]])),
        `solid intrusion ${v.getX(i)},${v.getZ(i)}`,
      );
      // flush with the lawn: shrub and grass bases may sit a little in the ground
      assert.ok(v.getY(i) >= -0.1 && v.getY(i) < 1.2, 'grounded low planting');
    }
    g.dispose();
  }
  assert.ok(triangles < 4400, `${triangles} arrival triangles`);
});

function hits(parts, origin, direction) {
  const ray = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction), 0, 0.5);
  const meshes = geometries(parts).map(
    (g) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })),
  );
  return ray.intersectObjects(meshes).length;
}
test('gym entrance and clerestory are physical wall openings', () => {
  const p = new Parts();
  gymShell(p, { wall: '#ccc' }, 4.4);
  assert.equal(hits(p, [P.GX, 1.5, P.GYM[3] + 0.1], [0, 0, -1]), 0);
  assert.equal(hits(p, [P.GYM[1] + 0.1, 3.35, P.GYM[2] + 1.5], [-1, 0, 0]), 0);
  assert.ok(hits(p, [P.GYM[1] + 0.1, 1.5, P.GYM[2] + 1.5], [-1, 0, 0]) > 0);
  geometries(p).forEach((g) => g.dispose());
});
test('r3 recesses exist on every upper face, independent of shared chunk origin', () => {
  const k = BLOCKS.find((k) => k.id === 'r3'),
    p = new Parts();
  const details = new Parts();
  const front = northFront(details, p, k, '#ccc');
  const [x0, x1, z0, z1] = k.rect;
  for (const [origin, direction] of [
    [
      [(x0 + x1) / 2, 3, z1 + 0.1],
      [0, 0, -1],
    ],
    [
      [(x0 + x1) / 2, 3, z0 - 0.1],
      [0, 0, 1],
    ],
    [
      [x0 - 0.1, 3, (z0 + z1) / 2],
      [1, 0, 0],
    ],
    [
      [x1 + 0.1, 3, (z0 + z1) / 2],
      [-1, 0, 0],
    ],
  ])
    assert.equal(hits(p, origin, direction), 0);
  const root = new THREE.Group();
  front.meshes(root);
  assert.equal(root.children.length, 1);
  lightUp(front.glows);
  assert.equal(root.children[0].material.color.getHexString(), '806d56');
  geometries(p).forEach((g) => g.dispose());
});
test('r3 shares its soil and original seed-330 trees across collector frames', async () => {
  const { belt } = await import('../../js/scenes/dorm-court/cluster-yards.js');
  const { sakura, keyaki } = await import('../../js/scenes/outdoor/planting.js');
  const { BANDS } = await import('../../js/scenes/bands-plan.js');
  const expected = [],
    original = { geo() {}, box() {}, planting: { tree: (_, t) => (expected.push(t), true) } };
  for (const _ of belt(original, [72.6, 76, -40.6, -30.2], [sakura, keyaki], { seed: 330, pitch: 3.2 })) void _;
  assert.equal(expected.length, 3);
  assert.ok(!BANDS.east_lane.some((b) => b.by === 'lawn' && b.seed === 330), 'no duplicated old bed');
  const k = BLOCKS.find((b) => b.id === 'r3');
  const snapshots = [];
  for (const shift of [
    [0, 0],
    [37.29, -2.48],
  ]) {
    const trees = [],
      p = new Parts();
    p.planting = { tree: (_, t) => (trees.push(t), true) };
    const [dx, dz] = shift;
    northFront(p, new Parts(), { ...k, rect: k.rect.map((v, i) => v + (i < 2 ? dx : dz)), at: k.at + dz }, '#ccc');
    assert.deepEqual(trees, expected, 'same species, roots, scales and seeds');
    const soil = [...p.sets.values()].filter((s) => s.surf === 'soil').flatMap((s) => s.list);
    assert.equal(soil.length, 2, 'both shared gardens have their soil, flush with the lawn');
    snapshots.push(
      soil.flatMap((g) => {
        const v = g.attributes.position,
          out = [];
        for (let i = 0; i < v.count; i++) out.push(v.getX(i) - dx, v.getY(i), v.getZ(i) - dz);
        return out;
      }),
    );
    geometries(p).forEach((g) => g.dispose());
  }
  assert.equal(snapshots[0].length, snapshots[1].length);
  snapshots[0].forEach((v, i) => assert.ok(Math.abs(v - snapshots[1][i]) < 1e-5, 'same translated soil'));
});

test('the map includes the exact sports arrival garden outlines', () => {
  const parts = new Parts();
  arrivalGardens(parts);
  arrivalGardens(parts, { foundations: true });
  arrivalGardens(parts, { northStreet: true });
  const soil = [...parts.sets.values()].filter((s) => s.surf === 'soil').flatMap((s) => s.list);
  for (const bed of ARRIVAL_GARDENS)
    for (const [x, z] of bed.poly)
      for (const y of [BED_FLUSH])
        assert.ok(
          soil.some((g) => {
            const v = g.attributes.position;
            for (let i = 0; i < v.count; i++)
              if (Math.hypot(v.getX(i) - x, v.getY(i) - y, v.getZ(i) - z) < 1e-5) return true;
            return false;
          }),
          bed.id + ' soil lies on the outline, flush with the lawn',
        );
  geometries(parts).forEach((g) => g.dispose());

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
  for (const bed of ARRIVAL_GARDENS)
    assert.ok(
      paths.some((p) => JSON.stringify(p) === JSON.stringify(bed.poly)),
      bed.id,
    );
});
process.on('exit', () => hooks.deregister());
