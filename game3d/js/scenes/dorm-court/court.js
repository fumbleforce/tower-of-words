// The dorm courtyard's ground and planting (scenes/dorm-court.js), built from its plan (dorm-court/plan.js) with the
// outdoor kit (scenes/outdoor/): pale square pavers round one walk from the garden to the bike shelter (dark granite
// in running bond with a pale soldier border), with legs up to the hall doors, between two kerbed beds, and to the
// sento door, and the gate link down to the street on the door leg's axis; brick under the shelter. Round the court
// on the west and south, raised beds with a low wall: the garden west of the laundry, and the front bed, opened only
// for the gate. Past the front, the street: the lane home in the plaza's brick, with a verge and an avenue on its far
// side. A tall lamp by the drinks machines and one where the walk ends in the garden; lanterns on the gate piers, a
// stone lantern in the front bed, bollard lights along its wall. Blocks what can't be walked.
import * as THREE from 'three';
import { Parts, pools } from '../outdoor/parts.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { kerb, kerbRect, lowWall, wallRect } from '../outdoor/edges.js';
import { laneField, verge } from '../outdoor/lane.js';
import { keyaki, sakura, maple, cluster, hedge, grass, bed, mound, gravel as rake, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins, stoneLantern } from '../outdoor/furniture.js';
import { monument } from '../forecourt/details.js';
import * as P from './plan.js';

const { WALK, DOOR_LEG, LINK, GATE, BW, LAUNDRY, SENTO, RETURN_X, RETURN_Z, SHELTER, SOUTH_BED: SB, STREET } = P;
const [W0, W1, WZ0, WZ1] = WALK;
const [L0, L1] = DOOR_LEG;
const [S0, S1] = P.SENTO_LEG;
const BED_Y = 0.33; // the raised beds' soil, just under their walls' coping
const STRAW = '#aaa983'; // the grasses in October, pale enough to read at dusk
const PALE_LEAF = '#6f8a62';
const MOSS = '#586f4b'; // moss under the groups on the gravel // a lighter evergreen (pieris, a variegated box) among the darker ones

function paving(root) {
  const pv = paver();
  // the walk: dark granite, courses along it; the legs' and the link's courses turned along them
  const dark = { tones: GRANITE.dark, vary: 0.07, origin: [P.DOOR_X, P.AZ], module: [0.6, 0.3] };
  pv.field([W0 + BW, W1 - BW, WZ0 + BW, WZ1 - BW], { ...dark, pattern: 'bond' });
  pv.field([L0 + BW, L1 - BW, DOOR_LEG[2], WZ0 + BW], { ...dark, pattern: 'bondZ', seed: 3 });
  pv.field([S0 + BW, S1 - BW, P.SENTO_LEG[2], WZ0 + BW], { ...dark, pattern: 'bondZ', seed: 4 });
  pv.field([L0 + BW, L1 - BW, WZ1 - BW, LINK[3]], { ...dark, pattern: 'bondZ', seed: 6 });
  // its border, round the outline; open at the two doors, at the gate and at the shelter
  const e = { module: [0.15, BW], tones: GRANITE.edge, vary: 0.04, seed: 5, h: 0.008 };
  const eZ = { ...e, module: [BW, 0.15] };
  pv.field([W0, L0 + BW, WZ0, WZ0 + BW], e); // north side, up to the door leg
  pv.field([L1 - BW, S0 + BW, WZ0, WZ0 + BW], e); // on between the legs
  for (const [x0, x1, z0, z1] of [
    [L0, L1, DOOR_LEG[2], WZ0],
    [S0, S1, P.SENTO_LEG[2], WZ0],
    [L0, L1, WZ1, LINK[3]],
  ]) {
    pv.field([x0, x0 + BW, z0, z1], eZ); // the legs' and the link's sides
    pv.field([x1 - BW, x1, z0, z1], eZ);
  }
  pv.field([W0, W0 + BW, WZ0 + BW, WZ1 - BW], eZ); // across the walk's west end, at the garden
  pv.field([W0, L0 + BW, WZ1 - BW, WZ1], e); // south side, either side of the link
  pv.field([L1 - BW, W1, WZ1 - BW, WZ1], e);
  // the aprons: pale square pavers from the fronts to the walk and on to the front bed
  const pale = { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.pale, origin: [P.DOOR_X, P.AZ], vary: 0.07 };
  pv.field([W0, L0, LAUNDRY.z, WZ0], pale);
  pv.field([L1, S0, SENTO.z, WZ0], pale);
  pv.field([S1, RETURN_X, SENTO.z, SHELTER[2]], pale);
  pv.field([S1, RETURN_X, SHELTER[3], SB[2]], pale);
  pv.field([RETURN_X, SB[1], RETURN_Z, SB[2]], pale);
  pv.field([W0, L0, WZ1, SB[2]], pale);
  pv.field([L1, S1, WZ1, SB[2]], pale);
  // under the shelter: brick in herringbone, the bays painted on it (dorm-court/fittings.js)
  pv.field([SHELTER[0], SHELTER[1], SHELTER[2], SHELTER[3]], {
    pattern: 'herringbone',
    module: [0.3, 0.15],
    tones: GRANITE.brick,
    vary: 0.08,
    origin: [SHELTER[0], SHELTER[2]],
  });
  // the street past the front: the lane home, the same brick and borders as in the plaza
  laneField(pv, STREET, { origin: [P.DOOR_X, STREET[2]] });
  pv.build(root);
}

