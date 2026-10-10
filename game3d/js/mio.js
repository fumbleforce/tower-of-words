// Legacy Mio body and motion.
import * as THREE from 'three';
import { CHARACTER_SCALE } from './character-scale.js';
import { loadRelaxedIdle } from './relaxed-idle.js';
import { makeGait, holdNow } from './movement/gait.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { loadSkin } from './perf/skin-tex.js';

const DIR = new URL('../assets/mio/', import.meta.url).href;
export const V = () => '?v=' + encodeURIComponent(window.BUILD || '');
const HELD = 1e-6;

// Region colours (sRGB). The model's navy shades differ only slightly; each face keeps its shade relative
// to the mean navy, so the planes still read.
export const MIO_COLOURS = {
  hair: '#13292f', // dark green bordering on black, sampled from her portrait (proto2/cast-fixed/mio-after.webp)
  hoodie: '#09232a', // dark green hoodie, sampled from her portrait (proto2/cast-fixed/mio-after.webp)
  trousers: '#3b4152', // dark charcoal cargo trousers
  shoes: '#3d4658', // dark part of the sneakers
  teal: '#20a081', // the lighter green underneath, sampled from the same portrait
  tealDark: '#188066',
  skin: null, // unchanged
  white: '#f3f1ec', // sneaker soles and trim, a touch warmer
};

