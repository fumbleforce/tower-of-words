// The stair hall at the corridor's east end, in the block's return (docs/game/places.md, Dorm building): the 2F
// landing level with the corridor, the flight Eric comes up from the half landing along the west face (lane A),
// beside it the flight down to 1F (lane B), a low wall between them. The stair window is on the west face over
// lane A (the court sees it); the landing's back wall has the store's door, the 2F sign and a light. Everything is
// cut at the ceiling like the flat, and the return in front of the stairs is cut at the floor, so the camera sees
// the half landing. The return round the hall is cut solid.
import * as THREE from 'three';
import { lightPool } from '../../places/life.js';
import { RETURN, STAIR, STOREY, CORR, H, T, BACK, C } from './layout.js';
import { plates } from './plates.js';

const RISE = STOREY / 2 / (STAIR.treads + 1), // one step: half a storey in six
  FLOOR = '#7a7f87',
  NOSE = '#a3a8ae',
  WALL = '#8a8f98',
  DEEP = -2.45, // the court's ground, below 1F's floor
  RET_E = RETURN + 3.5, // the return's east side
  RET_S = 6.65; // its front, on the court
// the height under Eric at z in lane A: the landing, down the flight's pitch line, then the half landing
export function stairY(z) {
  const k = (z - STAIR.top) / (STAIR.half[0] - STAIR.top);
  return (-Math.min(1, Math.max(0, k)) * STOREY) / 2;
}

// a flight of steps in lane [x0, x1], from z0 by `dir` (+1 toward the camera), each `RISE` lower (or higher) than
// the one before, starting at y0
function flight(kit, [x0, x1], z0, dir, y0, step) {
  for (let i = 0; i < STAIR.treads; i++) {
    const za = z0 + dir * i * STAIR.tread,
      zc = za + (dir * STAIR.tread) / 2,
      y = y0 + step * (i + 1);
    kit.box(FLOOR, x1 - x0, RISE + 0.03, STAIR.tread + 0.002, (x0 + x1) / 2, y - RISE - 0.03, zc, { surf: 'concrete' });
    kit.box(NOSE, x1 - x0, 0.012, 0.04, (x0 + x1) / 2, y, za + dir * (STAIR.tread - 0.02), { cast: false });
  }
}

// a sloped box from (z0, y0) to (z1, y1) along a line, `h` tall above it, `w` wide at x
function sloped(kit, color, x, w, h, [z0, y0], [z1, y1], o = {}) {
  const len = Math.hypot(z1 - z0, y1 - y0),
    rx = Math.atan2(y0 - y1, z1 - z0);
  kit.box(color, w, h, len, x, (y0 + y1) / 2, (z0 + z1) / 2, { rx, ...o });
}

