// The people's shared frame: the proportions and pivots the scenes pose and hang props on, the poses on them, the
// train passengers' props, and the stand-in for a person whose model is not there. Nobody in the game is built in
// code any more (notes/people-plan.md): the cast and the crowd are Meshy models (cast3d.js, crowd/approved-models.js)
// wrapped to these parts.
import * as THREE from 'three';
import { CHARACTER_SCALE } from '../character-scale.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SEAT_Y } from './car.js';

export const S = 1.15; // a person's scale against the car
const screenMat = new THREE.MeshStandardMaterial({
  color: '#bfe6ff',
  emissive: new THREE.Color('#9fd8ff'),
  emissiveIntensity: 0.9,
  roughness: 0.3,
});

// Proportions (standing, feet at y = 0)
const HIP = 0.32; // hips pivot height
const TORSO_H = 0.31;
const HEAD_K = 0.74; // head scale
const HEAD = { rx: 0.245, ry: 0.222, rz: 0.232, c: 0.225 }; // c: head centre above the neck pivot

// ---------- stand-in ----------
// The parts alone (root, hips, torso, head, headK, arms with a hand, legs, knees), where the old code-built bodies had
// them, with nothing drawn: a seat for the train's passengers until their model takes over (crowd/passengers.js), and
// every person in the Node unit tests, where no model loads. root.userData.standIn names who it stands in for.
export function standIn(who, { headK = HEAD_K, torsoW = 0.31, scale = S } = {}) {
  const root = new THREE.Group();
  root.name = 'stand-in:' + who;
  root.scale.setScalar(scale * CHARACTER_SCALE);
  root.userData.standIn = who;
  const hips = new THREE.Group();
  hips.position.y = HIP;
  root.add(hips);
  const torso = new THREE.Group();
  torso.position.y = 0.02;
  hips.add(torso);
  const head = new THREE.Group();
  head.position.y = TORSO_H;
  torso.add(head);
  const hk = new THREE.Group();
  hk.scale.setScalar(headK);
  head.add(hk);
  const arms = [],
    legs = [],
    knees = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * (torsoW / 2 + 0.01), TORSO_H * 0.82, 0);
    const hand = new THREE.Object3D();
    hand.position.y = -0.255;
    arm.add(hand);
    arm.userData.hand = hand;
    torso.add(arm);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(s * 0.065, -0.03, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.155;
    leg.add(knee);
    hips.add(leg);
    legs.push(leg);
    knees.push(knee);
  }
  return { root, hips, torso, head, headK: hk, arms, legs, knees, ph: 0 };
}

// r's model did not load. In a page that is an error, logged as one (the day test fails on it), and r is never drawn,
// nor anything a scene hangs on it: the player sees nobody there rather than a figure that isn't the person. In Node
// (the unit tests) r stays as it is.
const PAGE = typeof addEventListener === 'function';
export function missing(r, who) {
  if (!PAGE) return r;
  console.error(`${who}: the model did not load, so nobody is drawn in their place`);
  Object.defineProperty(r.root, 'visible', { get: () => false, set() {}, configurable: true });
  return r;
}

// Poses
export function sit(r) {
  r.seated = true;
  if (r.meshy) {
    r.sitHere ? r.sitHere() : r.setState('sit');
    return;
  }
  r.root.position.y = SEAT_Y - (HIP - 0.075) * r.root.scale.y + 0.012;
  for (const l of r.legs) l.rotation.x = -1.5;
  for (const k of r.knees) k.rotation.x = 1.35;
  r.legs[0].rotation.z = 0.04;
  r.legs[1].rotation.z = -0.04;
}
export function armsLap(r) {
  if (r.meshy) return;
  for (const [i, a] of r.arms.entries()) {
    a.rotation.x = -0.75;
    a.rotation.z = (i ? -1 : 1) * 0.28;
  }
}
export function armsHold(r, x = -1.15, z = 0.52) {
  if (r.meshy) return;
  for (const [i, a] of r.arms.entries()) {
    a.rotation.x = x;
    a.rotation.z = (i ? -1 : 1) * z;
  }
}

