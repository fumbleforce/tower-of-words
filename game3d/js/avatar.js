// Eric, the player: built with the same chibi() as everyone else, matched to the approved portrait
// (proto2/cast-fixed/mc-it-guy-after.webp): short messy dark-blond hair, a short beard, clear glasses with
// dark frames, grey hoodie under a navy blazer, blue lanyard, pale skin, slim.
// Wrapped so the game can drive him like any avatar: setState('idle'|'walk'|'sit'), update(dt), sitAt(...).
import * as THREE from 'three';
import { chibi, sit, walkPose, HIP, TORSO_H, HEAD } from './train/people.js';
import { hull } from './train/hull.js';
import { V } from './train/kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
const mesh = (g) => { const m = new THREE.Mesh(toCreasedNormals(g.build(), 0.7), charMat); m.castShadow = true; m.receiveShadow = true; return m; };

export const ERIC = { skin: '#f6ddcf', hair: '#ad8d5c', beard: '#9a7b52', blazer: '#2d3a58', hoodie: '#8f9298', trousers: '#373c48', shoes: '#4a3a30' };

function beard(rig) {
  // a short beard along the jaw and chin, as a thin shell just outside the lower face
  const { rx, ry, rz, c } = HEAD;
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = -1.05 + (i / 8) * 2.1;              // around the front of the head
    for (const [yy, out] of [[-0.175, 0.006], [-0.215, 0.009], [-0.24, 0.002]]) {
      const k = Math.sqrt(Math.max(0.02, 1 - (yy / ry) ** 2));
      pts.push(V(Math.sin(a) * (rx * k + out), c + yy, Math.cos(a) * (rz * k + out)));
    }
  }
  pts.push(V(0, c - 0.25, rz * 0.4));
  rig.headK.add(mesh(hull(pts.filter((p) => p.z > 0.02), ERIC.beard, { grad: 0.1, name: 'beard' })));
  // moustache
  const ms = [];
  for (let i = 0; i <= 4; i++) { const x = -0.06 + i * 0.03; const z = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (0.09 / ry) ** 2)) * rz; ms.push(V(x, c - 0.09, z + 0.004), V(x, c - 0.11, z + 0.01)); }
  rig.headK.add(mesh(hull(ms, ERIC.beard, { grad: 0, name: 'moustache' })));
}
function tufts(rig) {
  // messy swept-up hair: a few separate wedges on the crown and over the forehead, so it can't read as a hat
  const { rx, ry, rz, c } = HEAD;
  const spots = [[0.0, 0.95, 0.3, 0.1], [0.45, 0.85, 0.35, 0.09], [-0.45, 0.85, 0.3, 0.09], [0.25, 0.7, 0.75, 0.08], [-0.25, 0.72, 0.72, 0.08], [0.0, 0.8, 0.62, 0.085], [0.7, 0.6, 0.1, 0.07], [-0.7, 0.6, 0.05, 0.07]];
  for (const [sx, sy, sz, s] of spots) {
    const n = V(sx, sy, sz).normalize();
    const base = V(n.x * (rx + 0.02), c + n.y * (ry + 0.02), n.z * (rz + 0.02));
    const tip = base.clone().addScaledVector(V(n.x * 0.7, 0.8, n.z * 0.9 + 0.5).normalize(), s * 0.95);
    const side = V(-n.z, 0, n.x).normalize().multiplyScalar(s * 1.05);
    const back = V(n.x, 0, n.z).normalize().multiplyScalar(-s * 0.5);
    const pts = [base.clone().add(side), base.clone().sub(side), base.clone().add(back), base.clone().addScaledVector(n, -0.03), tip];
    rig.headK.add(mesh(hull(pts, ERIC.hair, { grad: 0.18, name: 'tuft' })));
  }
}
function hood(rig) {
  // the hoodie's hood lying round the back of the neck, and its strings
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16), new THREE.MeshStandardMaterial({ color: ERIC.hoodie, roughness: 0.9 }));
  ring.rotation.x = Math.PI / 2; ring.scale.set(1.2, 1, 0.9); ring.position.set(0, TORSO_H - 0.01, -0.02); ring.castShadow = true;
  rig.torso.add(ring);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 5), new THREE.MeshStandardMaterial({ color: '#e8e8e8' })); st.position.set(s * 0.025, TORSO_H - 0.08, 0.092); rig.torso.add(st); }
}
function lanyard(rig) {
  const card = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.09, 0.012, 1, 0.006), new THREE.MeshStandardMaterial({ color: '#eef0f2', roughness: 0.6 }));
  card.position.set(0.0, TORSO_H * 0.36, 0.1); rig.torso.add(card);
  const strap = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.2, 0.01, 1, 0.004), new THREE.MeshStandardMaterial({ color: '#2f5f9a', roughness: 0.7 }));
  strap.position.set(-0.02, TORSO_H * 0.62, 0.097); strap.rotation.z = -0.18; rig.torso.add(strap);
}

