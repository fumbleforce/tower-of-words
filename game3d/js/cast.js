// The people of the lobby and the office, built with the train's chibi() so everyone matches the car.
// Colours follow the muted palette: navy and charcoal suits, a few warm hair colours to tell people apart.
import * as THREE from 'three';
import { chibi, sit, armsLap, armsHold, walkPose, phone, SKINS, HIP, TORSO_H, HEAD } from './train/people.js';
import { hull } from './train/hull.js';
import { V } from './train/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
const mesh = (geo) => { const m = new THREE.Mesh(toCreasedNormals(geo.build(), 0.7), charMat); m.castShadow = true; m.receiveShadow = true; return m; };

export { sit, armsLap, armsHold, walkPose, HIP };

// a peaked guard cap: crown, band and a short brim, sitting over the hair
function guardCap(r) {
  const { rx, ry, rz, c } = HEAD;
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    for (const [y, k] of [[c + ry * 0.35, 1.0], [c + ry * 0.72, 1.08], [c + ry * 1.02, 1.1]]) pts.push(V((rx + 0.05) * k * Math.sin(a), y, (rz + 0.05) * k * Math.cos(a) + (y > c + ry ? 0.02 : 0)));
  }
  r.headK.add(mesh(hull(pts, '#343b4c', { grad: 0.2, name: 'cap' })));
  r.headK.add(mesh(hull([[-0.17, c + ry * 0.36, 0.2], [0.17, c + ry * 0.36, 0.2], [-0.14, c + ry * 0.3, 0.36], [0.14, c + ry * 0.3, 0.36], [-0.17, c + ry * 0.42, 0.2], [0.17, c + ry * 0.42, 0.2], [0, c + ry * 0.33, 0.38]], '#1b2233', { grad: 0.05, name: 'brim' })));
  const badge = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.06, 0.02, 1, 0.01), new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.4, metalness: 0.3 }));
  badge.position.set(0, c + ry * 0.62, rz + 0.1); r.headK.add(badge);
}

// small lanyard card on the chest
function lanyard(r, col = '#3e7fa6') {
  const card = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.09, 0.012, 1, 0.006), new THREE.MeshStandardMaterial({ color: '#eef0f2', roughness: 0.6 }));
  card.position.set(0.03, TORSO_H * 0.42, 0.1); r.torso.add(card);
  const strap = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.16, 0.01, 1, 0.004), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }));
  strap.position.set(0.015, TORSO_H * 0.66, 0.098); strap.rotation.z = 0.2; r.torso.add(strap);
}

// a high ponytail: a tapered hull from the crown down the back
function ponytail(r, col) {
  const { rx, ry, rz, c } = HEAD;
  const pts = [[-0.07, c + ry * 0.8, -rz * 0.7], [0.07, c + ry * 0.8, -rz * 0.7], [0, c + ry * 0.95, -rz * 0.6], [-0.06, c + ry * 0.55, -rz - 0.08], [0.06, c + ry * 0.55, -rz - 0.08], [-0.05, c - 0.1, -rz - 0.14], [0.05, c - 0.1, -rz - 0.14], [0, c - 0.32, -rz - 0.1]];
  r.headK.add(mesh(hull(pts, col, { grad: 0.2, name: 'tail' })));
}

export function briefcase() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.17, 0.07, 2, 0.025), new THREE.MeshStandardMaterial({ color: '#2c2f38', roughness: 0.7 }));
  m.position.y = -0.1; m.castShadow = true; g.add(m);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 5, 8, Math.PI), new THREE.MeshStandardMaterial({ color: '#1e2027' })); h.position.y = -0.01; g.add(h);
  return g;
}
export function mug(color = '#e9e6df') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.08, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
  m.castShadow = true; return m;
}

