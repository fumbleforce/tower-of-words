// The walkable-ground system (movement/walk-ground.js, notes/grounds-system.md): the outline of a union of
// rectangles, the walk grid that comes from it, and the two places built on it (forecourt, campus).
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
process.on('exit', () => hooks.deregister());
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
const ctx = new Proxy(
  {
    measureText: (t) => ({ width: String(t).length * 8 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
  },
  { get: (o, k) => o[k] || (() => {}) },
);
globalThis.document.createElement = () => ({
  width: 128,
  height: 128,
  getContext: () => ctx,
  style: {},
});

const { walkGround, applyGround } = await import('../../js/movement/walk-ground.js');
const { Nav } = await import('../../js/movement/navigation.js');
const { walkEdges } = await import('../../js/scenes/outdoor/walk-edges.js');

const len = (e) => e.s1 - e.s0;
const B = [-10, 10, -10, 10];

test('an L of two overlapping rectangles has one outline and no edge where they join', () => {
  const g = walkGround({
    walk: [
      [0, 4, 0, 2],
      [0, 2, 0, 5],
      [1, 3, 1, 1.5],
    ],
    bounds: B,
  });
  assert.equal(g.edges.length, 6);
  assert.ok(g.edges.every((e) => e.kind === 'kerb'));
  const total = g.edges.reduce((s, e) => s + len(e), 0);
  assert.equal(total, 4 + 2 + 2 + 3 + 2 + 5);
  assert.ok(g.contains(1, 1) && g.contains(1, 4) && !g.contains(3, 4));
  // the inside corner at (2, 2) and the outside ones
  const top = g.edges.find((e) => e.out === 's' && e.line === 2);
  assert.equal(g.corner(top, 'a'), 'inside');
  assert.equal(g.corner(top, 'b'), 'outside');
});

test('a T junction joins with no edge across the path mouth', () => {
  const g = walkGround({
    walk: [
      [0, 10, 0, 2],
      [4, 6, 2, 8],
    ],
    bounds: B.map((v) => v * 2),
  });
  assert.ok(!g.edges.some((e) => e.out === 's' && e.line === 2 && e.s0 < 5 && e.s1 > 5));
  assert.deepEqual(
    g.edges.filter((e) => e.out === 's' && e.line === 2).map((e) => [e.s0, e.s1]),
    [
      [0, 4],
      [6, 10],
    ],
  );
});

test('a cut makes a hole whose outline is the barrier named over it', () => {
  const g = walkGround({
    walk: [[0, 10, 0, 10]],
    cut: [[4, 6, 4, 6]],
    barriers: [{ kind: 'building', rect: [4, 6, 4, 6] }],
    bounds: [-1, 11, -1, 11],
  });
  const hole = g.edges.filter((e) => e.kind === 'building');
  assert.equal(hole.length, 4);
  assert.ok(!g.contains(5, 5) && g.contains(3, 5));
});

test('the edge kind changes where the barrier beyond it changes, and past the bounds it is open', () => {
  const g = walkGround({
    walk: [[0, 10, 0, 2]],
    barriers: [{ kind: 'wall', rect: [3, 5, 2, 4] }],
    bounds: [-1, 8, -1, 3],
  });
  const south = g.edges.filter((e) => e.out === 's').map((e) => [e.s0, e.s1, e.kind]);
  assert.deepEqual(south, [
    [0, 3, 'kerb'],
    [3, 5, 'wall'],
    [5, 10, 'kerb'],
  ]);
  // the walk grid stops at the bounds (x 8) where the drawn walk runs on: an open stop, nothing drawn there
  assert.ok(g.stops.some((e) => e.out === 'e' && e.line === 8 && e.kind === 'open'));
  assert.ok(!g.edges.some((e) => e.line === 8));
});

test('a stop with walkable-looking ground beyond it and nothing named there is a seam', () => {
  const g = walkGround({
    walk: [[0, 4, 0, 2]],
    backdrop: [[4, 8, 0, 2]],
    bounds: B,
  });
  assert.ok(g.stops.some((e) => e.kind === 'seam' && e.line === 4));
  const named = walkGround({
    walk: [[0, 4, 0, 2]],
    backdrop: [[4, 8, 0, 2]],
    barriers: [{ kind: 'gate', rect: [4, 8, 0, 2] }],
    bounds: B,
  });
  assert.ok(!named.stops.some((e) => e.kind === 'seam'));
});

test('the blockers are exactly the ground inside the bounds that is not walkable', () => {
  const g = walkGround({
    walk: [
      [0, 4, 0, 2],
      [1, 2, 2, 6],
    ],
    cut: [[3, 3.5, 0.5, 1]],
    bounds: [-2, 6, -2, 7],
  });
  const rects = g.blockers();
  const blocked = (x, z) => rects.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
  for (let x = -1.95; x < 6; x += 0.1)
    for (let z = -1.95; z < 7; z += 0.1) assert.equal(blocked(x, z), !g.contains(x, z), `${x} ${z}`);
  assert.ok(rects.length < 12, `${rects.length} rectangles`);
});

test('on the walk grid his whole body stops at the drawn edge, not just his centre', () => {
  const nav = new Nav(-2, 6, -2, 4, 0.1);
  applyGround(nav, walkGround({ walk: [[0, 4, 0, 2]], bounds: [-2, 6, -2, 4] }));
  assert.ok(nav.free(2, 2 - nav.R - 0.01));
  assert.ok(!nav.free(2, 2 - nav.R + 0.01));
  // walking south into the edge: he stops a radius short of it
  let [x, z] = [2, 1];
  for (let i = 0; i < 100; i++) [x, z] = nav.collide(x, z + 0.03, x, z);
  assert.ok(Math.abs(z - (2 - nav.R)) < 0.035, `stopped at ${z}`);
});

test('kerbs lie wholly beyond the walk and meet at corners without overlapping', () => {
  const boxes = [];
  const p = { box: (color, w, h, d, x, y, z) => boxes.push({ w, d, x, z, h }) };
  const g = walkGround({
    walk: [
      [0, 4, 0, 2],
      [0, 2, 0, 5],
    ],
    bounds: B,
  });
  walkEdges(p, g);
  const bodies = boxes.filter((b) => b.h > 0.05);
  for (const b of bodies)
    for (const [px, pz] of [
      [b.x, b.z],
      [b.x - b.w / 2 + 0.01, b.z],
      [b.x + b.w / 2 - 0.01, b.z],
    ])
      assert.ok(!g.contains(px, pz), `kerb on the walk at ${px} ${pz}`);
  const area = (b) => b.w * b.d;
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) *
    Math.max(0, Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2));
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) assert.ok(overlap(bodies[i], bodies[j]) < 1e-9);
  // the outline's length plus its four outside corners (one less inside corner each way), all covered
  const w = 0.16,
    perimeter = 4 + 2 + 2 + 3 + 2 + 5;
  const covered = bodies.reduce((s, b) => s + area(b), 0);
  assert.ok(Math.abs(covered - (perimeter * w + 5 * w * w - w * w)) < 1e-6, `${covered}`);
});

