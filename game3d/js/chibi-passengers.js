// The train's unnamed passengers on the approved native crowd bodies (crowd/approved-models.js): the man with a book,
// the girl with headphones, the woman with a bun and the man with a bag, standing (docs/game/cast.md). Each code-built passenger
// (train/people.js buildPassengers) becomes that body in place, the same object, so places/train.js and
// train/discoveries.js keep every reference they hold. The things that tell them apart move over onto the new body:
// the book, the phones and the headphones. Office woman B already wears her hair in a bun. Called by
// trainDiscoveries before it reads their parts. If a body fails to load, the code-built passenger stays. The man with
// a bag keeps the code-built one's visibility (places/train.js hides him).
import * as THREE from 'three';
import { EVERYDAY_ROLES } from './crowd/roles.js';
import { proxyParts, roleBody, preparePlacePeople } from './chibi-crowd.js';
import { bridgeOfficePose } from './crowd/office-pose.js';
import { phoneLighter } from './perf/phone.js';

// How each passenger sits: the code-built passenger's hold (train/people.js armsHold), so the hands stay on the book
// or phone, and a little shorter for the student. Which body each one gets is the shared role table's (crowd/roles.js).
const POSE = {
  reader: { arms: [-1.05, 0.55] },
  music: { arms: [-0.95, 0.45], scale: 0.96 },
  bun: { arms: [-1.1, 0.5] },
  stander: { stand: true }, // his arms as the idle has them, the bag in his hand
};
const IN_HAND = new THREE.Vector3(0, 0.03, 0.05); // code-built units (train/people.js S), on the torso

export const prepareTrainPassengers = () => preparePlacePeople('train');

// The car already holds the named cast's full-size skins, so its passengers wear a smaller copy of their body's skin
// (1024 on desktop, 512 on a phone), one per body, to keep the train inside its texture budget (#373). Day 3's
// attendant and club member wear the same (places/day-cast.js).
const small = new Map();
export function smallSkin(model) {
  model.traverse((o) => {
    const map = o.material?.map;
    if (!o.isMesh || !map?.image) return;
    if (!small.has(map)) {
      const n = phoneLighter() ? 512 : 1024,
        c = Object.assign(document.createElement('canvas'), { width: n, height: n });
      c.getContext('2d').drawImage(map.image, 0, 0, n, n);
      const t = new THREE.CanvasTexture(c);
      Object.assign(t, { flipY: map.flipY, colorSpace: map.colorSpace, anisotropy: map.anisotropy });
      small.set(map, t);
    }
    o.material.map = small.get(map);
  });
}

// r becomes a view of the new body: the body's own functions read and write the body object (meshyPerson closes over
// it), so every field it has is forwarded rather than copied. Fields only r has (act, blob) stay r's.
function becomes(r, body) {
  for (const k of Object.keys(body))
    Object.defineProperty(r, k, {
      get: () => body[k],
      set: (v) => (body[k] = v),
      enumerable: true,
      configurable: true,
    });
}

export function chibiPassengers(people) {
  for (const [id, role] of Object.entries(POSE)) {
    const r = people[id];
    if (!r || r.meshy || !EVERYDAY_ROLES[id]) continue;
    const n = roleBody(id);
    if (!n) continue;
    const old = { root: r.root, torso: r.torso, head: r.head, headK: r.headK, arms: r.arms };
    // the props: groups on the torso (the book, a phone), the headphones on the head
    const props = old.torso.children.filter((o) => o.isGroup && o !== old.head && !old.arms.includes(o));
    // what hangs from a hand (the stander's bag)
    const carried = old.arms.map((a) => a.children.filter((o) => o.isGroup));
    const cans = old.headK.children.filter((o) => o.isMesh && /Cylinder|Torus/.test(o.geometry.type));
    n.ph = 0;
    smallSkin(n.model);
    // where the passenger sat, facing the same way
    n.root.position.set(old.root.position.x, 0, old.root.position.z);
    n.root.rotation.copy(old.root.rotation);
    if (role.scale) n.root.scale.multiplyScalar(role.scale);
    n.root.visible = old.root.visible;
    old.root.parent.add(n.root);
    old.root.removeFromParent();
    if (role.stand) {
      n.seated = false;
      proxyParts(n);
      // the stand-in arms follow the real ones, so the bag stays in the hand as the idle moves it
      carried.forEach((list, i) => list.forEach((o) => n.arms[i].add(o)));
      becomes(r, n);
      continue;
    }
    n.seated = true;
    n.sitHere();
    proxyParts(n);
    // the passenger's head nod and turn (its act) reach the real head
    bridgeOfficePose(n);
    for (const c of cans) n.headK.add(c);
    const [x, z] = role.arms;
    n.arms.forEach((a, i) => a.rotation.set(x, 0, (i ? -1 : 1) * z));
    // the book or phone goes where this body's hands now are, a little in front of them
    n.update(0);
    n.root.updateMatrixWorld(true);
    const hands = new THREE.Vector3();
    for (const a of n.arms) hands.add(a.userData.hand.getWorldPosition(new THREE.Vector3()));
    n.torso.worldToLocal(hands.multiplyScalar(0.5));
    for (const p of props) {
      n.torso.add(p);
      p.position.copy(hands).add(IN_HAND);
    }
    becomes(r, n);
    r.breath = 0;
  }
}
