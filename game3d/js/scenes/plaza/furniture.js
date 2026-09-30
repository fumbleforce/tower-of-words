// The fountain plaza's furniture (scenes/plaza.js), with the outdoor kit (scenes/outdoor/), placed on the plan's
// lines (plaza/plan.js):
//   lamps: the forecourt lane's post lamps along each lane's south edge at every other gap between the avenue's
//   trees; a pair in the ring bed either side of each opening (the two lanes and the canteen link) and either side
//   of the notice board; one between each pair of benches. After work eight lights set flush in the dark band
//   round the basin light the middle of the circle, where the rim lamps don't reach
//   benches: a pair in each quarter just inside the border ring, facing the fountain, each with a cherry (or a
//   maple) behind it and a lamp between; the sorted bins beside the first bench on the west side, north and south
//   the notice board: on the canteen's axis at the south of the circle, facing the fountain, low shrubs behind it
//   the canteen terrace: tables with four chairs under umbrellas in the canteen's teal and a pale canvas
//   bikes in a rack along the shops' backs
import * as THREE from 'three';
import { PAL, mat } from '../../props.js';
import { lamps, bench, bins, STEEL } from '../outdoor/furniture.js';
import { bikeRow, bicycle } from '../forecourt/details.js';
import { merged, AWNING } from '../plaza-buildings.js';
import { BENCH_ANGLES, RING_LAMPS, SOUTH_PAIR } from './green.js';
import * as P from './plan.js';

const { F, R, BORDER, BASIN, LANE, LINK, LZ, HALF, AVENUE, CANTEEN, SHOPS_Z, polar } = P;
const SEAT_R = R - BORDER - 0.55; // the benches and the notice board, just inside the border ring
const facing = (a) => Math.atan2(-Math.cos(a), -Math.sin(a)); // toward the fountain

// the lamps: [x, z, where the light falls: [dx, dz] from the foot, the pool's radius]. The lanes' lamps light the
// lane; the plaza's reach well in over the paving inside its border.
export function lampPoints() {
  const out = [];
  const zs = LANE.w[3] + 0.35;
  for (let i = 0; i + 1 < AVENUE.length; i += 2) {
    const d = (AVENUE[i] + AVENUE[i + 1]) / 2;
    out.push([F[0] - d, zs, [0, -0.9], 1.7], [F[0] + d, zs, [0, -0.9], 1.7]);
  }
  const rr = R + 0.38;
  const inward = ([x, z]) => {
    const L = Math.hypot(x - F[0], z - F[1]);
    return [x, z, [((F[0] - x) / L) * 1.5, ((F[1] - z) / L) * 1.5], 2.2];
  };
  // either side of each opening, in the ring bed, half a unit clear of the path's edge
  const off = HALF + 0.5;
  for (const dz of [-off, off]) {
    const a = Math.asin((LZ + dz - F[1]) / rr);
    out.push(inward(polar(a, rr)), inward(polar(Math.PI - a, rr)));
  }
  const cx = (LINK[0] + LINK[1]) / 2;
  for (const dx of [-off, off]) out.push(inward(polar(2 * Math.PI - Math.acos((cx + dx - F[0]) / rr), rr)));
  // and either side of the notice board, the link's pair mirrored
  for (const dx of SOUTH_PAIR) out.push(inward(polar(Math.acos(dx / rr), rr)));
  for (const a of RING_LAMPS) out.push(inward(polar(a, rr)));
  return out;
}

// the lights set flush in the dark band round the basin, every 45 degrees from the lane's axis: a steel ring and a
// dark glass lens level with the stones that lights up after work; their pools spread outward over the pale granite
const UPLIGHT_R = BASIN + 0.9;
function uplights(set, p, root) {
  const lenses = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const [x, z] = polar(a, UPLIGHT_R);
    p.geo(STEEL.dark, new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12).translate(x, 0.02, z), { cast: false });
    lenses.push(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12).translate(x, 0.025, z));
    set.lit.push([...polar(a, UPLIGHT_R + 1.3), 2.2]);
  }
  // its own material, not a shared one from mat(), since the evening changes it
  const glass = new THREE.MeshStandardMaterial({
    color: '#5d626b',
    roughness: 0.3,
    emissive: new THREE.Color('#ffe2b4'),
    emissiveIntensity: 0,
  });
  root.add(merged(lenses, glass, { cast: false }));
  return () => {
    glass.color.set('#fff3dc');
    glass.emissiveIntensity = 2.4;
  };
}

