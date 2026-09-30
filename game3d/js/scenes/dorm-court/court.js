// The dorm courtyard's ground and planting (scenes/dorm-court.js), built from its plan (dorm-court/plan.js) with the
// outdoor kit (scenes/outdoor/): pale square pavers round one walk from the lane to the bike shelter (dark granite
// in running bond with a pale soldier border), with legs up to the hall doors, between two kerbed beds, and to the
// sento door; brick under the shelter; a raised bed with a low wall along the front, a cherry beside the bench,
// shrubs and grasses of mixed heights; a bed of zelkovas and shrubs west of the laundry; the street pavement past
// the front. Tall lamps on the walk's north side, bollard lights on the south. Blocks what can't be walked.
import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { kerbRect, wallRect } from '../outdoor/edges.js';
import { keyaki, sakura, maple, cluster, hedge, grass, bed, mound, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins } from '../outdoor/furniture.js';
import { monument } from '../forecourt/details.js';
import * as P from './plan.js';

const { WALK, DOOR_LEG, BW, LAUNDRY, SENTO, RETURN_X, RETURN_Z, SHELTER, SOUTH_BED: SB, STREET, WEST_BED: WB } = P;
const [W0, W1, WZ0, WZ1] = WALK;
const [L0, L1] = DOOR_LEG;
const [S0, S1] = P.SENTO_LEG;

function paving(root) {
  const pv = paver();
  // the walk: dark granite, courses along it, the door leg's courses turned toward the doors
  const dark = { tones: GRANITE.dark, vary: 0.07, origin: [P.DOOR_X, P.AZ], module: [0.6, 0.3] };
  pv.field([W0, W1 - BW, WZ0 + BW, WZ1 - BW], { ...dark, pattern: 'bond' });
  pv.field([L0 + BW, L1 - BW, DOOR_LEG[2], WZ0 + BW], { ...dark, pattern: 'bondZ', seed: 3 });
  pv.field([S0 + BW, S1 - BW, P.SENTO_LEG[2], WZ0 + BW], { ...dark, pattern: 'bondZ', seed: 4 });
  // its border, round the outline; open at the two doors, at the shelter and where the lane comes in off the frame
  const e = { module: [0.15, BW], tones: GRANITE.edge, vary: 0.04, seed: 5, h: 0.008 };
  const eZ = { ...e, module: [BW, 0.15] };
  pv.field([W0, L0 + BW, WZ0, WZ0 + BW], e); // north side, up to the door leg
  pv.field([L1 - BW, S0 + BW, WZ0, WZ0 + BW], e); // on between the legs
  for (const [x0, x1, top] of [
    [L0, L1, DOOR_LEG[2]],
    [S0, S1, P.SENTO_LEG[2]],
  ]) {
    pv.field([x0, x0 + BW, top, WZ0], eZ); // each leg's sides
    pv.field([x1 - BW, x1, top, WZ0], eZ);
  }
  pv.field([W0, W1, WZ1 - BW, WZ1], e); // south side
  // the aprons: pale square pavers from the fronts to the walk and on to the south bed
  const pale = { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [P.DOOR_X, P.AZ], vary: 0.07 };
  pv.field([LAUNDRY.x0, L0, LAUNDRY.z, WZ0], pale);
  pv.field([L1, S0, SENTO.z, WZ0], pale);
  pv.field([S1, RETURN_X, SENTO.z, SHELTER[2]], pale);
  pv.field([S1, RETURN_X, SHELTER[3], SB[2]], pale);
  pv.field([RETURN_X, SB[1], RETURN_Z, SB[2]], pale);
  pv.field([W0, S1, WZ1, SB[2]], pale);
  // under the shelter: brick in herringbone, the bays painted on it (dorm-court/fittings.js)
  pv.field([SHELTER[0], SHELTER[1], SHELTER[2], SHELTER[3]], {
    pattern: 'herringbone',
    module: [0.3, 0.15],
    tones: GRANITE.brick,
    vary: 0.08,
    origin: [SHELTER[0], SHELTER[2]],
  });
  // the street past the front: brick in running bond behind a pale kerb band
  pv.field([STREET[0], STREET[1], STREET[2] + 0.25, STREET[3]], {
    pattern: 'bond',
    module: [0.5, 0.25],
    tones: GRANITE.brick,
    vary: 0.08,
    origin: [0, STREET[2]],
  });
  pv.border(STREET, { w: 0.25, sides: 'n' });
  pv.build(root);
}

