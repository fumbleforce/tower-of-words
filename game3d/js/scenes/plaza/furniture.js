// The fountain plaza's furniture (scenes/plaza.js), with the outdoor kit (scenes/outdoor/), placed on the plan's
// lines (plaza/plan.js):
//   lamps: the forecourt lane's post lamps along the lane's south edge at every other gap between the avenue's
//   trees, a pair where the plaza meets the lane, a pair at the mouth of each link, one between each pair of benches
//   benches: two pairs just inside the border ring on the north-west and north-east, facing the fountain, each with
//   a cherry (or a maple) behind it and a lamp between; two in bays in the lane's south verge, facing the plaza
//   the canteen terrace: tables with four chairs under umbrellas in the canteen's teal and a pale canvas
//   the sorted bins by a bay bench, and bikes in a rack along the shops' backs
import * as THREE from 'three';
import { PAL, mat } from '../../props.js';
import { lamps, bench, bins } from '../outdoor/furniture.js';
import { bikeRow, bicycle } from '../forecourt/details.js';
import { merged, AWNING } from '../plaza-buildings.js';
import { BENCH_ANGLES, RING_LAMPS } from './green.js';
import * as P from './plan.js';

const { F, R, BORDER, LANE, LANE_N, LINKS, BAYS, AVENUE, CANTEEN, SHOPS_Z, polar } = P;

// the lamps: [x, z, where the light falls: [dx, dz] from the foot]. The lane's lamps light the lane, the plaza's
// light the paving inside its border.
export function lampPoints() {
  const s = LANE.s;
  const out = [];
  for (let i = 0; i + 1 < AVENUE.length; i += 2) out.push([(AVENUE[i] + AVENUE[i + 1]) / 2, s[3] + 0.35, [0, -0.9]]);
  const rr = R + 0.38;
  const inward = ([x, z], d) => {
    const L = Math.hypot(x - F[0], z - F[1]);
    return [x, z, [((F[0] - x) / L) * d, ((F[1] - z) / L) * d]];
  };
  const zc = LANE_N - 0.5;
  for (const side of [1, -1]) {
    const a = Math.asin((zc - F[1]) / rr);
    out.push(inward(polar(side > 0 ? a : Math.PI - a, rr), 1.1));
  }
  for (const a of RING_LAMPS) out.push(inward(polar(a, rr), 1.1));
  // a pair on the border ring either side of the axis from the canteen's doors to the fountain
  const rn = R - BORDER / 2;
  for (const sx of [-1.8, 1.8]) out.push(inward([F[0] + sx, F[1] - Math.sqrt(rn * rn - sx * sx)], 0.8));
  // either side of each link's mouth, lighting the link
  for (const [x, z, dz] of [
    [LINKS.w[0] + 0.6, LINKS.w[2] - 0.5, 1],
    [LINKS.w[0] + 0.6, LINKS.w[3] + 0.5, -1],
    [LINKS.e[1] - 0.6, LINKS.e[2] - 0.5, 1],
    [LINKS.e[1] - 0.6, LINKS.e[3] + 0.5, -1],
  ])
    out.push([x, z, [0, dz * 0.8]]);
  return out;
}

export function buildLamps(set, p, nav) {
  for (const [x, z, shift] of lampPoints()) {
    lamps(set, p, [[x, z]], { kind: 'post', pool: 1.7, poolShift: shift });
    nav.block(x - 0.16, x + 0.16, z - 0.16, z + 0.16);
  }
}

export function buildBenches(p, nav) {
  const r = R - BORDER - 0.55;
  for (const a of BENCH_ANGLES) {
    const [x, z] = polar(a, r);
    bench(p, x, z, Math.atan2(-Math.cos(a), -Math.sin(a)), { len: 1.6 });
    nav.block(x - 0.75, x + 0.75, z - 0.75, z + 0.75);
  }
  const z = LANE.s[3] + 0.55;
  for (const x of BAYS) bench(p, x, z, Math.PI, { len: 1.6 });
  bins(p, BAYS[0] + 0.78, z, Math.PI);
}

