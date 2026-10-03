// The generic islanders as Meshy chibis (Review chibi-crowd-1; Jørgen, 2026-10-03: "All the people milling about
// should have their own simple chibis that are unremarkable, but look all right."). With the chibi look on (chibi.js)
// the ambient crowd (crowd/looks.js), the background office workers (cast.js PEOPLE.worker: the gate, the lift, the
// canteen) and the train's unnamed passengers (chibi-passengers.js) take these bodies instead of the code-built ones.
// Eight bases, made once each; every copy wears its own colours (chibi.js tint) and stands a little taller or shorter,
// so a crowd of twenty has no twins. All copies of a base share its mesh, textures and clips.
//
//   generic(base, i, { proxy, height, tint, into })   a person, variant i of a base (or these colours); proxy: parts the
//                                         scenes can hang props on and move
//   crowdBody(kind, i)                    a crowd body for crowd/looks.js (office | casual | elder | sport)
//   hold(m, obj, at, bone)                obj on a bone, lined up with the body as it stands now
import * as THREE from 'three';
import { CHIBI_ON, chibiFiles, chibiFrom } from './chibi.js';
import { meshyPerson } from './cast3d.js';
import { PEOPLE } from './cast.js';
import { S as CODE } from './train/people.js';

// base: standing height (tools/characters/chibi-bake.mjs has the same) and the colours each region comes in, the
// first as made (null). The suit's trousers go with its jacket.
export const GEN = {
  suit: {
    h: 1.1,
    hair: [null, '#3b2a20', '#4a4a4c'],
    top: [null, '#3d4048', '#5e5448', '#7a7f86', '#2c3446'],
  },
  shirt: {
    h: 1.1,
    hair: [null, '#141417', '#5a3b26'],
    top: [null, '#f1f1ec', '#e9d6df', '#dbe5cf', '#d9d2c2'],
    bottom: [null, '#2b3242', '#5d574d'],
  },
  blouse: {
    h: 1.06,
    hair: [null, '#3a2619', '#62412c'],
    top: [null, '#2f3443', '#e6dfd0', '#8a6f5a', '#5c6170'],
    bottom: [null, '#2b2f3a', '#4a3f38'],
  },
  cardigan: {
    h: 1.03,
    hair: [null, '#e2dfda', '#4a3b33'],
    top: [null, '#8a5a5a', '#6f7f6a', '#7b8aa3', '#e4ddd0'],
    bottom: [null, '#2f3443', '#4b4b4b'],
  },
  polo: {
    h: 1.06,
    hair: [null],
    top: [null, '#3d5a80', '#9c5b52', '#d8d4c8', '#33415c'],
    bottom: [null, '#4a4f5c'],
  },
  hoodie: {
    h: 1.05,
    hair: [null, '#1e1b1a', '#5a3826', '#2f2522'],
    top: [null, '#9fb7a6', '#e7b9a8', '#5f6f86', '#efede6'],
    bottom: [null, '#2f3442', '#5b5f66'],
  },
  apron: {
    h: 1.06,
    hair: [null, '#141416'],
    top: [null, '#3a4a6b', '#7a3b3b', '#4a4a4a'],
    bottom: [null],
  },
  dock: {
    h: 1.11,
    hair: [null, '#3a2a20'],
    top: [null, '#3d5a7a', '#d9c24a'],
    bottom: [null, '#2f3a4f'],
  },
};
GEN.suit.bottom = 'top';
// which bases each kind of crowd body is drawn from, in turn
const KIND = {
  office: ['suit', 'blouse', 'shirt', 'suit', 'cardigan', 'shirt', 'blouse'],
  casual: ['hoodie', 'polo', 'shirt', 'dock', 'cardigan', 'apron', 'hoodie', 'blouse'],
  elder: ['polo', 'cardigan'],
  sport: ['hoodie'],
};

// a variant's colours: i counts through every mix of the base's hair, top and bottom once before any comes back (the
// top changes from each i to the next, then the hair, then the bottom), so people made one after another, and the
// same base a few people apart, don't come out alike (a hash of i gave neighbours the same colours now and then)
export function variant(base, i) {
  const g = GEN[base],
    nt = g.top.length,
    nh = g.hair.length,
    nb = g.bottom === 'top' ? 1 : g.bottom.length,
    n = nt * nh * nb;
  const k = ((i % n) + n) % n,
    t = k % nt,
    q = Math.floor(k / nt);
  const h = (q + t) % nh,
    b = (Math.floor(q / nh) + t + h) % nb;
  const top = g.top[t];
  return { hair: g.hair[h], top, bottom: g.bottom === 'top' ? top : g.bottom[b] };
}

export const GEN_ON = CHIBI_ON;
const PRE = {};
if (GEN_ON)
  await Promise.all(
    Object.keys(GEN).map(async (b) => {
      PRE[b] = await chibiFiles('gen-' + b).catch((e) => console.warn('generic chibi', b, e) ?? null);
    }),
  );

// scratch for the per-frame arm update (no allocation a frame: the garbage collector's pauses showed as hitches)
const _v = new THREE.Vector3(),
  _w = new THREE.Vector3(),
  _s = new THREE.Vector3(),
  _t = new THREE.Vector3(),
  _turn = new THREE.Quaternion(),
  _world = new THREE.Quaternion(),
  _q = new THREE.Quaternion(),
  _p = new THREE.Quaternion();