// ----- the places -----
const { buildCampus } = await import('../../js/scenes/campus.js');
const CP = await import('../../js/scenes/campus/plan.js');
const FG = await import('../../js/scenes/forecourt/ground.js');
const CG = await import('../../js/scenes/campus/ground.js');
const FP = await import('../../js/scenes/forecourt/plan.js');
const SG = await import('../../js/scenes/sports/ground.js');
const SP = await import('../../js/scenes/sports/plan.js');
const SCP = await import('../../js/scenes/sports/court-plan.js');

for (const [name, g] of [
  ['forecourt', FG.ground()],
  ['campus', CG.ground()],
  ['sports', SG.ground()],
]) {
  test(`${name}: every place the walk grid stops him shows why (a kerb or a named barrier, never a seam)`, () => {
    const seams = g.stops.filter((e) => e.kind === 'seam');
    assert.deepEqual(seams, []);
    // and every stop on a kerb has a drawn kerb on the same line covering it
    for (const s of g.stops.filter((e) => e.kind === 'kerb')) {
      const covered = g.edges
        .filter((e) => e.kind === 'kerb' && e.out === s.out && Math.abs(e.line - s.line) < 1e-6)
        .reduce((t, e) => t + Math.max(0, Math.min(e.s1, s.s1) - Math.max(e.s0, s.s0)), 0);
      assert.ok(Math.abs(covered - len(s)) < 1e-6, `${name} stop ${s.out} ${s.line} ${s.s0}..${s.s1} undrawn`);
    }
  });
}