// the terrace: round tables with four chairs, each under an eight-sided umbrella, clear of the doors
export function buildTerrace(root, nav) {
  const z = CANTEEN[3] + 1.9;
  const xs = [-10.4, -7.1, -3.9, 3.3, 6.2].map((x) => x + F[0]);
  const poles = [],
    tops = [],
    chairs = [],
    canopies = [[], []];
  xs.forEach((x, i) => {
    poles.push(
      new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6).translate(x, 1.15, z),
      new THREE.CylinderGeometry(0.06, 0.2, 0.05, 8).translate(x, 0.025, z),
    );
    tops.push(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16).translate(x, 0.72, z));
    for (const [dx, dz] of [
      [0.72, 0],
      [-0.72, 0],
      [0, 0.72],
      [0, -0.72],
    ]) {
      const cx = x + dx,
        cz = z + dz;
      chairs.push(
        new THREE.BoxGeometry(0.34, 0.05, 0.34).translate(cx, 0.44, cz),
        new THREE.BoxGeometry(0.26, 0.42, 0.26).translate(cx, 0.21, cz),
        new THREE.BoxGeometry(dz ? 0.34 : 0.04, 0.34, dz ? 0.04 : 0.34).translate(
          cx + Math.sign(dx) * 0.16,
          0.63,
          cz + Math.sign(dz) * 0.16,
        ),
      );
    }
    canopies[i % 2].push(
      new THREE.ConeGeometry(1.25, 0.42, 8).translate(x, 2.28, z),
      new THREE.ConeGeometry(0.12, 0.14, 8).translate(x, 2.55, z),
    );
    nav.block(x - 1.0, x + 1.0, z - 1.0, z + 1.0);
  });
  root.add(merged(poles, mat(PAL.metal)), merged(tops, mat('#d9d7d1')));
  root.add(merged(chairs, mat('#59616c')));
  root.add(merged(canopies[0], mat(AWNING.canvas, { roughness: 0.9 })));
  root.add(merged(canopies[1], mat(AWNING.stripe, { roughness: 0.9 })));
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

// what people leave: a few pigeons pecking by the fountain's south-west rim, a leaflet dropped near a bench
export function buildLife(p) {
  const [bx, bz] = [F[0] - 2.6, F[1] + 4.9];
  [
    [0, 0, 0.3],
    [0.45, 0.2, 2.1],
    [-0.3, 0.45, 4.0],
    [0.7, -0.35, 1.2],
    [-0.65, -0.1, 5.2],
  ].forEach(([dx, dz, turn], i) => {
    const x = bx + dx,
      z = bz + dz,
      c = Math.cos(turn),
      s = Math.sin(turn);
    const at = (u, y) => [x + u * s, y, z + u * c];
    const body = new THREE.DodecahedronGeometry(0.1, 0).scale(0.85, 0.72, 1.45).rotateY(turn);
    p.geo(i % 3 ? '#8e929c' : '#7d828d', body.translate(...at(0, 0.12)), { cast: false });
    const peck = i % 2 ? -0.06 : 0; // some have their heads down
    p.geo('#5e6472', new THREE.DodecahedronGeometry(0.055, 0).translate(...at(0.14, 0.2 + peck)), { cast: false });
    p.geo('#565c69', new THREE.BoxGeometry(0.1, 0.02, 0.12).rotateY(turn).translate(...at(-0.16, 0.13)), {
      cast: false,
    });
  });
  const [lx, lz] = polar(BENCH_ANGLES[0] + 0.07, R - BORDER - 1.6);
  p.geo('#e9e7e1', new THREE.BoxGeometry(0.21, 0.004, 0.3).rotateY(0.6).translate(lx, 0.02, lz), { cast: false });
}
