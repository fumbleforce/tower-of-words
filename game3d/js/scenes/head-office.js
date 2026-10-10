// Head office at the forecourt: the tower, its canopied entrance and the lobby with the lifts and Kuro's reception.
// Size and place come from the island layout (island-layout.js BUILDINGS head_office): a curtain-wall tower of twelve
// storeys north-east of the station, on the town's grid like the station, the court and the lobby inside it, so every
// wall, the lifts and the furniture share one set of axes with the camera. Its ground floor is the lobby, a
// double-height atrium over the west nine bays (head-office/frame.js), and the back office east of it. The atrium's
// back wall faces the door: the feature wall behind the reception desk with the receptionist's office behind it, the
// stair door and the bank of four lifts, the B2 car (the lift site below, its lid the dark of the shafts) the west
// one (head-office/core.js); the floor, the desk and the seating are head-office/lobby.js, the office
// head-office/office-room.js, every sign one canvas (head-office/signs.js).
// The atrium's glass front, the canopy and the storeys over it (frame.js NOTCH) are one occluder
// (scenes/occluders.js): they fade while Eric is inside the lobby, the office or the lift and come back when he walks
// out. The rest of the tower stands, so the lobby shows as a room cut into the foot of the tower. A second occluder,
// the feature wall, fades while he is in the office behind it.
import * as THREE from 'three';
import { mat } from '../props.js';
import { mergeStatic } from './merge-static.js';
import { drain } from '../perf/slice.js';
import { addOccluder, updateOccluders } from './occluders.js';
import { PEOPLE } from '../cast.js';
import { blob } from '../engine.js';
import { K } from './office.js';
import {
  T,
  at,
  inT,
  GF,
  AH,
  LU,
  LN,
  FW,
  BU,
  OFFICE,
  OFFICE_DOOR,
  DOOR,
  DOOR_U,
  DOOR_W,
  OUT,
  CZ,
  CORE,
  TOP,
  parts,
  splitParts,
} from './head-office/frame.js';
import { upper, ground } from './head-office/tower.js';
import { furniture, FURNITURE, RECEPTION, NOOKS, OFFICE_SPOTS } from './head-office/lobby.js';
import { featureWall, core, liftLanding } from './head-office/core.js';
import { officeRoom, ROOM, ROOM_FURNITURE } from './head-office/office-room.js';

export const FORECOURT_LIFT_SITE = {
  x: OUT[0],
  zBack: CZ - 0.09,
  zFront: CZ + 0.09,
  hole: [OUT[0] - 0.62, OUT[0] + 0.62],
  wallH: GF,
  topH: AH + 0.3, // the atrium's wall runs on over the doors to its top (places/lift-cut.js wallTop)
  floor: '1',
  out: [OUT[0], CZ + 0.85],
  // no lid over the car: the atrium's wall hides it from every camera but the ride's
  shaft: true,
};

// Eric in the lobby (past the door's threshold), the office or the lift: anywhere in the ground floor west of the
// back office, since the rooms behind the back wall are closed but for those two
const inLobby = (p) => {
  const [u, n] = inT(p.x, p.z);
  return u > 0 && u < LU && n > 0.05 && n < T.D;
};
// Eric in the receptionist's office, or in its doorway
const inOffice = (p) => {
  const [u, n] = inT(p.x, p.z);
  return u > OFFICE[0] && u < OFFICE[1] && n > FW + 0.1 && n < T.D;
};

