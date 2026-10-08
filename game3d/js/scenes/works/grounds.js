// The old works' ground (works/plan.js), in the island frame:
//   the lane: the supply yard's big concrete slabs carried on north (laid the same way as its mouth in the harbour,
//   so the two meet), to the chimney's foot; the plant's apron the same
//   the yard, the aprons and the corners: older concrete, worn and patched, short edge fractures, weeds at the edges
//   the works street: old asphalt with faded white edge lines and patches, kerbed, from the office street (the
//   harbour and the office quarter lay its mouth with worksStreet too)
//   the research walk and the two forecourts: the town's pale slabs, kerbed (newer than the works round them)
//   lamps: the works' arm lamps on their poles, post lamps on the research walk; utility poles with their wires down
//   the street's west side; the finger sign at the yard's east end
//   the lawns: trees between the lane and the harbour office, behind the street's east side and round Amakawa
//   Research; weeds along the walls and fences
import * as THREE from 'three';
import { kerb, kerbRect } from '../outdoor/edges.js';
import { lamps, fingerSign, STEEL, rod } from '../outdoor/furniture.js';
import { pine, keyaki, sakura, maple, grass, hedge } from '../outdoor/planting.js';
import { hash2 } from '../outdoor/parts.js';
import { belt } from '../dorm-court/cluster-yards.js';
import { walk } from '../plaza/east-lane.js';
import { CONCRETE } from '../harbour/quay.js';
import { fence } from './props.js';
import * as P from './plan.js';
import { vergeSteps } from './verges.js';
import { laneBeds, yardSurface } from './yard-details.js';

const WORN = ['#8b8984', '#84827d', '#918e88', '#7e7c77'];
const ASPHALT = ['#5d6065', '#595c61', '#62656a'];
const SLABS = { pattern: 'grid', module: [0.6, 0.6], tones: ['#a3a09b', '#9d9a95', '#a8a6a1', '#98958f'] };
const NO = { cast: false };
const { LANE: L, YARD: Y, GATE: G, APRON: A, STREET: S } = P;

// the works street from z0 to z1 (south): asphalt, faded white edge lines, patches on a fixed grid (so every
// chunk that lays a stretch of it lays the same ones), kerbs down both sides unless p is null. The asphalt lies
// 2 mm under the other paving (0.004), so a pad or lane that runs onto it never lies level with it
export function worksStreet(pv, p, [z0, z1]) {
  const [x0, x1] = [S[0], S[1]];
  pv.field([x0, x1, z0, z1], {
    pattern: 'grid',
    module: [3, 3],
    tones: ASPHALT,
    vary: 0.04,
    gap: 0,
    h: 0.004,
    origin: [x0, S[3]],
  });
  for (const x of [x0 + 0.22, x1 - 0.32])
    pv.field([x, x + 0.1, z0, z1], {
      pattern: 'grid',
      module: [0.1, 1.2],
      tones: ['#b9bab4', '#aeafa9'],
      vary: 0.1,
      gap: 0.05,
      h: 0.009,
      origin: [x, S[3]],
    });
  for (let z = S[3] - 4; z > z0; z -= 7.5) {
    if (z > z1 - 1.5) continue;
    const u = hash2(z, 3),
      w = 0.8 + u * 1.0;
    const px = x0 + 0.5 + u * (x1 - x0 - 1 - w);
    pv.field([px, px + w, z - 0.6 - u, z], {
      pattern: 'grid',
      module: [3, 3],
      tones: ['#54575c'],
      vary: 0,
      gap: 0,
      h: 0.008,
    });
  }
  if (!p) return;
  kerb(p, [x0, z0], [x0, z1], { off: 0.08 });
  kerb(p, [x1, z0], [x1, z1], { off: -0.08 });
}

// cracks: thin dark lines wandering across a rect; weeds where some end
function cracks(p, [x0, x1, z0, z1], n, seed) {
  for (let i = 0; i < n; i++) {
    let x = x0 + hash2(i, seed) * (x1 - x0),
      z = z0 + hash2(seed, i) * (z1 - z0),
      a = hash2(i, i + seed) * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const len = 0.16 + hash2(k, i + seed, 3) * 0.22,
        nx = Math.min(x1 - 0.05, Math.max(x0 + 0.05, x + Math.cos(a) * len)),
        nz = Math.min(z1 - 0.05, Math.max(z0 + 0.05, z + Math.sin(a) * len));
      const l = Math.hypot(nx - x, nz - z);
      if (l > 0.05)
        p.box('#6d6c65', 0.018, 0.014, l, (x + nx) / 2, 0, (z + nz) / 2, { ry: Math.atan2(nx - x, nz - z), ...NO });
      [x, z] = [nx, nz];
      a += (hash2(k, i, seed) - 0.5) * 1.4;
    }
    if (i % 3 === 0) grass(p, x, z, { h: 0.3, seed: seed + i });
  }
}

