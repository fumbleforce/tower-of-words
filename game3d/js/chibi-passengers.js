// The train's unnamed passengers as generic chibis (chibi-crowd.js), when the chibi look is on: the girl with
// headphones, the man with a book and the woman with a bun (docs/game/cast.md). Each code-built passenger
// (train/people.js buildPassengers) becomes a chibi in place, the same object, so places/train.js and
// train/discoveries.js keep every reference they hold; the things that tell them apart move over onto the chibi: the
// headphones, the book, the phones, and a bun for the woman. Called by trainDiscoveries before it reads their parts.
import * as THREE from 'three';
import { GEN_ON, generic } from './chibi-crowd.js';
import { HEAD } from './train/people.js';

// id: [base, variant, colours]
const WHO = {
  music: ['hoodie', 2],
  reader: ['suit', 5, { top: '#4a4f5c', hair: '#141417' }],
  bun: ['blouse', 4, { hair: '#3a2619', top: '#e6dfd0', bottom: '#2b2f3a' }],
};

// a bun at the back of the crown, in the code-built head's frame (headK)
function bun(col) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }),
  );
  m.position.set(0, HEAD.c + HEAD.ry * 0.8, -HEAD.rz * 0.8);
  m.scale.set(1, 0.85, 0.9);
  m.castShadow = true;
  return m;
}

export function chibiPassengers(people) {
  if (!GEN_ON) return;
  for (const [id, [base, i, tint]] of Object.entries(WHO)) {
    const r = people[id];
    if (!r || r.meshy) continue;
    const old = { root: r.root, torso: r.torso, head: r.head, headK: r.headK, arms: r.arms };
    // the props: groups on the torso (the book, a phone), the headphones on the head
    const props = old.torso.children.filter((o) => o.isGroup && o !== old.head && !old.arms.includes(o));
    const cans = old.headK.children.filter((o) => o.isMesh && /Cylinder|Torus/.test(o.geometry.type));
    if (!generic(base, i, { proxy: true, into: r, tint })) continue;
    // the chibi where the passenger sat, facing the same way
    r.root.position.set(old.root.position.x, 0, old.root.position.z);
    r.root.rotation.copy(old.root.rotation);
    old.root.parent.add(r.root);
    old.root.removeFromParent();
    for (const p of props) r.torso.add(p);
    for (const c of cans) r.headK.add(c);
    if (id === 'bun') r.headK.add(bun(r.hairHex));
    r.seated = true;
    r.sitHere();
  }
}