// Jørgen: smaller heads (2.8 to 3 heads tall) for the people in the lobby and the office
export const HK = 0.63;
export const PEOPLE = {
  aoi: () => {
    const r = chibi({ headK: HK, skin: SKINS[3], top: '#3a4256', sleeve: '#3a4256', bottom: '#2f3446', legs: '#2f3446', skirt: true, shin: '#e9c9b5', shirt: '#eef0f2', tie: '#9a4a55', hair: '#e89fae', blush: '#f2b4ab', hairOpts: { locks: 0.17, long: 0.26, front: 0.06, vfringe: 0.035, seed: 7 }, shoes: '#3b2e2c', sole: '#3b2e2c', torsoW: 0.28 });
    lanyard(r, '#b0506a');
    return r;
  },
  guard: () => {
    const r = chibi({ headK: HK, skin: SKINS[1], top: '#3e4556', sleeve: '#3e4556', bottom: '#2e3342', shirt: '#b3bccb', tie: '#1d2436', hair: '#2a2723', hairOpts: { front: 0.02, side: -0.1, seed: 5 }, shoes: '#1f2128', sole: '#1f2128' });
    guardCap(r);
    return r;
  },
  briefcaseMan: () => {
    const r = chibi({ headK: HK, skin: SKINS[0], top: '#2f3548', sleeve: '#2f3548', bottom: '#2a2f40', shirt: '#e8ebef', tie: '#3f5a86', hair: '#1f2229', glasses: '#22252c', hairOpts: { messy: 0.07, front: 0.065, vfringe: 0.03, seed: 17, tufts: [[0.08, 0.27, 0.02], [-0.07, 0.27, -0.04]] }, shoes: '#222', sole: '#222' });
    const b = briefcase(); b.position.y = -0.25; r.arms[0].add(b);
    return r;
  },
  rei: () => {
    // Sales: long silver-grey hair in a high ponytail, white suit over a black shirt
    const r = chibi({ headK: HK, skin: SKINS[0], top: '#e9e7e2', sleeve: '#e9e7e2', bottom: '#dcd9d3', legs: '#dcd9d3', shirt: '#1d1f24', hair: '#c3c7cf', blush: '#efb3a8', hairOpts: { front: 0.06, vfringe: 0.025, locks: 0.12, seed: 71 }, shoes: '#2a2626', sole: '#2a2626', torsoW: 0.28 });
    ponytail(r, '#c3c7cf');
    lanyard(r, '#c9a64a');
    return r;
  },
  kuro: () => {
    // the receptionist: black hair in a high bun, black-framed glasses, receptionist blazer
    const r = chibi({ headK: HK, skin: SKINS[0], top: '#2b2e36', sleeve: '#2b2e36', bottom: '#2b2e36', skirt: true, shin: '#e3c3ae', shirt: '#1d1f24', hair: '#16171b', glasses: '#111216', blush: '#efb3a8', hairOpts: { bun: true, front: 0.06, vfringe: 0.02, seed: 61 }, shoes: '#1d1f24', sole: '#1d1f24', torsoW: 0.28 });
    lanyard(r, '#7a5a8c');
    return r;
  },
  kuroda: () => {
    // the sleeper from the train, awake now
    const r = chibi({ headK: HK, skin: SKINS[1], top: '#2f3a55', bottom: '#2c354d', shirt: '#eef1f5', tie: '#8a3b46', hair: '#5a3e2f', hairOpts: { messy: 0.08, front: 0.065, vfringe: 0.03, seed: 4 }, shoes: '#2a2524', sole: '#2a2524' });
    const b = briefcase(); b.position.y = -0.25; r.arms[0].add(b);
    return r;
  },
  emi: () => {
    const r = chibi({ headK: HK, skin: SKINS[0], top: '#4a5068', sleeve: '#4a5068', bottom: '#343a4d', legs: '#343a4d', skirt: true, shin: '#e3c3ae', shirt: '#f2efe8', hair: '#9b4a33', blush: '#f0ada2', glasses: '#6d4f40', hairOpts: { locks: 0.2, front: 0.06, vfringe: 0.02, seed: 23, back: -0.26 }, shoes: '#2a2626', sole: '#2a2626', torsoW: 0.28 });
    lanyard(r, '#3e7fa6');
    return r;
  },
  kenji: () => {
    const r = chibi({ headK: HK, skin: SKINS[2], top: '#eef0f3', sleeve: '#eef0f3', bottom: '#30364a', shirt: null, hair: '#231f1f', hairOpts: { messy: 0.11, front: 0.06, vfringe: 0.03, seed: 41, tufts: [[0.09, 0.27, 0.0], [-0.08, 0.27, -0.03], [0.0, 0.29, -0.09]] }, shoes: '#2a2524', sole: '#2a2524' });
    r.torso.add(mesh(hull([[-0.015, TORSO_H - 0.005, 0.088], [0.015, TORSO_H - 0.005, 0.088], [0.02, TORSO_H - 0.11, 0.088], [0, TORSO_H - 0.13, 0.09], [-0.02, TORSO_H - 0.11, 0.088], [0, TORSO_H - 0.06, 0.1]], '#35507c', { grad: 0, name: 'tie' })));
    lanyard(r);
    return r;
  },
  mori: () => {
    const r = chibi({ headK: HK, skin: SKINS[1], top: '#2b3040', sleeve: '#2b3040', bottom: '#262b39', shirt: '#e8ebef', tie: '#7a2f3a', hair: '#a2a6ad', glasses: '#2a2c31', hairOpts: { front: 0.075, side: -0.04, seed: 3 }, shoes: '#1d1d1f', sole: '#1d1d1f' });
    return r;
  },
  yui: () => {
    const r = chibi({ headK: HK, skin: SKINS[3], top: '#8e9bb0', sleeve: '#8e9bb0', bottom: '#3a4052', shirt: '#f3f1ec', hair: '#c79b6d', blush: '#f2b4ab', hairOpts: { front: 0.05, vfringe: 0.03, bun: true, locks: 0.1, seed: 13 }, shoes: '#e8e6e0', sole: '#bfbcb4', torsoW: 0.28 });
    lanyard(r, '#6c8a5c');
    return r;
  },
  sota: () => {
    const r = chibi({ headK: HK, skin: SKINS[0], top: '#5d6b62', sleeve: '#5d6b62', bottom: '#3b3f4a', shirt: '#eef0f3', hair: '#4a3a33', glasses: '#2b2f3a', hairOpts: { front: 0.06, messy: 0.05, seed: 29 }, shoes: '#3b2e2c', sole: '#3b2e2c' });
    lanyard(r);
    return r;
  },
  worker: (i = 0) => {
    const hairs = ['#2c2622', '#3a2f2a', '#1f2229'], tops = ['#eef0f3', '#e6e9ee', '#dfe3ea'];
    const r = chibi({ headK: HK, skin: SKINS[i % 4], top: tops[i % 3], sleeve: tops[i % 3], bottom: '#2e3446', shirt: null, hair: hairs[i % 3], hairOpts: { messy: 0.1, front: 0.06, seed: 50 + i }, shoes: '#222', sole: '#222' });
    return r;
  },
};

// idle life: breathing and small head turns
export function idle(r, t) {
  r.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.7 + r.ph);
}
export { phone };
