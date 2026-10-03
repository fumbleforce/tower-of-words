// Eric's dorm block behind the courtyard (scenes/dorm-court.js), `dorm_1` in the island layout: five storeys of
// plain concrete, its long face on the court running past both edges of the frame, and at its east end a return
// that comes forward along the court's east side. Along the long face, one open corridor a floor (2F to 5F): the
// slab out from the face and a low concrete parapet, and behind it the flats' front doors (six a floor, the same
// flats and doors as the dorms scene, so 203's door is almost above the hall doors), each with its light, meter box
// and kitchen window, some lit. The corridors run into the return, where the stairs are, behind a tall stair window
// on its west face. The return's front keeps balconies. Merged per colour by the court's mergeStatic; the lit
// windows are one emissive mesh, the corridor lights another.
import * as THREE from 'three';
import { mat, rbox } from '../../props.js';
import { boxes } from '../forecourt/details.js';
import { Parts } from '../outdoor/parts.js';
import { PITCH, DOOR } from '../dorms/layout.js';
import { DORMS, STOREY, STAIR_WINDOW, RETURN_X, RETURN_Z } from './plan.js';

export const BLOCK = {
  x0: -10.5, // the long face's west end, well past the frame
  x1: 9.4, // the return's east side, past the frame
  z: -4.3, // the long face (the court side)
  back: -8.45, // the flats' back walls (the dorms scene): 1.15 short of dorm_1e
  corridor: 0.55, // how far the open corridors stand out from the long face
  rx: RETURN_X, // the return's west face, on the court's east side
  rz: RETURN_Z, // the return's front
  ground: DORMS.y, // the ground floor's height (2F's floor), clear of the laundry's and the sento's roofs
  floor: STOREY, // each floor above it
  floors: 4, // floors above the ground floor: five storeys in all
};
const CONCRETE = '#9a9ea3',
  CONCRETE_DARK = '#85898e',
  PANEL = '#b3bac1', // balcony fronts, corridor parapets
  GLASS = '#46505c',
  FRAME = '#5d636c',
  LIT = '#e8c89a',
  LIT_GLOW = '#ffc98a',
  STEEL = '#5a6a80', // front doors, as in the dorms scene
  COOL = '#8f99a7', // the corridor and stair lights
  COOL_GLOW = '#b8c3d4',
  CLOTHES = ['#d9dcd8', '#8fa2b4', '#b7b2a8', '#4f5f74', '#c7cdd2'];
// which rooms have their lights on, and which have washing out: fixed, so the frame never changes between visits
const lit = (f, c) => (c * 7 + f * 3) % 9 < 3;
const washing = (f, c) => (c * 5 + f * 11) % 13 === 2 || (f === 1 && c === 3);
const ac = (f, c) => (c + f * 2) % 3 === 0;

// one floor's worth of balconies along the long face, from x0 to x1 in `bays` rooms
function balconies(parts, f, y, { x0, x1, bays, z, dir = 1, openings }) {
  const w = (x1 - x0) / bays,
    D = 0.5 * dir; // how far a balcony stands out
  parts.slab.push([x1 - x0 + 0.1, 0.12, Math.abs(D) + 0.02, (x0 + x1) / 2, y - 0.12, z + D / 2]);
  parts.panel.push([x1 - x0 + 0.1, 0.55, 0.05, (x0 + x1) / 2, y, z + D]);
  parts.rail.push([x1 - x0 + 0.1, 0.035, 0.07, (x0 + x1) / 2, y + 0.58, z + D]);
  for (let c = 0; c < bays; c++) {
    const cx = x0 + w * (c + 0.5);
    // a divider between rooms, and the room's sliding door behind
    if (c) parts.divider.push([0.05, 1.15, Math.abs(D) - 0.04, x0 + w * c, y, z + D / 2]);
    const on = openings ? openings(c) : true;
    if (!on) continue;
    (lit(f, c) ? parts.lit : parts.glass).push([w - 0.42, 1.22, 0.03, cx, y + 0.08, z + 0.02 * dir]);
    parts.frame.push([w - 0.34, 0.05, 0.05, cx, y + 1.3, z + 0.02 * dir]);
    if (ac(f, c)) parts.ac.push([0.34, 0.28, 0.2, cx + w / 2 - 0.3, y, z + D * 0.55]);
    if (washing(f, c)) {
      // a laundry pole across the balcony, a few things hung on it
      parts.pole.push([w - 0.3, 0.025, 0.025, cx, y + 1.18, z + D * 0.72]);
      let x = cx - w / 2 + 0.3;
      for (let i = 0; x < cx + w / 2 - 0.35; i++) {
        const cw = 0.14 + ((c + i * 3 + f) % 3) * 0.07,
          ch = 0.24 + ((c * 2 + i + f) % 3) * 0.1;
        parts.cloth[(c + i + f) % CLOTHES.length].push([cw, ch, 0.02, x + cw / 2, y + 1.17 - ch, z + D * 0.72]);
        x += cw + 0.06;
      }
    }
  }
}