// a sasanqua: a clipped evergreen dome with flowers open on it (they bloom in October), pink or white
function bloom(p, x, z, r, y, seed = 1, colors = ['#c98d98', '#e3b7bd']) {
  mound(p, x, z, r, LEAF.deep, { y, squash: 0.72 });
  for (let i = 0; i < 9; i++) {
    const a = seed * 1.7 + i * 2.4,
      k = 0.35 + ((i * 37) % 10) / 16;
    const fx = x + Math.cos(a) * r * k * 0.95,
      fz = z + Math.sin(a) * r * k * 0.8;
    const fy = y + r * 0.72 * 0.72 + Math.sqrt(Math.max(0, 1 - k * k)) * r * 0.45;
    p.geo(colors[i % 3 ? 0 : 1], new THREE.DodecahedronGeometry(0.05, 0).translate(fx, fy, fz), { cast: false });
  }
}
const WHITE = ['#eceee8', '#d9ddd6'];

// clipped balls in three sizes, touching, as a Japanese garden groups them (tamamono): never in a row
function balls(p, x, z, { s = 1, y = BED_Y, seed = 1, tones = [LEAF.mid, PALE_LEAF, LEAF.fresh] } = {}) {
  const k = seed % 2 ? 1 : -1;
  mound(p, x, z, 0.36 * s, tones[seed % 3], { y, squash: 0.7 });
  mound(p, x + k * 0.42 * s, z + 0.12 * s, 0.26 * s, tones[(seed + 1) % 3], { y, squash: 0.72 });
  mound(p, x - k * 0.3 * s, z + 0.28 * s, 0.18 * s, tones[(seed + 2) % 3], { y, squash: 0.75 });
}

// a drift of grass tufts along the bed, a little staggered
function drift(p, x0, x1, z, { n = 3, h = 0.62, seed = 1, color = STRAW } = {}) {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
    grass(p, x, z + ((i * 7 + seed) % 3) * 0.1 - 0.1, {
      h: h * (0.85 + ((i + seed) % 3) * 0.1),
      seed: seed + i,
      color,
    });
  }
}

// a low island of moss under a group of plants, on the gravel
function moss(p, x, z, rx, rz) {
  p.geo(MOSS, new THREE.CylinderGeometry(1, 1, 0.05, 12).scale(rx, 1, rz).translate(x, BED_Y + 0.035, z), {
    cast: false,
  });
}

// a clipped podocarpus (inumaki) column, the tree Japanese gates are flanked with: a short trunk, a tall narrow
// clipped shape in three tiers
function column(p, x, z) {
  p.geo(LEAF.bark, new THREE.CylinderGeometry(0.05, 0.06, 0.3, 5).translate(x, BED_Y + 0.15, z));
  [
    [0.3, 0.55, 0.24],
    [0.62, 0.95, 0.2],
    [0.95, 1.3, 0.13],
  ].forEach(([y0, y1, r], i) =>
    p.geo(
      i % 2 ? LEAF.pine : '#44604f',
      new THREE.CylinderGeometry(r * 0.8, r, y1 - y0, 7).translate(x, BED_Y + (y0 + y1) / 2, z),
    ),
  );
  p.geo('#44604f', new THREE.SphereGeometry(0.12, 7, 4).scale(1, 0.8, 1).translate(x, BED_Y + 1.33, z));
}

