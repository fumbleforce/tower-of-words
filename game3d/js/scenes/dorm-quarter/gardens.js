// The dorm quarter's gardens and the ground round its blocks (the plan is dorm-quarter/plan.js), in the island frame:
//   the residents' allotments: plots of dark soil in timber edging with rows of vegetables, canes and a net here and
//   there, a water tank and cans; the tool shed; the orchard of plums and persimmons beyond; a low hedge along the
//   north path, open at the gardens' path
//   the ground-floor flats' gardens: a clipped hedge round each run and a lower one between flats, a gate onto the
//   lawn, a chair or a pot or a drying rack in some; the villas' walled gardens with a tree each
//   N-E's sea garden: the pergola over two picnic tables, pines in groups, a cherry, the lawn out to the water
//   S-E's court: the walk to its door, a play spot of two spring riders and a bench on a soft pad, trees; a bike
//   shelter by each block's door
//   the lawns round Eric's block and along the dorm street: zelkovas, cherries and maples, loose on the lawn
//   lamps along the north path, the north-south walk and the north-east walks
import * as THREE from 'three';
import { hedge, keyaki, sakura, pine, maple, ginkgo, mound, grass, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins, STEEL, PAINTED } from '../outdoor/furniture.js';
import { lowWall } from '../outdoor/edges.js';
import { shelter } from '../dorm-court/cluster-yards.js';
import { hash2 } from '../outdoor/parts.js';
import * as Q from './plan.js';
import { QUARTER_LAMPS } from './fittings.js';

const SOIL = '#5a4a3c',
  EDGING = '#8a7560',
  CROPS = ['#5f7f45', '#6f8f4f', '#4f6f3f', '#7f9a55'],
  WOOD = '#9a846c';

// a plot: soil in a timber edging, rows of crops along it (or canes with beans, or a net over cabbages)
function plot(p, [x0, x1, z0, z1], i, far) {
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    w = x1 - x0,
    d = z1 - z0;
  p.box(SOIL, w - 0.1, 0.06, d - 0.1, cx, 0, cz, { cast: false, surf: 'soil' });
  for (const [ew, ed, ex, ez] of [
    [w, 0.08, cx, z0 + 0.04],
    [w, 0.08, cx, z1 - 0.04],
    [0.08, d, x0 + 0.04, cz],
    [0.08, d, x1 - 0.04, cz],
  ])
    p.box(EDGING, ew, 0.12, ed, ex, 0, ez, { surf: 'wood' });
  const kind = i % 4;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const z = z0 + 0.45 + (r * (d - 0.9)) / (rows - 1);
    if (kind === 2 && r % 2) {
      // canes in a row, a vine up them
      for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.45) {
        p.geo('#b9a77e', new THREE.CylinderGeometry(0.015, 0.015, 1.1, 4).translate(x, 0.55, z), { cast: false });
        if (!far) mound(p, x, z, 0.12, CROPS[(r + i) % 4], { y: 0.45, squash: 1.4 });
      }
      continue;
    }
    if (far && r % 2) continue;
    for (let x = x0 + 0.35; x < x1 - 0.25; x += (far ? 0.6 : 0.32) + hash2(x, z, i) * 0.12)
      mound(p, x, z, 0.12 + hash2(z, x, i) * 0.07, CROPS[(r + i + Math.round(x)) % 4], { y: 0.06, squash: 0.8 });
  }
  if (kind === 3 && !far) {
    // a net on hoops over one row
    for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.6)
      p.geo(
        '#cfd6d0',
        new THREE.TorusGeometry(0.28, 0.012, 3, 8, Math.PI).rotateY(Math.PI / 2).translate(x, 0.06, z0 + 0.6),
        { cast: false },
      );
    p.box('#dfe5e0', w - 0.6, 0.01, 0.56, cx, 0.34, z0 + 0.6, { cast: false });
  }
}

