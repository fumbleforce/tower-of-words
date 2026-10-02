// The supply yard's buildings and gear (harbour/plan.js), in the island frame:
//   the warehouse: a long shed of pale ribbed metal on a concrete plinth under a low-pitched roof, three roller
//   doors in its south face (one half up, dark inside), a personnel door with a lamp over it, にあげば SUPPLY QUAY on
//   a board along its front, a gutter and downpipes
//   the foreman's hut: a white site cabin on blocks by the supply pier's root, a window and a door to the yard;
//   company bikes in a rack along its east side
//   the crane: a pedestal jib crane on the south quay, muted orange with a dark machinery house and a glazed cab,
//   its jib out over the freighter's hatches, the hook hanging
//   the containers: 20-foot boxes in two blocks, one or two high, in muted colours with ribbed sides and door ends
//   pallets and crates by the warehouse's doors and on the supply pier; two floodlight masts
// After work the floodlights, the hut's window and the lamp over the warehouse door are lit.
import * as THREE from 'three';
import { STEEL, bikeRack, rod } from '../outdoor/furniture.js';
import { bike } from '../dorm-court/cluster-yards.js';
import * as P from './plan.js';

const C = {
  shed: '#a3aab0',
  rib: '#929aa1',
  shedRoof: '#6f7680',
  plinth: '#8c8d8c',
  door: '#7b838c',
  doorRib: '#6d747c',
  dark: '#2c3036',
  hut: '#e2e1db',
  hutBand: '#3f6178',
  crane: '#bf6b3f',
  craneDark: '#3b3f46',
  pallet: '#a8957a',
  crate: '#8f7e66',
};
const BOXES = ['#3f6178', '#8a4b44', '#5f7a6a', '#b9b2a2', '#4e5a66', '#3e7377', '#8a4b44', '#3f6178'];

// the warehouse
function shed(p, glow, lights, signs) {
  const [x0, x1, z0, z1] = P.SHED,
    w = x1 - x0,
    d = z1 - z0,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    H = 4.6,
    RISE = 0.7;
  p.box(C.plinth, w + 0.1, 0.35, d + 0.1, cx, 0, cz, { surf: 'concrete' });
  p.box(C.shed, w, H - 0.35, d, cx, 0.35, cz, { surf: 'metal' });
  // the ribs down every face, every 0.5
  for (let x = x0 + 0.25; x < x1; x += 0.5)
    for (const z of [z0 - 0.02, z1 + 0.02]) p.box(C.rib, 0.08, H - 0.4, 0.04, x, 0.38, z, { cast: false });
  for (let z = z0 + 0.25; z < z1; z += 0.5)
    for (const x of [x0 - 0.02, x1 + 0.02]) p.box(C.rib, 0.04, H - 0.4, 0.08, x, 0.38, z, { cast: false });
  // the roof: two low slopes from a ridge along x, overhanging, a dark edge
  const half = d / 2 + 0.35,
    slope = Math.hypot(half, RISE),
    a = Math.atan2(RISE, half);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(w + 0.5, 0.12, slope)
      .rotateX(s * a)
      .translate(cx, H + RISE / 2, cz + (s * half) / 2);
    p.geo(C.shedRoof, g, { surf: 'metal' });
  }
  // the gable ends' triangles
  for (const x of [x0, x1]) {
    const sh = new THREE.Shape();
    sh.moveTo(-d / 2, 0);
    sh.lineTo(d / 2, 0);
    sh.lineTo(0, RISE);
    sh.closePath();
    p.geo(C.shed, new THREE.ShapeGeometry(sh).rotateY(Math.PI / 2).translate(x + (x === x0 ? -0.01 : 0.01), H, cz), {
      cast: false,
    });
    p.geo(C.shed, new THREE.ShapeGeometry(sh).rotateY(-Math.PI / 2).translate(x + (x === x0 ? -0.01 : 0.01), H, cz), {
      cast: false,
    });
  }
  p.box(C.dark, w + 0.5, 0.14, 0.14, cx, H - 0.1, z1 + 0.42); // the gutter
  for (const x of [x0 + 0.3, x1 - 0.3]) p.box(C.dark, 0.1, H - 0.1, 0.1, x, 0, z1 + 0.08, { cast: false });
  // the roller doors: three across the south face, framed, the middle one half up and dark behind
  const doors = [x0 + 2.6, cx, x1 - 2.6],
    DW = 3.0,
    DH = 3.4;
  doors.forEach((x, i) => {
    const up = i === 1 ? 1.5 : 0;
    p.box(C.dark, DW + 0.3, DH + 0.3, 0.06, x, 0, z1 + 0.02, { cast: false });
    if (up) p.box('#1d2024', DW, up, 0.05, x, 0, z1 + 0.05, { cast: false }); // the dark inside
    p.box(C.door, DW, DH - up, 0.06, x, up, z1 + 0.06, { cast: false });
    for (let y = up + 0.18; y < DH; y += 0.18) p.box(C.doorRib, DW, 0.025, 0.03, x, y, z1 + 0.1, { cast: false });
    p.box(C.dark, DW + 0.3, 0.3, 0.3, x, DH, z1 + 0.15); // the roller's box
    // yellow and black bollards guarding the jambs
    for (const s of [-1, 1]) p.box('#c6b252', 0.2, 0.8, 0.2, x + s * (DW / 2 + 0.3), 0, z1 + 0.25);
  });
  // the personnel door between the west and middle doors, its lamp
  const px = (doors[0] + doors[1]) / 2;
  p.box(C.dark, 1.0, 2.1, 0.06, px, 0.35, z1 + 0.04, { cast: false });
  p.box('#5b616b', 0.85, 2.0, 0.06, px, 0.35, z1 + 0.07, { cast: false });
  glow.push(new THREE.BoxGeometry(0.4, 0.12, 0.16).translate(px, 2.7, z1 + 0.2));
  lights.lit.push([px, z1 + 1.2, 1.4]);
  // the name along the front, over the doors
  signs.board('にあげば', 'AMAKAWA LOGISTICS · SUPPLY QUAY', '#4f5f74', 5.6, 0.62, [cx + 0.2, 3.98, z1 + 0.33], 0);
  p.box(C.dark, 5.7, 0.68, 0.05, cx + 0.2, 3.64, z1 + 0.3, { cast: false });
}