function plainFace(mesh, faces, palette) {
  const g = mesh.geometry,
    pos = g.attributes.position,
    idx = g.index.array;
  const si = g.attributes.skinIndex,
    sw = g.attributes.skinWeight;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const headBones = new Set([names.indexOf('mixamorigHead'), names.indexOf('headfront')]);
  const skin = palette.reduce((a, c) => (c[0] - c[2] > a[0] - a[2] ? c : a)).join();
  const map = new Map(),
    uid = new Int32Array(pos.count),
    groups = [];
  for (let i = 0; i < pos.count; i++) {
    const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(4)).join();
    if (!map.has(k)) {
      map.set(k, groups.length);
      groups.push([]);
    }
    uid[i] = map.get(k);
    groups[uid[i]].push(i);
  }
  const P = groups.map((gr) => new THREE.Vector3().fromBufferAttribute(pos, gr[0]));
  const N = P.map(() => new THREE.Vector3());
  const onFace = new Uint8Array(P.length),
    onOther = new Uint8Array(P.length);
  const e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (let f = 0; f < idx.length / 3; f++) {
    const [a, b, d] = [uid[idx[f * 3]], uid[idx[f * 3 + 1]], uid[idx[f * 3 + 2]]];
    e1.subVectors(P[b], P[a]);
    e2.subVectors(P[d], P[a]);
    const n = e1.cross(e2);
    c.copy(P[a]).add(P[b]).add(P[d]).divideScalar(3);
    const col = faces[f];
    const isFace = col ? col.join() === skin : Math.abs(c.x) < 0.31 && c.y < 1.8 && n.z > 0.3 * n.length();
    for (const u of [a, b, d]) {
      N[u].add(n);
      if (isFace) onFace[u] = 1;
      else onOther[u] = 1;
    }
  }
  const sel = [];
  for (let u = 0; u < P.length; u++) {
    const i = groups[u][0];
    let bi = 0;
    for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, bi)) bi = k;
    const p = P[u],
      n = N[u].normalize();
    if (
      headBones.has(si.getComponent(i, bi)) &&
      onFace[u] &&
      n.z > 0.45 &&
      p.y > 1.38 &&
      p.y < 1.87 &&
      Math.abs(p.x) < 0.36 &&
      p.z > 0.25
    )
      sel.push(u);
  }
  const Y0 = 1.65,
    basis = (p) => [1, p.y - Y0, (p.y - Y0) ** 2, p.x * p.x];
  const A = [0, 1, 2, 3].map(() => [0, 0, 0, 0, 0]);
  for (const u of sel) {
    const r = basis(P[u]);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) A[i][j] += r[i] * r[j];
      A[i][4] += r[i] * P[u].z;
    }
  }
  for (let i = 0; i < 4; i++) {
    let m = i;
    for (let k = i + 1; k < 4; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
    [A[i], A[m]] = [A[m], A[i]];
    for (let k = 0; k < 4; k++)
      if (k !== i) {
        const t = A[k][i] / A[i][i];
        for (let j = i; j < 5; j++) A[k][j] -= t * A[i][j];
      }
  }
  const coef = A.map((r, i) => r[4] / r[i]);
  const k = 0.3,
    mx2 = sel.reduce((s, u) => s + P[u].x ** 2, 0) / sel.length;
  coef[0] += (1 - k) * coef[3] * mx2;
  coef[3] *= k;
  const kv = 0.3,
    my2 = sel.reduce((s, u) => s + (P[u].y - Y0) ** 2, 0) / sel.length;
  coef[0] += (1 - kv) * coef[2] * my2;
  coef[2] *= kv;
  const surf = (p) => basis(p).reduce((s, v, i) => s + v * coef[i], 0);
  for (const u of sel) {
    const p = P[u];
    const r = Math.hypot(p.x / 0.31, (p.y - Y0) / 0.22);
    const w = onOther[u] ? 0 : 1 - THREE.MathUtils.smoothstep(r, 0.85, 1.1);
    const z = p.z + w * (surf(p) - p.z);
    for (const i of groups[u]) pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
}

function reshapeJaw(mesh) {
  const g = mesh.geometry,
    pos = g.attributes.position,
    si = g.attributes.skinIndex,
    sw = g.attributes.skinWeight;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const head = new Set([names.indexOf('mixamorigHead'), names.indexOf('headfront')]);
  const map = new Map(),
    groups = [];
  for (let i = 0; i < pos.count; i++) {
    const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(4)).join();
    if (!map.has(k)) {
      map.set(k, groups.length);
      groups.push([]);
    }
    groups[map.get(k)].push(i);
  }
  const dom = (i) => {
    let bi = 0;
    for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, bi)) bi = k;
    return si.getComponent(i, bi);
  };
  const V = groups.map((gr) => ({
    gr,
    p: new THREE.Vector3().fromBufferAttribute(pos, gr[0]),
    head: head.has(dom(gr[0])),
  }));
  const EYE = 1.62,
    L = 1.08,
    CH = 0.8;
  const low = V.filter((v) => v.head && v.p.y < EYE && v.p.z > -0.1);
  const front = low.filter((v) => v.p.z > 0.28);
  const minY = Math.min(...front.map((v) => v.p.y));
  const tip = front.filter((v) => Math.abs(v.p.x) < 0.08 && v.p.y < minY + 0.02);
  const side = front
    .filter((v) => Math.abs(v.p.x) > 0.08 && Math.abs(v.p.x) < 0.25 && v.p.y < minY + 0.12)
    .sort((a, b) => a.p.y - b.p.y)
    .slice(0, 2);
  const jawY = side.length ? side.reduce((s, v) => s + v.p.y, 0) / side.length : minY;
  const lift = tip.length ? CH * Math.max(0, jawY - tip[0].p.y) : 0;
  for (const v of tip) v.p.y += lift;
  for (const v of low)
    if (!tip.includes(v) && Math.abs(v.p.x) < 0.08 && v.p.z > 0.12 && v.p.z <= 0.28 && v.p.y < minY + 0.05)
      v.p.y += lift * 0.5;
  for (const v of low) v.p.y = EYE - (EYE - v.p.y) * L;
  for (const v of V)
    if (v.head && v.p.z > -0.1 && v.p.y < EYE)
      for (const i of v.gr) {
        pos.setY(i, v.p.y);
        pos.setZ(i, v.p.z);
      }
  pos.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
}

// region of a triangle from its vertices' strongest bones
export let HEM = 0.8,
  COLLAR = 1.36;
export function setCollar(v) {
  COLLAR = v;
}
export let HEM_ = 0; // hoodie hem height in model units (the body is skinned to the hips above and below it)
export function setHem(v) {
  HEM = v;
}
function regionOf(boneName, y) {
  const n = boneName.replace(/mixamorig:?/, '');
  if (/Head|headfront|HeadTop/i.test(n)) return y > COLLAR ? 'hair' : 'hoodie';
  if (/Neck/i.test(n)) return y > COLLAR ? 'hair' : 'hoodie';
  if (/Foot|Toe/i.test(n)) return 'shoes';
  if (/^(Left|Right)Leg/i.test(n)) return 'trousers';
  if (/UpLeg|Hips|Spine/i.test(n)) return y > HEM ? 'hoodie' : 'trousers';
  return 'hoodie';
}