// the flats along one floor's corridor, numbered from the stairs (east): 201, 202, 203 (Eric's), 205, 206, 207.
// k is a flat's place from 203 (+1 is 202), so a flat's middle is DORMS.x + k * PITCH, as in the dorms scene
const FLATS = [2, 1, 0, -1, -2, -3];
const kitchenLit = (f, k) => (f === 0 ? k === 1 || k === -2 : lit(f + 1, k + 3)); // 2F: 202 home, 206 lamp on

// one floor's open corridor on the long face at height y (its floor): slab, parapet with its cap, the doors behind
function corridor(parts, f, y, { x0, x1, z, D }) {
  const len = x1 - x0,
    cx = (x0 + x1) / 2;
  parts.slab.push([len, 0.14, D, cx, y - 0.14, z + D / 2]);
  parts.drip.push([len, 0.02, 0.02, cx, y - 0.16, z + D + 0.002]);
  parts.panel.push([len, 0.6, 0.09, cx, y - 0.05, z + D - 0.041]); // proud of the slab's edge, which it overlaps
  parts.rail.push([len + 0.02, 0.035, 0.13, cx, y + 0.55, z + D - 0.045]);
  const zf = z + 0.012;
  for (const k of FLATS) {
    const c = DORMS.x + k * PITCH + (DOOR[0] + DOOR[1]) / 2;
    parts.frame.push(
      [0.04, 1.3, 0.04, c - 0.3, y, zf],
      [0.04, 1.3, 0.04, c + 0.3, y, zf],
      [0.64, 0.05, 0.04, c, y + 1.28, zf],
    );
    parts.door.push([0.56, 1.26, 0.02, c, y + 0.01, zf]);
    parts.plate.push([0.16, 0.07, 0.01, c, y + 1.38, zf]);
    parts.cool.push([0.14, 0.07, 0.05, c + 0.36, y + 1.4, zf + 0.02]);
    parts.meter.push([0.15, 0.22, 0.05, c + 0.52, y + 0.9, zf + 0.02]);
    const wx = c - 0.62;
    (kitchenLit(f, k) ? parts.lit : parts.frost).push([0.3, 0.36, 0.01, wx, y + 0.72, zf]);
    parts.grille.push([0.36, 0.02, 0.02, wx, y + 0.7, zf + 0.03], [0.36, 0.02, 0.02, wx, y + 1.1, zf + 0.03]);
    for (let i = 0; i < 5; i++) parts.grille.push([0.012, 0.42, 0.012, wx - 0.14 + i * 0.07, y + 0.69, zf + 0.035]);
  }
  // where the corridor runs into the return: the lit way through to the stairs
  parts.cool.push([0.02, 1.3, D - 0.12, x1 - 0.015, y, z + D / 2 - 0.02]);
}

// the stair window on the return's west face, one a floor: the flight up to the half landing behind it, lit
function stairWindow(parts, y, x, [z0, z1]) {
  parts.cool.push([0.02, 1.2, z1 - z0, x - 0.012, y + 0.3, (z0 + z1) / 2]);
  parts.frame.push(
    [0.05, 0.05, z1 - z0 + 0.08, x - 0.02, y + 0.26, (z0 + z1) / 2],
    [0.05, 0.05, z1 - z0 + 0.08, x - 0.02, y + 1.5, (z0 + z1) / 2],
    [0.05, 1.2, 0.04, x - 0.02, y + 0.3, (z0 + z1) / 2],
  );
  // the half landing's edge across the glass, and a flight's stringer on it
  parts.slab.push([0.03, 0.1, z1 - z0 - 0.04, x - 0.02, y + 0.84, (z0 + z1) / 2]);
}

// a row of plain windows on a flat face along x (the ground floor, the return's front)
function windowsX(parts, y, x0, x1, n, z, h = 0.9, f = 0) {
  const step = (x1 - x0) / n;
  for (let c = 0; c < n; c++) {
    const cx = x0 + step * (c + 0.5);
    (lit(f + 5, c) ? parts.lit : parts.glass).push([step * 0.55, h, 0.03, cx, y, z]);
    parts.frame.push([step * 0.55 + 0.08, 0.05, 0.06, cx, y - 0.05, z + 0.01]);
  }
}
// the same on a face along z (the return's west face)
function windowsZ(parts, y, z0, z1, n, x, h = 0.9, f = 0) {
  const step = (z1 - z0) / n;
  for (let c = 0; c < n; c++) {
    const cz = z0 + step * (c + 0.5);
    (lit(f + 2, c + 1) ? parts.lit : parts.glass).push([0.03, h, step * 0.26, x, y, cz]);
    parts.frame.push([0.06, 0.05, step * 0.26 + 0.08, x - 0.01, y - 0.05, cz]);
  }
}