// the foreman's hut, its plate, and the bikes along its east side
function hut(p, glow, lights, signs) {
  const [x0, x1, z0, z1] = P.HUT,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    w = x1 - x0,
    d = z1 - z0;
  for (const [x, z] of [
    [x0 + 0.3, z0 + 0.3],
    [x1 - 0.3, z0 + 0.3],
    [x0 + 0.3, z1 - 0.3],
    [x1 - 0.3, z1 - 0.3],
  ])
    p.box(C.plinth, 0.4, 0.25, 0.4, x, 0, z, { cast: false });
  p.box(C.hut, w, 2.3, d, cx, 0.25, cz, { surf: 'paint' });
  p.box(C.hutBand, w + 0.02, 0.18, d + 0.02, cx, 2.35, cz);
  p.box('#cfcfc9', w + 0.2, 0.08, d + 0.2, cx, 2.55, cz);
  // the door and the window on the south face, a step to the door
  p.box('#5b616b', 0.85, 1.95, 0.05, x0 + 0.9, 0.3, z1 + 0.01, { cast: false });
  p.box(C.plinth, 1.1, 0.25, 0.5, x0 + 0.9, 0, z1 + 0.25, { cast: false });
  p.box('#3a4a58', 1.6, 0.9, 0.05, x1 - 1.3, 1.1, z1 + 0.01, { cast: false });
  glow.push(new THREE.BoxGeometry(1.5, 0.8, 0.02).translate(x1 - 1.3, 1.55, z1 + 0.045));
  glow.push(new THREE.BoxGeometry(0.3, 0.1, 0.14).translate(x0 + 0.9, 2.42, z1 + 0.12));
  lights.lit.push([x0 + 0.9, z1 + 1.0, 1.1]);
  // the bikes in their rack along the east side, nose in
  bikeRack(p, P.RACK.a, P.RACK.b, { n: 3 }).forEach(([x, z], i) => i !== 1 && bike(p, x + 0.1, z, Math.PI / 2, i + 3));
}

// the crane: the pedestal, the turret with its machinery house and cab, the jib to the hook over the freighter
function crane(p) {
  const { x, z, base, to } = P.CRANE,
    yaw = Math.atan2(-(to[1] - z), to[0] - x),
    reach = Math.hypot(to[0] - x, to[1] - z);
  p.box(C.craneDark, base, 0.4, base, x, 0, z, { surf: 'metal' });
  p.geo(C.crane, new THREE.CylinderGeometry(0.75, 0.95, 4.2, 10).translate(x, 2.5, z), { surf: 'metal' });
  // the turret, turned toward the jib's tip: the machinery house behind, the cab beside the jib's foot
  const T = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  const put = (color, g, o) => p.geo(color, g.applyMatrix4(T), o);
  put(C.crane, new THREE.BoxGeometry(3.4, 1.6, 2.2).translate(-0.6, 5.4, 0), { surf: 'metal' });
  put(C.craneDark, new THREE.BoxGeometry(3.5, 0.12, 2.3).translate(-0.6, 6.26, 0));
  put('#e2e1db', new THREE.BoxGeometry(1.2, 1.2, 1.0).translate(1.2, 5.2, 1.3));
  put('#3a4a58', new THREE.BoxGeometry(0.04, 0.6, 0.8).translate(1.82, 5.5, 1.3));
  put(C.craneDark, new THREE.BoxGeometry(1.0, 0.9, 1.6).translate(-2.6, 4.9, 0)); // the counterweight
  // the jib: two chords from its foot up to its head, laced across
  const foot = [0.9, 5.8],
    headY = 9.0,
    len = Math.hypot(reach - foot[0], headY - foot[1]),
    tilt = Math.atan2(headY - foot[1], reach - foot[0]);
  for (const s of [-0.35, 0.35])
    put(
      C.crane,
      new THREE.BoxGeometry(len, 0.16, 0.16).rotateZ(tilt).translate((foot[0] + reach) / 2, (foot[1] + headY) / 2, s),
      { surf: 'metal' },
    );
  for (let k = 1; k < 9; k++) {
    const u = foot[0] + ((reach - foot[0]) * k) / 9,
      y = foot[1] + ((headY - foot[1]) * k) / 9;
    put(C.crane, new THREE.BoxGeometry(0.08, 0.08, 0.7).translate(u, y, 0), { cast: false });
  }
  // the hoist rope and the hook block over the freighter
  const tip = new THREE.Vector3(reach, headY, 0).applyMatrix4(T);
  rod(p, C.craneDark, [tip.x, tip.y, tip.z], [tip.x, 3.6, tip.z], 0.03);
  p.box('#c6b252', 0.35, 0.45, 0.35, tip.x, 3.15, tip.z);
}

