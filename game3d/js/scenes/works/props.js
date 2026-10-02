// The old works' gear and the nooks' props (works/plan.js), in the island frame:
//   the pipe bridge: three pipes on tall steel portals from the power plant over the lane's head to the factory's
//   west end, one lagged in silver, an elbow down into the plant; high, so they never hide Eric at the chimney's foot
//   the siding: rails set flush in the concrete, out of the factory's gates, round a curve and east along the yard to
//   a buffer stop, rust along them
//   the transformer lot: a chain-link fence, its gate open; two old transformers on plinths with their insulators,
//   a water tank on four legs, weeds
//   the smoking corner: the server hall's condensers, a plank bench on two crates, a sand bucket, 喫煙所 on the wall,
//   a fence along the yard
//   the weather station: a low fence, the white louvred screen on its legs, a rain gauge, a wind mast
//   drums and pallets round the factory apron and at the chimney's foot; the recycling centre's sorting bins
import * as THREE from 'three';
import { STEEL, rod } from '../outdoor/furniture.js';
import { grass } from '../outdoor/planting.js';
import { C } from './buildings.js';
import * as P from './plan.js';

const NO = { cast: false };
const PIPES = [
  { r: 0.24, y: 6.7, color: '#b9bcbc' },
  { r: 0.17, y: 6.65, color: '#8f9a92', dz: 0.55 },
  { r: 0.12, y: 6.6, color: '#7f8a84', dz: -0.5 },
];
const FENCE = { opts: { transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide } };

// a chain-link fence from a to b, posts every 2.2, a top rail; gaps [from, to] along it left open
export function fence(p, mesh, a, b, { h = 1.6, gaps = [] } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
    at = (t) => [a[0] + d[0] * t, a[1] + d[1] * t];
  const cuts = [0, ...gaps.flat(), L];
  for (let i = 0; i + 1 < cuts.length; i += 2) {
    const [t0, t1] = [cuts[i], cuts[i + 1]];
    if (t1 - t0 < 0.2) continue;
    const [m, n] = [at((t0 + t1) / 2), t1 - t0];
    const ry = Math.atan2(-d[1], d[0]);
    mesh.geo('#4b5158', new THREE.PlaneGeometry(n, h - 0.08).rotateY(ry).translate(m[0], h / 2, m[1]), FENCE);
    rod(p, STEEL.mid, [at(t0)[0], h, at(t0)[1]], [at(t1)[0], h, at(t1)[1]], 0.025);
    const k = Math.max(1, Math.ceil((t1 - t0) / 2.2));
    for (let j = 0; j <= k; j++) {
      const [x, z] = at(t0 + ((t1 - t0) * j) / k);
      p.geo(STEEL.mid, new THREE.CylinderGeometry(0.03, 0.035, h, 6).translate(x, h / 2, z));
    }
  }
}

function pipeBridge(p) {
  const x0 = P.PLANT[1],
    x1 = P.FACTORY[0],
    z = P.PIPE_Z;
  for (const { r, y, color, dz = 0 } of PIPES) {
    p.geo(
      color,
      new THREE.CylinderGeometry(r, r, x1 - x0, 10).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, y, z + dz),
      { surf: 'metal' },
    );
    for (let x = x0 + 1.2; x < x1; x += 2.4)
      p.geo(
        STEEL.dark,
        new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.08, 10).rotateZ(Math.PI / 2).translate(x, y, z + dz),
        NO,
      );
  }
  // the portals: west of the lane and between the chimney's foot and the factory
  for (const x of [P.LANE[0] - 0.5, P.FOOT[1] + 0.45]) {
    for (const s of [-0.9, 0.9]) p.box(STEEL.dark, 0.18, 6.4, 0.18, x, 0, z + s);
    p.box(STEEL.dark, 0.2, 0.2, 2.1, x, 6.3, z);
    p.box(C.base, 0.5, 0.15, 0.5, x, 0, z - 0.9, NO);
    p.box(C.base, 0.5, 0.15, 0.5, x, 0, z + 0.9, NO);
  }
  // rust at the brackets; the lagged pipe's elbow down into the plant's wall
  p.geo('#b9bcbc', new THREE.CylinderGeometry(0.24, 0.24, 1.6, 10).translate(x0 + 0.3, 5.9, z), { surf: 'metal' });
}

