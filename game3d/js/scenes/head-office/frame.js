// The head office's frame and measures (scenes/head-office.js): the tower's footprint from the island layout,
// squared up, with u along the south face from the south-west corner and n inward; the lobby, the door and the
// lift core in it; and a box collector that merges per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, footprint, toLocal } from '../island-layout.js';

// ---------- the tower's frame, from the layout ----------
// The traced footprint is squared up: its centre, the mean angle of its long faces, their mean lengths. u runs along
// the south face from the south-west corner (east-south-east), n inward from the south face (north-north-east).
export const GF = 2.4; // ground floor height; the core, the service block and the lift's walls are this high
export const T = (() => {
  const b = BUILDINGS.find((x) => x.id === 'head_office');
  const [NW, NE, SE, SW] = footprint(b).map(([x, z]) => toLocal('forecourt', x, z));
  const len = (a, c) => Math.hypot(c[0] - a[0], c[1] - a[1]);
  const dir = (a, c) => Math.atan2(c[1] - a[1], c[0] - a[0]);
  const a = (dir(SW, SE) + dir(NW, NE)) / 2,
    W = (len(SW, SE) + len(NW, NE)) / 2,
    D = (len(SW, NW) + len(SE, NE)) / 2;
  const c = [(NW[0] + NE[0] + SE[0] + SW[0]) / 4, (NW[1] + NE[1] + SE[1] + SW[1]) / 4];
  const U = [Math.cos(a), Math.sin(a)],
    N = [Math.sin(a), -Math.cos(a)];
  const o = [c[0] - (U[0] * W) / 2 - (N[0] * D) / 2, c[1] - (U[1] * W) / 2 - (N[1] * D) / 2];
  return { a, W, D, U, N, o, storeys: b.storeys, fh: b.floorH };
})();
export const at = (u, n) => [T.o[0] + u * T.U[0] + n * T.N[0], T.o[1] + u * T.U[1] + n * T.N[1]];
export const inT = (x, z) => {
  const dx = x - T.o[0],
    dz = z - T.o[1];
  return [dx * T.U[0] + dz * T.U[1], dx * T.N[0] + dz * T.N[1]];
};
export const TOP = GF + (T.storeys - 1) * T.fh;
export const LU = 9.9, // the lobby: u 0..LU, n 0..LN; the rest of the ground floor is the service block
  LN = 6.2,
  DOOR_U = 3.2, // the entrance, in the south face
  DOOR_W = 1.6;
export const DOOR = at(DOOR_U, 0);
// the lift site: square to the camera, straight in from the door
export const OUT = at(DOOR_U, 3.3).map((v) => Math.round(v * 100) / 100);
export const CZ = Math.round((OUT[1] - 0.85) * 100) / 100; // the core's front wall, centre line
export const CORE = [OUT[0] - 1.6, OUT[0] + 5.6, CZ - 2.32, CZ + 0.09]; // x0, x1, z back, z front face
export const CAR2_X = OUT[0] + 2.0,
  STAIR_X = OUT[0] + 3.3;
export const CAP = '#949aa3'; // the core's top, and the lift's lid over the car (unlit, so they match)

// ---------- geometry in the tower's frame: boxes collected per material, merged into one mesh each ----------
export function parts() {
  const list = [];
  return {
    // u0..u1 along the south face, y0..y1, n0..n1 inward (in the group below: x = u, z = -n)
    box(u0, u1, y0, y1, n0, n1) {
      list.push(
        new THREE.BoxGeometry(u1 - u0, y1 - y0, n1 - n0).translate((u0 + u1) / 2, (y0 + y1) / 2, -(n0 + n1) / 2),
      );
    },
    mesh(material, name) {
      if (!list.length) return null;
      const m = new THREE.Mesh(mergeGeometries(list), material);
      list.forEach((g) => g.dispose());
      m.name = name;
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    },
  };
}
export const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};