// the lamps and the flush lights; returns what turns the flush lights' lenses on (the pools come on with the set)
export function buildLamps(set, p, nav, root) {
  for (const [x, z, shift, pool] of lampPoints()) {
    lamps(set, p, [[x, z]], { kind: 'post', pool, poolShift: shift });
    nav.block(x - 0.16, x + 0.16, z - 0.16, z + 0.16);
  }
  return uplights(set, p, root);
}

export function buildBenches(p, nav) {
  for (const a of BENCH_ANGLES) {
    const [x, z] = polar(a, SEAT_R);
    bench(p, x, z, facing(a), { len: 1.6 });
    nav.block(x - 0.75, x + 0.75, z - 0.75, z + 0.75);
  }
  // the bins by the west bench of the north-west pair, and by its mirror on the south-west
  for (const a of [BENCH_ANGLES[0] - 0.13, BENCH_ANGLES[4] + 0.13]) {
    const [x, z] = polar(a, SEAT_R);
    bins(p, x, z, facing(a));
    nav.block(x - 0.35, x + 0.35, z - 0.35, z + 0.35);
  }
}

// the notice board on the canteen's axis at the south of the circle, facing the fountain: a dark steel frame on two
// posts under a small pitched hood, a pale cork panel with notices pinned on both faces
const NOTES = ['#f1efe8', '#e6d9a8', '#c9dbe5', '#f1efe8', '#e8c8c8', '#d5e2c6'];
export function buildNoticeBoard(p, nav) {
  const [x, z] = polar(Math.PI / 2, SEAT_R + 0.2);
  const W = 1.5,
    H = 0.9,
    Y = 0.75;
  for (const u of [-W / 2 - 0.05, W / 2 + 0.05]) p.box(STEEL.dark, 0.08, Y + H + 0.1, 0.08, x + u, 0, z);
  p.box(STEEL.dark, W + 0.2, H + 0.1, 0.06, x, Y - 0.05, z); // the frame
  p.box('#c9b99b', W, H, 0.08, x, Y, z); // the panel
  // the hood: two slopes over the top
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(W + 0.4, 0.035, 0.26).rotateX(s * 0.35);
    p.geo(STEEL.mid, g.translate(x, Y + H + 0.14, z + s * 0.11));
  }
  // the notices, on both faces: a few sheets in a loose grid, each a little askew
  NOTES.forEach((c, i) => {
    const col = i % 3,
      row = Math.floor(i / 3);
    const u = -0.48 + col * 0.48 + (row ? 0.08 : -0.04),
      y = Y + 0.12 + row * 0.4,
      w = i % 2 ? 0.3 : 0.24,
      h = i % 2 ? 0.26 : 0.34;
    for (const side of [-1, 1]) {
      const g = new THREE.BoxGeometry(w, h, 0.006).rotateZ((i % 3) * 0.05 - 0.05);
      p.geo(c, g.translate(x + u * side, y + h / 2, z + side * 0.045), { cast: false });
    }
  });
  nav.block(x - W / 2 - 0.2, x + W / 2 + 0.2, z - 0.3, z + 0.3);
  return { at: [x, z], top: Y + H };
}

