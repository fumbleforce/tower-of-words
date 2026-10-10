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
// the curtain wall's bay lines along a face of length L (its fins stand on them); the ground floor's piers, glass
// mullions and windows use the same lines, so the facade runs through from the plinth to the parapet
export const bayLines = (L) => {
  const n = Math.round(L / 1.48);
  return Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
};
export const BU = bayLines(T.W); // the south face's bay lines: the atrium's grid along u (1.49 apart)
// The lobby is a double-height atrium (Jørgen picked it, reviews/lobby-plan-1): u 0..LU (nine bays) by n 0..LN, AH
// high (the ground floor and the first storey). Behind its back wall, up to the tower's north wall, a row of rooms
// one storey high: the closed service room, the receptionist's office, the stair and the four lift shafts. East of
// the atrium the back office.
export const AH = GF + T.fh,
  LU = BU[9],
  LN = 7.5, // the back wall's face (the lift bank; the feature wall stands proud of it, FW)
  FW = 7.2,
  BACK = LN + 0.18, // the back rooms, from the back wall to the north wall's inside face (T.D - 0.18)
  DOOR_U = 3.2, // the entrance, in the south face
  DOOR_W = 1.6;
export const DOOR = at(DOOR_U, 0);
// the back rooms along u: the service room (west of the office), the receptionist's office (its door in the
// feature wall's east end, OFFICE_DOOR), the stair (its door in the bay between the feature wall and the lifts) and
// the four lifts, one a bay, the B2 car the west one, nearest the desk
export const OFFICE = [BU[2], BU[4], BACK, T.D - 0.18],
  OFFICE_DOOR = [4.95, 5.8],
  STAIR_U = (BU[4] + BU[5]) / 2,
  LIFTS = [5, 6, 7, 8].map((i) => (BU[i] + BU[i + 1]) / 2),
  BANK = [BU[5], LU];
// the lift site: the B2 car's doors in the back wall; CZ the wall's centre line (z), OUT where he stands to board
export const CZ = Math.round((T.o[1] - LN - 0.09) * 100) / 100;
export const OUT = [Math.round(at(LIFTS[0], 0)[0] * 100) / 100, Math.round((CZ + 0.85) * 100) / 100];
// x0, x1, z back, z front face: the stair and the lift shafts behind the back wall
export const CORE = [at(BU[4], 0)[0], at(LU, 0)[0], at(0, T.D - 0.18)[1], CZ + 0.09];

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
// The cut over the lobby: while Eric is in the lobby, the receptionist's office or the lift, only the part of the
// tower between him and the camera fades: the lobby's glass front and canopy and the storeys over the atrium, from
// the south face back to its back wall and east to its east wall (a bay line). The floors above that, and the rest
// of the tower, stay, so the lobby reads as a room open to the camera at the foot of a standing tower. The cut is
// five storeys tall (NT): the camera looks into the lift car and the office behind the back wall over the south
// face's storeys, at 46 degrees (50 in the lift), so a lower cut would hide them. [u0, u1, y0, y1, n0, n1]
export const NT = GF + 5 * T.fh;
export const NOTCH = [-2, LU, 0.45, NT, -2.2, LN];
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
