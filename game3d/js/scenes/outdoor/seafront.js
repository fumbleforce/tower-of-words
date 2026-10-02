// The seafront south of the shop street for the outdoor kit (scenes/outdoor/), from scenes/island-south.js: the
// promenade's paving (pale slabs with a dark course on every bay line of the shops, a darker band along the wall for
// the lamps and benches, a band across it on each alley's axis), the walks down the arcade's two mouths and through
// the alleys, the alleys' beds, the stairs down to the beach, the lookout's rail at the promenade's east end, the
// lamps, benches and bins, kerbs where paving meets lawn, and on the beach a wet band and foam along the water and
// boulders in groups on the sand and in the shallows. The sea wall, its rocks and the pines come from
// scenes/outdoor/coast.js with the seafront's data, so the island's coast is one design. The shop street's chunk
// (scenes/shotengai.js) builds it to walk; the plaza and the forecourt build it for their island map tiles only.
//
//   const front = yield* seafrontSteps(root, { at, layer })     at: island point -> the place's frame (a shift)
//   front.evening()                                              the lamps come on
import * as THREE from 'three';
import { Parts, hash2 } from './parts.js';
import { paver, GRANITE } from './paving.js';
import { kerb } from './edges.js';
import { lamps, bench, bins, lightSet, STEEL } from './furniture.js';
import { bed, cluster, grass } from './planting.js';
import { coastSteps, rail, along } from './coast.js';
import { SAND } from '../skyline.js';
import * as S from '../island-south.js';

// the gap in the lookout's east rail, island z [from, to] (shotengai/plan.js NOOKS walks through it)
export const LOOKOUT_GAP = [28.55, 30.35];

const { PROMENADE: P, WALL_Z, BAND, STAIRS, ALLEYS, LINKS, BEACH_E, BAYS } = S;
const BW = 0.25; // soldier borders
const STONE = { cheek: '#8d9194', nosing: '#6c7177', tread: '#9a9a96' };
const WET = new THREE.Color(SAND).multiplyScalar(0.9).getStyle();
const SURF = '#b9c6cc'; // as the west coast's (outdoor/coast.js)
const FOAM = { cast: false, opts: { transparent: true, opacity: 0.3, depthWrite: false } };
const ROCKS = ['#5f666e', '#6b7279', '#585e66', '#737a82'];
const SHALLOW = '#6c8794';
const SHALLOWS = { cast: false, opts: { transparent: true, opacity: 0.3, depthWrite: false } };
const FOAM_LINE = { cast: false, opts: { transparent: true, opacity: 0.85, depthWrite: false } };
const SHADE = new THREE.Color(SAND).multiplyScalar(0.8).getStyle();
const DUNE = '#7a8460';
const CANVAS = '#3f6f77'; // the canteen's awning teal (plaza-buildings.js AWNING)
const HUT = {
  walls: ['#93a4ad', '#a9adb2', '#8fa09f'],
  roofs: ['#5f7f86', '#8a939c', '#76866f'],
  trim: '#c9ccce',
};

const { LAMP_X, BENCH_X, FURNITURE_Z } = S;

// draws everything under `object` on the island map's layer only
export function mapOnly(object, layer, tag) {
  let i = 0;
  object.traverse((m) => {
    if (!m.isMesh) return;
    m.name ||= `${tag}:${i++}`; // named: the place's merge pass leaves it as it is
    if (layer == null) return;
    m.layers.set(layer);
    m.userData.noBatch = true;
  });
}