const lin = (v) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const hexLin = (h) => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
}; // THREE.Color stores linear

function recolour(mesh, data, colours) {
  // classify palette entries
  const pal = data.palette;
  const key = (c) => c.join();
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const skin = pal.reduce((a, c) => (c[0] - c[2] > a[0] - a[2] ? c : a));
  const cls = new Map();
  const navy = [];
  for (const c of pal) {
    if (key(c) === key(skin)) cls.set(key(c), 'skin');
    else if (lum(c) > 200) cls.set(key(c), 'white');
    else if (c[1] > c[0] + 40 && lum(c) > 90) cls.set(key(c), 'teal');
    else if (c[1] > c[0] + 40) cls.set(key(c), 'tealDark');
    else {
      cls.set(key(c), 'navy');
      navy.push(c);
    }
  }
  const navyMean = navy.reduce((s, c) => s + lum(c), 0) / navy.length;
  const g = mesh.geometry,
    idx = g.index.array,
    si = g.attributes.skinIndex,
    sw = g.attributes.skinWeight;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const out = [],
    tints = [];
  const pos = g.attributes.position;
  const regionOfFace = (f) => {
    const votes = {};
    const cy = (pos.getY(idx[f * 3]) + pos.getY(idx[f * 3 + 1]) + pos.getY(idx[f * 3 + 2])) / 3;
    for (let v = 0; v < 3; v++) {
      const i = idx[f * 3 + v];
      let bi = 0;
      for (let q = 1; q < 4; q++) if (sw.getComponent(i, q) > sw.getComponent(i, bi)) bi = q;
      const r = regionOf(names[si.getComponent(i, bi)] || '', cy);
      votes[r] = (votes[r] || 0) + 1;
    }
    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  };
  // the eye band on the face front: textured triangles here are never tinted, so the eyes, lashes and brows
  // keep their exact colours
  const eyeBand = (f) => {
    let x = 0,
      y = 0,
      z = 0;
    for (let v = 0; v < 3; v++) {
      const i = idx[f * 3 + v];
      x += pos.getX(i) / 3;
      y += pos.getY(i) / 3;
      z += pos.getZ(i) / 3;
    }
    return z > 0.2 && y > 1.4 && y < 1.76 && Math.abs(x) < 0.33;
  };
  data.faces.forEach((c, f) => {
    if (!c) {
      out.push(null);
      if (!colours || eyeBand(f)) {
        tints.push(null);
        return;
      }
      tints.push(hexLin(colours[regionOfFace(f)]));
      return;
    }
    tints.push(null);
    const k = cls.get(key(c));
    if (!colours) out.push([lin(c[0]), lin(c[1]), lin(c[2])]);
    else if (k === 'navy') {
      const base = hexLin(colours[regionOfFace(f)]);
      const s = Math.pow(lum(c) / navyMean, 2.2);
      out.push(base.map((x) => x * s));
    } else if (colours[k]) out.push(hexLin(colours[k]));
    else out.push([lin(c[0]), lin(c[1]), lin(c[2])]);
  });
  return { cols: out, tints, navyLum: lin(navyMean) };
}