// buildHeadOffice() builds it at once; headOfficeSteps() yields between parts (js/perf/slice.js)
export const buildHeadOffice = (root, nav) => drain(headOfficeSteps(root, nav));
export function* headOfficeSteps(root, nav) {
  const g = new THREE.Group(); // the tower's frame
  g.position.set(T.o[0], 0, T.o[1]);
  root.add(g);
  const inner = new THREE.Group();
  const fur = furniture(inner, root);
  officeRoom(inner, root);
  g.add(inner);
  mergeStatic(inner);
  yield;
  // the tower's shell in two sets: what fades while Eric is in the lobby (the lobby's glass front, the canopy and the
  // storeys over the lobby, frame.js NOTCH) and what stays; each set one mesh per material
  const P = () => ({ fade: parts(), stay: parts() });
  const glassP = P(),
    litP = P(),
    frameP = P(),
    lobbyP = parts();
  const split = (q) => splitParts(q.fade, q.stay);
  const frameS = split(frameP);
  upper(split(glassP), split(litP), frameS, splitParts(lobbyP, lobbyP));
  yield;
  const front = ground(g, frameS);
  yield;
  const glassM = mat('#8c9dad', { roughness: 0.45, metalness: 0.05 }),
    litM = glassM.clone(), // its own: the lit bays glow after work
    frameM = mat('#b3b9c0');
  const fading = [
    glassP.fade.mesh(glassM, 'ho:glass'),
    litP.fade.mesh(litM, 'ho:glassLit'),
    frameP.fade.mesh(frameM, 'ho:frame'),
  ];
  const standing = [
    glassP.stay.mesh(glassM, 'ho:glassStay'),
    litP.stay.mesh(litM, 'ho:glassLitStay'),
    frameP.stay.mesh(frameM, 'ho:frameStay'),
  ];
  // the atrium's glass front: cool by day, lit warm from inside after dark
  const lobbyGlass = lobbyP.mesh(
    new THREE.MeshStandardMaterial({ color: '#95a3ad', roughness: 0.4, emissive: '#ffd6a0', emissiveIntensity: 0.05 }),
    'ho:lobbyGlass',
  );
  for (const m of [...fading, ...standing, lobbyGlass]) {
    if (!m) continue;
    m.userData.noBatch = true;
    g.add(m);
  }
  const feature = featureWall(g);
  core(root, g);
  // all of the tower stays whole while the lift's cut takes down the wall in front of the car, but its doorway
  // (core.js: the B2 doorway and the plates over the doors are named and left out here)
  g.traverse((o) => o.isMesh && !/^ho:(liftWall|bankSigns)/.test(o.name) && (o.userData.liftKeep = true));
  const occ = { occluders: [] };
  for (const m of front) m.userData.noBatch = true;
  addOccluder(occ, [...fading, lobbyGlass, ...front].filter(Boolean), inLobby, { name: 'ho:upper' });
  // the feature wall fades while he is in the office behind it; its letters go with it (alpha-tested: never hashed)
  const featureOcc = addOccluder(occ, feature.meshes, inOffice, { name: 'ho:feature' });
  const landing = liftLanding(root);
  yield;
  // Kuro behind the desk, facing the door
  const kuro = PEOPLE.kuro();
  kuro.root.scale.multiplyScalar(K);
  const [kx, kz] = at(RECEPTION[0], RECEPTION[1] + 0.65);
  kuro.root.position.set(kx, 0, kz);
  root.add(kuro.root);
  const kb = blob(0.55, 0.35);
  kb.position.set(kx, 0.02, kz);
  root.add(kb);

  // walk grid: the building is solid except the atrium, its door, the office door and the office, less the
  // furniture; the stair and the shafts are a plain block
  const R = 0.2;
  const inRect = (u, n, [u0, u1, n0, n1]) => u > u0 - R && u < u1 + R && n > n0 - R && n < n1 + R;
  const inside = (u, n, [u0, u1, n0, n1]) => u > u0 + R && u < u1 - R && n > n0 + R && n < n1 - R;
  const before = nav.extra;
  nav.extra = (x, z) => {
    if (before && !before(x, z)) return false;
    const [u, n] = inT(x, z);
    if (FURNITURE.some((r) => inRect(u, n, r)) || ROOM_FURNITURE.some((r) => inRect(u, n, r))) return false;
    if (u < -R || u > T.W + R || n < -R || n > T.D + R) return true;
    if (n < 0.5 && u > DOOR_U - DOOR_W / 2 + R && u < DOOR_U + DOOR_W / 2 - R) return true; // the door, into the lobby
    if (u > OFFICE_DOOR[0] + R && u < OFFICE_DOOR[1] - R && n > FW - 0.4 && n < ROOM[2] + 0.4) return true;
    if (inside(u, n, ROOM)) return true;
    return inside(u, n, [0.24, LU - 0.06, 0.16, u < BU[4] ? FW : LN]);
  };
  nav.block(CORE[0], CORE[1], CORE[2], CORE[3]);

  const spot = ([u, n]) => at(u, n);
  let last = null;
  return {
    liftSite: FORECOURT_LIFT_SITE,
    landing,
    kuro,
    door: DOOR,
    entrance: at(DOOR_U, -0.75),
    receptionFront: at(RECEPTION[0], RECEPTION[1] - 0.8),
    kuroAt: [kx, kz],
    labelPrinter: fur.printer, // Kuro's label printer on the desk (places/forecourt.js label_printer)
    // the nooks and the office's spots (places/forecourt.js), [x, z]
    nooks: Object.fromEntries(Object.entries(NOOKS).map(([id, p]) => [id, spot(p)])),
    officeDoor: spot(OFFICE_SPOTS.reception_office_door),
    office: at((ROOM[0] + ROOM[1]) / 2 + 0.3, (ROOM[2] + ROOM[3]) / 2 - 0.15),
    inOffice: (x, z) => inside(...inT(x, z), ROOM),
    top: TOP,
    // for the camera: the lobby's corners and the tower's south-west corner
    lobby: [at(0, 0), at(LU, 0), at(LU, LN), at(0, LN)],
    occluder: occ,
    // fade the upper floors: a jump (a trip, a restored save) snaps, walking in or out fades
    update(pos, dt) {
      const jump = !last || Math.hypot(pos.x - last[0], pos.z - last[1]) > 0.8;
      last = [pos.x, pos.z];
      updateOccluders(occ, pos, jump ? Infinity : dt);
      feature.signs.visible = featureOcc.k > 0.5;
    },
    // after work about a third of the bays are lit, and the atrium glows (for the place's light rig, kit/light/)
    glows: [
      ...[litM, fading[1]?.material].map(
        (m) => m && { mat: m, night: { color: '#cdb48f', emissive: '#ffc98a', emissiveIntensity: 0.5 } },
      ),
      { mat: lobbyGlass.material, night: { emissiveIntensity: 0.55 } },
    ],
  };
}
