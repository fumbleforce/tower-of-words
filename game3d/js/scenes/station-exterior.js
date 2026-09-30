// Honsha station from outside, at the forecourt (scenes/forecourt.js): the two-storey block over the security room's
// footprint (island-layout.js BUILDINGS station; scenes/lobby.js inside), the platform shed along the west coast with
// the monorail beam on piers, and the covered walkway from the shed to the station's glass front.
// The camera looks north over the station at Eric on the court, so everything above the cut-low wall height is one
// occluder (scenes/occluders.js): it fades while the station stands between him and the camera (just outside its
// north door) and stands whole again as he walks east, so the station is at the bottom left when he reaches the head
// office. On a phone the camera looks east past it from the door (places/forecourt.js), so it stays whole there and
// the platform shed's roof fades instead.
import * as THREE from 'three';
import { PAL, mat, rbox, emissive, bench, plant, textTexture, plane, JP_FONT } from '../props.js';
import { lightPool } from '../places/life.js';
import { addOccluder, updateOccluders } from './occluders.js';
import { BUILDINGS, footprint, toLocal } from './island-layout.js';
import { boxes } from './forecourt/details.js';
import { paving } from './town.js';
import { buildShed } from './station-shed.js';

// the station's outline in the forecourt's frame: the gate room's walls (lobby.js X 6.3, Z 4.5, centred on the
// forecourt's (-0.5, 7.15)); its north face is the court's south edge
const F = footprint(BUILDINGS.find((b) => b.id === 'station')).map(([x, z]) => toLocal('forecourt', x, z));
export const STATION = {
  x0: Math.min(...F.map((p) => p[0])),
  x1: Math.max(...F.map((p) => p[0])),
  zN: Math.min(...F.map((p) => p[1])),
  zS: Math.max(...F.map((p) => p[1])),
};
const { x0: X0, x1: X1, zN: ZN, zS: ZS } = STATION;
const CX = (X0 + X1) / 2;
export const DOOR_X = CX - 1, // the exit (the gate room's back-wall opening at room x -1)
  STAFF_X = CX + 3.95, // the staff door beside it (room x 3.95)
  LOW = 0.45, // the cut-low wall height while it fades
  H1 = 1.9, // the ground storey: the gate room's wall height
  H2 = 3.8,
  TOPH = 4.1, // parapet top
  T = 0.18; // wall thickness
// ground-floor windows on the side walls (room z -3.4..-2.2, -1..0.2, 1.4..2.6) and the glass front (room x ±2.4)
const SIDE_WIN = [
  [-3.4, -2.2],
  [-1.0, 0.2],
  [1.4, 2.6],
].map(([a, b]) => [ZN + 4.5 + a, ZN + 4.5 + b]);
const FRONT = [CX - 2.4, CX + 2.4];

// a wall along x (north or south face) or z (east or west), y0..y1, with holes [a, b, y0, y1] along it
function wallRun(out, axis, a0, a1, at, y0, y1, holes = []) {
  const cuts = holes
    .filter(([a, b, h0, h1]) => h1 > y0 && h0 < y1 && b > a0 && a < a1)
    .map(([a, b, h0, h1]) => [Math.max(a, a0), Math.min(b, a1), Math.max(h0, y0), Math.min(h1, y1)]);
  const put = (s0, s1, t0, t1) => {
    if (s1 - s0 < 0.01 || t1 - t0 < 0.01) return;
    if (axis === 'x') out.push([s1 - s0, t1 - t0, T, (s0 + s1) / 2, t0, at]);
    else out.push([T, t1 - t0, s1 - s0, at, t0, (s0 + s1) / 2]);
  };
  // strips between every hole edge; in each, the wall is what the holes crossing it leave of y0..y1
  const xs = [...new Set([a0, a1, ...cuts.flatMap(([a, b]) => [a, b])])].sort((p, q) => p - q);
  for (let i = 0; i + 1 < xs.length; i++) {
    const [s0, s1] = [xs[i], xs[i + 1]];
    const gaps = cuts.filter(([a, b]) => a < s1 - 1e-6 && b > s0 + 1e-6).sort((p, q) => p[2] - q[2]);
    let t = y0;
    for (const [, , h0, h1] of gaps) {
      put(s0, s1, t, h0);
      t = Math.max(t, h1);
    }
    put(s0, s1, t, y1);
  }
}

