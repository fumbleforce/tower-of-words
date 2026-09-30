// The platform shed along the west coast of the station forecourt, the monorail beam arriving on piers, and the
// covered walkway from the shed's stairs to the station's glass front (scenes/station-exterior.js builds the station
// and calls buildShed).
import * as THREE from 'three';
import { mat } from '../props.js';
import { BUILDINGS, footprint, toLocal } from './island-layout.js';
import { boxes } from './forecourt/details.js';
import { paving } from './town.js';

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
  return { foot: w(0, L / 2 + 2.6), beamEnd: w(-2.2, L / 2 + 6), roof };
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
function walkway(root, foot, { x0: X0, x1: X1, zS: ZS }) {
  const CX = (X0 + X1) / 2;
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
  root.add(
    paving(xa - 0.2, xb + 1.2, z - 0.9, z + 0.9, 0.9, {
      color: '#8e8a86',
      seam: '#7f7b77',
    }),
  );
}

// the shed, the beam and the walkway round `station` (its outline { x0, x1, zN, zS }); returns the shed's roof
export function buildShed(root, station) {
  const { foot, beamEnd, roof } = shed(root);
  approach(root, beamEnd);
  walkway(root, foot, station);
  return roof;
}
