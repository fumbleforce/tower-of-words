import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Three crowd findings from Codex's review, each on the real crowd code:
//   #179 a walker waiting at a door for Eric in a scene, pushed out of his way, went into the wall beside them
//   #182 a walker stepping aside to stop (a phone, a shop window) walked into someone standing there
//   #183 a walker coming in along a street was checked out of view half a metre behind where they appeared
async function load() {
  const vendor = new URL('../../vendor/three/three.module.js', import.meta.url).href;
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three') return { url: vendor, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      // the walk pose isn't under test; the real people.js builds meshes
      if (url.endsWith('/js/train/people.js'))
        return { format: 'module', source: 'export const HIP = 0.7; export function walkPose() {}', shortCircuit: true };
      return next(url, context);
    },
  });
  globalThis.window ??= {};
  try {
    return {
      THREE: await import(vendor),
      ...(await import('../../js/crowd/motion.js')),
      ...(await import('../../js/crowd/stops.js')),
      ...(await import('../../js/crowd/launch.js')),
      ...(await import('../../js/crowd/paths.js')),
      ...(await import('../../js/movement/shared.js')),
      ...(await import('../../js/movement/crowd.js')),
      ...(await import('../../js/movement/navigation.js')),
    };
  } finally {
    hooks.deregister();
  }
}
const M = await load();

// a person as the crowd code sees one: a chibi-style rig (clips, no limbs to pose)
function rig(x, z, ambient = false) {
  const r = {
    root: new M.THREE.Group(),
    ambient,
    meshy: true,
    state: 'idle',
    setState(s) {
      this.state = s;
    },
    setGait() {},
    phone() {},
  };
  r.root.position.set(x, 0, z);
  return r;
}
function place(nav, crowd, people, player) {
  const space = new M.THREE.Group();
  for (const r of [...crowd, ...Object.values(people), player]) space.add(r.root);
  return { space, charScale: 1, nav, crowd, people };
}

test('a walker giving way at a door for Eric stays on the walk grid (#179)', () => {
  // Codex's case: the floor ends at x = 0.67 (free to x = 0.50), Eric at the door, the walker just inside the margin
  for (const x0 of [0.49, 0.45, 0.3]) {
    const nav = new M.Nav(-2, 0.67, -5, 5);
    const eric = rig(0, 0),
      walker = rig(x0, 0, true);
    const game = { t: 0, player: eric, place: place(nav, [walker], {}, eric) };
    const w = { r: walker, line: [[0, 0]], i: 0, tail: [[0, 0]], toDoor: true, speed: 1, onGrid: true };
    for (let i = 0; i < 60; i++) {
      const list = M.bodies(game);
      M.walkStep(game, w, 0.05, list, list.find((b) => b.root === eric.root), 0.9);
      const p = walker.root.position;
      assert.ok(nav.free(p.x, p.z), `from x ${x0}: walker pushed off the floor to x ${p.x.toFixed(3)} (frame ${i})`);
    }
  }
});

test('a walker already in a wall margin is never pushed further in (#179)', () => {
  const nav = new M.Nav(-2, 0.67, -5, 5);
  const eric = rig(0, 0),
    walker = rig(0.55, 0, true);
  const game = { t: 0, player: eric, place: place(nav, [walker], {}, eric) };
  const w = { r: walker, line: [[0, 0]], i: 0, tail: [[0, 0]], toDoor: true, speed: 1, onGrid: true };
  for (let i = 0; i < 40; i++) {
    const list = M.bodies(game);
    M.walkStep(game, w, 0.05, list, list.find((b) => b.root === eric.root), 0.9);
  }
  assert.ok(walker.root.position.x <= 0.55 + 1e-9, `walker went on into the wall (x ${walker.root.position.x})`);
});

test('a walker stepping aside to stop never walks into someone standing there (#182)', () => {
  // Codex's case: the walker at (0,0) facing +z steps right (toward -x) up to 2.4; staff stands fixed at (-1,0)
  const nav = new M.Nav(-4, 4, -4, 4);
  const g = M.coarseGrid(nav);
  const eric = rig(3, 3),
    walker = rig(0, 0, true),
    staff = rig(-1, 0);
  staff._noAvoid = true;
  const P = place(nav, [walker], { staff }, eric);
  const game = { t: 0, player: eric, place: P };
  const b = { r: walker, kind: 'walk', mate: null };
  M.startStop(b, () => 0.3, { g, K: 1 });
  assert.ok(b.stopped.to[0] < -1.5, `the stop should lie past the staff (to ${b.stopped.to})`);
  let closest = Infinity,
    overlaps = 0;
  for (let i = 0; i < 120; i++) {
    const list = M.bodies(game);
    M.stopStep(b, 0.05, { place: P, eric: list.find((o) => o.root === eric.root), K: 1, list });
    game.t += 0.05;
    M.softSeparate(game, 0.05);
    const d = walker.root.position.distanceTo(staff.root.position);
    closest = Math.min(closest, d);
    if (d < 0.48 - 1e-6) overlaps++;
  }
  assert.equal(overlaps, 0, `walker overlapped the staff on ${overlaps} frames (closest ${closest.toFixed(3)} < 0.48)`);
  assert.ok(walker.root.position.x < -0.3, 'walker still stepped aside as far as there was room');
});

test('someone new along a street appears out of view, where they actually stand (#183)', () => {
  // Codex's case: an open floor, a street from (0,0) to (0,5), the view's edge at z = -0.25 (everything beyond is seen)
  const nav = new M.Nav(-6, 6, -20, 10);
  const g = M.coarseGrid(nav);
  const inView = (x, z) => z > -0.25;
  const ends = { a: { at: [0, 0] }, b: { at: [0, 5] } };
  const routes = new Map([['a>b', M.routeBetween(g, [0, 0], [0, 5])]]);
  assert.ok(routes.get('a>b'), 'a route along the street');
  let launched = 0;
  for (const twos of [0, 1])
    for (let seed = 1; seed <= 25; seed++) {
      let s = seed * 9973;
      const R = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
      const pool = [0, 1].map(() => ({ state: 'off', kind: 'office', r: rig(0, -50, true) }));
      const game = { player: rig(5, 8) };
      const st = { spec: { flows: [['a', 'b', 1]], who: { office: 1 }, twos }, counts: { walk: 2 }, R };
      const L = M.launcher({ game, g, K: 1, ends, routes, pool, inView, st });
      if (!L.launch(false)) continue;
      for (const b of pool.filter((b) => b.state === 'walk')) {
        const p = b.r.root.position;
        launched++;
        assert.ok(!inView(p.x, p.z), `seed ${seed}, twos ${twos}: a walker appeared in view at z ${p.z.toFixed(2)}`);
      }
    }
  assert.ok(launched > 20, `too few launches to judge (${launched})`);
});
