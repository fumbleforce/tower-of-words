// The pool and its shower pavilion (pool_deck, pool_hall; docs/game/island.md "Sports and baths"), seen through the
// deck's fence from the pool walk and the courts walk, and walked on the deck itself, through the pavilion's door
// (places/pool.js). In the island frame (sports/plan.js, deck-plan.js):
//   the deck: pale slabs inside a steel mesh fence, the pavilion closing its north side; a row of loungers down its
//   east side, a lifeguard's chair by the pool's middle
//   the pool: 25 m of water in a white coping, six lanes, their lines dark under the water, lane ropes of floats,
//   starting blocks at the pavilion's end, a steel ladder at each corner of that end
//   the pavilion: one tall storey of white walls on a plinth under a flat roof with a parapet, its plant and two
//   rows of solar water heaters on it, a blue band round it,
//   frosted windows high up; its door on the west face at the pool walk's end, glass in a dark frame under a canopy,
//   プール POOL on a board on the canopy; on the deck side the two changing rooms' doors, a blue and a red plate by
//   them, and the shower heads along the wall between
//   round the deck (deck-plan.js): steps down into the first lane, two benches, the winter cover on its reel, the
//   pace clock, the float rack and buoys, the attendant's table
// After work the frosted windows and the door's glass are lit from inside.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRANITE } from '../outdoor/paving.js';
import { STEEL, bench, rod } from '../outdoor/furniture.js';
import { flatRoof } from '../dorm-court/roofs.js';
import { BLOCK } from '../outdoor/block.js';
import { meshFence } from './courts.js';
import * as P from './plan.js';
import * as D from './deck-plan.js';

const C = {
  wall: '#dedcd5',
  band: '#4f7f9a',
  coping: '#e6e6e1',
  water: '#5c9fb0',
  line: '#4b8597',
  frame: '#3f4650',
  frost: '#c5cfd2',
  lounger: '#e4e2dc',
  red: '#b0433f',
  blue: '#3e5a8c',
};
const [DX0, DX1, DZ0, DZ1] = P.DECK,
  [VX0, VX1, VZ0, VZ1] = P.PAVILION;
const { x: PX, z: PZ, w: PW, l: PL } = D.POOL; // six lanes, 25 m
const PH = 3.6; // the pavilion's walls (with the parapet, the layout's 2 storeys of 2)

