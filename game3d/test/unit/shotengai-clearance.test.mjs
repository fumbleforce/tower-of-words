import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
globalThis.location = { search: '' };
globalThis.window = {};
globalThis.addEventListener = () => {};
const gradient = { addColorStop() {} };
const ctx = new Proxy(
  { measureText: () => ({ width: 100 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient },
  { get: (o, k) => o[k] || (() => {}) },
);
globalThis.innerWidth = 1366;
globalThis.innerHeight = 860;
globalThis.document = {
  documentElement: { style: { setProperty() {} } },
  body: { classList: { contains: () => false, toggle() {} } },
  createElement: () => ({ getContext: () => ctx }),
};
const { buildShotengai } = await import('../../js/scenes/shotengai.js');
const { coarseGrid, occupiedGrid, routeBetween } = await import('../../js/crowd/paths.js');
const { scenePaths } = await import('../../js/crowd/scene-paths.js');
const S = await import('../../js/scenes/island-south.js');
const P = await import('../../js/scenes/shotengai/plan.js');
const world = buildShotengai(),
  grid = coarseGrid(world.nav);
const player = { x: 1.358, z: 3.84, r: 0.2832, rig: { _walk: false } },
  kenji = { x: 1.244, z: 3.165, r: 0.2832, rig: { _walk: false } };
function distance(a, b, o) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    l = dx * dx + dz * dz,
    t = l ? Math.max(0, Math.min(1, ((o.x - a[0]) * dx + (o.z - a[1]) * dz) / l)) : 0;
  return Math.hypot(a[0] + dx * t - o.x, a[1] + dz * t - o.z);
}
function minimum(line, o) {
  return Math.min(...line.slice(1).map((b, i) => distance(line[i], b, o)));
}
function walker(a, b) {
  const line = routeBetween(grid, a, b);
  assert.ok(line?.length > 1);
  return {
    onGrid: true,
    wait: false,
    r: { root: { position: { x: a[0], z: a[1] } } },
    line: [a, ...line],
    i: 1,
    goal: b,
    tail: [],
    held: 4,
    best: 2,
  };
}
test('actual shop-street route detours around the held conversation in both directions without changing nav', () => {
  const before = grid.dist.slice(),
    cache = grid.cache;
  const planner = scenePaths(grid),
    detour = planner.update([player, kenji], player, 1.062, 1.18);
  for (const [a, b] of [
    [
      [0, 10],
      [0, -12],
    ],
    [
      [0, -12],
      [0, 10],
    ],
  ]) {
    const w = walker(a, b),
      original = w.line;
    assert.ok(minimum(original, player) < 1.8, 'old route crosses scene space');
    detour(w);
    assert.notEqual(w.line, original);
    assert.ok(minimum(w.line, player) > 2.1, 'new route leaves the existing scene clearance');
    for (const p of w.line) assert.ok(world.nav.free(...p), 'every route point stays on real floor');
    const line = w.line;
    detour(w);
    assert.equal(w.line, line, 'stable scene does not route every frame');
  }
  assert.deepEqual(grid.dist, before);
  assert.equal(grid.cache, cache);
  assert.notEqual(planner.grid.cache, cache);
  planner.update([player, kenji], player, 0);
  assert.equal(planner.grid, grid);
});
test('a fresh route on a reused crowd body is detoured; moving actors and waiting doorway walkers keep ownership', () => {
  const planner = scenePaths(grid),
    detour = planner.update([player, kenji], player, 1.062, 1.18),
    w = walker([0, 10], [0, -12]);
  detour(w);
  w.line = walker([0, 10], [0, -12]).line;
  const fresh = w.line;
  detour(w);
  assert.notEqual(w.line, fresh);
  w.wait = true;
  w.line = fresh;
  detour(w);
  assert.equal(w.line, fresh);
  const empty = scenePaths(grid);
  empty.update([{ ...player, rig: { _walk: true } }], player, 1.062, 1.18);
  assert.equal(empty.grid, grid);
  assert.deepEqual([player.x, player.z, kenji.x, kenji.z], [1.358, 3.84, 1.244, 3.165]);
});
test('a completely blocked corridor has no route rather than crossing occupied space', () => {
  const block = occupiedGrid(grid, [{ x: 0, z: 3.8, r: 50 }]);
  assert.equal(routeBetween(block, [0, 10], [0, -12]), null);
});
test('both sides of every seaside bench retain reachable standing floor and sea-side knee room', () => {
  const actual = [];
  world.root.traverse((o) => actual.push(...(o.userData.seats || [])));
  for (const x of S.BENCH_X) {
    const sea = S.BENCH_Z + 0.2,
      shop = S.BENCH_Z - 0.4;
    for (const z of [sea, shop])
      assert.ok(
        actual.some((b) => Math.abs(b.x - x) < 1e-8 && Math.abs(b.z - z) < 1e-8),
        'actual builder seat metadata matches the new blockers',
      );
    assert.ok(S.WALL_Z - 0.25 - sea > 1, 'sea-facing hips have over one metre before the rail');
    for (const z of [sea + 0.55, shop - 0.55]) {
      const p = P.local([x, z]);
      assert.ok(world.nav.free(...p), `bench approach ${x},${z}`);
      assert.ok(world.nav.path(...P.local([x - 2, S.BENCH_Z]), ...p)?.length, 'approach connects to promenade');
    }
  }
});