// small props held in the hands
export function phone() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(
    new RoundedBoxGeometry(0.075, 0.012, 0.12, 2, 0.006),
    new THREE.MeshStandardMaterial({ color: '#2d3240', roughness: 0.4 }),
  );
  const s = new THREE.Mesh(new RoundedBoxGeometry(0.064, 0.004, 0.105, 1, 0.002), screenMat);
  s.position.y = 0.007;
  g.add(b, s);
  return g;
}
export function book() {
  const g = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ color: '#c8584f', roughness: 0.7 });
  const paper = new THREE.MeshStandardMaterial({ color: '#fbf6ea', roughness: 0.9 });
  const left = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.02, 0.15, 1, 0.006), paper);
  left.position.x = -0.058;
  left.rotation.z = 0.12;
  const right = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.02, 0.15, 1, 0.006), paper);
  right.position.x = 0.058;
  right.rotation.z = -0.12;
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.012, 0.16, 1, 0.005), cover);
  back.position.y = -0.016;
  const pagePiv = new THREE.Group();
  const page = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.004, 0.14), paper);
  page.position.x = 0.055;
  pagePiv.add(page);
  pagePiv.position.y = 0.014;
  g.add(left, right, back, pagePiv);
  g.userData.page = pagePiv;
  for (const m of [left, right, back, page]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  return g;
}

