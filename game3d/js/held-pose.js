// Held poses and the phone on the Meshy bodies (avatar.js), the calm frame of the sit clip, and where the character
// files are.
import * as THREE from 'three';

export const V = () => '?v=' + encodeURIComponent(window.BUILD || '');

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
export const CDIR = new URL('../assets/characters/', import.meta.url).href;

// Give a loaded Meshy character a phone: the held pose from `json` (see PHONE), a phone prop on the right hand,
// and a hook: phone('look') raises it and looks at it, phone('away') puts it down; both resolve when done.
// `bones` names the hands, upper arms and forearms in this rig ([right, left] each).
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