// The chair clip rocks forward and back (Jørgen: "looks like they are constantly bending over to throw up").
// Hold one calm frame instead: sample the clip and keep the time where the head sits furthest back over the hips.
export function calmSitTime(model, mixer, action) {
  const head = (() => {
    let h = null;
    model.traverse((o) => {
      if (!h && o.isBone && /head$/i.test(o.name.replace(/[^a-z]/gi, ''))) h = o;
    });
    return h;
  })();
  const hips = (() => {
    let h = null;
    model.traverse((o) => {
      if (!h && o.isBone && /hips/i.test(o.name)) h = o;
    });
    return h;
  })();
  if (!head || !hips) return 0;
  const d = action.getClip().duration,
    a = new THREE.Vector3(),
    b = new THREE.Vector3();
  action.reset().play();
  action.setEffectiveWeight(1);
  let best = 0,
    bestLean = Infinity;
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * d;
    action.time = t;
    mixer.update(0);
    model.updateMatrixWorld(true);
    head.getWorldPosition(a);
    hips.getWorldPosition(b);
    model.worldToLocal(a);
    model.worldToLocal(b);
    const lean = a.z - b.z;
    if (lean < bestLean) {
      bestLean = lean;
      best = t;
    }
  }
  action.stop();
  return best;
}

// Foot fix from neon.html: the walk rolls her feet onto their outer edges; undo it after the mixer poses.
const DEG = Math.PI / 180;
function makeFootFix(model, skinned) {
  const FOOT_ROLL = 30 * DEG,
    FOOT_YAW = 5 * DEG;
  const feet = [
    ['Left', 1],
    ['Right', -1],
  ].map(([s, side]) => ({ bone: model.getObjectByName('mixamorig' + s + 'Foot'), side, sole: [] }));
  {
    const p = skinned.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.005) feet[p.getX(i) > 0 ? 0 : 1].sole.push(i);
  }
  const _qm = new THREE.Quaternion(),
    _qp = new THREE.Quaternion(),
    _qw = new THREE.Quaternion(),
    _qr = new THREE.Quaternion();
  const _e = new THREE.Euler(),
    _v = new THREE.Vector3(),
    _toModel = new THREE.Matrix4();
  function soleRoll(f) {
    _toModel.copy(model.matrixWorld).invert().multiply(skinned.matrixWorld);
    let n = 0,
      sx = 0,
      sz = 0,
      sy = 0,
      sxx = 0,
      szz = 0,
      sxz = 0,
      sxy = 0,
      szy = 0;
    for (const i of f.sole) {
      skinned.getVertexPosition(i, _v).applyMatrix4(_toModel);
      n++;
      sx += _v.x;
      sz += _v.z;
      sy += _v.y;
      sxx += _v.x * _v.x;
      szz += _v.z * _v.z;
      sxz += _v.x * _v.z;
      sxy += _v.x * _v.y;
      szy += _v.z * _v.y;
    }
    const m = new THREE.Matrix3().set(n, sx, sz, sx, sxx, sxz, sz, sxz, szz).invert();
    const slope = new THREE.Vector3(sy, sxy, szy).applyMatrix3(m).y;
    return Math.atan(-f.side * slope);
  }
  function turnFoot(f, roll, yaw) {
    _qr.setFromEuler(_e.set(0, f.side * yaw, f.side * roll, 'YZX'));
    _qr.premultiply(_qm).multiply(_qp.copy(_qm).invert());
    f.bone.parent.getWorldQuaternion(_qp);
    f.bone.quaternion.copy(_qp.invert().multiply(_qr.multiply(_qw.copy(f.world))));
    f.bone.updateMatrixWorld(true);
  }
  const before = new THREE.Quaternion();
  return function fixFeet(weight = 1) {
    model.updateMatrixWorld(true);
    model.getWorldQuaternion(_qm);
    for (const f of feet) {
      before.copy(f.bone.quaternion);
      f.world = f.bone.getWorldQuaternion(f.world || new THREE.Quaternion());
      const inv = soleRoll(f);
      const w = 1 - THREE.MathUtils.smoothstep(inv, 28 * DEG, 45 * DEG);
      let roll = THREE.MathUtils.clamp(inv * 1.3, 0, FOOT_ROLL) * w;
      turnFoot(f, roll, FOOT_YAW * w);
      if (roll > 0 && roll < FOOT_ROLL) {
        roll = THREE.MathUtils.clamp(roll + soleRoll(f) * 1.3 * w, 0, FOOT_ROLL);
        turnFoot(f, roll, FOOT_YAW * w);
      }
      f.bone.quaternion.copy(before.slerp(f.bone.quaternion, weight));
      f.bone.updateMatrixWorld(true);
    }
  };
}

