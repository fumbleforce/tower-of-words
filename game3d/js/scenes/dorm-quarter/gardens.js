// The dorm quarter's gardens and the ground round its blocks (the plan is dorm-quarter/plan.js), in the island frame:
//   the residents' allotments: plots of dark soil in timber edging with rows of vegetables, canes and a fleece tunnel
//   here and there, a water tank, a butt and cans by the tool shed; a border inside the low hedge along the north path,
//   open at the gardens' path; the orchard of plums and persimmons beyond, fruit fallen, crates, a ladder
//   the ground-floor flats' gardens (flats-gardens.js), and a tree in each villa's walled garden
//   N-E's sea garden: the walk through the pergola over two picnic tables, pines either side, the lawn out to the rail
//   S-E's court: the walk to its door, a play spot of two spring riders and a bench on a soft pad, trees; a bike
//   shelter by each block's door
//   the lawns south of Eric's block and round N-W's ends: zelkovas, cherries and a ginkgo, loose on the lawn
//   lamps along the north path, the north-south walk and the north-east walks
import * as THREE from 'three';
import { hedge, keyaki, sakura, pine, maple, ginkgo, mound, grass, cluster } from '../outdoor/planting.js';
import { drift } from '../forecourt/gardens.js';
import { BATH_COAST } from '../island-baths.js';
import { lamps, bench, bins, STEEL, PAINTED } from '../outdoor/furniture.js';
import { shelter } from '../dorm-court/cluster-yards.js';
import { gardens } from './flats-gardens.js';
import { pergola, picnicTable, springRider } from '../outdoor/park-kit.js';
import { planter } from '../../kit/planting/planter.js';
import { hash2 } from '../outdoor/parts.js';
import * as Q from './plan.js';
import { QUARTER_LAMPS } from './fittings.js';

const SOIL = '#5a4a3c',
  EDGING = '#8a7560',
  CROPS = ['#5f7f45', '#6f8f4f', '#4f6f3f', '#7f9a55'];

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
  const rows = 3;
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
    for (let x = x0 + 0.35; x < x1 - 0.25; x += (far ? 0.6 : 0.5) + hash2(x, z, i) * 0.12)
      mound(p, x, z, 0.14 + hash2(z, x, i) * 0.08, CROPS[(r + i + Math.round(x)) % 4], { y: 0.06, squash: 0.8 });
  }
  if (kind === 3 && !far) {
    // fleece over hoops along one row: a low white tunnel, its hoops showing through as ribs, the ends tied down
    const len = w - 0.6,
      zc = z0 + 0.6;
    p.geo(
      '#e9ece6',
      new THREE.CylinderGeometry(0.27, 0.27, len, 10, 1, true, 0, Math.PI)
        .rotateZ(Math.PI / 2)
        .scale(1, 1.15, 1)
        .translate(cx, 0.06, zc),
      { cast: false, opts: { side: THREE.DoubleSide } },
    );
    for (let x = x0 + 0.35; x < x1 - 0.25; x += 0.55)
      p.geo(
        '#b9c2bb',
        new THREE.TorusGeometry(0.275, 0.014, 3, 6, Math.PI)
          .rotateY(Math.PI / 2)
          .scale(1, 1.15, 1)
          .translate(x, 0.06, zc),
        { cast: false },
      );
    for (const s of [-1, 1]) p.box('#b9a77e', 0.05, 0.05, 0.62, cx + (s * (len + 0.08)) / 2, 0.04, zc, { cast: false });
  }
}

