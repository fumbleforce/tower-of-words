// The platform shed along the west coast of the station forecourt, the monorail beam arriving on piers, and the
// covered walkway from the shed's stairs to the station's glass front (scenes/station-exterior.js builds the station
// and calls buildShed). All of it on the town's grid, like the station; only the beam curves, out on the approach.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from '../props.js';
import { BUILDINGS, PATHS, toLocal } from './island-layout.js';
import { boxes } from './forecourt/details.js';
import { pavingRects } from './town.js';

// The shed from the layout's platform_shed: a rectangle on the grid, running north-south west of the station, its
// centre line down the middle of the traced roof; 7.2 wide under the traced 8, so its eaves stay inside the outline.
const SHED = (() => {
  const [x0, z0, x1, z1] = BUILDINGS.find((b) => b.id === 'platform_shed').rect;
  const [wx, nz] = toLocal('forecourt', x0, z0),
    [ex, sz] = toLocal('forecourt', x1, z1);
  return { c: [(wx + ex) / 2, (nz + sz) / 2], L: sz - nz, half: 3.6 };
})();
const DECK = 2.5, // platform level (the monorail car's floor)
  BEAM_TOP = 2.0,
  EAVE = 4.3;

function shed(root) {
  const g = new THREE.Group();
  g.position.set(SHED.c[0], 0, SHED.c[1]); // the group's +z points south, down the shed
  root.add(g);
  const L = SHED.L,
    beams = [],
    piers = [],
    deck = [],
    steel = [];
  // two track beams either side of the island platform; the west one runs on 6 past the south end into the
  // approach, the east one ends at the shed's end on a buffer, so the walkway south of the shed passes under nothing
  for (const [u, run] of [
    [-2.2, 6],
    [2.2, 0.4],
  ]) {
    beams.push([0.8, 0.9, L + run, u, BEAM_TOP - 0.9, run / 2]);
    for (let v = -L / 2 + 2; v < L / 2 + run; v += 6) piers.push([0.55, BEAM_TOP - 0.9, 0.55, u, 0, v]);
  }
  steel.push([0.9, 0.35, 0.3, 2.2, BEAM_TOP, L / 2 + 0.25]); // the buffer
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
  const w = (u, v) => new THREE.Vector3(u, 0, v).applyMatrix4(g.matrix);
  return { foot: w(0, L / 2 + 2.6), beamEnd: w(-2.2, L / 2 + 6), roof };
}

// the monorail beam arriving on piers along the layout's beam path: straight south out of the shed's west track,
// then a steady curve to the west-south-west in short straight pieces along a smooth line (one curved beam, not
// two straight ones meeting at an angle)
function approach(root, beamEnd) {
  const line = PATHS.find((p) => p.id === 'beam').line.map(([x, z]) => toLocal('forecourt', x, z));
  // from the west beam's end on along the path (its points south of the end, nearest first)
  const pts = [[beamEnd.x, beamEnd.z], ...line.reverse().filter(([, z]) => z > beamEnd.z + 0.5)];
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const n = Math.ceil(curve.getLength() / 1.5),
    P = curve.getSpacedPoints(n),
    beam = [],
    piers = [];
  for (let i = 0; i < n; i++) {
    const [a, b] = [P[i], P[i + 1]],
      len = a.distanceTo(b);
    beam.push(
      new THREE.BoxGeometry(0.8, 0.9, len + 0.04)
        .rotateY(Math.atan2(b.x - a.x, b.z - a.z))
        .translate((a.x + b.x) / 2, BEAM_TOP - 0.45, (a.z + b.z) / 2),
    );
    if (i % 4 === 2)
      piers.push(new THREE.BoxGeometry(0.55, BEAM_TOP - 0.9, 0.55).translate(a.x, (BEAM_TOP - 0.9) / 2, a.z));
  }
  for (const [list, color] of [
    [beam, '#9aa0a6'],
    [piers, '#8a8f96'],
  ]) {
    const m = new THREE.Mesh(mergeGeometries(list), mat(color));
    list.forEach((g) => g.dispose());
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }
}

// the covered walkway from the stair foot: east along the shed's south end, then north to the station's glass front
export function coveredWalk(station) {
  const CX = (station.x0 + station.x1) / 2,
    [x, z] = [SHED.c[0], SHED.c[1] + SHED.L / 2 + 2.6];
  return [
    [x - 0.9, CX + 1.2, z - 0.9, z + 0.9],
    [CX - 1.2, CX + 1.2, station.zS, z - 0.9],
  ];
}

function walkway(root, foot, station) {
  const { x0: X0, x1: X1, zS: ZS } = station;
  const CX = (X0 + X1) / 2,
    z = foot.z, // the east run's middle line
    posts = [],
    roofs = [];
  const run = (x0, x1, z0, z1) => roofs.push([x1 - x0, 0.08, z1 - z0, (x0 + x1) / 2, 2.2, (z0 + z1) / 2]);
  run(foot.x - 0.9, CX + 1.2, z - 0.9, z + 0.9);
  run(CX - 1.2, CX + 1.2, ZS, z - 0.9);
  for (let x = foot.x + 1.6; x < CX - 1.2; x += 2.5)
    posts.push([0.08, 2.2, 0.08, x, 0, z - 0.85], [0.08, 2.2, 0.08, x, 0, z + 0.85]);
  for (let zz = ZS + 1.2; zz < z - 0.9; zz += 2.5)
    posts.push([0.08, 2.2, 0.08, CX - 1.15, 0, zz], [0.08, 2.2, 0.08, CX + 1.15, 0, zz]);
  posts.push([0.08, 2.2, 0.08, CX + 1.15, 0, z + 0.85], [0.08, 2.2, 0.08, CX - 1.15, 0, z + 0.85]);
  const roof = boxes(roofs, '#56697d');
  root.add(roof, boxes(posts, '#6f7782'));
  const stone = { color: '#8e8a86', seam: '#7f7b77' };
  root.add(pavingRects(coveredWalk(station), 0.9, stone));
  return roof;
}

// the shed, the beam and the walkway round `station` (its outline { x0, x1, zN, zS }); returns the shed's roof
export function buildShed(root, station, onWalkRoof = null) {
  const { foot, beamEnd, roof } = shed(root);
  approach(root, beamEnd);
  const walkRoof = walkway(root, foot, station);
  onWalkRoof?.(walkRoof);
  return roof;
}