export function buildEric() {
  const rig = chibi({
    headK: 0.63, skin: ERIC.skin, top: ERIC.blazer, sleeve: ERIC.blazer, bottom: ERIC.trousers, shirt: ERIC.hoodie, tie: null,
    hair: ERIC.hair, glasses: '#2a2c31', eyes: 'open',
    hairOpts: { messy: 0.16, front: 0.1, vfringe: 0.0, side: -0.02, seed: 88, tufts: [[0.08, 0.3, 0.1], [-0.09, 0.29, 0.06], [0.02, 0.32, -0.02], [0.13, 0.26, 0.12], [-0.13, 0.25, 0.1], [0.0, 0.3, 0.14]] },
    shoes: ERIC.shoes, sole: '#2c2622', torsoW: 0.32,
  });
  beard(rig); tufts(rig); hood(rig); lanyard(rig);
  return rig;
}

// The player avatar: same interface as the Meshy loader returns (root, setState, update, sitAt).
export function makeAvatar() {
  const rig = buildEric();
  const root = new THREE.Group();
  root.add(rig.root);
  let state = 'idle', ph = 0, amt = 0, t = 0;
  const a = {
    root, rig, seated: false, scripted: false,
    setState(s) {
      if (s === state) return;
      if (state === 'sit' && s !== 'sit') { rig.root.position.set(0, 0, 0); for (const l of rig.legs) l.rotation.set(0, 0, 0); for (const k of rig.knees) k.rotation.set(0, 0, 0); for (const r of rig.arms) r.rotation.set(0, 0, 0); }
      state = s;
    },
    get state() { return state; },
    update(dt) {
      t += dt;
      if (state === 'sit') { rig.torso.scale.y = 1 + 0.01 * Math.sin(t * 1.7); return; }
      amt += ((state === 'walk' ? 1 : 0) - amt) * Math.min(1, dt * 10);
      if (state === 'walk') ph += dt * 9.5;
      walkPose(rig, ph, amt);
      if (amt < 0.02) { rig.hips.position.y = HIP; rig.torso.rotation.z = Math.sin(t * 0.5) * 0.02; rig.head.rotation.x = -0.08; rig.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.7); }
    },
    // hips on the seat top at (x, z), facing ry
    sitAt(x, seatTop, z, ry) {
      state = 'sit';
      const k = root.scale.x;
      sit(rig);                                   // poses the legs; sets rig.root.y for the train's seat height
      rig.root.position.y = 0;
      root.position.set(x, seatTop - (HIP - 0.075) * rig.root.scale.y * k + 0.012 * k, z);
      root.rotation.y = ry;
      for (const r of rig.arms) { r.rotation.x = -0.75; } rig.arms[0].rotation.z = 0.28; rig.arms[1].rotation.z = -0.28;
    },
  };
  return a;
}
