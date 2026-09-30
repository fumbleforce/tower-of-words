// Head office at the forecourt: the tower, its canopied entrance and the lobby with the lifts and Kuro's reception.
// Size and place come from the island layout (island-layout.js BUILDINGS head_office): a curtain-wall tower of twelve
// storeys north-east of the station, on the town's grid like the station, the court and the lobby inside it, so every
// wall, the core and the furniture share one set of axes with the camera. Its ground floor is the lobby (south-west
// part), a back office and a closed service block. The lift core stands against the lobby's back wall, facing the
// door: the B2 car (the lift site below, its lid the dark of the core's shafts), a closed second car for 6F-10F and
// the stair door, with the floor directory beside them.
// Everything above the ground floor, and the lobby's glass front above its sill, is one occluder (scenes/occluders.js):
// it fades while Eric is inside the lobby or the lift and comes back when he walks out.
import * as THREE from 'three';
import { mat } from '../props.js';
import { mergeStatic } from './merge-static.js';
import { drain } from '../perf/slice.js';
import { addOccluder, updateOccluders } from './occluders.js';
import { PEOPLE } from '../cast.js';
import { blob } from '../engine.js';
import { K } from './office.js';
import { T, at, inT, GF, LU, LN, DOOR, DOOR_U, DOOR_W, OUT, CZ, CORE, CAP, TOP, parts } from './head-office/frame.js';
import { upper, ground } from './head-office/tower.js';
import { furniture, FURNITURE, RECEPTION, core, liftLanding } from './head-office/lobby.js';

export const FORECOURT_LIFT_SITE = {
  x: OUT[0],
  zBack: CZ - 0.09,
  zFront: CZ + 0.09,
  hole: [OUT[0] - 0.62, OUT[0] + 0.62],
  wallH: GF,
  floor: '1',
  out: [OUT[0], CZ + 0.85],
  cap: true,
  capColor: CAP,
  shaft: true,
};

// Eric in the lobby (past the door's threshold) or in the lift, which stands inside it
const inLobby = (p) => {
  const [u, n] = inT(p.x, p.z);
  return u > 0 && u < LU && n > 0.05 && n < LN + 0.4;
};

// buildHeadOffice() builds it at once; headOfficeSteps() yields between parts (js/perf/slice.js)
export const buildHeadOffice = (root, nav) => drain(headOfficeSteps(root, nav));
export function* headOfficeSteps(root, nav) {
  const g = new THREE.Group(); // the tower's frame
  g.position.set(T.o[0], 0, T.o[1]);
  root.add(g);
  const inner = new THREE.Group();
  furniture(inner);
  g.add(inner);
  mergeStatic(inner);
  yield;
  // the upper floors, the lobby's glass front and the canopy: one occluder in five meshes
  const glassP = parts(),
    litP = parts(),
    frameP = parts();
  upper(glassP, litP, frameP);
  yield;
  const front = ground(g, frameP);
  yield;
  const glassM = () => mat('#8c9dad', { roughness: 0.45, metalness: 0.05 });
  const glass = glassP.mesh(glassM(), 'ho:glass');
  const lit = litP.mesh(glassM(), 'ho:glassLit');
  const frame = frameP.mesh(mat('#b3b9c0'), 'ho:frame');
  for (const m of [glass, lit, frame]) {
    m.userData.noBatch = true;
    g.add(m);
  }
  g.traverse((o) => o.isMesh && (o.userData.liftKeep = true));
  const occ = { occluders: [] };
  for (const m of front) m.userData.noBatch = true;
  addOccluder(occ, [glass, lit, frame, ...front], inLobby, {
    name: 'ho:upper',
  });
  core(root);
  const landing = liftLanding(root);
  yield;
  // Kuro behind the counter, facing the door
  const kuro = PEOPLE.kuro();
  kuro.root.scale.multiplyScalar(K);
  const [kx, kz] = at(RECEPTION[0], RECEPTION[1] + 0.65);
  kuro.root.position.set(kx, 0, kz);
  root.add(kuro.root);
  const kb = blob(0.55, 0.35);
  kb.position.set(kx, 0.02, kz);
  root.add(kb);

  // walk grid: the building is solid except the lobby, its door and the furniture; the core is a plain block
  const R = 0.2;
  const inRect = (u, n, [u0, u1, n0, n1]) => u > u0 - R && u < u1 + R && n > n0 - R && n < n1 + R;
  const before = nav.extra;
  nav.extra = (x, z) => {
    if (before && !before(x, z)) return false;
    const [u, n] = inT(x, z);
    if (FURNITURE.some((r) => inRect(u, n, r))) return false;
    if (u < -R || u > T.W + R || n < -R || n > T.D + R) return true;
    if (n < 0.5 && u > DOOR_U - DOOR_W / 2 + R && u < DOOR_U + DOOR_W / 2 - R) return true; // the door, into the lobby
    return u > 0.18 + R && u < LU - R && n > 0.16 + R && n < LN - R;
  };
  nav.block(CORE[0], CORE[1], CORE[2], CORE[3]);

  let last = null;
  return {
    liftSite: FORECOURT_LIFT_SITE,
    landing,
    kuro,
    door: DOOR,
    entrance: at(DOOR_U, -0.75),
    receptionFront: at(RECEPTION[0], RECEPTION[1] - 0.8),
    kuroAt: [kx, kz],
    top: TOP,
    // for the camera: the lobby's corners and the tower's south-west corner
    lobby: [at(0, 0), at(LU, 0), at(LU, LN), at(0, LN)],
    occluder: occ,
    // fade the upper floors: a jump (a trip, a restored save) snaps, walking in or out fades
    update(pos, dt) {
      const jump = !last || Math.hypot(pos.x - last[0], pos.z - last[1]) > 0.8;
      last = [pos.x, pos.z];
      updateOccluders(occ, pos, jump ? Infinity : dt);
    },
    // after work, about a third of the bays are lit
    onPeriod(period) {
      if (period !== 'evening') return;
      const m = lit.material;
      m.color.set('#cdb48f');
      m.emissive = new THREE.Color('#ffc98a');
      m.emissiveIntensity = 0.5;
      m.needsUpdate = true;
    },
  };
}