// ---------- held poses on top of the clips (phone, and later gestures) ----------
// A pose is one frame of a clip retargeted onto this skeleton (tools/characters/retarget.py), kept as bone
// rotations. Its weight eases in and out, and each frame the bones are turned toward it by that weight after the
// mixer has posed them, so the legs and the breath keep coming from the idle underneath.
const _mq = new THREE.Quaternion(),
  _pw = new THREE.Quaternion(),
  _r = new THREE.Quaternion(),
  _ax = new THREE.Vector3();
export function poseLayer(model) {
  const layers = {};
  const byName = (n) => {
    let b = null;
    model.traverse((o) => {
      if (!b && o.isBone && o.name === n) b = o;
    });
    return b;
  };
  return {
    layers,
    add(name, json, t, { only = null, rate = 6, lift = null } = {}) {
      const clip = THREE.AnimationClip.parse(json),
        pose = [];
      for (const tr of clip.tracks) {
        const [bn, prop] = tr.name.split('.');
        if (prop !== 'quaternion' || (only && !only.test(bn))) continue;
        const b = byName(bn);
        if (!b) continue;
        const v = tr.createInterpolant().evaluate(Math.min(t, clip.duration));
        pose.push([b, new THREE.Quaternion(v[0], v[1], v[2], v[3]).normalize()]);
      }
      // lift: [boneName, radians] pairs, turned forward about the body's side axis after the pose (arms up)
      const lb = (lift || []).map(([n, a]) => [byName(n), a]).filter((x) => x[0]);
      layers[name] = { pose, w: 0, target: 0, rate, onW: null, lift: lb };
      return layers[name];
    },
    set(name, on) {
      const l = layers[name];
      if (l) l.target = on ? 1 : 0;
    },
    step(dt) {
      for (const l of Object.values(layers)) {
        l.w += Math.sign(l.target - l.w) * Math.min(Math.abs(l.target - l.w), (dt * l.rate) / 1.6);
        if (l.onW) l.onW(l.w);
        if (l.w < 1e-3) continue;
        const k = l.w * l.w * (3 - 2 * l.w);
        for (const [b, q] of l.pose) b.quaternion.slerp(q, k);
        if (l.lift.length) {
          model.updateMatrixWorld(true);
          model.getWorldQuaternion(_mq);
          _ax.set(1, 0, 0).applyQuaternion(_mq);
          for (const [b, a] of l.lift) {
            b.parent.getWorldQuaternion(_pw);
            _r.setFromAxisAngle(_ax, -a * k);
            b.quaternion.premultiply(_pw.clone().invert().multiply(_r).multiply(_pw));
            b.updateMatrixWorld(true);
          }
        }
      }
    },
  };
}

// a small phone for a hand bone: dark body, screen facing the palm side
export function phoneProp(height = 1.12) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.1, 0.009),
    new THREE.MeshLambertMaterial({ color: '#23262d' }),
  );
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.044, 0.088),
    new THREE.MeshBasicMaterial({ color: '#a9d4e6' }),
  );
  screen.position.z = 0.0048;
  body.castShadow = true;
  g.add(body, screen);
  g.userData.k = (height / 1.12) * (PHONE.size || 1);
  return g;
}

// the phone pose: a frame of Meshy's Texting_Walk_inplace, retargeted from Eric's API rig (upper body only)
export const PHONE = {
  t: 0,
  pos: [0, 0.035, 0.035],
  rot: [-0.95, 0, 0],
  size: 1.3,
  lift: 0.4,
  lift2: 0.4,
  only: /Spine|Neck|Head$|Shoulder|Arm|Hand$/,
};
export function setPhone(o) {
  Object.assign(PHONE, o);
}
export const CDIR = new URL('../assets/characters/', import.meta.url).href;