function allotments(p, lights, far) {
  for (const [i, r] of Q.PLOTS.entries()) plot(p, r, i, far);
  // the water tank by the shed, a can or two, a wheelbarrow
  const [sx0, sx1, sz0, sz1] = Q.SHED;
  p.geo('#4d6b8a', new THREE.CylinderGeometry(0.4, 0.4, 0.9, 12).translate(sx1 + 0.6, 0.45, sz0 + 0.5), PAINTED);
  p.box('#6c8a5a', 0.25, 0.22, 0.14, sx1 + 0.5, 0, sz1 + 0.3);
  p.box('#c0533f', 0.25, 0.22, 0.14, sx0 - 0.3, 0, sz1 + 0.35);
  p.geo('#5b616b', new THREE.BoxGeometry(0.5, 0.22, 0.8).rotateX(0.1).translate(sx0 - 0.5, 0.35, sz0 + 0.5), PAINTED);
  // a bench by the gardens' path, under the orchard's edge, for a rest between rows
  bench(p, Q.GARDEN_PATH[1] + 0.9, Q.PLOT_WALKS[0][2] - 0.55, Math.PI, { len: 1.4 });
  // the low hedge along the north path, open at the gardens' path; and round the gardens' east and west ends
  const hz = Q.NORTH[2] - 0.35;
  hedge(p, [Q.NW_SHELTER[1] + 0.4, hz], [Q.GARDEN_PATH[0] - 0.1, hz], { w: 0.45, h: 0.55, seed: 141 });
  hedge(p, [Q.GARDEN_PATH[1] + 0.1, hz], [Q.ORCHARD[1], hz], { w: 0.45, h: 0.55, seed: 142 });
  hedge(p, [Q.ORCHARD[0] - 0.3, -55.9], [Q.ORCHARD[0] - 0.3, hz], { w: 0.45, h: 0.55, seed: 143 });
  hedge(p, [Q.ORCHARD[1] + 0.3, -55.9], [Q.ORCHARD[1] + 0.3, hz], { w: 0.45, h: 0.55, seed: 144 });
}

// the orchard: plums (a cherry's shape in a darker green) and persimmons (a zelkova's, smaller, with fruit on it)
function* orchard(p, far) {
  for (const [x, z, kind] of Q.ORCHARD_TREES) {
    if (kind === 'plum') sakura(p, x, z, 0.75, Math.round(x * 3));
    else {
      keyaki(p, x, z, 0.72, Math.round(x * 3));
      if (!far)
        for (let i = 0; i < 9; i++) {
          const a = i * 2.1,
            r = 0.45 + (i % 3) * 0.2;
          p.geo(
            '#e07a2e',
            new THREE.SphereGeometry(0.07, 6, 4).translate(
              x + Math.cos(a) * r,
              1.35 + (i % 4) * 0.2,
              z + Math.sin(a) * r * 0.8,
            ),
            { cast: false },
          );
        }
    }
    yield;
  }
  // long grass under the trees
  if (!far)
    for (let x = Q.ORCHARD[0] + 0.6; x < Q.ORCHARD[1]; x += 1.3)
      grass(p, x, -51.2 + hash2(x, 1, 3), { h: 0.38, color: '#8f9a6a', seed: Math.round(x) });
}

