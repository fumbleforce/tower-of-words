// The head office's frame and measures (scenes/head-office.js): the tower's footprint from the island layout, a
// rectangle on the town's grid like everything else in the forecourt, with u along the south face from the
// south-west corner (east) and n inward (north); the lobby, the door and the lift core in it; and a box collector
// that merges per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BUILDINGS, toLocal } from '../island-layout.js';

// ---------- the tower's frame, from the layout ----------
export const GF = 2.4; // ground floor height; the core, the service block and the lift's walls are this high
export const T = (() => {
  const b = BUILDINGS.find((x) => x.id === 'head_office');
  const [x0, z0, x1, z1] = b.rect;
  const [wx, nz] = toLocal('forecourt', x0, z0).map((v) => Math.round(v * 100) / 100),
    [ex, sz] = toLocal('forecourt', x1, z1).map((v) => Math.round(v * 100) / 100);
  // o: the south-west corner; the group in scenes/head-office.js stands there, its x = u and its z = -n
  return {
    W: ex - wx,
    D: sz - nz,
    o: [wx, sz],
    storeys: b.storeys,
    fh: b.floorH,
  };
})();
export const at = (u, n) => [T.o[0] + u, T.o[1] - n];
export const inT = (x, z) => [x - T.o[0], T.o[1] - z];
export const TOP = GF + (T.storeys - 1) * T.fh;
export const LU = 9.9, // the lobby: u 0..LU, n 0..LN; the rest of the ground floor is the service block
  LN = 6.2,
  DOOR_U = 3.2, // the entrance, in the south face
  DOOR_W = 1.6;
export const DOOR = at(DOOR_U, 0);
// the lift site: straight in from the door
export const OUT = at(DOOR_U, 3.3).map((v) => Math.round(v * 100) / 100);
export const CZ = Math.round((OUT[1] - 0.85) * 100) / 100; // the core's front wall, centre line
// x0, x1, z back, z front face: the core's back wall stands against the inside of the lobby's back wall
export const CORE = [OUT[0] - 1.6, OUT[0] + 5.6, at(0, LN)[1], CZ + 0.09];
export const CAR2_X = OUT[0] + 2.0,
  STAIR_X = OUT[0] + 3.3;
// the curtain wall's bay lines along a face of length L (its fins stand on them); the ground floor's piers, glass
// mullions and windows use the same lines, so the facade runs through from the plinth to the parapet
export const bayLines = (L) => {
  const n = Math.round(L / 1.48);
  return Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
}; // the lift's lid over the car (unlit): the dark of the core's shafts in the cut

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
// The cut over the lobby: while Eric is in the lobby or the lift, only the part of the tower between him and the
// camera fades: the lobby's glass front and canopy and the three storeys over the lobby, from the south face back
// to the lobby's back wall and east to the first bay line past the lobby's east wall. The floors above that, and the
// rest of the tower, stay, so the lobby reads as a room open to the camera at the foot of a standing tower (the
// camera's 46 degrees see nothing of the storeys above the cut from the lobby floor). [u0, u1, y0, y1, n0, n1]
export const NU = bayLines(T.W).find((u) => u >= LU - 1e-6),
  NT = GF + 3 * T.fh;
export const NOTCH = [-2, NU, 0.45, NT, -2.2, LN];
// a box collector that sends each box's part inside `region` to `fade` and the rest to `stay` (split along u, then
// y, then n), so a floor band or a fin running across the cut's edge is cut exactly there
export function splitParts(fade, stay, region = NOTCH) {
  const [a0, a1, b0, b1, c0, c1] = region;
  return {
    box(u0, u1, y0, y1, n0, n1) {
      if (u1 <= a0 || u0 >= a1 || y1 <= b0 || y0 >= b1 || n1 <= c0 || n0 >= c1) return stay.box(u0, u1, y0, y1, n0, n1);
      const [U0, U1, Y0, Y1, N0, N1] = [
        Math.max(u0, a0),
        Math.min(u1, a1),
        Math.max(y0, b0),
        Math.min(y1, b1),
        Math.max(n0, c0),
        Math.min(n1, c1),
      ];
      if (U0 > u0) stay.box(u0, U0, y0, y1, n0, n1);
      if (U1 < u1) stay.box(U1, u1, y0, y1, n0, n1);
      if (Y0 > y0) stay.box(U0, U1, y0, Y0, n0, n1);
      if (Y1 < y1) stay.box(U0, U1, Y1, y1, n0, n1);
      if (N0 > n0) stay.box(U0, U1, Y0, Y1, n0, N0);
      if (N1 < n1) stay.box(U0, U1, Y0, Y1, N1, n1);
      fade.box(U0, U1, Y0, Y1, N0, N1);
    },
  };
}

export const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};
