// The forecourt's planting look on every place (Jørgen 2026-10-09: "for desktop we need the proper forecourt
// vegetation everywhere"). The builders plant the street style's trees and hedges (diorama/planting.js
// ISLAND_PLANTING); once a place is built (places/lifecycle.js) this lays over them what the forecourt's dressStreet
// lays over its own: the crown core under every crown, hedge and shrub (diorama/canopy.js, coarser on a phone, its
// shadow from a stand-in), leaf cards on them near where the player walks, grass and flowers over the lawn there, and
// the street finish on bark, mulch and the leaf cover over the bed soil. A phone gets the core and the bark only, as
// in the forecourt (its high overview barely shows the cards and the grass). Ground and buildings keep their look; the
// world kit takes the street style's other parts to them (notes/outdoor-plan.md).
// Parts already dressed (the forecourt's statics: their root has userData.diorama) are left as they are.
import * as THREE from 'three';
import { CHUNKS } from '../island-chunks.js';
import { dressFoliage } from './foliage.js';
import { meadowDetail } from './meadow.js';
import { streetMaterial } from './materials.js';
import { detailController } from './quality.js';

const grow = (r, d) => r && [r[0] - d, r[1] + d, r[2] - d, r[3] + d];
const PLANTED = new Set(['diorama-tree', 'diorama-hedge']);

// The trunks' feet: the bark's vertices near the ground, gathered per metre, for the meadow's rings round the roots.
function trunks(root, skip) {
  const v = new THREE.Vector3(),
    cells = new Map(),
    inverse = root.matrixWorld.clone().invert(),
    m = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.surf !== 'bark' || skip(o)) return;
    const p = o.geometry.attributes.position;
    m.multiplyMatrices(inverse, o.matrixWorld);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
      if (v.y > 0.6) continue;
      const k = Math.round(v.x) + ':' + Math.round(v.z),
        c = cells.get(k) || [0, 0, 0];
      c[0] += v.x;
      c[1] += v.z;
      c[2]++;
      cells.set(k, c);
    }
  });
  return [...cells.values()].filter((c) => c[2] >= 6).map((c) => ({ x: c[0] / c[2], z: c[1] / c[2], scale: 1 }));
}

// phone: the phone's lighter build (perf/phone.js phoneLighter). Returns the per-frame detail check (the leaf and
// grass counts per quality tier, diorama/quality.js), or null when the place has no street planting to dress.
export function dressVegetation(place, name, { phone = false } = {}) {
  const root = place.space || place.scene;
  if (!root) return null;
  root.updateWorldMatrix(true, true);
  const dressed = new Set();
  root.traverse((o) => o.userData.diorama && dressed.add(o));
  const skip = (o) => {
    for (let a = o; a; a = a.parent) if (dressed.has(a)) return true;
    return false;
  };
  let planted = false;
  root.traverse((o) => (planted ||= o.isMesh && PLANTED.has(o.userData.surf) && !skip(o)));
  if (!planted) return null;
  let sun = place.sun?.shadow ? place.sun : null;
  if (!sun) (place.scene || root).traverse((o) => (sun ||= o.isDirectionalLight && o.castShadow && o));

  // the street finish on bark, mulch and the leaf cover (diorama/materials.js), one copy per material
  const cache = new Map();
  root.traverse((o) => {
    const kind = o.userData.surf;
    if (!o.isMesh || Array.isArray(o.material) || o.material.map || skip(o)) return;
    if (kind !== 'bark' && (phone || (kind !== 'mulch' && kind !== 'mulch-cover'))) return;
    const key = o.material.uuid + kind;
    if (!cache.has(key)) cache.set(key, streetMaterial(o.material, kind));
    o.material = cache.get(key);
    o.userData.noLook = true;
  });

  // the cards gather where he walks (the place's walk rectangle, docs/game/places.md), and stop where the camera
  // doesn't reach; places without one get them everywhere
  const walk = CHUNKS[name]?.walk || null;
  const group = new THREE.Group();
  group.name = 'street-vegetation';
  group.userData.diorama = {};
  root.add(group);
  const before = new Set(root.children);
  const leaves = dressFoliage(root, {
    budget: 32000,
    tileSize: 10,
    leafShadows: false,
    leafScale: 1.5,
    sun,
    phone,
    maxY: Infinity,
    focus: grow(walk, 3),
    cardBounds: grow(walk, 14),
    leaves: !phone,
    skip,
  });
  const meadow = phone
    ? null
    : meadowDetail(root, place.nav, {
        budget: 6500,
        shadows: false,
        bounds: grow(walk, 4) || [-Infinity, Infinity, -Infinity, Infinity],
        trees: trunks(root, skip),
        skip,
      });
  // what the passes added, into one group the detail check looks after
  for (const o of [...root.children]) if (!before.has(o)) group.add(o);
  group.userData.diorama = { leaves, meadow };
  const detail = detailController(group);
  detail();
  return detail;
}
