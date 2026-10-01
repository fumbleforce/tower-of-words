// People's batches (js/perf/batch.js, issue #136): a person's parts merge into one skinned mesh per look, with the
// joints the parts hang from (hips, torso, head, arms, legs, knees: whatever group each part's parent is) as its
// bones. Each part is weighted fully to its own parent, so the batch bends exactly as the parts would have moved:
// a walking or gesturing person draws once (and once more for its shadow) instead of part by part.
// Only a part's own changes (its transform, visibility, material, geometry) send it back to drawing itself; its
// joints may move freely, as long as they stay where they hang and visible.
//
//   rigSnap(o, rig)                   what a part's stillness is judged by (its own state, not its joints')
//   skinOf(list, rig, relMatrix)      the skin attributes and skeleton for the parts in build order
//   skinned(geo, mat, skin)           the batch mesh
//   looseSnap(n) / looseSame(n, s)    the watch on a joint: still visible and hanging where it was
import * as THREE from 'three';

const _m = new THREE.Matrix4();

export function rigSnap(o, rig) {
  if (o.matrixAutoUpdate) o.updateMatrix();
  const m = o.material;
  let s = 'R' + rig.id + ':' + o.parent.id + ':' + m.uuid + ':' + o.geometry.uuid + ':' + m.opacity;
  s += ':' + (m.color ? m.color.getHex() : '');
  if (m.emissive) s += ':' + m.emissive.getHex() + ':' + m.emissiveIntensity;
  for (const v of o.matrix.elements) s += ',' + Math.round(v * 1e5);
  return s;
}

// skinIndex/skinWeight per vertex (the part's parent, weight 1) and one bone per parent, its inverse taken in the
// rig root's frame at the pose the vertices were baked in (relMatrix(o, rig) in batch.js gives that pose)
export function skinOf(list, rig, relMatrix) {
  let nv = 0;
  for (const o of list) nv += o.geometry.attributes.position.count;
  const si = new Uint16Array(nv * 4),
    sw = new Float32Array(nv * 4),
    bones = [],
    at = new Map();
  let v0 = 0;
  for (const o of list) {
    const b = o.parent;
    if (!at.has(b)) at.set(b, bones.push(b) - 1);
    const k = at.get(b),
      n = o.geometry.attributes.position.count;
    for (let i = v0; i < v0 + n; i++) {
      si[i * 4] = k;
      sw[i * 4] = 1;
    }
    v0 += n;
  }
  const inverses = bones.map((b) => relMatrix(b, rig, _m).clone().invert());
  return { si, sw, bones, inverses };
}

export function skinned(geo, mat, skin) {
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skin.si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skin.sw, 4));
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.bind(new THREE.Skeleton(skin.bones, skin.inverses), new THREE.Matrix4());
  // culled by a sphere around the bind pose, grown so limbs swung away from it (a stride, sitting down) stay inside
  mesh.boundingSphere = geo.boundingSphere.clone();
  mesh.boundingSphere.radius *= 1.5;
  mesh.raycast = () => {}; // picking goes by the original parts (main.js modelAt)
  return mesh;
}

// an outlined person's share of a skinned batch (js/perf/batch-twin.js): the same skeleton
export function skinnedTwin(src, geo) {
  const m = new THREE.SkinnedMesh(geo, src.material);
  m.bind(src.skeleton, src.bindMatrix);
  m.boundingSphere = src.boundingSphere.clone();
  return m;
}

export const looseSnap = (n) => ({ v: n.visible, par: n.parent });
export const looseSame = (n, s) => n.visible === s.v && n.parent === s.par;
