import { Parts } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { laneField } from '../outdoor/lane.js';
import { kerb } from '../outdoor/edges.js';
import { cluster, bed } from '../outdoor/planting.js';
import { lamps, bench, fingerSign } from '../outdoor/furniture.js';
import { CAMPUS_PATHS } from '../island-campus.js';
import { pt, BENCH, BEDS } from './plan.js';
import { campusLandscape } from './landscape.js';
import { campusServiceFront } from './service-front.js';

// Model the previously empty campus ground from its real mapped path footprints.
export function* campusGrounds(root, lights) {
  const parts = new Parts(),
    pv = paver();
  for (const path of CAMPUS_PATHS) {
    const [x0, z0] = pt(path.rect),
      [x1, z1] = pt(path.rect.slice(2));
    const r = [x0, x1, z0, z1];
    if (path.kind === 'lane') laneField(pv, r, { along: z1 - z0 > x1 - x0 ? 'z' : 'x', origin: [x0, z0] });
    else pv.field(r, { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.pale });
  }
  // An open coast connection; its walls and trees are shared with the existing coast builder.
  for (const r of [
    [-42.6, -40.6, -39, -27.4],
    [-40.6, -20.75, -27.4, -25.4],
  ]) {
    const a = pt([r[0], r[2]]),
      b = pt([r[1], r[3]]);
    pv.field([a[0], b[0], a[1], b[1]], { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.pale });
  }
  // A low planted verge follows the coast path, entirely outside its navigable edge.
  // The cross street at -27.4 remains open; long soil runs are broken by rainwater grates.
  for (const [z0, z1] of [
    [-38.8, -36.6],
    [-36.2, -32.2],
    [-31.8, -27.65],
  ]) {
    const a = pt([-43.65, z0]),
      b = pt([-42.82, z1]);
    bed(parts, [a[0], b[0], a[1], b[1]], { y: 0.035, cover: false, soil: '#625f49' });
    kerb(parts, pt([-42.73, z0]), pt([-42.73, z1]), { w: 0.14, h: 0.06 });
    for (let z = z0 + 0.3, i = 0; z < z1 - 0.2; z += 0.55, i++) {
      const q = pt([-43.23 + (i % 2 ? 0.13 : -0.13), z]);
      cluster(parts, q[0], q[1], {
        n: 3,
        r: 0.16 + (i % 3) * 0.02,
        spread: 0.18,
        seed: 910 + Math.round(z * 10),
        tones: ['#546243', '#66704b', '#7a8057'],
      });
    }
  }
  for (const z of [-36.4, -32]) {
    const q = pt([-43.02, z]);
    parts.box('#394746', 0.58, 0.025, 0.32, q[0], 0.012, q[1], { cast: false });
    for (let i = 0; i < 5; i++)
      parts.box('#747c73', 0.53, 0.018, 0.018, q[0], 0.038, q[1] - 0.12 + i * 0.06, { cast: false });
  }
  // Drainage/kerbs flank the new roads, with breaks at cross streets and the print-shop entrance.
  for (const [x, z0, z1, skip] of [
    [-20.75, -52.5, -27.4, [[-44.3, -42.3]]],
    [-17.75, -52.5, -27.4, []],
    [3, -45.5, -18.1, []],
    [6, -45.5, -18.1, [[-33, -30]]],
  ]) {
    let from = z0;
    for (const [a, b] of [...skip, [z1, z1]]) {
      if (a > from) kerb(parts, pt([x, from]), pt([x, a]), { off: x === -20.75 || x === 3 ? -0.08 : 0.08 });
      from = b;
    }
  }
  campusLandscape(parts);
  campusServiceFront(parts);
  for (const box of BEDS) {
    const a = pt([box[0], box[2]]),
      b = pt([box[1], box[3]]);
    bed(parts, [a[0], b[0], a[1], b[1]], { y: 0.08 });
  }
  bench(parts, BENCH.x, BENCH.z, 0, { len: 1.8 });
  lamps(
    lights,
    parts,
    [
      [-22, -46.6],
      [-16.8, -37.4],
      [-21.8, -29.5],
      [7, -38.5],
      [7, -24.3],
      [-35, -30.4],
    ].map(pt),
    { kind: 'post' },
  );
  fingerSign(root, parts, ...pt([-16.8, -26]), [
    { text: 'Office street', sub: 'Offices', dir: 0 },
    { text: 'Harbour', sub: 'Coast walk', dir: -1 },
  ]);
  yield;
  pv.build(root);
  parts.build(root);
}