export function stairs(kit, root) {
  const { a, b, east, back, top, half, window: win } = STAIR;
  const x0 = RETURN,
    hy = -STOREY / 2;
  // the landing, level with the corridor, its nosing along the top step
  kit.box(FLOOR, east - x0, 0.2, top - back, (x0 + east) / 2, -0.22, (back + top) / 2, {
    surf: 'concrete',
    cast: false,
  });
  // lane A: up from the half landing to the landing; lane B: down from the half landing to 1F, under the landing
  flight(kit, a, top, 1, 0, -RISE);
  flight(kit, b, half[0], -1, hy, -RISE);
  kit.box(FLOOR, b[1] - a[0], 0.2, half[1] - half[0], (a[0] + b[1]) / 2, hy - 0.2, (half[0] + half[1]) / 2, {
    surf: 'concrete',
  });
  // under it all, 1F's floor at the foot of lane B
  kit.box('#50555d', east - x0, 0.1, half[1] - back, (x0 + east) / 2, -STOREY - 0.1, (back + half[1]) / 2, {
    cast: false,
  });
  // the low wall between the lanes, following lane A, with its rail; the guard wall at the landing's edge over B
  const wx = (a[1] + b[0]) / 2;
  sloped(kit, WALL, wx, 0.05, 0.5, [top, -0.05], [half[0], hy - 0.05], { surf: 'plaster' });
  sloped(kit, '#5d636c', wx, 0.07, 0.03, [top, 0.45], [half[0], hy + 0.45], { cast: false });
  kit.box(WALL, b[1] - b[0] + 0.1, 0.5, 0.05, (b[0] + b[1]) / 2, -0.02, top, { surf: 'plaster' });
  kit.box('#5d636c', b[1] - b[0] + 0.12, 0.03, 0.07, (b[0] + b[1]) / 2, 0.48, top, { cast: false });
  // a handrail on the west wall over lane A
  sloped(kit, '#5d636c', a[0] + 0.04, 0.035, 0.035, [top, 0.55], [half[0], hy + 0.55], { cast: false });
  // the west face: the return's wall on the court, from the corridor's parapet to the front, cut at the stair
  // window's sill (it stands between the camera and the landing); the window's sill and a sliver of its glass
  const wz = [CORR[1], half[1] + 0.1],
    [g0, g1] = win,
    sill = 0.3,
    cutAt = sill + 0.08;
  kit.box(C.facade, T, sill - DEEP, wz[1] - wz[0], x0 + T / 2, DEEP, (wz[0] + wz[1]) / 2, { surf: 'plaster' });
  kit.boxes(C.facade, [
    [T, cutAt - sill, g0 - wz[0], x0 + T / 2, sill, (wz[0] + g0) / 2],
    [T, cutAt - sill, wz[1] - g1, x0 + T / 2, sill, (g1 + wz[1]) / 2],
  ]);
  kit.box('#3d4a5c', 0.02, cutAt - sill, g1 - g0, x0 + T / 2, sill, (g0 + g1) / 2, { cast: false });
  kit.box(C.alu, 0.12, 0.04, g1 - g0, x0 + T / 2, sill - 0.04, (g0 + g1) / 2);
  // the east wall and the landing's back wall, cut at the ceiling
  kit.box(WALL, T, H - DEEP, half[1] + 0.1 - back, east + T / 2, DEEP, (back + half[1] + 0.1) / 2, { surf: 'plaster' });
  kit.box(WALL, east - x0 + T, H, T, (x0 + east) / 2, 0, back - T / 2, { surf: 'plaster' });
  kit.boxes(C.wallTop, [
    [T + 0.02, 0.03, wz[1] - wz[0], x0 + T / 2, cutAt, (wz[0] + wz[1]) / 2],
    [T + 0.02, 0.035, half[1] + 0.1 - back, east + T / 2, H, (back + half[1] + 0.1) / 2],
    [east - x0 + T + 0.02, 0.035, T + 0.02, (x0 + east) / 2, H, back - T / 2],
  ]);
  // on the back wall: the store's steel door, the 2F sign, a light; a fire hose cabinet on the east wall
  const dx = east - 0.45;
  kit.boxes(C.frame, [
    [0.04, 1.3, 0.05, dx - 0.3, 0, back + 0.02],
    [0.04, 1.3, 0.05, dx + 0.3, 0, back + 0.02],
    [0.64, 0.05, 0.05, dx, 1.28, back + 0.02],
  ]);
  kit.box(C.steel, 0.56, 1.26, 0.03, dx, 0.01, back + 0.025, { surf: 'door' });
  kit.box('#c9cdd2', 0.1, 0.025, 0.04, dx - 0.2, 0.62, back + 0.05, { r: 0.008, cast: false });
  root.add(plates([['2F', x0 + 0.45, 1.05, back + 0.012, 0.36, 0.18]]));
  kit.box('#eef2f8', 0.2, 0.08, 0.07, x0 + 0.45, 1.36, back + 0.035, {
    r: 0.02,
    cast: false,
    opts: { emissive: '#dfe7f5', emissiveIntensity: 0.9 },
  });
  kit.box('#8a5454', 0.06, 0.5, 0.36, east - 0.03, 0.55, 1.5, { r: 0.01 });
  kit.box('#d9d4c8', 0.012, 0.08, 0.24, east - 0.065, 0.92, 1.5, { cast: false });
  // the return round the hall, cut solid: behind the landing, east of the stairs, and in front of them cut at the
  // floor (the camera looks over it at the half landing)
  const cut = [
    [RET_E - x0, H + 0.035, back - T - (BACK - T), (x0 + RET_E) / 2, 0, (back - T + BACK - T) / 2],
    [RET_E - east - T, H + 0.035, half[1] + 0.1 - back + T, (east + T + RET_E) / 2, 0, (back - T + half[1] + 0.1) / 2],
    [RET_E - x0, 0.035 - DEEP, RET_S - half[1] - 0.1, (x0 + RET_E) / 2, DEEP, (half[1] + 0.1 + RET_S) / 2],
  ];
  kit.boxes(C.cut, cut, { cast: false });
  kit.box(C.wallTop, RET_E - x0, 0.02, 0.03, (x0 + RET_E) / 2, 0.02, half[1] + 0.115, { cast: false });
  // the stair light: cool, over the landing, and its pools on the landing and the half landing
  const light = new THREE.PointLight('#dfe7f5', 1.1, 3.2, 1.4);
  light.position.set((x0 + east) / 2, 1.3, (back + top) / 2 + 0.3);
  root.add(light);
  root.add(lightPool((x0 + east) / 2, (back + top) / 2, 0.8, { color: '#dfe7f5', k: 0.16, y: -0.015 }));
  root.add(lightPool((a[0] + b[1]) / 2, (half[0] + half[1]) / 2, 0.6, { color: '#dfe7f5', k: 0.1, y: hy + 0.004 }));
}