function deck(p, pv, signs) {
  pv.field([DX0, DX1, DZ0, DZ1], {
    pattern: 'grid',
    module: [1.0, 1.0],
    tones: GRANITE.pale,
    origin: [DX0, DZ0],
  });
  // the pool: the coping, the water, the lane lines under it, the ropes on it
  const [x0, x1, z0, z1] = [PX - PW / 2, PX + PW / 2, PZ - PL / 2, PZ + PL / 2];
  p.box(C.coping, PW + 0.6, 0.07, PL + 0.6, PX, 0, PZ, { cast: false });
  p.box(C.water, PW, 0.02, PL, PX, 0.07, PZ, { cast: false });
  const lw = PW / 6;
  for (let i = 0; i < 6; i++) {
    const x = x0 + lw * (i + 0.5);
    p.box(C.line, 0.22, 0.01, PL - 2.2, x, 0.09, PZ, { cast: false });
    for (const s of [-1, 1])
      p.box(C.line, 0.7, 0.01, 0.22, x, 0.09, PZ + s * (PL / 2 - 1.2), {
        cast: false,
      });
  }
  for (let i = 1; i < 6; i++) {
    const x = x0 + lw * i;
    let k = 0;
    for (let z = z0 + 0.1; z < z1 - 0.1; z += 0.5, k++) {
      const end = z < z0 + 2.6 || z > z1 - 2.6;
      p.box(end ? C.red : k % 2 ? C.blue : '#e8e6df', 0.09, 0.07, 0.42, x, 0.08, z + 0.21, { cast: false });
    }
  }
  // the starting blocks at the pavilion's end, the ladders at that end's corners
  for (let i = 0; i < 6; i++) {
    const x = x0 + lw * (i + 0.5);
    p.box('#d6d8d6', 0.5, 0.5, 0.5, x, 0.07, z0 - 0.08);
    p.box(C.blue, 0.46, 0.04, 0.4, x, 0.57, z0 - 0.06);
  }
  for (const x of [x0 + 0.35, x1 - 0.35])
    for (const dx of [-0.2, 0.2]) {
      p.geo(STEEL.pale, new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6).translate(x + dx, 0.5, z0 + 0.05));
      p.geo(
        STEEL.pale,
        new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6).rotateX(Math.PI / 2).translate(x + dx, 0.95, z0 - 0.12),
      );
    }
  // loungers down the east side, a lifeguard's chair by the pool's west side
  for (const [x, z] of D.LOUNGERS) {
    p.box(C.lounger, 0.7, 0.32, 1.8, x, 0, z);
    p.box(C.lounger, 0.7, 0.08, 0.6, x, 0.32, z - 0.75, { ry: 0 });
    p.box(C.lounger, 0.66, 0.5, 0.08, x, 0.32, z - 0.88);
  }
  const [lx] = D.CHAIR;
  for (const [dx, dz] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ])
    p.box('#e8e6df', 0.06, 1.5, 0.06, lx + dx, 0, PZ + dz);
  p.box('#e8e6df', 0.62, 0.06, 0.62, lx, 1.5, PZ);
  p.box('#e8e6df', 0.6, 0.6, 0.06, lx - 0.0, 1.56, PZ - 0.28);
  p.box(C.red, 0.6, 0.06, 0.6, lx, 1.56, PZ);
  steps(p);
  furniture(p, signs);
  // the fence round the deck, the pavilion closing it on the north
  meshFence(p, [DX0, VZ1], [DX0, DZ1], { h: 2.0 });
  meshFence(p, [DX0, DZ1], [DX1, DZ1], { h: 2.0 });
  meshFence(p, [DX1, DZ0], [DX1, DZ1], { h: 2.0 });
  meshFence(p, [VX1, DZ0], [DX1, DZ0], { h: 2.0 });
}

// the steps down into the first lane at the south end: each tread a paler band under the water, deeper ones darker,
// a white nosing on each, and a steel rail either side curving from the coping down into the water
function steps(p) {
  const { x0, x1, z1, tread, n } = D.STEPS;
  const w = x1 - x0 - 0.16,
    cx = (x0 + x1) / 2;
  for (let i = 0; i < n; i++) {
    const z = z1 - tread * (i + 0.5);
    p.box(['#9fd0d8', '#86c0cb', '#71afbc'][i], w, 0.012, tread, cx, 0.085, z, {
      cast: false,
    });
    p.box('#eef2f0', w, 0.014, 0.05, cx, 0.088, z + tread / 2 - 0.03, {
      cast: false,
    });
  }
  for (const x of [x0 + 0.1, x1 - 0.1]) {
    const pts = [
      [x, 0.07, z1 + 0.22],
      [x, 0.92, z1 + 0.12],
      [x, 0.95, z1 - 0.35],
      [x, 0.55, z1 - tread * n + 0.05],
      [x, 0.08, z1 - tread * n - 0.05],
    ];
    for (let i = 0; i + 1 < pts.length; i++) rod(p, STEEL.pale, pts[i], pts[i + 1], 0.024);
  }
}

