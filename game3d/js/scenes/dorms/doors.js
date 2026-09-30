// The doors along Eric's corridor: a flat's front door as the corridor sees it (frame, steel leaf, mail slot, the
// kitchen window beside it behind its grille, lit where someone's home, the meter box, what's left at the door),
// the numbers over the doors, and Eric's own front at full height for the walk along the corridor.
import * as THREE from 'three';
import { Kit } from './kit.js';
import { plates } from './plates.js';
import { X0, X1, NEAR, H, FRONT_LOW, T, DOOR, C } from './layout.js';

// the flats' numbers along 2F, by their place from Eric's (k), counted from the stairs: no 4
export const NUMBER = { 2: '201', 1: '202', 0: '203', '-1': '205', '-2': '206' };
export const DOOR_C = (DOOR[0] + DOOR[1]) / 2;

// the corridor light on the wall beside a door at c
export function corridorLight(kit, c, zf) {
  kit.box('#eef2f8', 0.14, 0.08, 0.06, c + 0.36, 1.36, zf + 0.03, {
    r: 0.02,
    cast: false,
    opts: { emissive: '#dfe7f5', emissiveIntensity: 0.9 },
  });
}

// Eric's front seen from the corridor: the wall full height over the cut-low one, his door shut, its fittings like
// the neighbours' (dark: he isn't home) and its number. It drops away as he goes in (places/dorms.js), to the
// cut-low front the room is seen through.
export function tallFront() {
  const kit = new Kit(),
    zf = NEAR + T,
    [d0, d1] = DOOR,
    z = NEAR + T / 2;
  kit.box(C.facade, d0 - (X0 - T), H - FRONT_LOW, T, (X0 - T + d0) / 2, FRONT_LOW, z, { surf: 'plaster' });
  kit.box(C.facade, X1 + T - d1, H - FRONT_LOW, T, (d1 + X1 + T) / 2, FRONT_LOW, z, { surf: 'plaster' });
  kit.box(C.facade, d1 - d0, H - 1.3, T, DOOR_C, 1.3, z, { surf: 'plaster' });
  kit.box(C.wallTop, X1 - X0 + 2 * T, 0.035, T + 0.03, 0, H, z, { cast: false });
  neighbourDoor(kit, DOOR_C, zf, 0);
  corridorLight(kit, DOOR_C, zf);
  const g = kit.flush(new THREE.Group());
  g.add(plates([['203', DOOR_C, 1.43, zf + 0.012, 0.24, 0.12]]));
  return g;
}

export function neighbourDoor(kit, c, zf, k) {
  const z = zf + 0.02;
  kit.boxes(C.frame, [
    [0.04, 1.3, 0.05, c - 0.3, 0, z],
    [0.04, 1.3, 0.05, c + 0.3, 0, z],
    [0.64, 0.05, 0.05, c, 1.28, z],
  ]);
  kit.box(C.steel, 0.56, 1.26, 0.03, c, 0.01, z + 0.005, { surf: 'door' });
  kit.box('#c9cdd2', 0.1, 0.025, 0.04, c + 0.2, 0.62, z + 0.03, {
    r: 0.008,
    cast: false,
  });
  kit.box('#2f333b', 0.16, 0.035, 0.01, c, 0.82, z + 0.022, { cast: false });
  // the kitchen window beside the door, frosted, behind a grille; lit where someone's home (neighbours.js)
  const wx = c - 0.62;
  const lit = k === 1 || k === -2;
  kit.box(lit ? '#f0dcb4' : '#aeb8c0', 0.3, 0.36, 0.01, wx, 0.72, zf + 0.006, {
    cast: false,
    opts: lit ? { emissive: '#ffcf8a', emissiveIntensity: 0.55 } : {},
  });
  const bars = [[0.36, 0.02, 0.02, wx, 0.7, zf + 0.04]];
  for (let i = 0; i < 5; i++) bars.push([0.012, 0.42, 0.012, wx - 0.14 + i * 0.07, 0.69, zf + 0.045]);
  bars.push([0.36, 0.02, 0.02, wx, 1.1, zf + 0.04]);
  kit.boxes(C.alu, bars, { cast: false });
  // the meter box, and something at the door: an umbrella or a pot plant
  kit.box('#b4b8bc', 0.15, 0.22, 0.06, c + 0.52, 0.9, zf + 0.03, {
    r: 0.01,
    cast: false,
  });
  if (k === 1)
    kit.cyl('#3d4d6b', 0.012, 0.035, 0.62, c + 0.36, 0, zf + 0.08, {
      rz: -0.12,
      seg: 6,
    });
  if (k === -1) {
    kit.cyl('#b3aea5', 0.07, 0.055, 0.12, c - 0.38, 0, zf + 0.12, { seg: 10 });
    kit.cyl('#4d6b47', 0.02, 0.09, 0.16, c - 0.38, 0.12, zf + 0.12, { seg: 7 });
    // they're out: a parcel left at the door, its slip on top
    kit.box('#b09474', 0.26, 0.16, 0.2, c + 0.1, 0, zf + 0.16, { r: 0.008, ry: 0.15, surf: 'card' });
    kit.box('#f2f0ea', 0.1, 0.004, 0.07, c + 0.12, 0.16, zf + 0.16, { ry: 0.15, cast: false });
  }
  // home: sandals by the door
  if (k === 1)
    for (const dx of [-0.05, 0.05])
      kit.box('#3d4d6b', 0.06, 0.025, 0.14, c - 0.2 + dx, 0, zf + 0.14, { r: 0.01, ry: 0.1 });
}