// what stands on the beach (island data in scenes/island-south.js): trodden sand from each flight's foot to the
// water, outcrops at the wall's foot midway between flights, the lifeguard's chair, the beach huts
function* beachThings(p, at) {
  const shoreZ = (x) => {
    const s = S.SHORELINE;
    for (let i = 0; i + 1 < s.length; i++)
      if (x >= s[i][0] && x <= s[i + 1][0])
        return s[i][1] + ((x - s[i][0]) / (s[i + 1][0] - s[i][0])) * (s[i + 1][1] - s[i][1]);
    return WALL_Z + 4;
  };
  // the wall's shadow on the sand (the map draws no sun shadow this far out)
  const [sx0, sz] = at(-13.6, WALL_Z + 0.3),
    sx1 = at(BEACH_E, 0)[0];
  p.box(SHADE, sx1 - sx0, 0.01, 1.1, (sx0 + sx1) / 2, -0.147, sz + 0.55, { cast: false });
  // between the flights and at the beach's ends: a group of boulders with dune grass round it, halfway down the sand
  for (const x of [0, 9.5, 21.5, 31, 41.5, 54]) {
    const z = WALL_Z + 3 + (shoreZ(x) - WALL_Z - 6) * hash2(x, 1, 103);
    for (let j = 0; j < 5; j++) {
      const a = j * 1.3 + hash2(x, j, 97),
        [rx, rz] = at(x + Math.cos(a) * 0.5 * Math.sqrt(j), z + Math.sin(a) * 0.45 * Math.sqrt(j));
      boulder(p, rx, rz, (j ? 0.3 : 0.55) * (0.8 + hash2(rx, j, 101) * 0.5), -0.16);
    }
    for (let j = 0; j < 6; j++) {
      const [gx, gz] = at(x - 1.6 + hash2(j, x, 105) * 3.2, z - 1.2 + hash2(x, j, 107) * 2.4);
      grass(p, gx, gz, { h: 0.35, color: DUNE, seed: j + Math.round(x) });
    }
    yield;
  }
  // the umbrellas: a pole and a canopy of eight panels in two colours, a towel beside some
  S.UMBRELLAS.forEach(([x, z], i) => {
    const [ux, uz] = at(x, z);
    p.box(STEEL.pale, 0.05, 1.7, 0.05, ux, -0.15, uz);
    for (let k = 0; k < 8; k++)
      p.geo(
        k % 2 ? CANVAS : HUT.trim,
        new THREE.ConeGeometry(0.95, 0.3, 2, 1, false, (k * Math.PI) / 4, Math.PI / 4).translate(ux, 1.7, uz),
      );
    if (i % 2 === 0) p.box(i % 4 ? HUT.walls[0] : CANVAS, 0.7, 0.02, 1.5, ux + 1.1, -0.15, uz + 0.3, { cast: false });
  });
  yield;
  // the huts: a box with a door to the sea under a gable roof along x
  S.HUTS.forEach(([x, z], i) => {
    const [hx, hz] = at(x, z);
    p.box(HUT.walls[i % 3], 1.8, 1.3, 1.4, hx, -0.15, hz);
    p.box(CANVAS, 0.7, 1.0, 0.04, hx, -0.15, hz + 0.71);
    p.box(HUT.trim, 2.1, 0.08, 0.16, hx, 1.66, hz); // the ridge
    const half = 0.95,
      shape = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, 0.55)]);
    p.geo(
      HUT.roofs[i % 3],
      new THREE.ExtrudeGeometry(shape, { depth: 2.0, bevelEnabled: false })
        .rotateY(Math.PI / 2)
        .translate(hx - 1.0, 1.15, hz),
    );
  });
}

// a boulder half sunk at (x, z), r across
function boulder(p, x, z, r, y) {
  const g = new THREE.DodecahedronGeometry(r, 0)
    .rotateY(hash2(x, z, 83) * 6.3)
    .rotateX(hash2(z, x, 87) * 0.6)
    .scale(1.15, 0.6, 1)
    .translate(x, y + r * 0.2, z);
  p.geo(ROCKS[Math.floor(hash2(z, x, 85) * 4)], g, { cast: false });
}