// the lane, the yard and the aprons: the lane's slabs, the works' older concrete, its patches, kerbs and cracks
// (the harbour lays them too, as it sees them up the works lane: laneViewSteps)
function* yardPaving(pv, p, laneTo = L[3] + 0.4) {
  // the lane in the supply yard's slabs (harbour/quay.js), from the yard's north edge
  const lane = {
    pattern: 'grid',
    module: [2.4, 2.4],
    tones: CONCRETE,
    vary: 0.04,
    gap: 0.03,
    origin: [L[0], Y[3] + 4],
  };
  pv.field([L[0], L[1], P.FOOT[2], laneTo], lane);
  pv.field([L[1], P.FOOT[1], P.FOOT[2], P.FOOT[3]], lane);
  pv.field(P.PLANT_APRON, lane);
  // the works' own older concrete
  const worn = (r, seed) =>
    pv.field(r, {
      pattern: 'grid',
      module: [2.0, 2.0],
      tones: WORN,
      vary: 0.08,
      gap: 0.04,
      origin: [L[1], Y[2]],
      seed,
    });
  worn([L[1], Y[1], Y[2], Y[3]], 3);
  worn([G[0], G[1], G[2], G[3]], 4);
  worn([A[0], A[1], A[2], A[3]], 5);
  worn([P.CORNER[0], P.HALL[0], P.CORNER[2] + 0.2, P.CORNER[3]], 6);
  worn([P.LOT[0], P.LOT[1], P.LOT[2], Y[2]], 7);
  // patches of newer concrete in the yard
  for (const [x, w] of [
    [-74.5, 2.2],
    [-60.2, 1.6],
    [-55.4, 2.6],
  ])
    pv.field([x, x + w, Y[2] + 1.2, Y[3] - 0.3], {
      pattern: 'grid',
      module: [3, 3],
      tones: ['#9a9893'],
      vary: 0,
      gap: 0,
      h: 0.009,
    });
  yield;
  // kerbs where the paving meets the lawn
  kerb(p, [L[0], P.PLANT_APRON[3]], [L[0], L[3]], { off: 0.08 });
  kerb(p, [L[0], P.FOOT[2]], [L[0], P.PLANT_APRON[2]], { off: 0.08 });
  kerb(p, [L[1], Y[2]], [L[1], L[2]], { off: -0.08 });
  kerbRect(p, A, { sides: 's' });
  yardSurface(pv, p);
  cracks(p, [L[1], Y[1] - 4, Y[2], Y[2] + 0.7], 7, 11);
  cracks(p, [G[0], G[1], G[2], G[2] + 0.8], 3, 23);
  cracks(p, [A[0] + 3, A[1], A[3] - 0.6, A[3]], 3, 31);
  yield;
}

function* paving(pv, p) {
  yield* yardPaving(pv, p);
  worksStreet(pv, p, [S[2], S[3]]);
  walk(pv, P.RWALK, true);
  pv.field(P.N4_LANDING, { ...SLABS, origin: [P.N4_LANDING[0], P.N4_LANDING[2]] });
  pv.field(P.W2_COURT, { ...SLABS, origin: [P.W2_COURT[0], P.W2_COURT[2]] });
  kerbRect(p, P.RWALK, { sides: 'ns', gaps: { n: [[P.STATION_GATE[0], P.STATION_GATE[1]]], s: [] } });
  yield;
}

// a concrete utility pole with a crossarm and its insulators
function pole(p, x, z) {
  p.geo('#a9a79f', new THREE.CylinderGeometry(0.1, 0.14, 7.4, 8).translate(x, 3.7, z), { surf: 'concrete' });
  p.box(STEEL.dark, 0.08, 0.08, 1.4, x, 6.7, z);
  for (const dz of [-0.55, 0, 0.55])
    p.geo('#c9c3b2', new THREE.CylinderGeometry(0.04, 0.05, 0.16, 6).translate(x, 6.86, z + dz), NO);
  p.box('#5a6066', 0.3, 0.45, 0.3, x + 0.2, 5.6, z, NO); // the transformer can
}

