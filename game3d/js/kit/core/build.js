// Builds what kit pieces put into a Parts collector (kit/core/piece.js) and hands a place everything they reported:
//   const { meshes, blocks, spots, glows } = buildKit(p, root, { poolY });
//   blocks -> nav.block(...rect) each, and walk-ground; spots -> the place's seats, doors and tap targets;
//   glows  -> the place's light rig (rig.glow.add(...glows), kit/light/glow.js): the lit panes shown at night, the
//             lamp heads turned up, the light pools strengthened.
// The glass is one mesh in the window glass colour, so the street finish (scenes/diorama/materials.js finishWindows)
// gives it its reflections and the rooms behind it; the lit panes and lamp heads are one mesh each.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from './mat.js';
import { pools } from './pool.js';
import { kitBag } from './piece.js';

// the window glass colour the street finish looks for, and the shared glass the faceted blocks also use
export const GLASS = '#8c9dad';
// what the lit parts become at night (the same values as the outdoor lamps', scenes/outdoor/furniture.js lightSet)
export const NIGHT = {
  head: { emissiveIntensity: 2.6, color: '#fff3dc' },
  pool: 0.42,
};

const colored = (g, color) => {
  const c = new THREE.Color(color),
    n = g.attributes.position.count,
    a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
// one attribute set (position, normal, uv), so differently made geometries merge
const plain = (g) => {
  for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
  if (!g.attributes.uv)
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
};
const merge = (list) => {
  const indexed = list.every((g) => g.index);
  return mergeGeometries(indexed ? list : list.map((g) => (g.index ? g.toNonIndexed() : g)));
};

export function buildKit(p, root, { poolY } = {}) {
  const bag = kitBag(p);
  const meshes = p.build(root);
  const glows = [];
  if (bag.glass.length) {
    const m = new THREE.Mesh(merge(bag.glass.map(plain)), mat(GLASS, { roughness: 0.25, metalness: 0.1 }));
    m.name = 'kit:glass';
    m.castShadow = false;
    m.receiveShadow = true;
    root.add(m);
    meshes.push(m);
  }
  if (bag.lit.length) {
    const g = merge(bag.lit.map(([geo, color]) => colored(plain(geo), color)));
    const m = new THREE.Mesh(g, litMat());
    m.name = 'kit:lit'; // named, so the merge and the draw-call pass leave it alone (like block:lit)
    m.castShadow = false;
    m.visible = false;
    root.add(m);
    meshes.push(m);
    glows.push({ show: m });
  }
  if (bag.heads.length) {
    const head = mat.own('#f4ede2', {
      emissive: new THREE.Color('#ffd9a0'),
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
    const m = new THREE.Mesh(merge(bag.heads.map(plain)), head);
    m.name = 'kit:lamps';
    m.castShadow = false;
    root.add(m);
    meshes.push(m);
    glows.push({ mat: head, night: NIGHT.head });
  }
  if (bag.pools.length && typeof document !== 'undefined') {
    const m = pools(bag.pools, 1, {
      k: 0.16,
      ...(poolY != null ? { y: poolY } : {}),
    });
    m.userData.lampPool = true;
    root.add(m);
    meshes.push(m);
    glows.push({ pool: m, night: NIGHT.pool });
  }
  const out = {
    meshes,
    blocks: bag.blocks.splice(0),
    spots: bag.spots,
    glows,
    glow: bag.glow.splice(0),
  };
  for (const k of ['glass', 'lit', 'heads', 'pools']) bag[k].length = 0;
  bag.spots = {};
  return out;
}

const litMat = () =>
  mat.own('#ffffff', {
    vertexColors: true,
    emissive: new THREE.Color('#ffc98a'),
    emissiveIntensity: 0.9,
  });