// a run of ground-floor gardens: a hedge round its outer sides, lower ones between flats, a gap for a gate in each
// flat's outer hedge; a few things in them
function gardens(p, { rect, open, walled }, far, seed) {
  const [x0, x1, z0, z1] = rect;
  const alongX = open === 's' || open === 'n';
  const L = alongX ? x1 - x0 : z1 - z0,
    flats = Math.max(1, Math.round(L / 2.4)),
    fw = L / flats;
  const at = (t, o) => (alongX ? [x0 + t, open === 's' ? z1 - o : z0 + o] : [open === 'e' ? x1 - o : x0 + o, z0 + t]);
  const H = walled ? null : { w: 0.4, h: 0.62 };
  // the outer side, a gate gap in each flat's
  for (let i = 0; i < flats; i++) {
    const t0 = fw * i,
      t1 = fw * (i + 1),
      g = (t0 + t1) / 2;
    for (const [a, b] of [
      [t0 + 0.05, g - 0.35],
      [g + 0.35, t1 - 0.05],
    ]) {
      if (walled) lowWall(p, at(a, 0.12), at(b, 0.12), { h: 0.75, w: 0.22 });
      else hedge(p, at(a, 0.2), at(b, 0.2), { ...H, seed: seed + i * 2 });
    }
    // between flats, a lower hedge (or the wall) back to the building
    if (i) {
      const depth = alongX ? z1 - z0 : x1 - x0;
      if (walled) lowWall(p, at(t0, 0.25), at(t0, depth - 0.05), { h: 0.75, w: 0.18 });
      else hedge(p, at(t0, 0.4), at(t0, depth - 0.1), { w: 0.3, h: 0.45, seed: seed + i * 2 + 1 });
    }
    if (far) continue;
    // in some: a chair, a pot, a drying rack with washing
    const k = hash2(i, seed, 7);
    const [cx, cz] = at((t0 + t1) / 2 + fw * 0.15, (alongX ? z1 - z0 : x1 - x0) * 0.55);
    if (k < 0.35) p.box('#c9cdd0', 0.3, 0.32, 0.3, cx, 0, cz);
    else if (k < 0.65) {
      p.geo('#9a6f55', new THREE.CylinderGeometry(0.16, 0.12, 0.3, 8).translate(cx, 0.15, cz), { cast: false });
      mound(p, cx, cz, 0.2, LEAF.fresh, { y: 0.3 });
    } else {
      p.box(STEEL.pale, 0.03, 0.75, 0.03, cx - 0.4, 0, cz, { cast: false });
      p.box(STEEL.pale, 0.03, 0.75, 0.03, cx + 0.4, 0, cz, { cast: false });
      p.box(STEEL.pale, 0.82, 0.02, 0.02, cx, 0.74, cz, { cast: false });
      p.box(['#d9dcd8', '#8fa2b4', '#c7cdd2'][i % 3], 0.5, 0.3, 0.02, cx, 0.44, cz, { cast: false });
    }
  }
  // the outer side's end returns to the building, so the run is closed
  const depth = alongX ? z1 - z0 : x1 - x0;
  for (const t of [0.02, L - 0.02]) {
    if (walled) lowWall(p, at(t, 0.12), at(t, depth - 0.05), { h: 0.75, w: 0.22 });
    else hedge(p, at(t, 0.2), at(t, depth - 0.1), { ...H, seed: seed + 50 });
  }
}

// N-E's sea garden: the pergola on its pad, two picnic tables under it, pines in groups, a cherry
function seaGarden(p, lights) {
  const [x0, x1, z0, z1] = Q.PERGOLA,
    h = 2.25;
  for (const x of [x0 + 0.15, x1 - 0.15])
    for (const z of [z0 + 0.15, z1 - 0.15]) p.box('#7a654f', 0.14, h, 0.14, x, 0, z, { surf: 'wood' });
  for (const x of [x0 + 0.15, x1 - 0.15])
    p.box('#6f5c49', 0.12, 0.16, z1 - z0 + 0.4, x, h, (z0 + z1) / 2, { surf: 'wood' });
  for (let z = z0 - 0.1; z <= z1 + 0.11; z += 0.4)
    p.box(WOOD, x1 - x0 + 0.5, 0.08, 0.07, (x0 + x1) / 2, h + 0.16, z, { surf: 'wood' });
  for (const tz of [z0 + 0.85, z1 - 0.85]) picnic(p, (x0 + x1) / 2, tz);
  lights.lit.push([(x0 + x1) / 2, (z0 + z1) / 2, 1.4]);
  for (const [x, z, s, k] of [
    [123.4, -48.9, 0.95, pine],
    [124.8, -50.0, 0.85, pine],
    [126.8, -49.2, 0.9, pine],
    [127.8, -40.4, 0.95, sakura],
    [127.6, -53.4, 0.85, pine],
    [121.8, -54.6, 0.9, pine],
    [113.4, -54.2, 1.0, keyaki],
    [109.6, -52.8, 0.85, maple],
  ])
    k(p, x, z, s, Math.round(x * 7 + z));
}
// a picnic table: a timber top and two benches on A-legs, all one piece
function picnic(p, x, z) {
  p.box(WOOD, 1.4, 0.05, 0.6, x, 0.5, z, { surf: 'wood' });
  for (const s of [-1, 1]) p.box(WOOD, 1.4, 0.04, 0.24, x, 0.3, z + s * 0.5, { surf: 'wood' });
  for (const dx of [-0.55, 0.55]) p.box('#6f5c49', 0.06, 0.5, 1.2, x + dx, 0, z, { surf: 'wood' });
  (p.seats ||= []).push({ x, z: z + 0.5, facing: Math.PI, len: 1.3 }, { x, z: z - 0.5, facing: 0, len: 1.3 });
}