// a path (a walk at least 3 long, 0.6 to 3.2 wide) whose end is wholly a kerb, with no other walk touching it within
// a width of that end, leads nowhere: it must reach a door, a building, another walk or a trip's start
const deadEnds = (g) =>
  g.walk.flatMap((r) => {
    const [x0, x1, z0, z1] = r,
      alongX = x1 - x0 >= z1 - z0,
      [len, wid] = alongX ? [x1 - x0, z1 - z0] : [z1 - z0, x1 - x0];
    if (len < 3 || wid > 3.2 || wid < 0.6) return [];
    const ends = alongX
      ? [
          ['w', x0, [x0, x0 + wid, z0, z1]],
          ['e', x1, [x1 - wid, x1, z0, z1]],
        ]
      : [
          ['n', z0, [x0, x1, z0, z0 + wid]],
          ['s', z1, [x0, x1, z1 - wid, z1]],
        ];
    const touches = ([a, b, c, d]) =>
      g.walk.some((o) => o !== r && o[0] <= b + 1e-6 && o[1] >= a - 1e-6 && o[2] <= d + 1e-6 && o[3] >= c - 1e-6);
    return ends
      .filter(([out, line, strip]) => {
        if (touches(strip)) return false;
        const [a, b] = alongX ? [z0, z1] : [x0, x1];
        const kerbed = g.edges
          .filter((e) => e.out === out && e.kind === 'kerb' && Math.abs(e.line - line) < 1e-6)
          .reduce((t, e) => t + Math.max(0, Math.min(e.s1, b) - Math.max(e.s0, a)), 0);
        return kerbed > b - a - 1e-6;
      })
      .map(([out]) => `${r.map((v) => +v.toFixed(2))} ${out}`);
  });
test('a path that ends in a kerb is flagged, one that turns or meets another walk is not', () => {
  const g = walkGround({
    walk: [
      [0, 10, 0, 3],
      [4, 6, 3, 9],
      [10, 12, 0, 8],
    ],
    bounds: [-5, 15, -5, 15],
  });
  assert.deepEqual(deadEnds(g), ['0,10,0,3 w', '4,6,3,9 s', '10,12,0,8 s']);
});
// known ends, each with what is there
const KNOWN_ENDS = {
  // the bike shelter's floor runs under its roof to the shelter's closed end; its bikes fill it (forecourt/north.js)
  [`${FP.SHELTER_FLOOR.map((v) => +v.toFixed(2))} e`]: 'the shelter',
  // the campus's east path meets the office quarter's paving at the chunk's edge, with no trip there yet (#362 stage 2
  // looks at the seams between places)
  '19.95,29.74,-32.35,-29.35 e': 'the chunk edge',
  // the sports ground's grove bench nook: a pad off the pool walk with the bench and its tree at the end
  '-4.3,-0.95,-26.2,-23.6 w': 'the grove bench',
};
for (const [name, g] of [
  ['forecourt', FG.ground()],
  ['campus', CG.ground()],
  ['sports', SG.ground()],
])
  test(`${name}: no path ends in a kerb with nothing at its end`, () =>
    assert.deepEqual(
      deadEnds(g).filter((e) => !KNOWN_ENDS[e]),
      [],
    ));