// Give a loaded Meshy character a phone: the held pose from `json` (see PHONE), a phone prop on the right hand,
// and a hook: phone('look') raises it and looks at it, phone('away') puts it down; both resolve when done.
// `bones` names the hands, upper arms and forearms in this rig ([right, left] each).
export const MIXAMO_PHONE_BONES = {
  hand: ['mixamorigRightHand', 'mixamorigLeftHand'],
  arm: ['mixamorigRightArm', 'mixamorigLeftArm'],
  fore: ['mixamorigRightForeArm', 'mixamorigLeftForeArm'],
  only: PHONE.only,
};
export const API_PHONE_BONES = {
  hand: ['RightHand', 'LeftHand'],
  arm: ['RightArm', 'LeftArm'],
  fore: ['RightForeArm', 'LeftForeArm'],
  only: /Spine|neck|Head$|Shoulder|Arm|Hand$/,
};
export function addPhone({ model, root, height, layers, json, bones }) {
  if (!json) return { place() {}, hook: () => Promise.resolve() };
  const lift = [
    [bones.arm[0], PHONE.lift],
    [bones.arm[1], PHONE.lift],
    [bones.fore[0], PHONE.lift2],
    [bones.fore[1], PHONE.lift2],
  ];
  const l = layers.add('phone', json, PHONE.t, { only: bones.only, lift });
  const hand = model.getObjectByName(bones.hand[0]),
    other = model.getObjectByName(bones.hand[1]);
  const phone = phoneProp(height);
  phone.visible = false;
  hand.add(phone);
  l.onW = (w) => {
    phone.visible = w > 0.45;
  };
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _qh = new THREE.Quaternion(),
    _e = new THREE.Euler();
  const up = new THREE.Vector3(),
    fwd = new THREE.Vector3(),
    ws = new THREE.Vector3(),
    hs = new THREE.Vector3();
  // between the hands, long side forward, screen tilted up toward the face; set each frame while it shows
  function place() {
    if (!phone.visible) return;
    model.updateMatrixWorld(true);
    hand.getWorldPosition(_a);
    other.getWorldPosition(_b);
    _a.add(_b).multiplyScalar(0.5);
    root.getWorldQuaternion(_q);
    up.set(0, 1, 0).applyQuaternion(_q);
    fwd.set(0, 0, 1).applyQuaternion(_q);
    root.getWorldScale(ws);
    _a.addScaledVector(fwd, PHONE.pos[2] * ws.x).addScaledVector(up, PHONE.pos[1] * ws.x);
    phone.position.copy(hand.worldToLocal(_a));
    _q.multiply(_qh.setFromEuler(_e.set(-Math.PI / 2 + PHONE.rot[0], PHONE.rot[1], PHONE.rot[2])));
    hand.getWorldQuaternion(_qh);
    phone.quaternion.copy(_qh.invert().multiply(_q));
    hand.getWorldScale(hs);
    phone.scale.setScalar((ws.x * phone.userData.k) / hs.x);
  }
  function hook(state) {
    const want = state === 'look' ? 1 : 0;
    layers.set('phone', want === 1);
    return new Promise((ok) => {
      const chk = () => (Math.abs(l.w - want) < 1e-3 ? ok() : setTimeout(chk, 50));
      chk();
    });
  }
  return { place, hook, prop: phone };
}

