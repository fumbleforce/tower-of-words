// Honsha station from outside, at the forecourt (scenes/forecourt.js): the two-storey block over the security room's
// footprint (island-layout.js BUILDINGS station; scenes/lobby.js inside), the platform shed along the west coast with
// the monorail beam on piers, and the covered walkway from the shed to the station's glass front.
// The camera looks north over the station at Eric on the court, so everything above the cut-low wall height is one
// occluder (scenes/occluders.js): it fades while he is in the station's screen shadow (just outside its north door)
// and stands whole again as he walks east, so the station is at the bottom left when he reaches the head office.
import * as THREE from 'three';
import { PAL, mat, textTexture, plane, JP_FONT } from '../props.js';
import { lightPool } from '../places/life.js';
import { addOccluder, updateOccluders } from './occluders.js';
import { BUILDINGS, footprint, toLocal } from './island-layout.js';
import { boxes } from './forecourt/details.js';
import { paving } from './town.js';

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

// window glass and frames on a face: `rects` [a, b, y0, y1] along the face at `at`, a hair outside it (`side` +1/-1)
function glazing(glass, frame, axis, rects, at, side, { mull = 1.2 } = {}) {
  const o = at + side * (T / 2 + 0.01);
  for (const [a, b, y0, y1] of rects) {
    const h = y1 - y0,
      w = b - a,
      m = (a + b) / 2;
    if (axis === 'x') glass.push([w, h, 0.03, m, y0, o]);
    else glass.push([0.03, h, w, o, y0, m]);
    // frame: sill and head, and mullions every `mull`
    const f = (s0, s1, t0, t1) =>
      axis === 'x'
        ? frame.push([s1 - s0, t1 - t0, 0.06, (s0 + s1) / 2, t0, o + side * 0.01])
        : frame.push([0.06, t1 - t0, s1 - s0, o + side * 0.01, t0, (s0 + s1) / 2]);
    f(a - 0.04, b + 0.04, y0 - 0.06, y0);
    f(a - 0.04, b + 0.04, y1, y1 + 0.05);
    const n = Math.max(1, Math.round(w / mull));
    for (let i = 0; i <= n; i++) f(a + (w * i) / n - 0.025, a + (w * i) / n + 0.025, y0, y1);
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

// What shows of the security room when the station is cut low: the gate line (glass runs, readers, the scanner arch,
// the guard's desk), the plants along the back wall and the two benches, where lobby.js has them, in plain shapes.
function interior(root) {
  const rx = (x) => CX + x,
    rz = (z) => ZN + 4.5 + z,
    BZ = rz(-0.55);
  const posts = [],
    rails = [],
    panes = [],
    dark = [],
    pots = [];
  for (const [a, b] of [
    [-5.95, -1.2],
    [3.25, 5.95],
  ]) {
    const n = Math.max(1, Math.round((b - a) / 1.3));
    for (let i = 0; i <= n; i++) posts.push([0.1, 0.62, 0.1, rx(a + ((b - a) * i) / n), 0, BZ]);
    rails.push([b - a, 0.04, 0.08, rx((a + b) / 2), 0.58, BZ]);
    panes.push([b - a, 0.5, 0.03, rx((a + b) / 2), 0.06, BZ]);
  }
  for (const x of [-0.93, 0.93]) dark.push([0.22, 0.95, 0.22, rx(x), 0, BZ]);
  dark.push([0.12, 1.5, 0.3, rx(-0.5), 0, BZ], [0.12, 1.5, 0.3, rx(0.5), 0, BZ], [1.12, 0.14, 0.3, rx(0), 1.5, BZ]);
  dark.push([1.2, 0.72, 0.6, rx(2.2), 0, BZ]);
  for (const [x, z] of [
    [-3.9, 2.55],
    [3.95, 1.3],
  ])
    dark.push([2.1, 0.42, 0.5, rx(x), 0, rz(z)]);
  const leaves = [];
  for (const [x, z] of [
    [-5.7, -3.9],
    [-2.95, -3.95],
    [2.95, -3.95],
    [5.7, -3.9],
  ]) {
    pots.push([0.34, 0.36, 0.34, rx(x), 0, rz(z)]);
    leaves.push(new THREE.IcosahedronGeometry(0.34, 0).translate(rx(x), 0.72, rz(z)));
  }
  root.add(boxes(posts, '#6b717c'), boxes(rails, '#7c828d'), boxes(panes, '#9fb6c6'), boxes(dark, '#454956'));
  root.add(boxes(pots, '#6c7280'));
  for (const g of leaves) {
    const m = new THREE.Mesh(g, mat(PAL.leaf[1]));
    m.castShadow = true;
    root.add(m);
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
  root.add(boxes([[0.86, LOW, 0.06, STAFF_X, 0, ZN + 0.02]], PAL.door));
  root.add(paving(X0 + T, X1 - T, ZN + T, ZS - T, 1.25, { color: PAL.floor, seam: PAL.floorSeam }));
  root.add(boxes([[1.9, 0.012, 1.0, DOOR_X, 0, ZN + 0.75]], '#3c4658'));
  root.add(lightPool(DOOR_X, ZN - 0.7, 0.9, { k: 0.28 }));
  interior(root);

  // what fades: walls above the cut, the upper storey, parapet, roof, the exit canopy, windows and the sign
  const wall = [],
    glass = [],
    frame = [],
    roof = [];
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
  glazing(glass, frame, 'x', [...front, ...sUp], ZS - T / 2, 1);
  // east and west: the gate room's tall windows, and the upper row
  for (const [x, side] of [
    [X1 - T / 2, 1],
    [X0 + T / 2, -1],
  ]) {
    const up = upperWin(ZN, ZS);
    const g = sideGround.map(([a, b, y0, y1]) => [a, b, Math.max(LOW, y0), y1]);
    wallRun(wall, 'z', ZN, ZS, x, LOW, H2, [...g, ...up]);
    glazing(glass, frame, 'z', [...g, ...up], x, side);
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
  ];
  ['station:walls', 'station:glass', 'station:frame', 'station:roof'].forEach((n, i) => (meshes[i].name = n));
  meshes[1].material = mat('#8c9dad', { roughness: 0.45, metalness: 0.05 });
  for (const m of meshes) root.add(m);
  root.add(sign);
  const occ = {};
  const reach = 0.97 * TOPH;
  // Eric in the station's screen shadow: north of it within the reach of its height, across its width, or in the door
  const hides = (p) => p.x > X0 - 0.4 && p.x < X1 + 0.4 && p.z < ZN + 0.5 && p.z > ZN - reach - 0.3;
  addOccluder(occ, [...meshes, sign], hides, { name: 'station' });
  let last = null;
  return {
    update(pos, dt) {
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

// ---------- the platform shed, the beam and the walkway ----------
// The shed's centre line from the layout's platform_shed (the middles of its two short ends), moved west so its
// roof clears the station's north-west corner (the traced outline overlaps it; notes/map-gaps.md H7, H8), and
// 7.2 wide instead of the drawn 9, so the court keeps its west edge.
const SHED = (() => {
  const P = footprint(BUILDINGS.find((b) => b.id === 'platform_shed')).map(([x, z]) => toLocal('forecourt', x, z));
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const N = mid(P[0], P[1]),
    S = mid(P[2], P[3]);
  return {
    c: [(N[0] + S[0]) / 2 - 1.3, (N[1] + S[1]) / 2],
    yaw: Math.atan2(S[0] - N[0], S[1] - N[1]), // the group's +z points south-south-west, down the shed
    L: Math.hypot(N[0] - S[0], N[1] - S[1]),
    half: 3.6,
  };
})();
const DECK = 2.5, // platform level (the monorail car's floor)
  BEAM_TOP = 2.0,
  EAVE = 4.3;

function shed(root) {
  const g = new THREE.Group();
  g.position.set(SHED.c[0], 0, SHED.c[1]);
  g.rotation.y = SHED.yaw;
  root.add(g);
  const L = SHED.L,
    beams = [],
    piers = [],
    deck = [],
    steel = [];
  // two track beams either side of the island platform, running on 6 past the south end toward the approach
  for (const u of [-2.2, 2.2]) {
    beams.push([0.8, 0.9, L + 6, u, BEAM_TOP - 0.9, 3]);
    for (let v = -L / 2 + 2; v < L / 2 + 6; v += 6) piers.push([0.55, BEAM_TOP - 0.9, 0.55, u, 0, v]);
  }
  // the island platform on columns, its edge lines, and the roof columns and ribs down its middle
  deck.push([1.9, 0.3, L - 2, 0, DECK - 0.3, 0]);
  for (let v = -L / 2 + 2; v < L / 2 - 1; v += 5) {
    piers.push([0.4, DECK - 0.3, 0.4, 0, 0, v]);
    steel.push([0.14, EAVE - DECK + 0.3, 0.14, 0, DECK, v], [SHED.half * 2 - 0.4, 0.1, 0.12, 0, EAVE, v]);
  }
  steel.push([0.06, 0.04, L - 2, -0.9, DECK, 0], [0.06, 0.04, L - 2, 0.9, DECK, 0]);
  // stairs down from the platform's south end to the walkway
  for (let i = 0; i < 10; i++) deck.push([1.3, DECK - i * 0.25, 0.32, 0, 0, L / 2 - 1 + 0.32 * (i + 0.5)]);
  g.add(boxes(beams, '#9aa0a6'), boxes(piers, '#8a8f96'), boxes(deck, '#7d8288'), boxes(steel, '#6f7782'));
  // the curved blue-grey roof, open at both ends
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(SHED.half, SHED.half, L, 16, 1, true, -Math.PI / 2, Math.PI),
    mat('#56697d', { side: THREE.DoubleSide }),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.scale.set(1, 1, 0.24);
  roof.position.set(0, EAVE + 0.05, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  g.add(roof);
  g.updateMatrixWorld(true);
  // the stair foot and the west beam's end, in the forecourt's frame
  const w = (u, v) => new THREE.Vector3(u, 0, v).applyMatrix4(g.matrixWorld);
  return { foot: w(0, L / 2 + 2.6), beamEnd: w(-2.2, L / 2 + 6) };
}

// the monorail beam arriving from the west on piers (the layout's beam path) to the end of the shed's west beam
function approach(root, beamEnd) {
  const [ax, az] = toLocal('forecourt', -44.8, 7.7);
  const len = Math.hypot(beamEnd.x - ax, beamEnd.z - az);
  const g = new THREE.Group();
  g.position.set(ax, 0, az);
  g.rotation.y = Math.atan2(beamEnd.x - ax, beamEnd.z - az);
  root.add(g);
  const piers = [];
  for (let v = 3; v < len; v += 6) piers.push([0.55, BEAM_TOP - 0.9, 0.55, 0, 0, v]);
  g.add(boxes([[0.8, 0.9, len, 0, BEAM_TOP - 0.9, len / 2]], '#9aa0a6'), boxes(piers, '#8a8f96'));
}

// the covered walkway from the stair foot, south of the station, to its glass front
function walkway(root, foot) {
  const z = ZS + 1.4,
    xa = Math.min(foot.x, X0 - 1),
    xb = CX;
  const posts = [],
    roofs = [];
  const run = (x0, x1, z0, z1) => roofs.push([x1 - x0 + 0.3, 0.08, z1 - z0 + 0.3, (x0 + x1) / 2, 2.2, (z0 + z1) / 2]);
  run(xa, xb, z - 0.9, z + 0.9);
  run(xb - 1.2, xb + 1.2, ZS, z - 0.9);
  if (foot.z > z + 0.9) run(foot.x - 0.9, foot.x + 0.9, z + 0.9, foot.z);
  for (let x = xa; x <= xb; x += 2.5) posts.push([0.08, 2.2, 0.08, x, 0, z - 0.85], [0.08, 2.2, 0.08, x, 0, z + 0.85]);
  root.add(boxes(roofs, '#56697d'), boxes(posts, '#6f7782'));
  root.add(paving(xa - 0.2, xb + 1.2, z - 0.9, z + 0.9, 0.9, { color: '#8e8a86', seam: '#7f7b77' }));
}

// the station, the shed, the beam and the walkway; returns the station's handle ({ update(pos, dt), onPeriod })
export function buildStation(root) {
  const station = block(root);
  const { foot, beamEnd } = shed(root);
  approach(root, beamEnd);
  walkway(root, foot);
  return station;
}