// window glass and frames on a face: `rects` [a, b, y0, y1] along the face at `at`, a hair outside it (`side` +1/-1).
// With `trim`, each window also gets a pale surround standing out from the wall (a hood over it, jambs, a sill), so
// it still reads as a window when the camera sees the face almost edge on (the side walls, from the court).
function glazing(glass, frame, axis, rects, at, side, { mull = 1.2, trim = null } = {}) {
  const o = at + side * (T / 2 + 0.01);
  // a box s0..s1 along the face, t0..t1 high, d0..d1 out from the glass
  const put = (out, s0, s1, t0, t1, d0, d1) =>
    axis === 'x'
      ? out.push([s1 - s0, t1 - t0, d1 - d0, (s0 + s1) / 2, t0, o + (side * (d0 + d1)) / 2])
      : out.push([d1 - d0, t1 - t0, s1 - s0, o + (side * (d0 + d1)) / 2, t0, (s0 + s1) / 2]);
  for (const [a, b, y0, y1] of rects) {
    const w = b - a;
    put(glass, a, b, y0, y1, -0.015, 0.015);
    // frame: sill and head, and mullions every `mull`
    const f = (s0, s1, t0, t1) => put(frame, s0, s1, t0, t1, -0.02, 0.04);
    f(a - 0.04, b + 0.04, y0 - 0.06, y0);
    f(a - 0.04, b + 0.04, y1, y1 + 0.05);
    const n = Math.max(1, Math.round(w / mull));
    for (let i = 0; i <= n; i++) f(a + (w * i) / n - 0.025, a + (w * i) / n + 0.025, y0, y1);
    if (!trim) continue;
    put(trim, a - 0.14, b + 0.14, y1 + 0.05, y1 + 0.16, 0, 0.36); // the hood
    for (const s of [a - 0.14, b + 0.04]) put(trim, s, s + 0.1, y0 - 0.1, y1 + 0.05, 0, 0.3); // the jambs
    put(trim, a - 0.14, b + 0.14, y0 - 0.16, y0 - 0.06, 0, 0.24); // the sill
  }
}

function stationSign() {
  const tex = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#3f4650';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8e9e6';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.font = '700 88px ' + JP_FONT;
      ctx.fillText('本社駅', w * 0.44, h / 2 + 4);
      ctx.textAlign = 'left';
      ctx.font = '600 54px sans-serif';
      ctx.fillText('HONSHA STATION', w * 0.48, h / 2 + 4);
    },
    1024,
    128,
  );
  const s = plane(4.4, 0.55, tex);
  s.name = 'station:sign';
  return s;
}

