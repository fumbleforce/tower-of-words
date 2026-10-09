// Honsha station from outside, at the forecourt (scenes/forecourt.js): the two-storey block over the security room's
// footprint (island-layout.js BUILDINGS station; scenes/lobby.js inside), the platform shed along the west coast with
// the monorail beam on piers, and the covered walkway from the shed to the station's glass front.
// The camera looks north over the station at Eric on the court, so everything above the cut-low wall height is one
// occluder (scenes/occluders.js): it fades while the station stands between him and the camera (just outside its
// north door) and stands whole again as he walks east, so the station is at the bottom left when he reaches the head
// office. On a phone the camera looks east past it from the door (places/forecourt.js), so it stays whole there and
// the platform shed's roof fades instead.
import * as THREE from 'three';
import { PAL, mat, textTexture, plane, JP_FONT } from '../props.js';
import { lightPool } from '../places/life.js';
import { addOccluder, updateOccluders } from './occluders.js';
import { BUILDINGS, footprint, toLocal } from './island-layout.js';
import { boxes } from './forecourt/details.js';
import { POOL_Y } from './outdoor/parts.js';
import { hall, hallFares, ROOM } from './station-hall.js';
import { FARES } from './station-fittings.js';
import { glowSet } from '../kit/light/glow.js';
import { buildShed, coveredWalk } from './station-shed.js';

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
const CX = (X0 + X1) / 2,
  CZ = (ZN + ZS) / 2;
export const DOOR_X = CX - 1, // the exit (the gate room's back-wall opening at room x -1)
  STAFF_X = CX + 3.95, // the staff door beside it (room x 3.95)
  LOW = 0.45, // the cut-low wall height while it fades
  H1 = 1.9, // the ground storey: the gate room's wall height
  H2 = 3.8,
  TOPH = 4.1, // parapet top
  T = 0.18, // wall thickness
  STEP = ZN + 2.45; // where the side walls rise from the cut to the full ground storey (past the first window)
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

