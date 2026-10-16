// The people of the lobby, the office and the other places: the named cast's Meshy models (cast3d.js), a copy for
// each place that builds them. A model that did not load gives a stand-in that is never drawn, with an error logged
// (train/people.js missing); in the Node unit tests, where no model loads, the plain stand-in. The office workers are
// the approved crowd bodies (crowd/office-workers.js, crowd/bodies.js), and PEOPLE.worker is only their stand-in.
import * as THREE from 'three';
import { sit, armsLap, armsHold, walkPose, phone, HIP, standIn, missing } from './train/people.js';
import { LOOK } from './look/flags.js';
import { mug as detailMug } from './look/detail.js';
import { meshy3 } from './cast3d.js';

export { sit, armsLap, armsHold, walkPose, HIP };

export function mug(color = '#e9e6df') {
  if (LOOK.detail) return detailMug(color, { centre: true }); // a rim, a handle and coffee (look/detail.js)
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.036, 0.08, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
  );
  m.castShadow = true;
  return m;
}

// Smaller heads (2.8 to 3 heads tall) for the people in the lobby and the office (Jørgen), as the stand-ins' frame
const HK = 0.63;
const nobody = (who) => missing(standIn(who, { headK: HK }), who);
const person = (id) => meshy3(id) ?? nobody(id);
export const PEOPLE = {
  aoi: () => person('aoi'),
  emi: () => person('emi'),
  kuro: () => person('kuro'),
  rei: () => person('rei'),
  guard: () => person('guard'),
  kuroda: () => person('kuroda'),
  kenji: () => person('kenji'),
  mori: () => person('mori'),
  // a background office worker whose crowd body did not load
  worker: (i = 0) => nobody(`office worker ${i}`),
};

// idle life: breathing and small head turns
export function idle(r, t) {
  r.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.7 + r.ph);
}
export { phone };