// What shows of the security room when the station is cut low: its furniture where lobby.js has it, modelled
// enough to read from above (the gate line with the scanner arch and its readers, the guard's desk with its
// monitor, the visitor counter, the coffee kiosk, benches, plants), in the security room's own colours. The
// full room with its people is scenes/lobby.js; nothing here moves.
function interior(root) {
  const g = new THREE.Group();
  g.position.set(CX, 0, ZN + 4.5); // the security room's own frame (its x and z)
  root.add(g);
  const BZ = -0.55;
  const add = (...m) => g.add(...m);
  // the gate line: glass runs on posts either side, card readers, the scanner arch between them
  for (const [a, b] of [
    [-5.95, -1.2],
    [3.25, 5.95],
  ]) {
    const n = Math.max(1, Math.round((b - a) / 1.3));
    for (let i = 0; i <= n; i++) add(rbox(0.1, 0.62, 0.1, '#6b717c', { x: a + ((b - a) * i) / n, z: BZ, r: 0.02 }));
    add(rbox(b - a, 0.04, 0.08, '#7c828d', { x: (a + b) / 2, y: 0.58, z: BZ, r: 0.015 }));
    add(rbox(b - a, 0.46, 0.03, '#a9bccb', { x: (a + b) / 2, y: 0.08, z: BZ, r: 0.005, cast: false }));
    add(rbox(b - a, 0.02, 0.03, '#d6e2ea', { x: (a + b) / 2, y: 0.55, z: BZ + 0.012, r: 0.005, cast: false }));
  }
  for (const x of [-0.93, 0.93]) {
    add(rbox(0.2, 0.86, 0.3, '#8b919c', { x, z: BZ, r: 0.03 }));
    add(rbox(0.16, 0.02, 0.2, '#5b7ea8', { x, y: 0.86, z: BZ, r: 0.006, cast: false })); // the IC pad
  }
  const W = 1.4,
    H = 1.57;
  const blue = emissive('#9fd4ff', '#6ab8ff', 1.5);
  for (const s of [-1, 1]) {
    add(rbox(0.17, H, 0.32, '#8b919c', { x: s * (W / 2), z: BZ, r: 0.03 }));
    add(rbox(0.03, H * 0.62, 0.05, null, { x: s * (W / 2 - 0.1), y: H * 0.22, z: BZ, r: 0.012, m: blue, cast: false }));
    add(rbox(0.5, 0.03, 0.04, '#9aa0aa', { x: s * 0.33, y: 0.66, z: BZ, r: 0.01 })); // the glass flaps' edges
    add(rbox(0.5, 0.42, 0.03, '#b7c8d4', { x: s * 0.33, y: 0.24, z: BZ, r: 0.01, cast: false }));
  }
  add(rbox(W + 0.17, 0.22, 0.36, '#7d838e', { y: H, z: BZ, r: 0.04 }));
  add(rbox(0.5, 0.04, 0.05, null, { y: H - 0.05, z: BZ + 0.16, r: 0.015, m: blue, cast: false }));
  // the guard's desk in the barrier line, his monitor and chair behind it
  const desk = (x, z, w, d, top) => {
    add(rbox(w, 0.52, d, '#8c929c', { x, z, r: 0.03 }));
    add(rbox(w + 0.06, 0.05, d + 0.06, top, { x, y: 0.52, z, r: 0.02 }));
    add(rbox(w, 0.06, 0.01, '#5b7ea8', { x, y: 0.25, z: z + d / 2 + 0.005, r: 0.004, cast: false }));
  };
  desk(2.2, BZ, 1.9, 0.62, '#b9bdc3');
  add(rbox(0.46, 0.3, 0.04, PAL.monitor, { x: 2.4, y: 0.63, z: BZ + 0.05, r: 0.015 }));
  add(rbox(0.4, 0.3, 0.4, '#2c3242', { x: 2.35, z: BZ - 0.62, r: 0.04 }));
  // the visitor counter with its book, the lost-property shelf, the coffee kiosk
  desk(-4.2, 0.75, 1.9, 0.5, '#bfc3c8');
  add(rbox(0.34, 0.03, 0.24, PAL.paper, { x: -3.75, y: 0.57, z: 0.83, r: 0.005 }));
  add(rbox(0.3, 0.2, 0.03, PAL.monitor, { x: -4.7, y: 0.58, z: 0.67, r: 0.01 }));
  add(rbox(0.5, 0.95, 0.34, '#8a909a', { x: -5.7, z: 0.55, r: 0.02 }));
  for (const y of [0.3, 0.62]) add(rbox(0.44, 0.03, 0.3, '#a3a9b2', { x: -5.7, y, z: 0.57, r: 0.005 }));
  add(rbox(0.6, 1.25, 0.8, '#4a4f59', { x: 5.45, z: 3.0, r: 0.03 }));
  const warm = emissive('#f1d8b8', '#e8b27a', 0.7);
  add(rbox(0.02, 0.5, 0.6, null, { x: 5.14, y: 0.62, z: 3.0, r: 0.01, m: warm, cast: false }));
  // benches either side, plants along the back wall
  for (const [x, z] of [
    [-3.9, 2.55],
    [3.95, 1.3],
  ]) {
    const b = bench(2.1);
    b.position.set(x, 0, z);
    add(b);
  }
  for (const [x, z, seed] of [
    [-5.7, -3.9, 3],
    [-2.95, -3.95, 5],
    [2.95, -3.95, 7],
    [5.7, -3.9, 9],
  ]) {
    const pl = plant({ size: 1.1, seed });
    pl.position.set(x, 0, z);
    add(pl);
  }
}