// the gate: the bed's walls turn in at the opening; a stone pier at each side with a lantern on it, a clipped column
// (podocarpus) beside each and a sweep of clipped azalea running out from it, the same both sides
function gate(p, set, block) {
  const [z0, z1] = [SB[2], SB[3]];
  const zc = (z0 + z1) / 2;
  for (const x of GATE) lowWall(p, [x, z0], [x, z1], { off: x === GATE[0] ? -0.11 : 0.11 });
  for (const [i, x] of P.PIERS.entries()) {
    const out = i ? 1 : -1;
    p.box('#8b8d90', 0.46, 1.05, 0.46, x, 0, zc, { surf: 'concrete' });
    p.box('#b0b1b0', 0.56, 0.08, 0.56, x, 1.05, zc, { surf: 'concrete' });
    column(p, x + out * 0.72, zc + 0.05);
    // a sweep of clipped azalea running out from the column, each dome a little lower (okarikomi)
    [0.34, 0.27, 0.21].forEach((r, k) =>
      mound(p, x + out * (1.25 + k * 0.42), z1 - 0.38 + (k % 2) * 0.08, r, k % 2 ? PALE_LEAF : LEAF.fresh, {
        y: BED_Y,
        squash: 0.66,
      }),
    );
    moss(p, x + out * 1.1, zc, 0.95, 0.4);
    block(x - 0.3, x + 0.3, z0, z1);
  }
  lamps(
    set,
    p,
    P.PIERS.map((x) => [x, zc]),
    { kind: 'lantern', y: 1.13, pool: 0.95, poolShift: [0, -0.7] },
  );
}

// the front bed, walled both sides, from the garden to past the frame's east edge, open only at the gate: pale
// raked gravel with planted groups on moss, gravel between them. West of the gate: the stone lantern in hakone
// grass behind the bench, a maple over clipped balls and a white sasanqua; east of it, past the bay: maples, grass,
// clipped balls, a sasanqua and a cherry out of the frame. Low at the front, taller at the back, so the court stays
// in view from the camera.
function frontBed(p, set, block) {
  wallRect(p, SB, { sides: 'n', gaps: { n: [GATE] } });
  wallRect(p, [P.GARDEN[0], SB[1], SB[2], SB[3]], { sides: 's', gaps: { s: [GATE] } }); // on along the garden
  const [z0, z1] = [SB[2], SB[3]];
  const zf = z0 + 0.4,
    zb = z1 - 0.35;
  rake(p, [SB[0] - 0.22, GATE[0] - 0.2, z0 + 0.2, z1 - 0.2], { y: BED_Y });
  rake(p, [GATE[1] + 0.2, SB[1], z0 + 0.2, z1 - 0.2], { y: BED_Y });
  for (const [x, rx] of [
    [-5.0, 0.95],
    [5.2, 0.7],
    [7.9, 0.8],
    [9.8, 0.9],
    [12.6, 0.9],
    [14.8, 0.7],
  ])
    moss(p, x, (z0 + z1) / 2 + 0.05, rx, 0.4);
  // west of the gate (the pier's column and azaleas are the gate's)
  stoneLantern(p, set, -3.55, zb - 0.05, BED_Y);
  drift(p, -3.95, -2.75, zf + 0.05, { n: 3, seed: 2 });
  maple(p, -5.0, zb - 0.25, 0.72, 3);
  balls(p, -5.3, zf + 0.02, { s: 0.7, seed: 1, tones: [PALE_LEAF, LEAF.fresh, LEAF.mid] });
  bloom(p, -4.45, zf + 0.05, 0.26, BED_Y, 2, WHITE);
  // east of the gate, past the bay and on out of the frame
  maple(p, 5.0, zb - 0.25, 0.78, 2);
  drift(p, 5.6, 6.9, zf, { n: 3, seed: 5 });
  balls(p, 7.6, zb - 0.1, { s: 0.85, seed: 3 });
  bloom(p, 8.6, zf + 0.1, 0.3, BED_Y, 4, WHITE);
  maple(p, 9.8, zb - 0.25, 0.8, 5);
  drift(p, 10.4, 12, zf, { n: 3, seed: 7 });
  balls(p, 13, zb - 0.1, { s: 0.85, seed: 5 });
  sakura(p, 14.8, zb - 0.25, 0.7, 6);
  // pools of the bed's own lights on its planting (the ones on the ground sit under the raised soil)
  const zm = (z0 + z1) / 2; // kept inside the bed: a pool past its wall would hang over the street
  const lit = [[-3.55, zm, 0.5], ...P.PIERS.map((x, i) => [x + (i ? 0.55 : -0.55), zm, 0.5])]; // piers: bed side
  const mesh = pools(lit, 1, { k: 0.16, y: BED_Y + 0.08 });
  mesh.userData.set(0.24);
  set.bedPools = mesh;
}