// ---------- the passengers of the carriage ----------
// Each passenger is a stand-in in their seat with their act and props; places/train.js puts Hamada and Aoi in the
// first two seats (cast3d.js inSeat), and crowd/passengers.js gives the rest their crowd bodies, moving the props over.
export function buildPassengers(LZ) {
  const list = [];
  const far = -(LZ - 0.24),
    near = LZ - 0.24;
  const add = (r, x, z, faceIn = true) => {
    r.root.position.x = x;
    r.root.position.z = z;
    r.root.rotation.y = z < 0 ? 0 : Math.PI;
    if (!faceIn) r.root.rotation.y += Math.PI;
    list.push(r);
    return r;
  };

  // 1. salaryman asleep, head nodding (Hamada's seat)
  const sleeper = standIn('sleeper');
  sit(sleeper);
  armsLap(sleeper);
  add(sleeper, -2.55, far);
  sleeper.head.rotation.z = 0.2;
  sleeper.act = (t, r) => {
    // slow drift down, a small catch back up every ~7 s
    const c = (t + 2.3) % 7.2,
      drop = c < 6.5 ? c / 6.5 : 1 - (c - 6.5) / 0.7;
    r.head.rotation.x = -0.2 + drop * 0.12 - (c > 6.5 && c < 6.8 ? 0.05 : 0);
    r.head.rotation.z = 0.36 + drop * 0.08 + Math.sin(t * 0.4) * 0.02;
  };

  // 2. woman on her phone (Aoi's seat)
  const phoneW = standIn('phone', { torsoW: 0.28 });
  sit(phoneW);
  armsHold(phoneW, -1.4, 0.5);
  add(phoneW, -1.7, far);
  const ph1 = phone();
  ph1.position.set(0, 0.13, 0.21);
  ph1.rotation.x = 1.1;
  phoneW.torso.add(ph1);
  phoneW.head.rotation.x = -0.18;
  phoneW.act = (t, r) => {
    r.arms[1].rotation.x = -1.4 + Math.max(0, Math.sin(t * 5.1)) * 0.05;
    r.head.rotation.y = Math.sin(t * 0.3) * 0.05;
  };

  // 3. man reading; turns a page now and then. Near bench, right (Jørgen, 2026-10-05: "have the excel guy sit there
  // instead, to give mio the full row"), so Mio has the far bench's right half to herself
  const reader = standIn('reader');
  sit(reader);
  armsHold(reader, -1.05, 0.55);
  add(reader, 1.32, near);
  const bk = book();
  bk.position.set(0, 0.05, 0.2);
  bk.rotation.x = 0.75;
  reader.torso.add(bk);
  reader.head.rotation.x = -0.14;
  reader.act = (t, r) => {
    const c = (t + 1.0) % 6.5;
    const k = c < 0.7 ? c / 0.7 : 0; // page flips over the spine
    bk.userData.page.rotation.z = k > 0 ? Math.PI * (k * k * (3 - 2 * k)) : 0;
    bk.userData.page.visible = k > 0;
    r.head.rotation.x = -0.14 + Math.sin(t * 0.5) * 0.02;
  };

  // 4. someone in headphones, nodding to music
  const music = standIn('music');
  sit(music);
  armsHold(music, -0.95, 0.45);
  add(music, 2.5, far);
  const { rx, c } = HEAD;
  for (const s of [-1, 1]) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: '#e0a44a', roughness: 0.5 }),
    );
    cup.rotation.z = Math.PI / 2;
    cup.position.set(s * (rx + 0.04), c - 0.01, 0);
    cup.castShadow = true;
    music.headK.add(cup);
  }
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(rx + 0.07, 0.016, 6, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.5 }),
  );
  band.position.set(0, c - 0.01, 0);
  music.headK.add(band);
  const ph2 = phone();
  ph2.position.set(0, 0.02, 0.21);
  ph2.rotation.x = 0.6;
  music.torso.add(ph2);
  music.act = (t, r) => {
    const b = Math.max(0, Math.sin(t * Math.PI * 2 * 1.05));
    r.head.rotation.x = -0.3 + b * b * 0.1;
    r.torso.rotation.z = Math.sin(t * Math.PI * 1.05) * 0.015;
  };

  // 5. man standing by the far-right corner, bag in hand, looking out
  const stander = standIn('stander');
  stander.root.position.set(3.58, 0, -0.78);
  stander.root.rotation.y = Math.PI * 0.62;
  stander.arms[0].rotation.z = 0.12;
  stander.arms[1].rotation.x = -0.1;
  const sb = new THREE.Group();
  const sbm = new THREE.Mesh(
    new RoundedBoxGeometry(0.2, 0.15, 0.08, 2, 0.03),
    new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.8 }),
  );
  sbm.position.y = -0.1;
  sbm.castShadow = true;
  sb.add(sbm);
  sb.position.y = -0.24;
  stander.arms[1].add(sb);
  stander.act = (t, r, sway) => {
    r.root.rotation.z = -sway * 1.5;
    r.hips.rotation.y = Math.sin(t * 0.25) * 0.08;
  };
  list.push(stander);

  // 6. near side, from behind: woman with a bun
  const bunW = standIn('bun', { torsoW: 0.28 });
  sit(bunW);
  armsHold(bunW, -1.1, 0.5);
  add(bunW, -0.75, near);
  const ph3 = phone();
  ph3.position.set(0, 0.07, 0.2);
  ph3.rotation.x = 0.9;
  bunW.torso.add(ph3);
  bunW.head.rotation.x = 0.12;
  bunW.act = (t, r) => {
    r.head.rotation.y = -0.8 + Math.sin(t * 0.21 + 1) * 0.15;
  };

  for (const r of list) r.breath = 0.012;
  return list;
}

// walk cycle (phase in radians) and idle
export function walkPose(r, ph, amt) {
  if (r.meshy) {
    if (!r.seated) r.setState(amt > 0.5 ? 'walk' : 'idle');
    return;
  }
  const s = Math.sin(ph);
  r.legs[0].rotation.x = s * 0.6 * amt;
  r.legs[1].rotation.x = -s * 0.6 * amt;
  r.knees[0].rotation.x = Math.max(0, -Math.cos(ph)) * 0.5 * amt;
  r.knees[1].rotation.x = Math.max(0, Math.cos(ph)) * 0.5 * amt;
  r.arms[0].rotation.x = -s * 0.5 * amt;
  r.arms[1].rotation.x = s * 0.5 * amt;
  r.arms[0].rotation.z = 0.1;
  r.arms[1].rotation.z = -0.1;
  r.hips.position.y = HIP + Math.abs(Math.cos(ph)) * 0.025 * amt;
  r.torso.rotation.y = s * 0.08 * amt;
  r.head.rotation.x = 0.06 - Math.abs(Math.cos(ph)) * 0.02 * amt;
}
export { HIP, TORSO_H, HEAD };