// the station block. Returns { update(pos, dt), onPeriod(p) }
function block(root) {
  // what stays: the walls cut low, the floor inside, a mat and a pool of light at the exit
  const low = [];
  const northHoles = [
    [DOOR_X - 0.85, DOOR_X + 0.85, 0, 1.75],
    [STAFF_X - 0.45, STAFF_X + 0.45, 1.35, 2], // the staff door: its leaf stands in the low wall
  ];
  wallRun(low, 'x', X0, X1, ZN + T / 2, 0, LOW, northHoles);
  wallRun(low, 'x', X0, X1, ZS - T / 2, 0, LOW, [[FRONT[0], FRONT[1], 0, 2]]);
  for (const x of [X0 + T / 2, X1 - T / 2]) wallRun(low, 'z', ZN + T, ZS - T, x, 0, LOW);
  root.add(boxes(low, PAL.wall));
  // the cut: a pale cap on every low wall's top, as on every cut wall in the office
  const tops = low.filter((b) => Math.abs(b[4] + b[1] - LOW) < 1e-3);
  root.add(
    boxes(
      tops.map(([w, , d, x, , z]) => [w + 0.01, 0.014, d + 0.01, x, LOW, z]),
      PAL.wallTop,
    ),
  );
  root.add(boxes([[0.86, LOW, 0.06, STAFF_X, 0, ZN + 0.02]], PAL.door));
  root.add(
    paving(X0 + T, X1 - T, ZN + T, ZS - T, 1.25, {
      color: PAL.floor,
      seam: PAL.floorSeam,
    }),
  );
  root.add(boxes([[1.9, 0.012, 1.0, DOOR_X, 0, ZN + 0.75]], '#3c4658'));
  root.add(lightPool(DOOR_X, ZN - 0.7, 0.9, { k: 0.28 }));
  interior(root);

  // what fades: walls above the cut, the upper storey, parapet, roof, the exit canopy, windows and the sign
  const wall = [],
    glass = [],
    frame = [],
    roof = [],
    trim = [];
  const upperWin = (a0, a1) => {
    const out = [];
    const n = Math.max(1, Math.floor((a1 - a0 - 0.6) / 1.7));
    const step = (a1 - a0) / n;
    for (let i = 0; i < n; i++) out.push([a0 + step * (i + 0.5) - 0.6, a0 + step * (i + 0.5) + 0.6, 2.3, 3.35]);
    return out;
  };
  const sideGround = SIDE_WIN.map(([a, b]) => [a, b, 0.3, 1.6]);
  // north face: the exit and the staff door, upper windows
  const nUp = upperWin(X0, X1);
  wallRun(wall, 'x', X0, X1, ZN + T / 2, LOW, H2, [
    [DOOR_X - 0.85, DOOR_X + 0.85, 0, 1.75],
    [STAFF_X - 0.45, STAFF_X + 0.45, 0, 1.35],
    ...nUp,
  ]);
  glazing(glass, frame, 'x', nUp, ZN + T / 2, -1);
  // south face: the glass front (the walkway arrives there), upper windows
  const sUp = upperWin(X0, X1);
  const front = [[FRONT[0], FRONT[1], LOW, 1.75]];
  wallRun(wall, 'x', X0, X1, ZS - T / 2, LOW, H2, [...front, ...sUp]);
  glazing(glass, frame, 'x', front, ZS - T / 2, 1);
  glazing(glass, frame, 'x', sUp, ZS - T / 2, 1, { trim });
  // east and west: the gate room's tall windows, and the upper row
  for (const [x, side] of [
    [X1 - T / 2, 1],
    [X0 + T / 2, -1],
  ]) {
    const up = upperWin(ZN, ZS);
    const g = sideGround.map(([a, b, y0, y1]) => [a, b, Math.max(LOW, y0), y1]);
    wallRun(wall, 'z', ZN, ZS, x, LOW, H2, [...g, ...up]);
    glazing(glass, frame, 'z', [...g, ...up], x, side, { trim });
  }
  // the floor band between the storeys, the parapet, the roof and its plant
  frame.push(
    [X1 - X0 + 0.12, 0.14, 0.08, CX, H1 - 0.02, ZN - 0.02],
    [X1 - X0 + 0.12, 0.14, 0.08, CX, H1 - 0.02, ZS + 0.02],
    [0.08, 0.14, ZS - ZN + 0.12, X0 - 0.02, H1 - 0.02, (ZN + ZS) / 2],
    [0.08, 0.14, ZS - ZN + 0.12, X1 + 0.02, H1 - 0.02, (ZN + ZS) / 2],
  );
  wallRun(wall, 'x', X0, X1, ZN + T / 2, H2, TOPH);
  wallRun(wall, 'x', X0, X1, ZS - T / 2, H2, TOPH);
  for (const x of [X0 + T / 2, X1 - T / 2]) wallRun(wall, 'z', ZN, ZS, x, H2, TOPH);
  frame.push(
    [X1 - X0 + 0.1, 0.06, 0.26, CX, TOPH, ZN + 0.09],
    [X1 - X0 + 0.1, 0.06, 0.26, CX, TOPH, ZS - 0.09],
    [0.26, 0.06, ZS - ZN, X0 + 0.09, TOPH, (ZN + ZS) / 2],
    [0.26, 0.06, ZS - ZN, X1 - 0.09, TOPH, (ZN + ZS) / 2],
  );
  wall.push([X1 - X0 - 2 * T, 0.1, ZS - ZN - 2 * T, CX, H2 - 0.1, (ZN + ZS) / 2]); // the roof deck
  // on the roof: the stair hatch, an air-handling box, a row of condenser units along the east side, a walkway
  frame.push([2.6, 0.9, 1.8, CX + 2.4, H2, ZN + 5.4], [1.4, 0.8, 1.2, CX - 3.8, H2, ZN + 6.6]);
  for (let z = ZN + 1.4; z < ZS - 1; z += 1.25) frame.push([0.8, 0.5, 0.9, X1 - 1.0, H2, z]);
  roof.push([0.9, 0.02, ZS - ZN - 2, X1 - 2.3, H2, (ZN + ZS) / 2], [X1 - X0 - 5, 0.02, 0.9, CX - 1.2, H2, ZN + 3.2]);
  // the exit canopy, cantilevered over the door, and the staff door's small hood
  frame.push([2.9, 0.12, 1.35, DOOR_X, 1.8, ZN - 0.62], [2.96, 0.2, 0.06, DOOR_X, 1.74, ZN - 1.3]);
  frame.push([1.3, 0.08, 0.6, STAFF_X, 1.48, ZN - 0.25]);
  // door frames above the cut (the exit's leaves stand open inside, as in the security room)
  for (const s of [-1, 1]) frame.push([0.08, 1.75 - LOW, 0.2, DOOR_X + s * 0.87, LOW, ZN + 0.09]);
  frame.push([0.9, 1.35 - LOW, 0.05, STAFF_X, LOW, ZN + 0.01]);
  // the name on the roof's south edge, facing the camera, on two posts
  const sign = stationSign();
  sign.position.set(DOOR_X + 1.6, TOPH + 0.45, ZS - 0.4);
  for (const s of [-1, 1]) frame.push([0.08, 0.5, 0.08, sign.position.x + s * 2.0, TOPH, ZS - 0.44]);
  const meshes = [
    boxes(wall, '#8a8f96'),
    boxes(glass, '#8c9dad'),
    boxes(frame, '#5b616b'),
    boxes(roof, '#9aa0a6'), // the roof's walkway boards
    boxes(trim, '#b3b9c0'), // the window surrounds
  ];
  ['station:walls', 'station:glass', 'station:frame', 'station:roof', 'station:trim'].forEach(
    (n, i) => (meshes[i].name = n),
  );
  meshes[1].material = mat('#8c9dad', { roughness: 0.45, metalness: 0.05 });
  for (const m of meshes) root.add(m);
  root.add(sign);
  const occ = {};
  // Eric hidden by the station: the line from his feet up to the camera runs through the block (a margin for his
  // width), or he stands in the door. `view` is the direction toward the camera; the forecourt's usual one looks
  // north at 46 degrees, and on a phone the camera looks east along the court, past the station.
  const view = new THREE.Vector3(0, Math.sin(0.8), Math.cos(0.8));
  const box = [
    [X0 - 0.4, X1 + 0.4],
    [0, TOPH],
    [ZN - 0.3, ZS],
  ];
  const hides = (p) => {
    let t0 = 0,
      t1 = Infinity;
    const o = [p.x, 0.05, p.z],
      d = [view.x, view.y, view.z];
    for (let i = 0; i < 3; i++) {
      const [lo, hi] = box[i];
      if (Math.abs(d[i]) < 1e-6) {
        if (o[i] < lo || o[i] > hi) return false;
        continue;
      }
      let a = (lo - o[i]) / d[i],
        b = (hi - o[i]) / d[i];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) return false;
    }
    return true;
  };
  addOccluder(occ, [...meshes, sign], hides, { name: 'station' });
  let last = null;
  return {
    occ,
    view,
    // pos: Eric; dir: toward the camera (RoomCam.dir), when it is not the usual one
    update(pos, dt, dir) {
      if (dir) view.copy(dir).normalize();
      const jump = !last || Math.hypot(pos.x - last[0], pos.z - last[1]) > 0.8;
      last = [pos.x, pos.z];
      updateOccluders(occ, pos, jump ? Infinity : dt);
    },
    onPeriod(period) {
      if (period !== 'evening') return;
      // the station is open late: its windows glow
      const m = meshes[1].material;
      m.color.set('#c9b596');
      m.emissive = new THREE.Color('#ffc98a');
      m.emissiveIntensity = 0.45;
      m.needsUpdate = true;
    },
  };
}

// the station, the shed, the beam and the walkway; returns the station's handle ({ update(pos, dt, dir), onPeriod })
export function buildStation(root) {
  const station = block(root);
  // the shed's roof fades while the camera looks east over it (the phone's view out of the station)
  const roof = buildShed(root, STATION);
  roof.name = 'station:shedRoof';
  addOccluder(station.occ, [roof], () => station.view.x < -0.5, { name: 'shed' });
  return station;
}