// S-E's court: a soft pad with two spring riders and a bench by it, its trees
function seCourt(p) {
  const [x0, x1, z0, z1] = Q.SE_PLAY;
  p.box('#8a6f62', x1 - x0, 0.03, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { cast: false });
  for (const [x, z, c] of [
    [x0 + 0.9, z0 + 1.0, '#4f8a6a'],
    [x1 - 0.9, z0 + 1.4, '#d9a73e'],
  ]) {
    p.geo(STEEL.mid, new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8).translate(x, 0.2, z), { cast: false });
    p.box(c, 0.22, 0.24, 0.55, x, 0.37, z, PAINTED);
    p.box(c, 0.2, 0.22, 0.18, x, 0.57, z - 0.22, PAINTED);
  }
  bench(p, (x0 + x1) / 2, z1 + 0.5, Math.PI, { len: 1.6 });
  for (const [k, x, z, s] of [
    [keyaki, 110.3, -6.0, 1.0],
    [sakura, 116.4, -6.4, 0.9],
    [maple, 110.0, -3.2, 0.8],
    [ginkgo, 113.6, -7.0, 0.85],
  ])
    k(p, x, z, s, Math.round(x * 5 + z));
}

// the lawns: round Eric's block (south of it, west of its return along the dorm street), between the court's garden
// and the north-south walk, round N-W's ends
const LAWN_TREES = [
  [keyaki, 77.6, -6.2, 1.05],
  [sakura, 77.8, -1.2, 0.95],
  [keyaki, 77.6, 4.2, 1.0],
  [maple, 84.0, 6.2, 0.8],
  [keyaki, 90.2, 6.6, 1.0],
  [sakura, 96.0, 6.2, 0.9],
  [maple, 101.6, 6.6, 0.8],
  [keyaki, 103.6, 1.4, 1.0],
  [ginkgo, 77.0, -33.0, 0.95],
  [keyaki, 104.8, -33.4, 1.0],
  [sakura, 109.4, -33.2, 0.95],
  [maple, 116.0, -33.6, 0.8],
];

export function* gardensSteps(pv, p, lights, { far = false } = {}) {
  allotments(p, lights, far);
  yield;
  yield* orchard(p, far);
  for (const [i, g] of Q.GARDENS.entries()) {
    gardens(p, g, far, 150 + i * 20);
    yield;
  }
  // a tree in each villa's garden
  sakura(p, 98.4, 21.4, 0.85, 171);
  maple(p, 111.8, 21.3, 0.85, 172);
  seaGarden(p, lights);
  yield;
  seCourt(p);
  // bike shelters by N-W's door and S-E's
  shelter(p, lights, Q.NW_SHELTER, 's', 3);
  shelter(p, lights, Q.SE_SHELTER, 's', 6);
  yield;
  for (const [k, x, z, s] of LAWN_TREES) {
    k(p, x, z, s, Math.round(x * 3 + z * 5));
    yield;
  }
  bins(p, Q.GATE_X - 2.0, Q.NORTH[3] + 0.4, Math.PI);
  lamps(lights, p, QUARTER_LAMPS, { pool: 1.3 });
  yield;
}