const bone = (m, name) => m.model.getObjectByName(name);
// obj on a bone, lined up with the body as it stands now, its origin at `at` (the root's space) and in the code-built
// people's units (train/people.js S), so the props made for those fit
export function hold(m, obj, at, name) {
  m.root.updateMatrixWorld(true);
  const g = new THREE.Group();
  g.scale.setScalar(CODE);
  g.position.copy(at);
  g.add(obj);
  m.root.add(g);
  g.updateMatrixWorld(true);
  bone(m, name).attach(g);
  return g;
}
// where a bone is now, in the root's space
export function boneAt(m, name) {
  m.root.updateMatrixWorld(true);
  return m.root.worldToLocal(bone(m, name).getWorldPosition(new THREE.Vector3()));
}

// Parts the scenes can hang props on and move, as on a code-built person: the torso on the spine, headK over the head
// (the code-built head's frame, scaled to this head: train/people.js HEAD), and two arms that follow the real ones and,
// once a scene turns them, lead them (the upper arm turned so the hand goes where the stand-in's hand is).
const DOWN = new THREE.Vector3(0, -1, 0),
  ARM = 0.255; // the code-built hand, down the arm
function proxyParts(m) {
  m.update(0);
  m.torso = new THREE.Group();
  hold(m, m.torso, boneAt(m, 'Spine'), 'Spine');
  const hb = boneAt(m, 'Head'),
    top = boneAt(m, 'head_end');
  const k = (top.y - hb.y) / (2 * 0.222 * CODE); // the code-built head is 2 ry tall in its own units
  m.headK = new THREE.Group();
  hold(m, m.headK, hb.clone().add(_v.set(0, (top.y - hb.y) / 2 - 0.225 * k * CODE, 0)), 'Head');
  m.headK.scale.setScalar(k);
  const arms = [0, 1].map((i) => {
    const side = i ? 'Left' : 'Right',
      sh = bone(m, side + 'Arm'),
      hand = bone(m, side + 'Hand');
    const len = boneAt(m, side + 'Hand').distanceTo(boneAt(m, side + 'Arm'));
    const anchor = new THREE.Group(),
      arm = new THREE.Group(),
      tip = new THREE.Object3D();
    anchor.scale.setScalar(CODE);
    arm.scale.setScalar(len / (ARM * CODE));
    tip.position.y = -ARM;
    arm.add(tip);
    arm.userData.hand = tip;
    anchor.add(arm);
    m.root.add(anchor);
    return { anchor, arm, sh, hand, auto: new THREE.Euler() };
  });
  m.arms = arms.map((a) => a.arm);
  m.bridge = true;
  const update = m.update;
  m.update = (dt, speed) => {
    update(dt, speed);
    m.model.updateMatrixWorld(true);
    m.root.getWorldQuaternion(_q);
    for (const a of arms) {
      const s = a.sh.getWorldPosition(_s),
        d = a.hand.getWorldPosition(_w).sub(s);
      a.anchor.position.copy(m.root.worldToLocal(_t.copy(s)));
      const r = a.arm.rotation,
        rest = Math.abs(r.x) + Math.abs(r.y) + Math.abs(r.z) < 1e-3,
        mine = r.equals(a.auto);
      if (rest || mine) {
        // following: the stand-in hangs where the real arm is, so whatever it holds stays in the hand
        a.arm.quaternion.setFromUnitVectors(DOWN, d.normalize().applyQuaternion(_p.copy(_q).invert()));
        a.auto.copy(a.arm.rotation);
        continue;
      }
      // leading: a scene has turned the stand-in; the upper arm turns so the hand goes to the stand-in's hand
      a.anchor.updateMatrixWorld(true);
      const t = a.arm.userData.hand.getWorldPosition(_t).sub(s).normalize();
      const turn = _turn.setFromUnitVectors(d.normalize(), t);
      const world = a.sh.getWorldQuaternion(_world).premultiply(turn);
      a.sh.quaternion.copy(a.sh.parent.getWorldQuaternion(_p).invert().multiply(world));
      a.sh.updateMatrixWorld(true);
    }
  };
  m.update(0);
}

// variant i of a base, as a person; null when its files didn't load
// (opt.into: an existing person object that becomes this body, keeping its other fields: chibi-passengers.js)
export function generic(base, i = 0, opt = {}) {
  const f = PRE[base];
  if (!f) return null;
  const tint = opt.tint || variant(base, i);
  const a = chibiFrom(f, { tint, height: opt.height || GEN[base].h });
  const m = meshyPerson(opt.into ? Object.defineProperties(opt.into, Object.getOwnPropertyDescriptors(a)) : a);
  Object.assign(m, {
    chibi: true,
    base,
    hairHex: tint.hair || f.regions.hair?.hex,
  });
  m.ph ??= i * 1.37;
  if (opt.proxy) proxyParts(m);
  return m;
}

// a crowd body (crowd/looks.js scales it and hangs its bag)
export function crowdBody(kind, i) {
  const list = KIND[kind] || KIND.casual;
  return generic(list[i % list.length], i);
}

// The background office workers (the gate's, the lift's Sales pair, the canteen's): every third a woman, as the
// code-built ones (cast.js PEOPLE.worker), each a little taller or shorter
export function worker(i = 0) {
  const base = i % 3 === 1 ? ['blouse', 'cardigan'][(i >> 2) % 2] : ['suit', 'shirt'][(i >> 1) % 2];
  return generic(base, i, {
    proxy: true,
    height: GEN[base].h * (0.97 + ((i * 37) % 7) / 100),
  });
}
if (GEN_ON) {
  const code = PEOPLE.worker;
  PEOPLE.worker = (i = 0) => worker(i) || code(i);
}