// the station block. Returns { update(pos, dt), glows, onPeriod(p) }
function block(root) {
  // What stays when the rest fades: the security room as a cut-away. The north wall, between Eric and the camera,
  // is cut low; the side walls stay the ground storey's full height from STEP back (clear of the line from Eric
  // to the camera anywhere by the north face) and are cut low in front of it; the south wall stays full height.
  // Every cut top gets a pale cap, as on every cut wall in the office; the walls' inner faces are the room's own.
  const low = [],
    lining = [],
    stayGlass = [],
    stayFrame = [],
    stayTrim = [];
  const northHoles = [
    [DOOR_X - 0.85, DOOR_X + 0.85, 0, 1.75],
    [STAFF_X - 0.45, STAFF_X + 0.45, 1.35, 2], // the staff door: its leaf stands in the low wall
  ];
  const sideGround = SIDE_WIN.map(([a, b]) => [a, b, 0.3, 1.6]);
  const front = [[FRONT[0], FRONT[1], 0, 1.75]];
  // the room's colour on a wall's inner face: a thin lining just inside it
  const inner = (axis, a0, a1, at, y1, holes) => {
    const L = [];
    wallRun(L, axis, a0, a1, at, 0, y1, holes);
    const k = (axis === 'x' ? (at < CZ ? 1 : -1) : at < CX ? 1 : -1) * (T / 2 + 0.016);
    for (const [w, h, d, x, y, z] of L)
      lining.push(axis === 'x' ? [w, h, 0.03, x, y, z + k] : [0.03, h, d, x + k, y, z]);
  };
  wallRun(low, 'x', X0, X1, ZN + T / 2, 0, LOW, northHoles);
  inner('x', X0 + T, X1 - T, ZN + T / 2, LOW, northHoles);
  wallRun(low, 'x', X0, X1, ZS - T / 2, 0, H1, front);
  inner('x', X0 + T, X1 - T, ZS - T / 2, H1, front);
  glazing(stayGlass, stayFrame, 'x', [[FRONT[0], FRONT[1], LOW, 1.75]], ZS - T / 2, 1);
  for (const [x, side] of [
    [X0 + T / 2, -1],
    [X1 - T / 2, 1],
  ]) {
    const back = sideGround.filter(([a]) => a >= STEP);
    wallRun(low, 'z', ZN + T, STEP, x, 0, LOW, sideGround);
    wallRun(low, 'z', STEP, ZS - T, x, 0, H1, back);
    inner('z', ZN + T, STEP, x, LOW, sideGround);
    inner('z', STEP, ZS - T, x, H1, back);
    glazing(stayGlass, stayFrame, 'z', back, x, side, { trim: stayTrim });
  }
  root.add(boxes(low, '#8a8f96'), boxes(lining, PAL.wall), boxes(stayFrame, '#5b616b'), boxes(stayTrim, '#b3b9c0'));
  const litGlass = boxes(stayGlass, '#8c9dad');
  litGlass.material = mat('#8c9dad', {
    roughness: 0.45,
    metalness: 0.05,
  }).clone(); // its own: it glows after dark
  root.add(litGlass);
  const tops = [...low, ...lining].filter((b) => [LOW, H1].some((h) => Math.abs(b[4] + b[1] - h) < 1e-3));
  root.add(
    boxes(
      tops.map(([w, h, d, x, y, z]) => [w + 0.01, 0.014, d + 0.01, x, y + h, z]),
      PAL.wallTop,
    ),
  );
  root.add(boxes([[0.86, LOW, 0.06, STAFF_X, 0, ZN + 0.02]], PAL.door));
  root.add(lightPool(DOOR_X, ZN - 0.7, 0.9, { k: 0.28, y: POOL_Y }));
  hall(root, CX, ZN + ROOM.Z);
  const fares = hallFares(root, CX, ZN + ROOM.Z);
  fares.position.z += T; // the room's back wall is inside the station's north wall here

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
  // north face: the exit and the staff door, upper windows
  const nUp = upperWin(X0, X1);
  wallRun(wall, 'x', X0, X1, ZN + T / 2, LOW, H2, [
    [DOOR_X - 0.85, DOOR_X + 0.85, 0, 1.75],
    [STAFF_X - 0.45, STAFF_X + 0.45, 0, 1.35],
    ...nUp,
  ]);
  glazing(glass, frame, 'x', nUp, ZN + T / 2, -1);
  // south face: upper windows over the glass front (the walkway arrives there)
  const sUp = upperWin(X0, X1);
  wallRun(wall, 'x', X0, X1, ZS - T / 2, H1, H2, sUp);
  glazing(glass, frame, 'x', sUp, ZS - T / 2, 1, { trim });
  // east and west: the front of the gate room's tall windows and the upper row
  for (const [x, side] of [
    [X1 - T / 2, 1],
    [X0 + T / 2, -1],
  ]) {
    const up = upperWin(ZN, ZS);
    const g = sideGround.filter(([a]) => a < STEP).map(([a, b, , y1]) => [a, b, LOW, y1]);
    wallRun(wall, 'z', ZN, STEP, x, LOW, H1, g);
    wallRun(wall, 'z', ZN, ZS, x, H1, H2, up);
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
  // (pale sheet-metal casings; louvres on the boxes' south faces, a dark fan grille with its hub on each unit)
  for (const [w, h, d, x, z] of [
    [2.6, 0.9, 1.8, CX + 2.4, ZN + 5.4],
    [1.4, 0.8, 1.2, CX - 3.8, ZN + 6.6],
  ]) {
    roof.push([w, h, d, x, H2, z], [w + 0.08, 0.05, d + 0.08, x, H2 + h, z]);
    for (let y = H2 + 0.18; y < H2 + h - 0.12; y += 0.14) frame.push([w - 0.3, 0.05, 0.03, x, y, z + d / 2 + 0.01]);
  }
  for (let z = ZN + 1.4; z < ZS - 1; z += 1.25) {
    roof.push([0.8, 0.5, 0.9, X1 - 1.0, H2, z]);
    frame.push([0.62, 0.02, 0.62, X1 - 1.0, H2 + 0.5, z], [0.16, 0.03, 0.16, X1 - 1.0, H2 + 0.51, z]);
    trim.push([0.62, 0.012, 0.04, X1 - 1.0, H2 + 0.515, z], [0.04, 0.012, 0.62, X1 - 1.0, H2 + 0.515, z]);
  }
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
  // the station is open late: its windows glow after work (for a light rig, kit/light/glow.js)
  const glows = [meshes[1], litGlass].map(({ material: m }) => ({
    mat: m,
    night: { color: '#c9b596', emissive: '#ffc98a', emissiveIntensity: 0.45 },
  }));
  const glowing = glowSet().add(glows);
  for (const m of meshes) root.add(m);
  root.add(sign);
  const occ = {};
  // Eric hidden by the station: the line from his feet up to the camera runs through the block (a margin for his
  // width), or he stands in the door. `view` is the direction toward the camera; the forecourt's usual one looks
  // north at 46 degrees, and on a phone the camera looks east along the court, past the station.
  const view = new THREE.Vector3(0, Math.sin(0.8), Math.cos(0.8));
  // the line from a point of Eric (his feet, or up to `tall` above them) toward the camera runs through the box
  const through =
    ([bx, by, bz], tall = 0) =>
    (p) => {
      let t0 = 0,
        t1 = Infinity;
      const o = [p.x, 0.05, p.z],
        d = [view.x, view.y, view.z],
        box = [bx, [by[0] - tall, by[1]], bz];
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
  const hides = through([
    [X0 - 0.4, X1 + 0.4],
    [0, TOPH],
    [ZN - 0.3, ZS],
  ]);
  addOccluder(occ, [...meshes, sign], hides, { name: 'station' });
  // the fare machines stand against the cut north wall: they fade too while they would hide any of him
  const fx = fares.position.x;
  const faresHide = through(
    [
      [fx - FARES.w / 2 - 0.3, fx + FARES.w / 2 + 0.3],
      [0, 1.95],
      [ZN, ZN + T + FARES.d],
    ],
    1.3,
  );
  const fm = [];
  fares.traverse((m) => m.isMesh && fm.push(m));
  addOccluder(occ, fm, faresHide, { name: 'fares' });
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
    glows,
    // for a place without a light rig (the station garden's)
    onPeriod(period) {
      glowing.set(period === 'evening');
    },
  };
}

// the station, the shed, the beam and the walkway; returns the station's handle ({ update(pos, dt, dir), glows, onPeriod })
export function buildStation(root, { covered = false } = {}) {
  const station = block(root);
  // the shed's roof fades while the camera looks east over it (the phone's view out of the station)
  const roof = buildShed(
    root,
    STATION,
    covered
      ? (walkRoof) => {
          addOccluder(
            station.occ,
            [walkRoof],
            (p) =>
              coveredWalk(STATION).some(
                ([x0, x1, z0, z1]) => p.x > x0 - 0.3 && p.x < x1 + 0.3 && p.z > z0 - 0.3 && p.z < z1 + 0.3,
              ),
            { name: 'covered-walk' },
          );
        }
      : null,
  );
  roof.name = 'station:shedRoof';
  addOccluder(station.occ, [roof], () => station.view.x < -0.5, {
    name: 'shed',
  });
  return station;
}