// round the deck: two benches against the west fence; the winter cover on its reel against the south fence and the
// pace clock on the pavilion's wall, the rules on the west fence; the float rack and a basket of pull buoys at the south-east corner; the
// attendant's folding table and chair at the north-east corner, a lost-property box and a clipboard on it
function furniture(p, signs) {
  for (const [x, z] of D.BENCHES) bench(p, x, z, Math.PI / 2, { len: D.BENCH_LEN });
  // the reel: the rolled blue cover on a steel drum between two A-frame stands, a crank on the west one
  const R = D.REEL,
    len = R.x1 - R.x0;
  p.geo(
    '#4d7fa6',
    new THREE.CylinderGeometry(R.r, R.r, len - 0.3, 14).rotateZ(Math.PI / 2).translate((R.x0 + R.x1) / 2, R.y, R.z),
  );
  for (let i = 0; i < 4; i++)
    p.geo(
      '#3f6d92',
      new THREE.CylinderGeometry(R.r + 0.008, R.r + 0.008, 0.06, 14)
        .rotateZ(Math.PI / 2)
        .translate(R.x0 + 0.6 + ((len - 1.2) * i) / 3, R.y, R.z),
    );
  for (const x of [R.x0, R.x1]) {
    rod(p, STEEL.mid, [x, 0, R.z - 0.32], [x, R.y + 0.05, R.z], 0.035);
    rod(p, STEEL.mid, [x, 0, R.z + 0.32], [x, R.y + 0.05, R.z], 0.035);
    p.geo(STEEL.pale, new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8).rotateZ(Math.PI / 2).translate(x, R.y, R.z));
  }
  rod(p, STEEL.dark, [R.x0 - 0.06, R.y, R.z], [R.x0 - 0.06, R.y - 0.28, R.z - 0.05], 0.02);
  // the pace clock on the pavilion's wall between the showers, facing down the pool: a white face in a dark ring,
  // its quarters marked, the red sweep hand
  const [cx, cy, cz] = D.CLOCK,
    face = (r, d, z) => new THREE.CylinderGeometry(r, r, d, 24).rotateX(Math.PI / 2).translate(cx, cy, z);
  p.geo('#2f3640', face(0.36, 0.06, cz + 0.03));
  p.geo('#f2f2ee', face(0.31, 0.02, cz + 0.07));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2,
      q = k % 3 === 0,
      r = q ? 0.24 : 0.26;
    p.box(
      '#2f3640',
      q ? 0.03 : 0.018,
      q ? 0.08 : 0.04,
      0.01,
      cx + Math.sin(a) * r,
      cy + Math.cos(a) * r - (q ? 0.04 : 0.02),
      cz + 0.085,
      { cast: false },
    );
  }
  rod(p, C.red, [cx, cy, cz + 0.09], [cx + 0.17, cy + 0.19, cz + 0.09], 0.01);
  // the rules on the west fence over the lifeguard's chair, facing the pool: 飛び込み禁止, no diving
  const [rx0, ry0, rz0] = D.RULES;
  p.box('#26404f', 0.04, 0.56, 1.64, rx0 - 0.03, ry0 - 0.28, rz0);
  signs.board('飛び込み禁止', 'NO DIVING', '#a8433c', 1.6, 0.5, [rx0, ry0, rz0], Math.PI / 2);
  // the float rack: a low steel frame of three shelves, kickboards stacked on it in blue and yellow; the basket of
  // pull buoys beside it
  const [rx, rz] = D.RACK;
  for (const dx of [-0.32, 0.32]) for (const dz of [-0.6, 0.6]) p.box(STEEL.mid, 0.04, 1.0, 0.04, rx + dx, 0, rz + dz);
  for (const y of [0.12, 0.47, 0.82]) {
    p.box(STEEL.pale, 0.7, 0.03, 1.24, rx, y, rz);
    for (let i = 0; i < 4; i++)
      p.box(i % 2 ? '#e8c34a' : '#3e7bb8', 0.42, 0.045, 0.3, rx, y + 0.03 + i * 0.05, rz - 0.42 + ((i * 0.28) % 0.9));
  }
  const [bx, bz] = D.BASKET;
  p.geo('#5b6670', new THREE.CylinderGeometry(0.3, 0.26, 0.42, 10).translate(bx, 0.21, bz));
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1;
    p.box(
      i % 2 ? '#e8c34a' : '#d85a3c',
      0.16,
      0.12,
      0.22,
      bx + Math.cos(a) * 0.12,
      0.42 + (i % 3) * 0.04,
      bz + Math.sin(a) * 0.12,
      { ry: a },
    );
  }
  // the attendant's table: a folding table with a white top, a chair beside it, the lost-property box (a clear tub)
  // and a clipboard on it
  const [tx, tz] = D.TABLE;
  p.box('#eceae4', 1.2, 0.04, 0.6, tx, 0.46, tz);
  for (const dx of [-0.55, 0.55])
    for (const dz of [-0.25, 0.25]) p.box(STEEL.mid, 0.03, 0.46, 0.03, tx + dx, 0, tz + dz);
  p.box('#cfdce0', 0.42, 0.24, 0.32, tx + 0.3, 0.5, tz);
  p.box('#3e7bb8', 0.18, 0.04, 0.08, tx + 0.28, 0.74, tz + 0.05);
  p.box('#d85a3c', 0.12, 0.05, 0.12, tx + 0.36, 0.74, tz - 0.06);
  p.box('#8a6f4e', 0.24, 0.015, 0.32, tx - 0.25, 0.5, tz, { ry: 0.2 });
  p.box('#f4f2ec', 0.2, 0.004, 0.27, tx - 0.25, 0.517, tz, { ry: 0.2 });
  const chx = tx - 0.15,
    chz = tz + 0.55;
  p.box('#4f7f9a', 0.3, 0.03, 0.3, chx, 0.29, chz);
  p.box('#4f7f9a', 0.3, 0.28, 0.03, chx, 0.32, chz + 0.14);
  for (const dx of [-0.13, 0.13])
    for (const dz of [-0.13, 0.13]) p.box(STEEL.mid, 0.025, 0.29, 0.025, chx + dx, 0, chz + dz);
}