// beds belong to the place's structure (Jørgen, 2026-10-09: "areas like this must be avoided, where the plants are
// contained in these oddly shaped areas"): every bed in the campus and forecourt is a rectangle standing behind a kerb
// of the real ground, or no bed at all (its plants loose on the lawn)
const { CAMPUS_GARDENS } = await import('../../js/scenes/campus/landscape-plan.js');
const { QUARTER_BEDS } = await import('../../js/scenes/campus/quarter-plan.js');
const { NORTH_GARDENS } = await import('../../js/scenes/campus/north-garden-plan.js');
const { SHED_GARDENS } = await import('../../js/scenes/campus/shed-garden-plan.js');
const { SOUTH_QUARTER_BEDS } = await import('../../js/scenes/forecourt/quarter-planting-plan.js');
const { CHUNKS } = await import('../../js/scenes/island-chunks.js');
test('every bed is a strip behind a kerb of the ground, or plants loose on the lawn', () => {
  const g = CG.ground(),
    [ax, az] = CHUNKS.campus.at;
  const beds = [...CAMPUS_GARDENS, ...QUARTER_BEDS, ...NORTH_GARDENS, ...SHED_GARDENS, ...SOUTH_QUARTER_BEDS];
  assert.ok(beds.some((b) => !b.loose));
  for (const bed of beds) {
    if (bed.loose) {
      assert.deepEqual([bed.masses, bed.grasses], [[], []], bed.id);
      continue;
    }
    const [x0, x1, z0, z1] = bed.strip.map((v, i) => v - (i < 2 ? ax : az));
    assert.equal(bed.poly.length, 4, bed.id);
    // one of its long sides lies a kerb's width from a drawn kerb along the ground's edge
    const kerbAt = (out, line, a, b) =>
      g.edges.some(
        (e) => e.kind === 'kerb' && e.out === out && Math.abs(e.line - line) < 1e-3 && e.s0 < b - 0.5 && e.s1 > a + 0.5,
      );
    assert.ok(
      kerbAt('e', x0 - 0.16, z0, z1) ||
        kerbAt('w', x1 + 0.16, z0, z1) ||
        kerbAt('s', z0 - 0.16, x0, x1) ||
        kerbAt('n', z1 + 0.16, x0, x1),
      `${bed.id} stands behind no kerb`,
    );
  }
});

test('campus: every exit, the print door and the bench stay reachable on the new ground', () => {
  const w = buildCampus();
  const staffDoor = [FP.STAFF_PATH[1] - 0.3, FP.WING_DOOR.at],
    shelter = [FP.SHELTER_PATH[1] - 0.35, (FP.SHELTER[2] + FP.SHELTER[3]) / 2];
  for (const p of [
    ...Object.values(CP.EXITS).flatMap((e) => [e.lane, e.in]),
    CP.PRINT_STEP,
    CP.BENCH.out,
    staffDoor,
    shelter,
  ]) {
    assert.ok(w.nav.free(...p), `blocked ${p}`);
    assert.ok(w.nav.path(...CP.IN, ...p)?.length, `unreachable ${p}`);
  }
});

