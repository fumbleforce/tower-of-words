// What the ambient crowd looks like (crowd/index.js): the same chibi bodies as the lobby's office workers
// (cast.js PEOPLE.worker, train/people.js chibi), in four kinds of clothes, some carrying a bag. Every part shares
// one vertex-coloured material, so the draw-call pass (perf/batch.js) turns each person into one skinned draw.
// The character models are still being decided: everything about a body is made here, by makeBody(kind, i), so a
// later model only has to replace this file (the crowd only needs root, hips, torso, head, arms, legs and knees).
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { chibi, SKINS } from '../train/people.js';
import { hull } from '../train/hull.js';
import { PEOPLE, HK } from '../cast.js';
import { K } from '../scenes/office.js';

// the chibi parts' own material settings (train/people.js), so the bags merge into the same draw
const mat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: false,
  roughness: 0.93,
  metalness: 0,
});
mat.userData.noLook = true;
const part = (pts, col) => {
  const m = new THREE.Mesh(toCreasedNormals(hull(pts, col, { grad: 0.12, name: 'bag' }).build(), 0.7), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const boxPts = (w, h, d, y = 0) => {
  const out = [];
  for (const x of [-w / 2, w / 2]) for (const yy of [y, y + h]) for (const z of [-d / 2, d / 2]) out.push([x, yy, z]);
  return out;
};

// bags hang from the hand (arm group, hand at y -0.255)
function briefcase() {
  const g = new THREE.Group();
  g.add(part(boxPts(0.24, 0.17, 0.07, -0.27), '#2c2f38'));
  g.add(part(boxPts(0.08, 0.03, 0.02, -0.1), '#1e2027'));
  return g;
}
function tote(col) {
  const g = new THREE.Group();
  g.add(
    part(
      [
        [-0.13, -0.42, -0.05],
        [0.13, -0.42, -0.05],
        [-0.13, -0.42, 0.05],
        [0.13, -0.42, 0.05],
        [-0.15, -0.16, -0.06],
        [0.15, -0.16, -0.06],
        [-0.15, -0.16, 0.06],
        [0.15, -0.16, 0.06],
      ],
      col,
    ),
  );
  g.add(part(boxPts(0.025, 0.14, 0.02, -0.17), col)); // the handle up to the hand
  return g;
}
function groceries() {
  const g = tote('#f1efe8');
  g.add(
    part(
      boxPts(0.06, 0.1, 0.05, -0.2).map(([x, y, z]) => [x - 0.05, y, z]),
      '#6f9a4a',
    ),
  ); // a leek's top
  return g;
}
function backpack(col) {
  return part(
    [
      [-0.12, -0.02, -0.1],
      [0.12, -0.02, -0.1],
      [-0.12, -0.02, -0.2],
      [0.12, -0.02, -0.2],
      [-0.11, 0.26, -0.1],
      [0.11, 0.26, -0.1],
      [-0.1, 0.26, -0.19],
      [0.1, 0.26, -0.19],
    ],
    col,
  );
}

const CASUAL_TOPS = ['#c8d3da', '#7f9cb5', '#d9c6a5', '#9aa77e', '#c98b7e', '#e8e4da', '#8a7fa3', '#5f7f86'];
const CASUAL_BOTTOMS = ['#3b4252', '#56606e', '#8a8478', '#2f3646', '#6c7a8a'];
const HAIRS = ['#2c2622', '#1f2229', '#4a3a33', '#6b4a36', '#8d8f94', '#3a302b', '#9b5a3c', '#c2b08a'];
const SPORT_TOPS = ['#e0675a', '#4f8fc0', '#f2f0ea', '#5aa38a', '#f0b84a', '#3c4a63'];

function casual(i) {
  const skirt = i % 3 === 1;
  const top = CASUAL_TOPS[i % CASUAL_TOPS.length],
    bottom = CASUAL_BOTTOMS[(i * 3) % CASUAL_BOTTOMS.length];
  return chibi({
    headK: HK,
    skin: SKINS[(i + 1) % 4],
    top,
    sleeve: top,
    bottom,
    legs: bottom,
    skirt,
    shin: skirt ? SKINS[(i + 1) % 4] : undefined,
    hair: HAIRS[(i * 5 + 2) % HAIRS.length],
    hairOpts: skirt
      ? {
          locks: 0.15,
          front: 0.06,
          seed: 80 + i,
          long: i % 2 ? 0.22 : 0,
          bun: i % 4 === 3,
        }
      : { messy: 0.09, front: 0.06, seed: 80 + i },
    shoes: i % 2 ? '#e8e6e0' : '#3a3f4a',
    sole: '#d8d6d0',
    torsoW: skirt ? 0.28 : 0.31,
  });
}
function sport(i) {
  const top = SPORT_TOPS[i % SPORT_TOPS.length];
  return chibi({
    headK: HK,
    skin: SKINS[i % 4],
    top,
    sleeve: top,
    bottom: '#262b36',
    legs: '#262b36',
    shin: '#262b36',
    hair: HAIRS[(i * 3 + 1) % HAIRS.length],
    hairOpts:
      i % 2 ? { locks: 0.12, front: 0.05, seed: 120 + i, bun: true } : { messy: 0.06, front: 0.05, seed: 120 + i },
    shoes: '#f2f2ee',
    sole: '#c9cdd3',
    torsoW: i % 2 ? 0.28 : 0.3,
  });
}
function elder(i) {
  const top = ['#8b8070', '#6f7a72', '#a59a8c', '#5d6470'][i % 4];
  return chibi({
    headK: HK,
    skin: SKINS[(i + 2) % 4],
    top,
    sleeve: top,
    bottom: '#4a4f5c',
    legs: '#4a4f5c',
    shirt: '#e9e6df',
    hair: ['#d9d6d0', '#b9bbbf', '#8d8f94'][i % 3],
    hairOpts: { front: 0.05, side: -0.08, seed: 160 + i },
    glasses: i % 2 ? '#3a3a3a' : undefined,
    shoes: '#3b2e2c',
    sole: '#3b2e2c',
  });
}

// kind: office | casual | sport | elder. i picks the variant (clothes, hair, bag)
export function makeBody(kind, i) {
  let r;
  if (kind === 'office') r = PEOPLE.worker(i + 7);
  else if (kind === 'sport') r = sport(i);
  else if (kind === 'elder') r = elder(i);
  else r = casual(i);
  r.root.scale.multiplyScalar(K * (0.95 + ((i * 37) % 11) / 100)); // a little taller or shorter each
  // a bag in the right hand (arms[1]) or on the back, for some
  const pick = i % 4;
  if (kind === 'office' && pick !== 3) r.arms[1].add(pick === 2 ? tote('#5b6474') : briefcase());
  if (kind === 'casual' && pick === 0) r.arms[1].add(groceries());
  if (kind === 'casual' && pick === 2) r.arms[1].add(tote(['#9db7c9', '#c9a98b', '#a9b88c'][i % 3]));
  if (kind === 'casual' && pick === 3) r.torso.add(backpack(['#e39a3b', '#4c6a8a', '#7a8f6a'][i % 3]));
  if (kind === 'elder' && pick === 1) r.arms[1].add(groceries());
  r.kind = kind;
  r.carries = r.arms[1].children.length > 2 || (kind === 'casual' && pick === 3);
  r.ph = i * 1.37;
  return r;
}