// Load her once. `height` is her standing height in world units.
export async function loadMio({ height = 1.12, colours = MIO_COLOURS } = {}) {
  height *= CHARACTER_SCALE;
  const loader = new GLTFLoader();
  const load = (u) => new Promise((ok, no) => loader.load(u, ok, undefined, no));
  const [walk, run, sit, data, tex, idleClip] = await Promise.all([
    load(DIR + 'walk.glb' + V()),
    load(DIR + 'run.glb' + V()),
    load(DIR + 'sit.glb' + V()),
    fetch(DIR + 'base-clean.json' + V()).then((r) => r.json()),
    loadSkin(DIR + 'base-clean.webp' + V()),
    loadRelaxedIdle('mio', V()),
  ]);
  const phoneJson = await fetch(CDIR + 'mio/phone.json' + V())
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const model = walk.scene;
  let skinned;
  model.traverse((o) => {
    if (o.isSkinnedMesh) skinned = o;
  });
  plainFace(skinned, data.faces, data.palette);
  reshapeJaw(skinned);
  const { cols, tints, navyLum } = recolour(skinned, data, colours);
  const NAVY_L = 0.2126 * lin(24) + 0.7152 * lin(47) + 0.0722 * lin(96);
  const tc = colours && colours.teal ? new THREE.Color(colours.teal) : new THREE.Color(1, 1, 1);
  const TEAL_V =
    colours && colours.teal ? `vec3(${tc.r.toFixed(4)}, ${tc.g.toFixed(4)}, ${tc.b.toFixed(4)})` : 'texel.rgb';
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const old = o.material;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    const n = g.attributes.position.count,
      col = new Float32Array(n * 3),
      use = new Float32Array(n),
      tint = new Float32Array(n * 4);
    cols.forEach((c, f) => {
      for (let k = 0; k < 3; k++) {
        const i = f * 3 + k;
        if (c) {
          col[i * 3] = c[0];
          col[i * 3 + 1] = c[1];
          col[i * 3 + 2] = c[2];
          use[i] = 0;
        } else {
          col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1;
          use[i] = 1;
        }
        const t = tints[f];
        if (t) {
          tint[i * 4] = t[0];
          tint[i * 4 + 1] = t[1];
          tint[i * 4 + 2] = t[2];
          tint[i * 4 + 3] = 1;
        }
      }
    });
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('useTex', new THREE.BufferAttribute(use, 1));
    g.setAttribute('tint', new THREE.BufferAttribute(tint, 4));
    o.geometry = g;
    const m = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, flatShading: true });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader =
        'attribute float useTex;\nattribute vec4 tint;\nvarying float vUseTex;\nvarying vec4 vTint;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvUseTex = useTex; vTint = tint;');
      // textured triangles outside the eye band: navy texels take the region colour, keeping their shade
      sh.fragmentShader =
        'varying float vUseTex;\nvarying vec4 vTint;\n' +
        sh.fragmentShader.replace(
          '#include <map_fragment>',
          `
#ifdef USE_MAP
 vec4 texel = texture2D( map, vMapUv );
 float tl = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
 float navy = step(0.5, vTint.a) * step(texel.r, 0.08) * step(texel.g, texel.b * 0.6) * step(0.035, texel.b) * step(texel.b, 0.3);
 texel.rgb = mix(texel.rgb, vTint.rgb * clamp(tl / ${NAVY_L.toFixed(5)}, 0.4, 1.8), navy);
 // teal texels (hair streaks, trim) take the portrait's green, keeping their shade
 float tealT = step(0.5, vTint.a) * step(texel.r + 0.12, texel.g) * step(0.12, texel.b);
 texel.rgb = mix(texel.rgb, ${TEAL_V} * clamp(tl / 0.35, 0.3, 1.6), tealT);
 diffuseColor *= mix( vec4( 1.0 ), texel, vUseTex );
#endif`,
        );
    };
    o.material = m;
    old.dispose();
    o.frustumCulled = false;
  });
  const box = new THREE.Box3().setFromObject(model);
  const H = box.max.y - box.min.y;
  const root = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(height / H);
  holder.add(model);
  root.add(holder);
  const mixer = new THREE.AnimationMixer(model);
  const clips = { walk: walk.animations[0], run: run.animations[0], sit: sit.animations[0] };
  const actions = {};
  for (const [k, c] of Object.entries(clips)) {
    actions[k] = mixer.clipAction(c);
  }
  const bind = [];
  model.traverse((o) => {
    if (o.isBone) bind.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
  });
  const fixFeet = makeFootFix(model, skinned);
  // the walk clip's hips travel forward a little; keep her in place (root motion off on x/z)
  const hips = model.getObjectByName('mixamorigHips');
  const hipRest = hips.position.clone();

  let SIT_T0 = 0;
  const sitT = () => SIT_T0;
  const pose = { bow: 0 };
  let spine = null,
    spine2 = null;
  model.traverse((o) => {
    if (o.isBone && /spine$/i.test(o.name.replace(/[^a-z0-9]/gi, ''))) spine = o;
    if (o.isBone && /spine1$/i.test(o.name.replace(/[^a-z0-9]/gi, ''))) spine2 = o;
  });
  const layers = poseLayer(model);
  const ph = addPhone({ model, root, height, layers, json: phoneJson, bones: MIXAMO_PHONE_BONES });
  actions.idle = mixer.clipAction(idleClip);
  let cur = null,
    curName = '';
  let sitO = null; // how far sitAt moved the root off the hips; given back when she stands, so she stands where she sat
  function setState(name) {
    if (name === curName) return;
    const prev = cur;
    if (curName === 'sit' && name !== 'sit' && sitO) {
      root.position.x += sitO.x;
      root.position.z += sitO.z;
      sitO = null;
    }
    curName = name;
    const a = actions[name];
    a.reset();
    a.setEffectiveWeight(1);
    if (name === 'sit') {
      a.time = sitT();
      a.timeScale = HELD;
    }
    a.fadeIn(prev ? 0.2 : 0).play();
    if (prev && prev !== a) prev.fadeOut(0.2);
    cur = a;
  }
  let t = 0,
    breath = 0;
  // three.js only writes a bone when the clip's value changes, so on a held frame whatever we add on top (breath,
  // bow, the foot fix) would pile up frame after frame: that was her floating and her feet jiggling. So every frame
  // the bones go back to what the mixer last gave them before the extras are added again.
  const bones = [];
  model.traverse((o) => {
    if (o.isBone) bones.push([o, o.position.clone(), o.quaternion.clone()]);
  });
  const snapBones = () => {
    for (const b of bones) {
      b[1].copy(b[0].position);
      b[2].copy(b[0].quaternion);
    }
  };
  const restoreBones = () => {
    for (const b of bones) {
      b[0].position.copy(b[1]);
      b[0].quaternion.copy(b[2]);
    }
  };
  const gait = makeGait(actions, { walkV: 0.47 * CHARACTER_SCALE, runV: 0.77 * CHARACTER_SCALE, runOff: 0.04 });
  const activeWeight = (action) => (action.isScheduled() ? action.getEffectiveWeight() : 0);
  function update(dt, speed = 1) {
    t += dt;
    gait.step(dt, curName, speed);
    // the held idle/sit frames don't rewrite the hips every frame, so the breath has to be taken back off first,
    // or it piles up (that was her floating and her feet jiggling)
    restoreBones();
    mixer.update(dt);
    snapBones();
    if (curName !== 'sit') {
      hips.position.x = hipRest.x;
      hips.position.z = hipRest.z;
    }
    if (curName === 'sit') {
      breath = Math.sin(t * 2.0) * 0.004;
      hips.position.y += breath;
    }
    const footWeight = Math.min(1, activeWeight(actions.walk) + activeWeight(actions.run));
    if (curName !== 'sit' && footWeight > 0) fixFeet(footWeight);
    if (pose.bow) {
      spine.rotateX(pose.bow * 0.6);
      spine2 && spine2.rotateX(pose.bow * 0.4);
    }
    layers.step(dt);
    ph.place();
  }
  // hold one calm frame of the chair clip, with only a breath on top
  SIT_T0 = calmSitTime(model, mixer, actions.sit);
  // where the hips sit in the chair clip, measured once in the root's own space
  setState('sit');
  for (let i = 0; i < 30; i++) update(1 / 30);
  root.updateMatrixWorld(true);
  const sitHip = new THREE.Vector3();
  hips.getWorldPosition(sitHip);
  root.worldToLocal(sitHip);
  cur = null;
  curName = '';
  mixer.stopAllAction();
  setState('idle');
  snapBones();
  update(0);
  // put her in a seat: the hips land on (x, seatTop + 0.07, z), facing ry
  function sitAt(x, seatTop, z, ry) {
    const k = root.scale.x;
    const o = sitHip
      .clone()
      .multiplyScalar(k)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    root.position.set(x - o.x, seatTop + 0.07 * k - o.y, z - o.z);
    root.rotation.y = ry;
    setState('sit');
    sitO = o.clone();
    holdNow(mixer, cur, Object.values(actions), restoreBones, snapBones); // straight into the seated frame
  }
  return {
    root,
    model,
    mixer,
    setState,
    update,
    setGait: gait.set,
    get sitOff() {
      return sitO;
    },
    sitAt,
    sitHip,
    pose,
    layers,
    phone: ph.hook,
    placePhone: ph.place,
    get state() {
      return curName;
    },
    H,
    height,
  };
}