// the pavilion: walls, the blue band, frosted windows high up, the roof; its door on the west face, the changing
// rooms' doors and the showers on the deck side
function pavilion(p, glow, signs, lights) {
  const cx = (VX0 + VX1) / 2,
    cz = (VZ0 + VZ1) / 2,
    w = VX1 - VX0,
    d = VZ1 - VZ0;
  p.box(BLOCK.plinth, w + 0.16, 0.3, d + 0.16, cx, 0, cz, { surf: 'concrete' });
  p.box(C.wall, w, PH - 0.3, d, cx, 0.3, cz, { surf: 'concrete' });
  p.box(C.band, w + 0.06, 0.22, d + 0.06, cx, PH - 0.75, cz);
  flatRoof(p, [VX0 - 0.05, VX1 + 0.05, VZ0 - 0.05, VZ1 + 0.05], PH + 0.1, {
    edges: 'nsew',
    units: [
      [VX1 - 1.2, VZ0 + 1.0],
      [VX1 - 2.2, VZ0 + 1.0],
    ],
    vents: [
      [VX0 + 1.2, VZ0 + 1.0],
      [VX0 + 2.0, VZ0 + 1.0],
    ],
  });
  // the solar water heaters for the showers: two rows of dark panels tilted to the south, on steel frames
  for (const z of [cz - 1.4, cz + 0.9])
    for (let x = VX0 + 3.0; x < VX1 - 3.5; x += 1.25) {
      p.geo('#2f3e52', new THREE.BoxGeometry(1.15, 0.05, 1.3).rotateX(0.5).translate(x + 0.6, PH + 0.62, z));
      p.box(STEEL.mid, 1.1, 0.04, 0.05, x + 0.6, PH + 0.95, z - 0.55);
    }
  // frosted windows high up on the south (deck) and west faces, but over the doors
  const doorZ = P.PAV_DOOR_Z;
  for (let x = VX0 + 0.8; x < VX1 - 1; x += 1.6)
    glow.push(new THREE.BoxGeometry(1.1, 0.5, 0.02).translate(x + 0.55, 2.35, VZ1 + 0.02));
  for (let z = VZ0 + 0.8; z < VZ1 - 1; z += 1.6)
    if (Math.abs(z + 0.55 - doorZ) > 1.2)
      glow.push(new THREE.BoxGeometry(0.02, 0.5, 1.1).translate(VX0 - 0.02, 2.35, z + 0.55));
  // the door: glass in a dark frame, a canopy over it, its board on the canopy's front edge, the card on the glass
  const f = VX0 - 0.02;
  p.box(C.frame, 0.08, 2.25, 2.0, f, 0.3, doorZ);
  glow.push(new THREE.BoxGeometry(0.02, 2.0, 1.8).translate(f - 0.05, 1.32, doorZ));
  p.box(C.frame, 0.06, 2.0, 0.06, f - 0.06, 0.32, doorZ);
  p.box(STEEL.pale, 0.04, 0.5, 0.04, f - 0.08, 0.85, doorZ - 0.12);
  p.box(BLOCK.plinth, 0.9, 0.08, 2.6, f - 0.45, 0, doorZ, { surf: 'concrete' });
  p.box(BLOCK.canopy, 1.2, 0.12, 3.0, f - 0.6, 2.62, doorZ);
  p.box(BLOCK.fascia, 0.08, 0.1, 3.0, f - 1.2, 2.55, doorZ);
  signs.board('プール', 'POOL', '#2f5f7a', 1.8, 0.5, [f - 1.15, 3.0, doorZ], -Math.PI / 2);
  p.box('#26404f', 0.05, 0.54, 1.84, f - 1.12, 2.73, doorZ);
  lights.glowParts.push(new THREE.BoxGeometry(0.3, 0.04, 0.3).translate(f - 0.6, 2.58, doorZ));
  lights.lit.push([f - 0.9, doorZ, 1.2]);
  // the deck side: the two changing rooms' doors with a blue and a red plate, shower heads on the wall between
  const df = VZ1 + 0.02;
  for (const [x, plate] of [
    [VX0 + 2.0, C.blue],
    [VX1 - 2.0, C.red],
  ]) {
    p.box('#9aa3aa', 1.0, 2.0, 0.06, x, 0.3, df);
    p.box(plate, 0.3, 0.3, 0.03, x + 0.75, 1.5, df + 0.03, { cast: false });
  }
  for (let x = cx - 3; x <= cx + 3; x += 1.5) {
    p.box(STEEL.mid, 0.05, 2.1, 0.05, x, 0.3, df + 0.05);
    p.box(STEEL.pale, 0.16, 0.05, 0.22, x, 2.3, df + 0.14);
  }
}

// builds it all: the pavilion into p (Parts, casts), the deck, the pool and the fence into q (Parts that doesn't),
// pv (a paver), signs (a signSet), lights (a lightSet); root takes the lit glass. Returns the evening switch.
export function* poolSteps(root, p, q, pv, signs, lights) {
  deck(q, pv, signs);
  yield;
  const glow = [];
  pavilion(p, glow, signs, lights);
  const glass = new THREE.MeshStandardMaterial({
    color: C.frost,
    emissive: new THREE.Color('#fff0d8'),
    emissiveIntensity: 0,
    roughness: 0.6,
  });
  const g = glow.map((q) => q.toNonIndexed());
  for (const q of g)
    for (const n of Object.keys(q.attributes)) if (n !== 'position' && n !== 'normal') q.deleteAttribute(n);
  const mesh = new THREE.Mesh(mergeGeometries(g), glass);
  g.forEach((q) => q.dispose());
  glow.forEach((q) => q.dispose());
  mesh.name = 'pool:glass';
  root.add(mesh);
  yield;
  return {
    evening() {
      glass.emissiveIntensity = 0.6;
    },
  };
}