// the terrace: round tables with four chairs, each under an eight-sided umbrella, clear of the doors. After work the
// chairs stand upside down on the tables for closing, except two at the table nearest the link (`shared`), which
// the place moves itself (places/canteen-closing.js): one upright at its south side, one in the canteen worker's hands.
export const TERRACE_TABLES = {
  z: CANTEEN[3] + 1.9,
  xs: [-10.4, -7.1, -3.9, 3.3, 6.2].map((x) => x + F[0]),
  top: 0.74, // the table top's upper face
  shared: 3,
  loose: [2, 0], // its south and east sides (SIDES)
};
const SIDES = [
  [0.72, 0],
  [-0.72, 0],
  [0, 0.72],
  [0, -0.72],
];
const CHAIR_MAT = mat('#59616c');
// one terrace chair standing at the origin, its back toward +z
function chairParts() {
  return [
    new THREE.BoxGeometry(0.34, 0.05, 0.34).translate(0, 0.44, 0),
    new THREE.BoxGeometry(0.26, 0.42, 0.26).translate(0, 0.21, 0),
    new THREE.BoxGeometry(0.34, 0.34, 0.04).translate(0, 0.63, 0.16),
  ];
}
// the same chair upside down with its seat on a table top, back still toward +z
export const STACKED_Y = TERRACE_TABLES.top + 0.465;
const flipped = () => chairParts().map((g) => g.rotateZ(Math.PI).translate(0, STACKED_Y, 0));
// where a chair goes at a table side: standing out at the side, back outward; stacked, back over the table's edge
export function chairAt(x, z, side, stacked = false) {
  const [dx, dz] = SIDES[side],
    r = stacked ? 0.38 / 0.72 : 1;
  return { x: x + dx * r, z: z + dz * r, yaw: Math.atan2(dx, dz), stacked };
}
// the floor a standing chair takes, for the walk grid
export const chairBlock = (c) => [c.x - 0.2, c.x + 0.2, c.z - 0.2, c.z + 0.2];
export function terraceChair() {
  const mesh = merged(chairParts(), CHAIR_MAT);
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}
export function buildTerrace(root, nav) {
  const { z, xs, shared, loose } = TERRACE_TABLES;
  const poles = [],
    tops = [],
    blocks = [],
    chairs = [],
    stacked = [],
    canopies = [[], []];
  const place = (list, parts, c) => list.push(...parts.map((g) => g.rotateY(c.yaw).translate(c.x, 0, c.z)));
  xs.forEach((x, i) => {
    poles.push(
      new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6).translate(x, 1.15, z),
      new THREE.CylinderGeometry(0.06, 0.2, 0.05, 8).translate(x, 0.025, z),
    );
    tops.push(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16).translate(x, 0.72, z));
    SIDES.forEach((_, side) => {
      if (i === shared && loose.includes(side)) return;
      const c = chairAt(x, z, side);
      place(chairs, chairParts(), c);
      place(stacked, flipped(), chairAt(x, z, side, true));
      blocks.push(chairBlock(c));
    });
    canopies[i % 2].push(
      new THREE.ConeGeometry(1.25, 0.42, 8).translate(x, 2.28, z),
      new THREE.ConeGeometry(0.12, 0.14, 8).translate(x, 2.55, z),
    );
    // the table and its pole; the chairs round it block only while they stand (places/canteen-closing.js: after
    // work they are up on the tables, and he can step right up to the one left standing)
    nav.block(x - 0.58, x + 0.58, z - 0.58, z + 0.58);
  });
  root.add(merged(poles, mat(PAL.metal)), merged(tops, mat('#d9d7d1')));
  // named, so the static merge leaves them whole: the evening swaps one for the other
  const day = merged(chairs, CHAIR_MAT),
    closed = merged(stacked, CHAIR_MAT);
  day.name = 'terrace-chairs';
  closed.name = 'terrace-chairs-stacked';
  closed.visible = false;
  root.add(day, closed);
  root.add(merged(canopies[0], mat(AWNING.canvas, { roughness: 0.9 })));
  root.add(merged(canopies[1], mat(AWNING.stripe, { roughness: 0.9 })));
  return { day, closed, blocks };
}

// bikes in a rack along the shops' backs, by their back doors; one left on its stand by the north-east benches
export function buildBikes(root, nav) {
  const row = bikeRow(7, { gaps: [2, 5], seed: 4 });
  row.position.set(F[0] - 6.5, 0, SHOPS_Z - 0.75);
  root.add(row);
  const a = (BENCH_ANGLES[2] + BENCH_ANGLES[3]) / 2;
  const [x, z] = polar(a, R - BORDER - 1.2);
  const bike = bicycle('#6f8a9c', { basket: true });
  bike.position.set(x, 0, z);
  bike.rotation.y = -a + 0.25;
  nav.block(x - 0.8, x + 0.8, z - 0.8, z + 0.8);
  root.add(bike);
}

// where the flock of pigeons (outdoor/pigeons.js) pecks: by the fountain's south-west rim
export const PIGEON_HOME = [F[0] - 2.6, F[1] + 4.9];