function allotments(p, lights, far) {
  for (const [i, r] of Q.PLOTS.entries()) plot(p, r, i, far);
  // in the strip between the shed and the next plot: the water tank on its stand, a water butt, two cans; the
  // wheelbarrow left on the lawn under the orchard, past the walk
  const [sx0, sx1, sz0, sz1] = Q.SHED,
    gx = (sx1 + Q.PLOT_XS[4][0]) / 2;
  p.box(STEEL.dark, 0.6, 0.18, 0.6, gx, 0, sz0 + 0.45, PAINTED);
  p.geo('#4d6b8a', new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12).translate(gx, 0.58, sz0 + 0.45), PAINTED);
  p.geo(STEEL.mid, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6).translate(gx - 0.32, 0.3, sz0 + 0.45), {
    cast: false,
  });
  p.geo('#4d6a5b', new THREE.CylinderGeometry(0.22, 0.2, 0.62, 10).translate(gx, 0.31, sz1 - 0.75));
  p.box('#6c8a5a', 0.14, 0.22, 0.26, gx + 0.05, 0, sz1 - 0.2);
  p.box('#c0533f', 0.26, 0.22, 0.14, sx0 + 0.35, 0, sz1 + 0.18);
  p.geo(
    '#5b616b',
    new THREE.BoxGeometry(0.8, 0.22, 0.5).rotateZ(0.1).translate(sx1 + 0.4, 0.35, Q.PLOT_WALKS[0][2] - 0.6),
    PAINTED,
  );
  for (const dz of [-0.17, 0.17])
    p.box(STEEL.dark, 0.04, 0.3, 0.04, sx1 + 0.75, 0, Q.PLOT_WALKS[0][2] - 0.6 + dz, { cast: false });
  p.geo(
    STEEL.dark,
    new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10)
      .rotateX(Math.PI / 2)
      .translate(sx1 - 0.05, 0.14, Q.PLOT_WALKS[0][2] - 0.6),
    PAINTED,
  );
  // a bench by the gardens' path, under the orchard's edge, for a rest between rows
  p.box('#8c8b8a', 1.9, 0.025, 0.95, Q.GARDEN_PATH[1] + 0.9, 0, Q.PLOT_WALKS[0][2] - 0.6, { cast: false });
  bench(p, Q.GARDEN_PATH[1] + 0.9, Q.PLOT_WALKS[0][2] - 0.55, Math.PI, { len: 1.4 });
  // the low hedge along the north path, open at the gardens' path; and round the gardens' east and west ends
  const hz = Q.NORTH[2] - 0.6; // its crowns clear of the path's kerb
  hedge(p, [Q.NW_SHELTER[1] + 0.4, hz], [Q.GARDEN_PATH[0] - 0.1, hz], { w: 0.45, h: 0.55, seed: 141 });
  hedge(p, [Q.GARDEN_PATH[1] + 0.1, hz], [Q.ORCHARD[1], hz], { w: 0.45, h: 0.55, seed: 142 });
  // a border of perennials and grasses inside the hedge, between the plots and the path
  const bz = [Q.PLOT_ROWS[1][1] + 0.45, hz - 0.35];
  drift(p, [Q.GARDEN_PATH[1] + 0.3, Q.GARDEN_PATH[1] + 6.3, ...bz], { back: 's', seed: 149 });
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
        for (let i = 0; i < 7; i++) {
          const a = i * 2.1,
            r = 0.45 + (i % 3) * 0.2;
          p.geo(
            '#e07a2e',
            new THREE.SphereGeometry(0.075, 5, 3).translate(
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
  // the picking: persimmons fallen under their trees, crates stacked by two of them, a ladder against one
  if (!far) {
    for (const [x, z, kind] of Q.ORCHARD_TREES)
      if (kind === 'kaki')
        for (let i = 0; i < 4; i++)
          p.geo(
            '#e07a2e',
            new THREE.SphereGeometry(0.06, 5, 3).translate(
              x + Math.cos(i * 1.9 + x) * 0.8,
              0.05,
              z + Math.sin(i * 1.9 + x) * 0.6,
            ),
            { cast: false },
          );
    for (const [x, z, n] of [
      [93.4, -51.6, 3],
      [100.4, -51.3, 2],
    ])
      for (let i = 0; i < n; i++)
        p.box('#a08b72', 0.42, 0.24, 0.3, x + (i === 2 ? 0.2 : i * 0.46), i === 2 ? 0.24 : 0, z, { surf: 'wood' });
    const [lx, lz] = [Q.ORCHARD_TREES[1][0] - 0.55, Q.ORCHARD_TREES[1][1] + 0.1];
    for (const dz of [-0.17, 0.17])
      p.geo('#9a846c', new THREE.BoxGeometry(0.04, 1.7, 0.04).rotateZ(-0.3).translate(lx, 0.8, lz + dz), {
        surf: 'wood',
      });
    for (let i = 0; i < 5; i++)
      p.geo('#9a846c', new THREE.BoxGeometry(0.03, 0.03, 0.34).translate(lx - 0.22 + i * 0.1, 0.18 + i * 0.32, lz), {
        cast: false,
      });
  }
  // long grass under the trees
  if (!far)
    for (let i = 0; i < 18; i++) {
      const x = Q.ORCHARD[0] + 0.6 + hash2(i, 1, 3) * (Q.ORCHARD[1] - Q.ORCHARD[0] - 1.2),
        z = Q.ORCHARD[2] + 0.6 + hash2(i, 2, 5) * (Q.ORCHARD[3] - Q.ORCHARD[2] - 1.2);
      grass(p, x, z, { h: 0.38, color: '#8f9a6a', seed: i });
    }
}

// N-E's sea garden: the pergola on its pad, two picnic tables under it, pines either side of the walk, a cherry;
// drifts of planting along the north path; along the rail at the water a band of salt-tolerant shrubs and
// grasses straight on the lawn (the coast kit lays no strip of ground cover here: east-coast.js)
function seaGarden(p, lights) {
  const [x0, x1, z0, z1] = Q.PERGOLA;
  pergola(p, Q.PERGOLA, { along: 'z' });
  for (const tz of [z0 + 0.85, z1 - 0.85]) picnicTable(p, (x0 + x1) / 2, tz);
  lights.lit.push([(x0 + x1) / 2, (z0 + z1) / 2, 1.4]);
  for (const [x, z, s, k] of [
    [123.0, -49.2, 0.95, pine],
    [127.4, -48.7, 0.9, pine],
    [127.2, -53.9, 0.85, pine],
    [123.1, -54.1, 0.9, pine],
    [127.8, -40.4, 0.95, sakura],
    [111.4, -53.6, 1.0, keyaki],
  ])
    k(p, x, z, s, Math.round(x * 7 + z));
  const wz = Q.PERGOLA_WALK;
  drift(p, [Q.GARDENS[0].rect[1] + 0.3, wz[0] - 0.3, Q.NORTH[2] - 1.3, Q.NORTH[2] - 0.2], { back: 'n', seed: 61 });
  drift(p, [wz[1] + 0.3, Q.EDGE[1] - 0.2, Q.NORTH[2] - 1.3, Q.NORTH[2] - 0.2], { back: 'n', seed: 67 });
  // the band along the rail: shrubs in twos and threes, grasses between, a hair inland of the coping
  const line = [[Q.SEA_X, Q.BEACH_PROM[2]], ...Q.COAST_LINE.slice(4), BATH_COAST[0]];
  for (let i = 0; i + 1 < line.length; i++) {
    const [a, b] = [line[i], line[i + 1]],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    for (let u = 0.7; u < L - 0.3; u += 1.0 + hash2(u, i, 81) * 0.7) {
      const o = 0.95 + hash2(i, u, 83) * 0.4,
        x = a[0] + d[0] * u + d[1] * o,
        z = a[1] + d[1] * u - d[0] * o;
      if (hash2(x, z, 85) < 0.55)
        cluster(p, x, z, {
          n: 2 + Math.floor(hash2(z, x, 87) * 2),
          r: 0.26,
          spread: 0.32,
          seed: i * 31 + Math.round(u * 5),
        });
      else grass(p, x, z, { h: 0.45, color: '#a1a482', seed: Math.round(u * 13) + i });
    }
  }
}

// S-E's court: a soft pad with two spring riders, a see-saw and a bench by it, its trees
function seCourt(p) {
  const [x0, x1, z0, z1] = Q.SE_PLAY;
  p.box('#8a6f62', x1 - x0, 0.03, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { cast: false });
  springRider(p, x0 + 0.9, z0 + 1.0, '#4f8a6a');
  springRider(p, x1 - 0.9, z0 + 1.4, '#d9a73e');
  // a see-saw along the pad's far side: a beam tilted on its pivot, a handle and a seat at each end
  const sz = z1 - 0.6,
    sx = (x0 + x1) / 2;
  p.box(STEEL.dark, 0.18, 0.3, 0.3, sx, 0, sz, PAINTED);
  p.geo('#c0533f', new THREE.BoxGeometry(2.3, 0.07, 0.22).rotateZ(0.16).translate(sx, 0.36, sz), PAINTED);
  for (const s of [-1, 1]) {
    const ex = sx + s * 1.0,
      ey = 0.36 + s * 0.16;
    p.box('#3f6f9e', 0.3, 0.05, 0.3, ex, ey + 0.03, sz, PAINTED);
    p.box(STEEL.mid, 0.04, 0.26, 0.26, ex + s * -0.2, ey + 0.05, sz, PAINTED);
  }
  bench(p, (x0 + x1) / 2, z1 + 0.5, Math.PI, { len: 1.6 });
  for (const [k, x, z, s] of [
    [keyaki, 110.3, -6.0, 1.0],
    [sakura, 116.4, -6.4, 0.9],
    [maple, 110.0, -3.2, 0.8],
  ])
    k(p, x, z, s, Math.round(x * 5 + z));
}

// the lawns: south of Eric's block, round N-W's ends (the line along the dorm street is the row's: yards.js)
const LAWN_TREES = [
  [keyaki, 92.2, 6.6, 1.0],
  [sakura, 101.6, 6.4, 0.9],
  [ginkgo, 77.0, -33.0, 0.95],
  [sakura, 109.4, -33.2, 0.95],
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
  // a flowering trough on the court by S-E's door walk
  planter(p, { at: [Q.SE_DOOR[0] + 2.2, Q.SE_DOOR[3] + 0.35], variant: 'flowering', seed: 21 });
  yield;
  for (const [k, x, z, s] of LAWN_TREES) {
    k(p, x, z, s, Math.round(x * 3 + z * 5));
    yield;
  }
  bins(p, Q.GATE_X - 2.0, Q.NORTH[3] + 0.4, Math.PI);
  // the bench at the courts walk's end, looking out over the water
  bench(p, Q.COURTS_EAST[1] - 0.5, (Q.COURTS_EAST[2] + Q.COURTS_EAST[3]) / 2, Math.PI / 2, { len: 1.6 });
  lamps(lights, p, QUARTER_LAMPS, { pool: 1.3 });
  yield;
}