// the siding: two rails flush in the concrete with a dark groove beside each, round the curve, to a buffer stop
function siding(p) {
  const { gauge: g, r, z: rz, stop } = P.RAIL,
    gx = P.GATES.x,
    zc = rz - r;
  const rail = (a, b) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
    p.box('#6c625a', 0.07, 0.022, L + 0.02, (a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2, {
      ry,
      cast: false,
      surf: 'metal',
    });
    p.box(
      '#3d4046',
      0.05,
      0.016,
      L + 0.02,
      (a[0] + b[0]) / 2 + Math.cos(ry) * 0.07,
      0,
      (a[1] + b[1]) / 2 - Math.sin(ry) * 0.07,
      { ry, cast: false },
    );
  };
  for (const s of [-g / 2, g / 2]) {
    rail([gx + s, P.GATE[2]], [gx + s, zc]);
    const R = r - s,
      n = 8;
    for (let k = 0; k < n; k++) {
      const a0 = Math.PI - (k * Math.PI) / 2 / n,
        a1 = Math.PI - ((k + 1) * Math.PI) / 2 / n;
      rail([gx + r + R * Math.cos(a0), zc + R * Math.sin(a0)], [gx + r + R * Math.cos(a1), zc + R * Math.sin(a1)]);
    }
    rail([gx + r, rz - s], [stop, rz - s]);
  }
  // the buffer stop: a steel frame with two buffers, painted, a red lamp board
  const bx = stop + 0.1;
  for (const s of [-0.5, 0.5]) p.box('#4a5058', 0.14, 0.9, 0.14, bx + 0.25, 0, rz + s);
  p.box('#4a5058', 0.3, 0.3, 1.5, bx + 0.25, 0.75, rz);
  for (const s of [-0.5, 0.5])
    p.geo(
      '#3a3e45',
      new THREE.CylinderGeometry(0.13, 0.13, 0.3, 8).rotateZ(Math.PI / 2).translate(bx - 0.05, 0.9, rz + s),
    );
  p.box(C.red, 0.04, 0.4, 0.4, bx + 0.42, 1.05, rz, NO);
  p.box(C.white, 0.045, 0.12, 0.42, bx + 0.42, 1.19, rz, NO);
}

// an oil drum, a pallet with an old crate, a plastic crate
const drum = (p, [x, z], k) =>
  p.geo(['#4e6f78', '#8a4b44', '#5f6a54'][k % 3], new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10).translate(x, 0.45, z), {
    surf: 'metal',
  });
function pallet(p, [x, z], k) {
  p.box('#a8957a', 1.1, 0.14, 1.1, x, 0, z, NO);
  if (k % 2 === 0) p.box('#8f8a80', 0.9, 0.5, 0.8, x, 0.14, z);
}

function lot(p, mesh) {
  const [x0, x1, z0, z1] = P.LOT;
  fence(p, mesh, [x0, z1], [x1, z1], { gaps: [[P.LOT_GATE[0] - x0, P.LOT_GATE[1] - x0]] });
  fence(p, mesh, [x0, z0], [x0, z1]);
  fence(p, mesh, [x1, z0], [x1, z1]);
  // the gate leaf, swung open inward against the fence
  p.box(STEEL.mid, 1.5, 1.5, 0.04, P.LOT_GATE[1] + 0.05, 0.05, z1 - 0.8, { ry: Math.PI / 2 });
  // the transformers: on plinths, ribbed, three insulators each
  for (const [k, x] of [x0 + 1.3, x0 + 3.3].entries()) {
    const z = z0 + 1.8;
    p.box(C.base, 1.8, 0.3, 1.8, x, 0, z, { surf: 'concrete' });
    p.box('#7d8a86', 1.4, 1.5, 1.2, x, 0.3, z, { surf: 'metal' });
    for (let t = -0.6; t <= 0.6; t += 0.2) p.box('#6c7874', 0.05, 1.2, 1.36, x + t, 0.45, z, NO);
    for (const dx of [-0.4, 0, 0.4]) {
      p.geo('#c9c3b2', new THREE.CylinderGeometry(0.07, 0.1, 0.6, 8).translate(x + dx, 2.1, z - 0.2));
      for (let y = 1.9; y < 2.4; y += 0.14)
        p.geo('#bdb6a3', new THREE.CylinderGeometry(0.13, 0.13, 0.04, 8).translate(x + dx, y, z - 0.2), NO);
    }
    p.box(C.rust, 0.04, 0.5, 0.4, x + 0.71, 0.6 + k * 0.2, z, NO);
  }
  // the water tank on four legs, by the factory's wall
  const tx = x1 - 1.1,
    tz = z0 + 1.6;
  for (const [dx, dz] of [
    [-0.8, -0.8],
    [0.8, -0.8],
    [-0.8, 0.8],
    [0.8, 0.8],
  ])
    p.box(STEEL.dark, 0.12, 4.2, 0.12, tx + dx, 0, tz + dz);
  rod(p, STEEL.dark, [tx - 0.8, 1.6, tz - 0.8], [tx + 0.8, 3.2, tz - 0.8], 0.03);
  rod(p, STEEL.dark, [tx - 0.8, 1.6, tz + 0.8], [tx + 0.8, 3.2, tz + 0.8], 0.03);
  p.geo('#8e9aa0', new THREE.CylinderGeometry(1.1, 1.1, 1.8, 14).translate(tx, 5.1, tz), { surf: 'metal' });
  p.geo('#6f7a80', new THREE.ConeGeometry(1.15, 0.45, 14).translate(tx, 6.22, tz));
  p.box(C.rust, 0.06, 1.0, 0.06, tx + 0.6, 4.3, tz + 0.95, NO);
  for (let k = 0; k < 9; k++)
    grass(p, x0 + 0.5 + ((k * 1.37) % (x1 - x0 - 1)), z1 - 0.5 - ((k * 0.83) % 3), { seed: 300 + k });
}

