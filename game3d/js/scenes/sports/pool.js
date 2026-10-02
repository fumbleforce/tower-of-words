// The pool and its shower pavilion (pool_deck, pool_hall; docs/game/island.md "Sports and baths"), seen through the
// deck's fence from the pool walk and the courts walk, and shut on day 1: nothing behind the pavilion's door. In the
// island frame (sports/plan.js):
//   the deck: pale slabs inside a steel mesh fence, the pavilion closing its north side; a row of loungers down its
//   east side, a lifeguard's chair by the pool's middle
//   the pool: 25 m of water in a white coping, six lanes, their lines dark under the water, lane ropes of floats,
//   starting blocks at the pavilion's end, a steel ladder at each corner of that end
//   the pavilion: one tall storey of white walls on a plinth under a flat roof with a parapet, its plant and two
//   rows of solar water heaters on it, a blue band round it,
//   frosted windows high up; its door on the west face at the pool walk's end, glass in a dark frame under a canopy,
//   プール POOL on a board on the canopy and a 準備中 CLOSED card on the glass; on the deck side the two changing
//   rooms' doors, a blue and a red plate by them, and the shower heads along the wall between
// After work the frosted windows and the door's glass are lit from inside.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRANITE } from '../outdoor/paving.js';
import { STEEL } from '../outdoor/furniture.js';
import { flatRoof } from '../dorm-court/roofs.js';
import { BLOCK } from '../outdoor/block.js';
import { meshFence } from './courts.js';
import * as P from './plan.js';

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
const PX = (DX0 + DX1) / 2,
  PZ = (DZ0 + DZ1) / 2 + 0.6, // a little toward the walk, the pavilion's end deeper
  PW = 8.6,
  PL = 16.7; // six lanes, 25 m
const PH = 3.6; // the pavilion's walls (with the parapet, the layout's 2 storeys of 2)

function deck(p, pv) {
  pv.field([DX0, DX1, DZ0, DZ1], { pattern: 'grid', module: [1.0, 1.0], tones: GRANITE.pale, origin: [DX0, DZ0] });
  // the pool: the coping, the water, the lane lines under it, the ropes on it
  const [x0, x1, z0, z1] = [PX - PW / 2, PX + PW / 2, PZ - PL / 2, PZ + PL / 2];
  p.box(C.coping, PW + 0.6, 0.07, PL + 0.6, PX, 0, PZ, { cast: false });
  p.box(C.water, PW, 0.02, PL, PX, 0.07, PZ, { cast: false });
  const lw = PW / 6;
  for (let i = 0; i < 6; i++) {
    const x = x0 + lw * (i + 0.5);
    p.box(C.line, 0.22, 0.01, PL - 2.2, x, 0.09, PZ, { cast: false });
    for (const s of [-1, 1]) p.box(C.line, 0.7, 0.01, 0.22, x, 0.09, PZ + s * (PL / 2 - 1.2), { cast: false });
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
  for (let z = z0 + 1.5; z < z1 - 1; z += 2.4) {
    const x = DX1 - 1.3;
    p.box(C.lounger, 0.7, 0.32, 1.8, x, 0, z);
    p.box(C.lounger, 0.7, 0.08, 0.6, x, 0.32, z - 0.75, { ry: 0 });
    p.box(C.lounger, 0.66, 0.5, 0.08, x, 0.32, z - 0.88);
  }
  const lx = x0 - 0.9;
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
  // the fence round the deck, the pavilion closing it on the north
  meshFence(p, [DX0, VZ1], [DX0, DZ1], { h: 2.0 });
  meshFence(p, [DX0, DZ1], [DX1, DZ1], { h: 2.0 });
  meshFence(p, [DX1, DZ0], [DX1, DZ1], { h: 2.0 });
  meshFence(p, [VX1, DZ0], [DX1, DZ0], { h: 2.0 });
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
  signs.card('準備中', 'CLOSED', 0.46, 0.3, [f - 0.09, 1.25, doorZ + 0.45], -Math.PI / 2);
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
  deck(q, pv);
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