// the forecourt's whole scene needs the cast and the head office (browser only: game3d/tools/grounds-shots.mjs and
// the day test); its ground alone is checked here
test('forecourt: the ground reaches the garden court, the bench bays, the shed street and every trip', () => {
  const nav = applyGround(new Nav(...FG.WALK_AREA, 0.1), FG.ground());
  const from = [FP.DOOR_X, FP.ZN - 1.5];
  const targets = {
    gravelCourt: [FP.GARDEN_COURT[0] + 1.6, FP.GARDEN_COURT[2] + 1.2],
    gravelWay: [(FP.GARDEN_PATH[0] + FP.GARDEN_PATH[1]) / 2, FP.STRIP_S[3]],
    bay: [FG.BAY_X[0] - 0.6, FG.BAYS[0][2] + 0.22],
    campus: FP.CAMPUS_EXIT.lane,
    plaza: [29.4, FP.LANE_Z],
    serviceGate: [7.5, FP.HZ - 0.05],
    bikes: [10, 7.5],
  };
  for (const [id, p] of Object.entries(targets)) {
    assert.ok(nav.free(...p), `${id} blocked ${p}`);
    assert.ok(nav.path(...from, ...p)?.length, `${id} unreachable ${p}`);
  }
  // lawn beside the gravel court and past the court's east edge stays off limits
  assert.equal(nav.free(FP.GARDEN_COURT[1] + 0.3, FP.GARDEN_COURT[2] + 1), false);
  assert.equal(nav.free(FP.LE + 0.3, 1.5), false);
});

// the sports ground's scene needs the browser's canvas for its signs; its ground alone is checked here
test('sports: the ground reaches every way out, both doors, the court, the bench bays and the nooks', () => {
  const nav = applyGround(new Nav(...SG.WALK_AREA, 0.12), SG.ground());
  for (const r of [...SP.FURNITURE, ...SCP.BLOCKS]) nav.block(...r);
  const targets = {
    ...Object.fromEntries(Object.entries(SP.EXITS).flatMap(([to, e]) => [[to, e.lane], ...(e.in ? [[to + ' in', e.in]] : [])])),
    ...Object.fromEntries(SP.DOORS.map((d) => [d.id, d.step])),
    ...SCP.SPOTS,
    bay: [(SP.BAY_WALKS[0][0] + SP.BAY_WALKS[0][1]) / 2, SP.BAY_WALKS[0][2] + 0.4],
    courtside: [(SP.NOOKS[0].walks[0][0] + SP.NOOKS[0].walks[0][1]) / 2, SP.NOOKS[0].walks[0][2] + 0.6],
  };
  for (const [id, p] of Object.entries(targets)) {
    assert.ok(nav.free(...p), `${id} blocked ${p}`);
    assert.ok(nav.path(...SP.IN, ...p)?.length, `${id} unreachable ${p}`);
  }
  // the lawn in the corner between the lane, the pool walk and the courts walk stays off limits
  assert.equal(nav.free(5, 5), false);
});

const { ARRIVAL_GARDENS } = await import('../../js/scenes/sports/arrival-garden-plan.js');
test('sports: every arrival garden is a strip along a walk or a wall, never a free shape on the lawn', () => {
  const g = SG.ground(),
    [ax, az] = CHUNKS.sports.at;
  for (const bed of ARRIVAL_GARDENS) {
    const xs = bed.poly.map((p) => p[0]),
      zs = bed.poly.map((p) => p[1]);
    assert.equal(bed.poly.length, 4, bed.id);
    assert.ok(Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) <= 1.5 + 1e-6, bed.id);
    if (!bed.strip) continue; // the gym's and r3's foundation strips, along their walls
    const [x0, x1, z0, z1] = bed.strip.map((v, i) => v - (i < 2 ? ax : az));
    const kerbAt = (out, line, a, b) =>
      g.edges.some(
        (e) => e.kind === 'kerb' && e.out === out && Math.abs(e.line - line) < 1e-3 && e.s0 < b - 0.5 && e.s1 > a + 0.5,
      );
    assert.ok(
      kerbAt('e', x0 - 0.16, z0, z1) ||
        kerbAt('w', x1 + 0.16, z0, z1) ||
        kerbAt('s', z0 - 0.16, x0, x1) ||
        kerbAt('n', z1 + 0.16, x0, x1),
      `${bed.id} stands behind no kerb`,
    );
  }
});