export function* seafrontSteps(root, { at, layer = null, backWalk = false }) {
  const group = new THREE.Group();
  root.add(group);
  // an island rect [x0, z0, x1, z1] in the place's frame as the kit's [x0, x1, z0, z1]
  const R = ([x0, z0, x1, z1]) => {
    const [a, b] = at(x0, z0),
      [c, d] = at(x1, z1);
    return [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)];
  };
  const pv = paver(),
    p = new Parts(),
    lights = lightSet();

  // the promenade: a dark course along its north edge, pale slabs with a dark course on every bay line, the band
  // along the wall with a pale course at the coping; across it on each alley's axis a band of the wall band's stone
  // between dark courses
  const [px0, px1, pz0, pz1] = R(P);
  const bandZ = pz1 - BAND,
    origin = at(BAYS.x0, P[1]);
  const course = (rect, module, tones = GRANITE.dark, h = 0.007) =>
    pv.field(rect, { pattern: 'grid', module, tones, h });
  course([px0, px1, pz0, pz0 + BW], [0.15, BW]);
  pv.field([px0, px1, pz0 + BW, bandZ], {
    pattern: 'bond',
    module: [1.2, 0.6],
    tones: [GRANITE.pale[0], GRANITE.pale[2]],
    vary: 0.015,
    origin,
  });
  for (let x = BAYS.x0; x <= BAYS.x0 + BAYS.w * BAYS.n + 0.01; x += BAYS.w) {
    const lx = at(x, 0)[0];
    course([lx - 0.08, lx + 0.08, pz0 + BW, bandZ], [0.16, 0.3]);
  }
  pv.field([px0, px1, bandZ, pz1 - 0.3], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin });
  course([px0, px1, bandZ - 0.15, bandZ], [0.3, 0.15]);
  course([px0, px1, pz1 - 0.3, pz1], [0.15, 0.3], GRANITE.edge);
  yield;
  for (const s of STAIRS) {
    const [sx0, sx1] = R(s);
    pv.field([sx0, sx1, pz0 + BW, bandZ], {
      pattern: 'bondZ',
      module: [0.6, 0.3],
      tones: GRANITE.mid,
      vary: 0.015,
      origin: [sx0, pz0],
      h: 0.009,
    });
    for (const x of [sx0 - 0.15, sx1]) course([x, x + 0.15, pz0 + BW, bandZ], [0.15, 0.3], GRANITE.dark, 0.01);
    yield;
  }
  // the footpath along the north row's backs, where the plaza's own doesn't reach (backWalk)
  if (backWalk)
    pv.field(R(S.BACK_WALK), {
      pattern: 'grid',
      module: [0.6, 0.6],
      tones: GRANITE.mid,
      origin: at(S.BACK_WALK[0], 0),
    });
  // the walks down the arcade's mouths and through the alleys: pale slabs between soldier borders on their long
  // sides
  for (const w of [LINKS.west, LINKS.east, ...ALLEYS]) {
    const [x0, x1, z0, z1] = R(w);
    pv.field([x0, x1, z0, z1], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [x0, z0] });
    for (const x of [x0, x1 - BW]) course([x, x + BW, z0, z1], [BW, 0.15], GRANITE.edge);
  }
  yield;
  pv.build(group); // the paving is the bulk: built on its own step
  yield;

  // the alleys' beds, between the walk and the next building, kerbed on the walk's side
  for (const [k, w] of ALLEYS.entries()) {
    const [x0, x1, z0, z1] = R(w),
      gap = BAYS.w / 2 - 1;
    bed(p, [x0 - gap + 0.05, x0 - 0.05, z0 + 0.1, z1 - 0.1], { y: 0.08 });
    bed(p, [x1 + 0.05, x1 + gap - 0.05, z0 + 0.1, z1 - 0.1], { y: 0.08 });
    for (const x of [x0, x1]) kerb(p, [x, z0], [x, z1], { w: 0.14 });
    S.SOUTH_SHRUBS.slice(k * 6, k * 6 + 6).forEach(([sx, sz], i) => {
      const [lx, lz] = at(sx, sz);
      cluster(p, lx, lz, { n: 3, r: 0.3, spread: 0.4, seed: 30 + k * 6 + i, y: 0.08 });
    });
    yield;
  }
  // kerbs where paving meets lawn: the promenade's west end and its north edge west and east of the rows, the west
  // walk's outer sides, the east walk's east side
  const kerbs = [
    [P[0], P[1], P[0], WALL_Z - 0.3],
    [-14.1, P[1], LINKS.west[0], P[1]],
    [LINKS.west[0], LINKS.west[1], LINKS.west[0], LINKS.west[3]],
    [LINKS.west[0], LINKS.west[1], LINKS.west[2], LINKS.west[1]],
    [LINKS.east[2], LINKS.east[1], LINKS.east[2], LINKS.east[3]],
    [S.EAST_BED[0], S.EAST_BED[1], S.EAST_BED[0], S.EAST_BED[3]],
    [S.EAST_BED[0], S.EAST_BED[3], S.EAST_BED[2], S.EAST_BED[3]],
    [S.EAST_BED[2], S.EAST_BED[1], S.EAST_BED[2], S.EAST_BED[3]],
  ];
  // the bed between the rows' east end and the east walk, a zelkova in it
  const eb = R(S.EAST_BED);
  bed(p, [eb[0] + 0.1, eb[1] - 0.1, eb[2] + 0.1, eb[3] - 0.1], { y: 0.08 });
  for (const [x, z] of [
    [65.3, 23.4],
    [67.6, 25.9],
    [65.6, 26.1],
  ]) {
    const [lx, lz] = at(x, z);
    cluster(p, lx, lz, { n: 3, r: 0.32, spread: 0.4, seed: Math.round(x * 3), y: 0.08 });
  }
  for (const [x0, z0, x1, z1] of kerbs) kerb(p, at(x0, z0), at(x1, z1), { w: 0.16 });
  yield;

  // the stairs: six treads down between two cheek walls, a dark nosing on each
  for (const s of STAIRS) {
    const [x0, x1, z0, z1] = R(s),
      td = (z1 - z0) / 6,
      cx = (x0 + x1) / 2;
    for (let i = 0; i < 6; i++) {
      const y = -0.06 - i * 0.015,
        z = z0 + td * i;
      p.box(STONE.tread, x1 - x0 - 0.4, 0.04, td, cx, y, z + td / 2, { cast: false });
      p.box(STONE.nosing, x1 - x0 - 0.4, 0.045, 0.07, cx, y, z + td - 0.035, { cast: false });
    }
    for (const x of [x0 + 0.1, x1 - 0.1]) p.box(STONE.cheek, 0.22, 0.25, z1 - z0, x, -0.05, (z0 + z1) / 2);
    p.box(STONE.tread, x1 - x0 + 0.6, 0.03, 1.2, cx, -0.15, z1 + 0.6, { cast: false }); // a landing on the sand
  }
  yield;
  // the lookout at the promenade's east end, over the rocks: a rail on its seaward sides
  rail(p, at(BEACH_E, WALL_Z - 0.25), at(P[2] - 0.15, WALL_Z - 0.25));
  // (its east side open at LOOKOUT_GAP, onto the lawn under the pines: the shop street's nook there)
  rail(p, at(P[2] - 0.15, WALL_Z - 0.25), at(P[2] - 0.15, LOOKOUT_GAP[1]));
  rail(p, at(P[2] - 0.15, LOOKOUT_GAP[0]), at(P[2] - 0.15, P[1] + 0.4));
  yield;
  // lamps and benches in the band along the wall, bins beside every other bench
  const bz = FURNITURE_Z;
  lamps(
    lights,
    p,
    LAMP_X.map((x) => at(x, bz)),
    { pool: 1.1 },
  );
  BENCH_X.forEach((x, i) => {
    const [lx, lz] = at(x, bz - 0.1);
    // a pair back to back: one faces the sea, one the shops
    bench(p, lx, lz + 0.3, 0, { len: 1.8 });
    bench(p, lx, lz - 0.3, Math.PI, { len: 1.8 });
    if (i % 2) bins(p, lx + 1.4, lz + 0.1, 0);
  });
  yield;

  // the beach: a wet band along the water, a drift line of weed above it, the shallows lighter than the sea, a foam
  // line on the water's edge and patches of foam beyond it; boulders in groups, most at the water's edge and in the
  // shallows (each with a ring of foam), a few up the sand; trodden sand from each flight of stairs to the water;
  // outcrops at the wall's foot between the flights; a lifeguard's chair and three beach huts
  yield* beachThings(p, at);
  const shore = S.SHORELINE.map(([x, z]) => at(x, z));
  for (let i = 0; i + 1 < shore.length; i++) {
    const a = shore[i],
      b = shore[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
      n = [-d[1], d[0]], // toward the sea
      Q = (u, o) => [a[0] + d[0] * u + n[0] * o, a[1] + d[1] * u + n[1] * o];
    along(p, WET, Q(L / 2, -0.8), d, L + 0.5, 1.6, -0.16, -0.143, { cast: false });
    along(p, SHALLOW, Q(L / 2, 1.3), d, L + 0.2, 2.2, -0.2, -0.19, SHALLOWS);
    along(p, SURF, Q(L / 2, 0.2), d, L + 0.4, 0.45, -0.19, -0.172, FOAM_LINE);
    for (let u = 0.6; u < L - 0.4; u += 1.1 + hash2(u, i, 61) * 1.2) {
      const f = new THREE.DodecahedronGeometry(0.6 + hash2(i, u, 63) * 0.5, 0)
        .scale(2.2, 0.03, 0.8)
        .rotateY(Math.atan2(-d[1], d[0]));
      const [fx, fz] = Q(u, 0.35 + hash2(u, i, 65) * 0.5);
      p.geo(SURF, f.translate(fx, -0.18, fz), FOAM);
    }
    for (let u = 1.5 + hash2(i, 0, 67) * 2; u < L - 0.6; u += 3.5 + hash2(u, i, 69) * 3) {
      const h = hash2(u, i, 71),
        off =
          h < 0.55 ? 0.4 + hash2(i, u, 73) * 1.8 : h < 0.9 ? -0.3 - hash2(i, u, 73) * 0.9 : -3 - hash2(i, u, 75) * 4;
      const k = 3 + Math.floor(hash2(u, off, 77) * 4);
      for (let j = 0; j < k; j++) {
        const a = (j / k) * 6.3 + hash2(j, u, 79),
          [rx, rz] = Q(u + Math.cos(a) * 0.4 * Math.sqrt(j), off + Math.sin(a) * 0.35 * Math.sqrt(j));
        const r = (j ? 0.32 : 0.6) * (0.7 + hash2(rx, rz, 81) * 0.6);
        boulder(p, rx, rz, r, -0.2);
        if (off > 0)
          p.geo(SURF, new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.02, 9).translate(rx, -0.18, rz), FOAM);
      }
    }
    yield;
  }
  p.build(group);
  yield;
  const lit = lights.build(group, { poolY: 0.02 });
  yield;

  // the sea wall, its rocks and surf, the shrubs at its foot and the pines (outdoor/coast.js)
  yield* coastSteps(group, { at, data: { coast: S.SOUTH_COAST, trees: S.SOUTH_TREES, paved: [S.PROMENADE] } });
  mapOnly(group, layer, 'seafront');
  return { evening: () => lit.evening() };
}
