// ---------- which meshes the hover and in-reach outline draws around ----------
// The outline pass (main.js) outlines every mesh under the objects it is given, and it masks a mesh by its whole
// shape, ignoring the texture's transparency. Given a person's root, it drew the blob shadow under her as a big
// square (Jørgen, 2026-09-29, with a screenshot of Mio outlined). So it gets the model's own meshes one by one, and
// helpers hung on the model are left out: blob shadows, contact footprints, depth proxies, hidden hit shapes and flat
// see-through decals.
import * as THREE from 'three';

// a mesh that belongs to the model itself
export function modelMesh(o) {
  if (o.userData.noOutline || /blob|shadow|contact|proxy/i.test(o.name || '')) return false;
  const ms = [].concat(o.material || []);
  const unseen = (m) => m.visible === false || m.colorWrite === false || (m.transparent && m.opacity <= 0.01);
  if (!ms.length || ms.every(unseen)) return false;
  const g = o.geometry && o.geometry.type;
  const decal = (m) => m.transparent && m.depthWrite === false;
  if ((g === 'PlaneGeometry' || g === 'CircleGeometry') && ms.every(decal)) return false;
  return true;
}

// the visible model meshes under the given roots; a helper's own children are skipped with it
export function outlineMeshes(roots) {
  const out = [];
  const walk = (o) => {
    if (!o || !o.visible || o.userData.noOutline || o.name === 'contact') return;
    if (o.isMesh && modelMesh(o)) out.push(o);
    for (const c of o.children) walk(c);
  };
  roots.forEach(walk);
  return out;
}

// A thing with no obj of its own (the copier, the kettle, the lift): the small meshes around its anchor, so the
// outline and the kotodama shimmer land on it. People and other things' own models are left out: they only stood
// there when this was first worked out (the office lift took in its two riders and Eric's blob, issue #82).
//   meshesNear(scene, anchor, skip)   skip: a Set of the people's and things' root objects
export function meshesNear(scene, a, skip) {
  const box = new THREE.Box3(),
    c = new THREE.Vector3(),
    sz = new THREE.Vector3(),
    out = [];
  scene.updateMatrixWorld(true);
  const walk = (o) => {
    if (skip.has(o)) return;
    if (o.isMesh && o.visible && !o.isSkinnedMesh) {
      box.setFromObject(o);
      box.getCenter(c);
      box.getSize(sz);
      // walls, floors and counters are too big to be the thing
      if (sz.x <= 1.6 && sz.z <= 1.6 && sz.y <= 2.2 && Math.hypot(c.x - a.x, c.z - a.z) < 0.55 && c.y < a.y + 0.3)
        out.push(o);
    }
    for (const ch of o.children) walk(ch);
  };
  walk(scene);
  return out;
}