function corner(p, mesh, plain) {
  const [x0, x1, z0, z1] = P.CORNER;
  fence(p, mesh, [x0, z0 + 0.15], [P.HALL[0], z0 + 0.15]);
  for (const [x, z] of P.CONDENSERS) {
    p.box('#c6c9c7', 0.7, 0.9, 0.9, x, 0, z);
    p.geo(
      '#6f747b',
      new THREE.CylinderGeometry(0.3, 0.3, 0.04, 12).rotateZ(Math.PI / 2).translate(x - 0.36, 0.45, z),
      NO,
    );
  }
  // the plank bench on two crates, the sand bucket, the sign
  const [bx, bz] = P.CORNER_BENCH;
  for (const s of [-0.7, 0.7]) p.box('#5c7f9a', 0.45, 0.42, 0.4, bx + s, 0, bz);
  p.box('#9b958c', 1.9, 0.06, 0.34, bx, 0.42, bz);
  p.geo('#a33f37', new THREE.CylinderGeometry(0.17, 0.14, 0.32, 10).translate(bx + 1.35, 0.16, bz + 0.05));
  p.geo('#c8bfa9', new THREE.CylinderGeometry(0.15, 0.15, 0.02, 10).translate(bx + 1.35, 0.31, bz + 0.05), NO);
  plain.board('きつえんじょ', 'SMOKING AREA', '#5a5f66', 0.9, 0.3, [x1 + 0.78, 1.7, (z0 + z1) / 2 + 0.6], -Math.PI / 2);
  for (let k = 0; k < 5; k++) grass(p, x0 + 0.3 + k * 0.9, z1 - 0.15, { seed: 320 + k });
}

function station(p, mesh) {
  const [x0, x1, z0, z1] = P.STATION;
  const low = { h: 1.0 };
  fence(p, mesh, [x0, z1], [x1, z1], { ...low, gaps: [[P.STATION_GATE[0] - x0, P.STATION_GATE[1] - x0]] });
  fence(p, mesh, [x0, z0], [x1, z0], low);
  fence(p, mesh, [x0, z0], [x0, z1], low);
  fence(p, mesh, [x1, z0], [x1, z1], low);
  p.box('#8a9a6e', x1 - x0 - 0.2, 0.02, z1 - z0 - 0.2, (x0 + x1) / 2, 0, (z0 + z1) / 2, { cast: false, surf: 'soil' });
  // the louvred screen on its legs, its door to the north (as they face), a pitched lid
  const [sx, sz] = [-42.9, z0 + 2.0];
  for (const [dx, dz] of [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ])
    p.box('#e6e3dc', 0.06, 1.1, 0.06, sx + dx, 0, sz + dz);
  p.box('#eeede8', 0.8, 0.6, 0.7, sx, 1.1, sz);
  for (let y = 1.16; y < 1.68; y += 0.08) p.box('#d6d4cd', 0.82, 0.02, 0.72, sx, y, sz, NO);
  p.geo('#eeede8', new THREE.ConeGeometry(0.62, 0.22, 4).rotateY(Math.PI / 4).translate(sx, 1.82, sz));
  // the rain gauge, the wind mast with its cups and vane
  p.geo('#c9cccf', new THREE.CylinderGeometry(0.12, 0.12, 0.6, 10).translate(-40.0, 0.3, z0 + 1.6));
  const [mx, mz] = [-39.6, z1 - 1.4];
  p.geo(STEEL.pale, new THREE.CylinderGeometry(0.03, 0.04, 3.4, 6).translate(mx, 1.7, mz));
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    rod(p, STEEL.pale, [mx, 3.4, mz], [mx + Math.cos(a) * 0.3, 3.4, mz + Math.sin(a) * 0.3], 0.012);
    p.geo(
      '#e6e3dc',
      new THREE.SphereGeometry(0.06, 6, 4).translate(mx + Math.cos(a) * 0.3, 3.4, mz + Math.sin(a) * 0.3),
      NO,
    );
  }
  p.box(STEEL.dark, 0.6, 0.12, 0.02, mx + 0.25, 3.55, mz, NO);
}

// the recycling centre's sorting bins along the street's east edge south of its door, each its colour
function bins(p) {
  const colors = ['#3f6178', '#5f7a6a', '#c6b252', '#8a4b44'];
  colors.forEach((c, k) => {
    const z = P.W2_COURT[3] + 0.9 + k * 0.85;
    p.box(c, 0.7, 0.9, 0.7, P.STREET[1] + 0.55, 0, z);
    p.box('#3e434d', 0.74, 0.06, 0.74, P.STREET[1] + 0.55, 0.9, z, NO);
  });
}

// p: a Parts collector (casting); g: a cells' collector for the small things; mesh: a Parts for the chain-link (its
// own see-through material); plain: the unlit signSet
export function* propsSteps(p, g, mesh, plain) {
  pipeBridge(p);
  siding(g);
  yield;
  P.DRUMS.forEach((d, k) => drum(g, d, k));
  P.PALLETS.forEach((d, k) => pallet(g, d, k));
  bins(g);
  yield;
  lot(p, mesh);
  corner(g, mesh, plain);
  station(g, mesh);
  yield;
}