// the lamps of a kind ('arm' or 'post') that `keep` keeps
function lampsOf(p, lights, kind, keep = () => true) {
  const pts = P.LAMPS[kind].filter(keep);
  lamps(
    lights,
    p,
    pts.map(([x, z]) => [x, z]),
    { kind, dirs: pts.map((q) => q[2] ?? 0), pool: kind === 'arm' ? 1.4 : 1.0 },
  );
}

function* furniture(p, lights, signRoot) {
  for (const kind of ['arm', 'post']) lampsOf(p, lights, kind);
  fingerSign(signRoot, p, ...P.SIGN, P.SIGN_BOARDS);
  // utility poles down the street's west side, the wires between them
  const zs = [-61, -72, -83, -94, -103.5],
    x = S[0] - 1.2;
  for (const z of zs) pole(p, x, z);
  for (let i = 0; i + 1 < zs.length; i++)
    for (const dz of [-0.55, 0.55]) rod(p, '#2b2e33', [x, 6.9, zs[i] + dz], [x, 6.9, zs[i + 1] + dz], 0.012);
  yield;
}

// the fences: the old works' chain-link down the street's west side, behind the poles, with a gate chained shut
function* fences(p, mesh) {
  fence(p, mesh, [S[0] - 2.4, -96], [S[0] - 2.4, -64], { h: 1.8, gaps: [[14, 17.6]] });
  const gz = -96 + 14;
  for (const s of [0, 1]) p.box(STEEL.mid, 0.04, 1.7, 1.8, S[0] - 2.4, 0.05, gz + 0.9 + s * 1.8);
  rod(p, '#2b2e33', [S[0] - 2.35, 1.0, gz + 1.6], [S[0] - 2.35, 1.0, gz + 2.0], 0.03);
  for (let k = 0; k < 12; k++) grass(p, S[0] - 2.1 - ((k * 0.7) % 1.2), -95 + k * 2.6, { seed: 400 + k });
  yield;
}

// the trees and the weeds
// between the lane and the harbour office, and between the office and the plant (the harbour plants them too)
const LANE_BELTS = [
  [[P.PLANT[0] + 1, L[0] - 1.0, -108.8, -105.6], [keyaki, sakura, pine], 501, 3.0],
  [[-87.4, L[0] - 1.1, -105, -100.4], [pine, keyaki], 503, 2.8],
];

function* trees(p, treeRoot) {
  yield* laneBeds(p, LANE_BELTS);
  for (const [r, kinds, seed, pitch] of [
    // south of the research walk
    [[-45.4, -38.5, -101.4, -98.6], [maple, sakura], 507, 2.6],
    // the lawn west of the street's fence, set well back
    [[-61.5, S[0] - 4.6, -94, -71], [keyaki, pine, maple], 511, 3.4],
  ])
    yield* belt(p, r, kinds, { seed, pitch });
  yield* vergeSteps(p, treeRoot);
  hedge(p, [-46.6, P.RWALK[3] + 0.6], [-35.6, P.RWALK[3] + 0.6], { w: 0.45, h: 0.5, seed: 513 });
  // weeds along the walls: the shed's and the gatehouse's fronts, the factory's, the hall's north face
  for (let k = 0; k < 18; k++) {
    const x = Y[0] + 0.6 + ((k * 1.83) % (Y[1] - Y[0] - 4));
    grass(p, x, Y[2] - 0.15, { h: 0.35, seed: 520 + k });
  }
  for (let k = 0; k < 8; k++) grass(p, G[0] + 0.3 + k * 1.05, G[2] + 0.2, { h: 0.4, seed: 540 + k });
  yield;
}

// what the harbour sees up the works lane from the supply yard (scenes/harbour.js): the lane, the yard and the
// aprons, the arm lamps along the lane and the yard, the trees either side of the harbour office; c: the harbour's
// cells; lights: its lightSet
export function* laneViewSteps(c, lights) {
  yield* yardPaving(c.paver, c.parts, L[3]); // to the supply yard's edge, its slabs on
  lampsOf(c.parts, lights, 'arm', ([, z]) => z < Y[3] + 1);
  yield* laneBeds(c.parts, LANE_BELTS);
}

// c: cells (dorm-court/cells.js); lights: a lightSet; signRoot: the finger sign's boards; mesh: the chain-link's Parts
export function* groundsSteps(c, lights, signRoot, mesh) {
  yield* paving(c.paver, c.parts);
  yield* furniture(c.parts, lights, signRoot);
  yield* fences(c.parts, mesh);
  yield* trees(c.parts, signRoot);
}