export function ericBlock(root) {
  const B = BLOCK,
    top = B.ground + B.floors * B.floor;
  const parts = {
    slab: [],
    panel: [],
    rail: [],
    divider: [],
    glass: [],
    lit: [],
    frame: [],
    ac: [],
    pole: [],
    cloth: CLOTHES.map(() => []),
    trim: [],
    drip: [],
    door: [],
    plate: [],
    meter: [],
    frost: [],
    grille: [],
    cool: [],
  };
  // the two volumes: the long block and its return
  root.add(
    rbox(B.rx - B.x0, top, B.z - B.back, CONCRETE, {
      x: (B.x0 + B.rx) / 2,
      z: (B.z + B.back) / 2,
      seg: 1,
      r: 0.03,
    }),
  );
  root.add(
    rbox(B.x1 - B.rx, top, B.rz - B.back, CONCRETE, {
      x: (B.rx + B.x1) / 2,
      z: (B.rz + B.back) / 2,
      seg: 1,
      r: 0.03,
    }),
  );
  // the long face: an open corridor a floor, the flats' doors behind it
  for (let f = 0; f < B.floors; f++) {
    const y = B.ground + f * B.floor;
    corridor(parts, f, y, { x0: B.x0, x1: B.rx, z: B.z, D: B.corridor });
  }
  // the return: its west face on the court (the stair window by the corner, then a room's window a floor), its
  // front with balconies
  for (let f = 0; f < B.floors; f++) {
    const y = B.ground + f * B.floor;
    stairWindow(parts, y, B.rx, STAIR_WINDOW);
    windowsZ(parts, y + 0.2, -0.9, B.rz - 0.2, 1, B.rx - 0.01, 1.05, f);
    balconies(parts, f + 4, y, {
      x0: B.rx,
      x1: B.x1,
      bays: 2,
      z: B.rz,
      dir: 1,
    });
    parts.trim.push([0.04, 0.1, B.rz - B.z, B.rx - 0.01, y - 0.25, (B.z + B.rz) / 2]);
  }
  // the ground floor where it shows: west of the laundry, the return's west face over its strip bed, its front
  windowsX(parts, 0.7, B.x0, -6.0, 3, B.z + 0.01, 0.95, 1);
  windowsZ(parts, 0.8, -1.3, B.rz - 0.1, 2, B.rx - 0.01, 0.9, 3);
  windowsX(parts, 0.7, B.rx, B.x1, 3, B.rz + 0.01, 0.95, 2);
  // roof: a parapet, a water tank on legs, two plant boxes
  parts.trim.push(
    [B.rx - B.x0, 0.35, 0.18, (B.x0 + B.rx) / 2, top, B.z + 0.09],
    [B.x1 - B.rx, 0.35, 0.18, (B.rx + B.x1) / 2, top, B.rz - 0.09],
    [0.18, 0.35, B.rz - B.z, B.rx + 0.09, top, (B.z + B.rz) / 2],
  );
  const tank = [
    [1.6, 1.0, 1.1, -3.2, top + 0.45, -6.2],
    [0.9, 0.55, 0.7, 1.8, top, -6.4],
    [0.7, 0.45, 0.7, 7.6, top, -1.2],
  ];
  const legs = [];
  for (const [dx, dz] of [
    [-0.7, -0.45],
    [0.7, -0.45],
    [-0.7, 0.45],
    [0.7, 0.45],
  ])
    legs.push([0.08, 0.45, 0.08, -3.2 + dx, top, -6.2 + dz]);

  // every part of the face in one vertex-coloured mesh (outdoor/parts.js): one draw, not one per colour
  const P = new Parts();
  const put = (list, color) => list.forEach(([w, h, d, x, y, z]) => P.box(color, w, h, d, x, y, z));
  put(parts.slab, CONCRETE_DARK);
  put(parts.panel, PANEL);
  put(parts.rail, '#b8bdc2');
  put(parts.divider, '#9ea3a8');
  put(parts.glass, GLASS);
  put(parts.frame, FRAME);
  put(parts.ac, '#c9cbc8');
  put(parts.pole, '#9aa1a8');
  put(parts.trim, '#a1a5aa');
  put(parts.drip, '#5b6068');
  put(parts.door, STEEL);
  put(parts.plate, '#d8dadc');
  put(parts.meter, '#b4b8bc');
  put(parts.frost, '#8f9aa4');
  put(parts.grille, '#4a515c');
  put(tank, '#9fa4a9');
  put(legs, FRAME);
  parts.cloth.forEach((list, i) => put(list, CLOTHES[i]));
  P.build(root);
  const warm = boxes(parts.lit, LIT);
  warm.material = mat(LIT, {
    emissive: new THREE.Color(LIT_GLOW),
    emissiveIntensity: 0.9,
  });
  warm.castShadow = false;
  root.add(warm);
  const cool = boxes(parts.cool, COOL);
  cool.material = mat(COOL, { emissive: new THREE.Color(COOL_GLOW), emissiveIntensity: 0.3 });
  cool.castShadow = false;
  root.add(cool);
  return { top };
}