// a 20-foot container from (x, z) along x or z, `high` stacked, colour by its place
function stack(p, [x, z, along, high], i) {
  const { L, W, H } = P.BOX;
  const [w, d] = along === 'x' ? [L, W] : [W, L];
  const cx = x + w / 2,
    cz = z + d / 2;
  for (let k = 0; k < high; k++) {
    const col = BOXES[(i * 3 + k * 5) % BOXES.length],
      y = k * H,
      dark = new THREE.Color(col).multiplyScalar(0.82).getStyle();
    p.box(col, w - 0.04, H - 0.04, d - 0.04, cx, y, cz, { surf: 'metal' });
    // the ribs along the long sides, the doors' bars on one end
    for (let u = 0.3; u < L - 0.2; u += 0.4)
      for (const s of [-1, 1])
        if (along === 'x') p.box(dark, 0.07, H - 0.2, 0.03, x + u, y + 0.1, cz + s * (d / 2 - 0.01), { cast: false });
        else p.box(dark, 0.03, H - 0.2, 0.07, cx + s * (w / 2 - 0.01), y + 0.1, z + u, { cast: false });
    for (const s of [-0.3, 0.3])
      if (along === 'x') p.box(dark, 0.03, H - 0.2, 0.05, x + L - 0.01, y + 0.1, cz + s, { cast: false });
      else p.box(dark, 0.05, H - 0.2, 0.03, cx + s, y + 0.1, z + L - 0.01, { cast: false });
  }
}

// a pallet with boxes, or a slatted crate
function load(p, [x, z, kind], i) {
  if (kind === 'pallet') {
    p.box(C.pallet, 1.1, 0.14, 1.1, x, 0, z, { cast: false });
    const n = 1 + (i % 3);
    for (let k = 0; k < n; k++) p.box(k % 2 ? '#c8bfa9' : '#b9ae95', 0.95, 0.35, 0.95, x, 0.14 + k * 0.36, z);
    p.box('#d9dbd6', 1.0, 0.02, 1.0, x, 0.14 + n * 0.36, z, { cast: false }); // the wrap's top
  } else {
    p.box(C.crate, 1.2, 0.9, 0.9, x, 0, z);
    for (const y of [0.15, 0.7]) p.box('#7d6d58', 1.22, 0.08, 0.92, x, y, z, { cast: false });
  }
}

// a floodlight mast: a tall pole, a head of four lamps facing the yard
function mast(p, glow, lights, [x, z]) {
  p.box(C.plinth, 0.6, 0.3, 0.6, x, 0, z, { cast: false });
  p.geo(STEEL.mid, new THREE.CylinderGeometry(0.08, 0.13, 7.6, 8).translate(x, 3.9, z));
  p.box(STEEL.dark, 1.4, 0.1, 0.3, x, 7.6, z);
  for (const dx of [-0.5, -0.17, 0.17, 0.5]) {
    p.box(STEEL.dark, 0.28, 0.3, 0.22, x + dx, 7.7, z + 0.12, { cast: false });
    glow.push(new THREE.BoxGeometry(0.22, 0.22, 0.03).translate(x + dx, 7.85, z + 0.24));
  }
  lights.lit.push([x, z + 3.5, 3.6]);
}

// p: a Parts collector (casting); g: a cells' collector for the small things; lights: a lightSet; signs: a signSet
export function* yardSteps(p, g, lights, signs) {
  const glow = lights.glowParts;
  shed(p, glow, lights, signs);
  yield;
  hut(p, glow, lights, signs);
  crane(p);
  yield;
  P.STACKS.forEach((s, i) => stack(p, s, i));
  yield;
  P.CRATES.forEach((c, i) => load(g, c, i));
  for (const m of P.MASTS) mast(p, glow, lights, m);
  yield;
}