// a sasanqua: a clipped evergreen dome with pink flowers open on it (they bloom in October)
function bloom(p, x, z, r, y, seed = 1) {
  mound(p, x, z, r, LEAF.deep, { y, squash: 0.72 });
  for (let i = 0; i < 9; i++) {
    const a = seed * 1.7 + i * 2.4,
      k = 0.35 + ((i * 37) % 10) / 16;
    const fx = x + Math.cos(a) * r * k * 0.95,
      fz = z + Math.sin(a) * r * k * 0.8;
    const fy = y + r * 0.72 * 0.72 + Math.sqrt(Math.max(0, 1 - k * k)) * r * 0.45;
    p.geo(i % 3 ? '#c98d98' : '#e3b7bd', new THREE.DodecahedronGeometry(0.05, 0).translate(fx, fy, fz), {
      cast: false,
    });
  }
}

// the raised bed along the front: a seat-height wall on the court side, the street kerb behind. At the back, short
// runs of clipped hedge in three heights, broken by the small trees (a cherry beside the bench, two maples, a
// zelkova out west); in front, azalea mounds, sasanquas in flower and grasses in groups, never evenly spaced
function southBed(p) {
  wallRect(p, SB, { sides: 'n' });
  kerbRect(p, SB, { sides: 's' });
  const y = 0.33,
    zb = SB[3] - 0.3;
  bed(p, [SB[0], SB[1], SB[2] + 0.22, SB[3] - 0.05], { y });
  for (const [x0, x1, h, seed] of [
    [SB[0], -10.8, 0.5, 1],
    [-9.0, -5.4, 0.6, 2],
    [-1.9, -0.2, 0.46, 3],
    [2.2, 6.6, 0.56, 4],
    [8.6, SB[1], 0.5, 5],
  ])
    hedge(p, [x0, zb], [x1, zb], { w: 0.4, h, y, seed });
  sakura(p, -4.3, SB[3] - 0.55, 0.7, 3);
  maple(p, 1.0, SB[3] - 0.5, 0.74, 2);
  maple(p, 7.6, SB[3] - 0.5, 0.8, 5);
  keyaki(p, -9.9, SB[3] - 0.45, 0.8, 6);
  const zf = SB[2] + 0.5;
  for (const [x, n, r, seed] of [
    [-12.4, 4, 0.36, 1],
    [-7.8, 3, 0.3, 2],
    [-2.6, 3, 0.3, 4],
    [3.3, 3, 0.32, 5],
    [5.9, 4, 0.36, 8],
    [9.8, 3, 0.32, 9],
  ])
    cluster(p, x, zf + (seed % 3) * 0.1, { n, r, spread: 0.25 + r, seed, y });
  for (const [x, r, seed] of [
    [-6.1, 0.34, 1],
    [-0.9, 0.3, 2],
    [4.6, 0.28, 3],
    [8.4, 0.32, 4],
  ])
    bloom(p, x, zf + 0.15, r, y, seed);
  for (const [x, s, h] of [
    [-8.8, 1, 0.46],
    [-5.3, 2, 0.52],
    [-3.3, 3, 0.4],
    [0.1, 4, 0.46],
    [2.3, 5, 0.42],
    [6.8, 7, 0.44],
  ])
    grass(p, x, SB[2] + 0.42 + (s % 2) * 0.14, { h, seed: s, color: '#7d8a62' });
}

// the street past the front: the gutter's concrete lids along the kerb, a steel grate every few metres
function street(p) {
  const z = STREET[2] + 0.4;
  for (let x = STREET[0] + 0.25, i = 0; x < STREET[1]; x += 0.5, i++) {
    if (i % 8 === 3) {
      p.box('#5a5f67', 0.46, 0.008, 0.3, x, 0.004, z, { cast: false });
      for (let k = -2; k <= 2; k++) p.box('#7a7f87', 0.03, 0.012, 0.26, x + k * 0.08, 0.004, z, { cast: false });
    } else p.box(i % 2 ? '#9b9994' : '#a19f9a', 0.47, 0.01, 0.3, x, 0.004, z, { cast: false });
  }
}

