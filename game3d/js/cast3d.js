// The 3D cast from the Meshy workflow (tools/characters/, assets/characters/<id>/), wrapped so the scenes can treat
// them like the code-built people of cast.js. Their files load once, and every place that builds the person gets its
// own copy.
import * as THREE from 'three';
import { HIP, missing } from './train/people.js';
import { SEAT_Y } from './train/car.js';
import { seatOffset } from './train/seat-fit.js';
import { clone } from '../vendor/utils/SkeletonUtils.js';
import { meshyFiles, meshyFrom } from './avatar.js';

// Standing heights next to Mio (1.12) and Eric (1.2). While a model waits for Jørgen's approval it only loads with
// ?cast3d=<id>[,<id>]; approved ids go in CAST3D_ON.
export const CAST3D = {
  mori: 1.09,
  kenji: 1.12,
  guard: 1.09,
  kuroda: 1.09,
  kuro: 1.12,
  aoi: 1.09,
  emi: 1.09,
  rei: 1.12,
};
// Kuro: Review kuro-meshy-orig-3 (Jørgen, 2026-10-04: "Yes, very good"); Aoi and Emi: Reviews aoi-meshy-1 and
// emi-meshy-1, round 2; the staff from Reviews <id>-meshy-1, made the same way (Jørgen, 2026-10-05: "can you also
// kick off the remaining staff and background characters in the new style"); Kenji is round 2 (kenji-2), after
// Jørgen's "he is too slim, doesnt look like himself" on kenji-1; Rei is rei-1 on a new rig of ours (Jørgen: "model good,
// rig terrible"; art/candidates/rei-rig-1)
const CAST3D_ON = ['kuro', 'aoi', 'emi', 'mori', 'guard', 'kuroda', 'kenji', 'rei'];
const Q3 = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
// only in a page: the unit tests import the cast in Node, where nobody loads
const PAGE = typeof addEventListener === 'function';
const want3 = [...CAST3D_ON, ...(Q3.get('cast3d') || '').split(',')].filter((id) => PAGE && CAST3D[id]);
// The Meshy cast has no phone pose or library gestures: their scenes use the drawn ones (rig-gestures.js)
const NO_EXTRAS = ['kuro', 'aoi', 'emi', 'mori', 'kenji', 'guard', 'kuroda', 'rei'];
// Hand bones scaled at load (Jørgen on aoi-1: "her hands are larger than the others"; at 0.75 hers are between Kuro's
// and Mio's, art/candidates/aoi-emi-meshy-2/hand_area.py); the rest is as Meshy made her
// The guard's came out larger still (0.139 of his height, Eric's 0.107; aoi-emi-meshy-2/hands.py): 0.75 brings them to Eric's
const HANDS = { aoi: 0.75, guard: 0.75 };
const PRE3 = {};
const warn = (id) => (e) => {
  console.warn('3D cast', id, e);
  return null;
};
await Promise.all(
  want3.map(
    async (id) =>
      (PRE3[id] = await meshyFiles(id, {
        extra: !NO_EXTRAS.includes(id),
      }).catch(warn(id))),
  ),
);
// Wrap a loaded Meshy character so the scenes can treat it like a code-built rig: the pose helpers (sit, walkPose,
// arms...) switch its clips instead, the parts they write to are harmless stand-ins (the head follows the real head bone,
// for labels and look-at), `seated` picks sit or idle, and it updates itself each frame it's drawn.
export function meshyPerson(m) {
  const O = () => new THREE.Object3D();
  m.legs = [O(), O()];
  m.knees = [O(), O()];
  m.arms = [O(), O()];
  m.torso = O();
  m.hips = O();
  m.hips.position.y = HIP;
  let hb = null;
  m.model.traverse((o) => {
    if (!hb && o.isBone && /^head$/i.test(o.name)) hb = o;
  });
  m.head = O();
  (hb || m.root).add(m.head);
  // the lap when seated, for things a place puts there (Rei's laptop on the train); the stand-ins above are not drawn
  if (m.sitHip) {
    m.lap = O();
    m.lap.position.set(0, m.sitHip.y + 0.03, 0);
    m.root.add(m.lap);
  }
  m.headK = O();
  let last = null;
  const bones = {};
  m.model.traverse((o) => o.isBone && /^(Head|Spine|Spine02)$/.test(o.name) && (bones[o.name] ??= o));
  // m.lean = { head: [forward, side], spine: forward } (radians, about the body's own axes) bends the head and upper
  // back over whatever the clip did this frame: Hamada asleep on the train (places/train.js); null leaves the clip
  m.lean = null;
  // m.sitLean = [waist, head] (radians forward) sits a body up off a bench back while it is seated: the sit clip
  // leans back, and Aoi's bob went into the train's bench back (#672). inSeat sets it from the seat's fit.
  m.sitLean = null;
  const sks = [];
  m.model.traverse((o) => o.isSkinnedMesh && sks.push(o));
  // on the game's clock, which moves them (a sped-up or paused game, a slow frame): on the wall clock their steps
  // fell behind or ran ahead of their feet; the wall clock only where there is no game (a viewer)
  // (on every mesh: the first drawn in a frame steps it)
  const step = () => {
    const G = globalThis.__game,
      now = G ? G.t : performance.now() / 1000;
    if (last !== null && now >= last && now - last < 0.004) return;
    const dt = last !== null && now > last ? Math.min(G ? 0.5 : 0.1, now - last) : 0;
    last = now;
    if (m.seated && m.state !== 'sit') m.sitHere();
    else if (m.seated === false && m.state === 'sit') {
      m.setState('idle');
      m.root.position.y = 0;
    }
    m.update(dt);
    if (m.sitLean && m.state === 'sit') {
      bend(m.root, bones.Spine02 || bones.Spine, 'x', m.sitLean[0]);
      bend(m.root, bones.Head, 'x', m.sitLean[1]);
    }
    if (m.lean) leanOver(m, bones);
  };
  for (const sk of sks) sk.onBeforeRender = step;
  m.stepNow = step; // a gesture tween takes the frame's step first (rig-gestures.js boneTween)
  // seat the hips on the chair under the root (train and office seats: SEAT_Y), keeping x, z and facing
  m.sitHere = () => {
    m.sitAt(m.root.position.x, SEAT_Y, m.root.position.z, m.root.rotation.y, m.seatLegs);
  };
  return m;
}
// turn a bone by `a` radians about one of the body's axes ('x' side, 'z' forward), as rig-gestures.js turn()
const _pw = new THREE.Quaternion(),
  _r = new THREE.Quaternion(),
  _mq = new THREE.Quaternion(),
  _ax = new THREE.Vector3();