// the garden west of the laundry, walled on the court side like the front bed: two zelkovas and a maple over
// shrubs, a hedge against the block, the tall lamp where the walk ends
function garden(p, block) {
  const G = P.GARDEN;
  lowWall(p, [G[1], LAUNDRY.z], [G[1], SB[2]], { off: -0.11 });
  kerbRect(p, [G[0], G[1], G[2], LAUNDRY.z], { sides: 'e' });
  bed(p, [G[0], G[1] - 0.22, G[2], G[3] - 0.05], { y: BED_Y });
  hedge(p, [G[0], G[2] + 0.35], [G[1] - 0.2, G[2] + 0.35], { w: 0.45, h: 0.6, y: BED_Y, seed: 8 });
  keyaki(p, -9.2, -2.6, 1.0, 4);
  keyaki(p, -12.6, -1.9, 1.08, 7);
  keyaki(p, -9.6, 1.9, 1.02, 9);
  maple(p, -7.3, -2.2, 0.85, 1);
  cluster(p, -8.3, -3.2, { n: 4, r: 0.36, seed: 3, y: BED_Y });
  balls(p, -6.75, -0.75, { s: 0.85, seed: 6 });
  balls(p, -6.8, 1.6, { s: 0.8, seed: 2 });
  bloom(p, -7.6, 0.4, 0.34, BED_Y, 5);
  grass(p, -6.5, -1.6, { seed: 4, color: STRAW });
  drift(p, -8.3, -7.4, 2.4, { n: 2, seed: 8 });
  cluster(p, -11.0, -0.4, { n: 4, r: 0.34, seed: 2, y: BED_Y });
  maple(p, -11.8, 2.3, 0.8, 7);
  grass(p, -8.4, -0.9, { seed: 7 });
  block(G[0], G[1] + 0.05, G[2], G[3]);
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
    mound(p, cx + 0.2, r[2] + 0.45, 0.22, i ? LEAF.mid : PALE_LEAF, { y: 0.08 });
    grass(p, i ? r[1] - 0.3 : r[0] + 0.3, r[3] - 0.3, { h: 0.35, seed: 3 + i * 3, color: STRAW });
  }
  const [x, z] = P.STONE;
  const stone = monument('社員寮', 'STAFF DORM', 0.85);
  stone.position.set(x, 0, z);
  root.add(stone);
  block(x - 0.5, x + 0.5, z - 0.2, z + 0.2);
}

// the front bed's bay in the south-east corner, walled like it: low shrubs only, so nothing stands between the
// camera and the court
function seBed(p, block) {
  const r = P.SE_BED;
  wallRect(p, [r[0], r[1], r[2], SB[2] + 0.22], { sides: 'nwe' });
  rake(p, [r[0] + 0.2, r[1] - 0.2, r[2] + 0.2, SB[2] + 0.3], { y: BED_Y });
  moss(p, r[0] + 0.75, r[2] + 0.55, 0.55, 0.32);
  balls(p, r[0] + 0.7, r[2] + 0.45, { s: 0.7, seed: 7, tones: [PALE_LEAF, LEAF.fresh, LEAF.mid] });
  drift(p, r[1] - 1.0, r[1] - 0.35, r[2] + 0.55, { n: 2, seed: 9 });
  block(r[0], r[1], r[2], P.NEAR + 0.2);
}

// the street's far side: a verge with a low hedge and the zelkova avenue, as along the lane in the plaza; where the
// small building across the street comes up to it, just the kerb
function farSide(p) {
  const z = STREET[3];
  verge(p, [STREET[0], z], [3.6, z], 's', { trees: [-13.5, -9.5], seed: 11 }); // none in front of the gate: from the
  // camera they would stand over the lane where he walks in
  kerb(p, [3.6, z], [6.5, z], { off: 0.08 });
  verge(p, [6.5, z], [STREET[1], z], 's', { trees: [10.5, 14.5], seed: 13 });
}

// the bench beside the cherry, backed on the front bed's wall and facing the court; the sorted bins beside it
function seats(p, block) {
  const [x, z] = P.BENCH;
  bench(p, x, z, Math.PI, { len: 1.6 });
  bins(p, x - 1.3, z + 0.1, Math.PI);
  block(x - 1.65, x + 0.85, z - 0.35, P.NEAR + 0.2);
}

// the bollard lights along the front bed's wall: a short stone post with the lamps' lantern on top
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
  frontBed(p, set, block);
  gate(p, set, block);
  farSide(p);
  garden(p, block);
  doorBeds(root, p, block);
  seBed(p, block);
  seats(p, block);
  bollards(set, p, block);
  for (const [x, z] of P.LAMPS) block(x - 0.14, x + 0.14, z - 0.14, z + 0.14);
  lamps(set, p, P.LAMPS, { kind: 'post', pool: 1.05 });
  p.build(root);
  root.add(set.bedPools);
  // the gate is open, but the court ends there on day 1: he came in that way
  block(GATE[0], GATE[1], SB[2], SB[3] + 0.1);
}