// north of the lane, west of the laundry: two zelkovas and a maple over shrubs, a hedge against the block
function westBed(p, block) {
  wallRect(p, WB, { sides: 's' });
  kerbRect(p, WB, { sides: 'e' });
  const y = 0.33;
  bed(p, [WB[0], WB[1] - 0.16, WB[2], WB[3] - 0.22], { y });
  hedge(p, [WB[0], WB[2] + 0.35], [WB[1] - 0.2, WB[2] + 0.35], { w: 0.45, h: 0.6, y, seed: 8 });
  keyaki(p, -9.2, -2.6, 1.0, 4);
  keyaki(p, -12.6, -1.9, 1.08, 7);
  maple(p, -7.4, -2.1, 0.85, 1);
  cluster(p, -8.3, -3.2, { n: 4, r: 0.36, seed: 3, y });
  cluster(p, -6.45, -1.05, { n: 3, r: 0.3, seed: 6, y });
  bloom(p, -6.55, -2.9, 0.34, y, 5);
  grass(p, -6.4, -1.95, { seed: 4, color: '#7d8a62' });
  cluster(p, -11.0, -1.0, { n: 4, r: 0.34, seed: 2, y });
  grass(p, -8.4, -0.8, { seed: 7 });
  block(WB[0], WB[1] + 0.05, WB[2], WB[3] + 0.05);
}

// the beds either side of the door leg, kerbed and low so the hall behind stays in view: azaleas and grasses; the
// 社員寮 stone stands on the paving past the east one, in front of the sento's corner
function doorBeds(root, p, block) {
  for (const [i, r] of P.DOOR_BEDS.entries()) {
    kerbRect(p, r, { sides: 'swe' });
    bed(p, [r[0] + 0.14, r[1] - 0.14, r[2], r[3] - 0.14], { y: 0.08 });
    block(r[0], r[1], r[2] - 0.1, r[3] + 0.05);
    const cx = (r[0] + r[1]) / 2;
    mound(p, cx - 0.12, r[2] + 0.3, 0.3, i ? LEAF.fresh : LEAF.mid, { y: 0.08 });
    mound(p, cx + 0.2, r[2] + 0.45, 0.22, i ? LEAF.mid : LEAF.fresh, { y: 0.08 });
    grass(p, i ? r[1] - 0.3 : r[0] + 0.3, r[3] - 0.3, { h: 0.35, seed: 3 + i * 3 });
  }
  const [x, z] = P.STONE;
  const stone = monument('社員寮', 'STAFF DORM', 0.85);
  stone.position.set(x, 0, z);
  root.add(stone);
  block(x - 0.5, x + 0.5, z - 0.2, z + 0.2);
}

// the south bed's bay in the south-east corner, walled like it: low shrubs only, so nothing stands between the camera
// and the court
function seBed(p, block) {
  const r = P.SE_BED,
    y = 0.33;
  wallRect(p, [r[0], r[1], r[2], SB[2] + 0.22], { sides: 'nwe' });
  bed(p, [r[0] + 0.2, r[1] - 0.2, r[2] + 0.2, SB[2] + 0.3], { y });
  cluster(p, r[0] + 0.6, r[2] + 0.55, { n: 4, r: 0.32, spread: 0.5, seed: 12, y });
  bloom(p, r[1] - 0.6, r[2] + 0.5, 0.3, y, 6);
  grass(p, (r[0] + r[1]) / 2 + 0.1, r[2] + 0.75, { h: 0.42, seed: 9, color: '#7d8a62' });
  block(r[0], r[1], r[2], P.NEAR + 0.2);
}

// the bench beside the cherry, backed on the south bed's wall and facing the court; the sorted bins beside it
function seats(p, block) {
  const [x, z] = P.BENCH;
  bench(p, x, z, Math.PI, { len: 1.6 });
  bins(p, x + 1.25, z + 0.1, Math.PI);
  block(x - 0.85, x + 1.55, z - 0.35, P.NEAR + 0.2);
}

// the bollard lights along the south bed's wall: a short stone post with the lamps' lantern on top
function bollards(set, p, block) {
  for (const [x, z] of P.BOLLARDS) {
    p.geo('#6d7078', new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8).translate(x, 0.25, z));
    block(x - 0.12, x + 0.12, z - 0.12, z + 0.12);
  }
  lamps(set, p, P.BOLLARDS, { kind: 'lantern', y: 0.5, pool: 0.75 });
}

export function buildCourt(root, nav, set) {
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  paving(root);
  const p = new Parts();
  southBed(p);
  street(p);
  westBed(p, block);
  doorBeds(root, p, block);
  seBed(p, block);
  seats(p, block);
  bollards(set, p, block);
  for (const [x, z] of P.LAMPS) block(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
  lamps(set, p, P.LAMPS, { kind: 'post', pool: 1.05 });
  p.build(root);
}