function bend(root, b, axis, a) {
  if (!b || !a) return;
  root.getWorldQuaternion(_mq);
  _ax.set(axis === 'x' ? 1 : 0, 0, axis === 'z' ? 1 : 0).applyQuaternion(_mq);
  b.parent.updateWorldMatrix(true, false);
  b.parent.getWorldQuaternion(_pw);
  _r.setFromAxisAngle(_ax, a);
  b.quaternion.premultiply(_pw.clone().invert().multiply(_r).multiply(_pw));
}
function leanOver(m, bones) {
  const { head = [0, 0], spine = 0 } = m.lean;
  bend(m.root, bones.Spine, 'x', spine);
  bend(m.root, bones.Head, 'x', head[0]);
  bend(m.root, bones.Head, 'z', head[1]);
}
export const meshy3 = (id) => {
  const p = PRE3[id];
  if (!p) return null;
  // a copy for each place that builds the person (Aoi is in the lobby and the office; each scales its own), its height
  // measured once on the loaded original (a fresh clone's skinned bounds come out a hundredth of the size)
  const [walk, ...rest] = p;
  p.size ??= new THREE.Box3().setFromObject(walk.scene).getSize(new THREE.Vector3()).y;
  const m = meshyFrom(id, [{ ...walk, scene: clone(walk.scene) }, ...rest], {
    height: CAST3D[id],
    size: p.size,
  });
  const hands = [];
  if (HANDS[id]) m.model.traverse((o) => o.isBone && /^(Left|Right)Hand$/.test(o.name) && hands.push(o));
  if (hands.length) {
    const update = m.update; // after each clip step, which would set them back
    m.update = (...a) => {
      update(...a);
      for (const h of hands) h.scale.setScalar(HANDS[id]);
    };
  }
  return meshyPerson(m);
};

// A Meshy model in a passenger's seat (train/people.js buildPassengers), facing the same way, with an optional act
// (train.js) and the seat's fit (train/seat-fit.js: the hips' offset and where the legs go); the stand-in, never drawn,
// if the model did not load
export function inSeat(id, r, act, fit = null) {
  const m = meshy3(id);
  if (!m) return missing(r, id);
  const [dx, dz] = fit ? seatOffset(r.root.rotation.y, fit.fwd) : [0, 0];
  m.root.position.set(r.root.position.x + dx, 0, r.root.position.z + dz);
  m.root.rotation.copy(r.root.rotation);
  m.seated = true;
  m.seatLegs = fit ? fit.legs : null;
  m.sitLean = fit?.lean ?? null;
  if (act) m.act = act;
  return m;
}
// asleep in a seat (Hamada on the train): the head drops slowly and catches itself every ~7 s, as the code-built
// sleeper's act; the place clears it with the act when he wakes
export function dozing(t, r) {
  const c = (t + 2.3) % 7.2,
    drop = c < 6.5 ? c / 6.5 : 1 - (c - 6.5) / 0.7;
  r.lean = { head: [0.35 + drop * 0.25 - (c > 6.5 && c < 6.8 ? 0.08 : 0), 0.3 + drop * 0.08], spine: 0.12 };
}
