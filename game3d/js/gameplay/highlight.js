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

// the root of every person in a place: the named people, the background people (the gate's workers) and the commuters.
// A body is never a thing's parts, even when a person stands in reach of the thing (issue #579: a commuter at the gate
// reader lit up with it)
export function peopleRoots(P) {
  const rigs = [...Object.values(P.people || {}), ...Object.values(P.extras || {}), ...(P.crowd || [])];
  return new Set(rigs.map((r) => r && r.root).filter(Boolean));
}

// A thing with no obj of its own (the copier, the kettle, a stool): the meshes that are its own, found from its anchor.
// The place's meshes carry no tag saying which thing they belong to, so these rules pick them out (issue #579, when a
// stool's outline took the table top, the table's centre leg and two floor tiles beside it):
//   - a merged batch holds many things' triangles in one mesh, so only the parts it was merged from can count;
//   - a floor, or a floor tile (a flat piece at floor level, 0.3 m or wider), is the place's, unless the anchor is down
//     on the floor too and stands on it (a photo lying on the floor is the thing);
//   - a flat piece 0.3 m or wider (a table, a desk, a counter top) is the thing's only when the anchor stands on it;
//   - any other part counts when its centre is within REACH of the anchor and it touches the thing's own core: the
//     parts within CORE of the anchor, and the parts that touch those. A stool takes its own seat and legs, while the
//     table top and the table's leg beside it (which touch only the table) stay out.
//   meshesNear(scene, anchor, skip)   skip: a Set of the people's and things' root objects
const REACH = 0.55; // metres from the anchor to a part's centre, horizontally (the copier, the stool)
const CORE = 0.25; // a part this close to the anchor is the thing's core
const FLAT = 0.3; // a flat piece this wide or wider is a surface (a table top, a floor tile), not a part of a thing
const LOW = 0.1; // an anchor this close to the floor is down there with the floor
const TOUCH = 0.02; // a gap this small between two parts still counts as touching

// the anchor stands on a flat piece: over its footprint, with a little margin
const onTop = (box, a) =>
  a.x >= box.min.x - 0.05 && a.x <= box.max.x + 0.05 && a.z >= box.min.z - 0.05 && a.z <= box.max.z + 0.05;
const touches = (p, q) =>
  p.min.x <= q.max.x + TOUCH &&
  q.min.x <= p.max.x + TOUCH &&
  p.min.y <= q.max.y + TOUCH &&
  q.min.y <= p.max.y + TOUCH &&
  p.min.z <= q.max.z + TOUCH &&
  q.min.z <= p.max.z + TOUCH;

export function meshesNear(scene, a, skip) {
  const parts = [],
    lying = [], // flat pieces on the floor under an anchor that is down there too: the nearest one is the thing
    c = new THREE.Vector3(),
    sz = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  const walk = (o) => {
    if (skip.has(o)) return;
    if (o.isMesh && o.visible && !o.isSkinnedMesh && !o.userData.perfBatch && !o.userData.noOutline) {
      const box = new THREE.Box3().setFromObject(o);
      box.getCenter(c);
      box.getSize(sz);
      const flat = sz.y <= 0.05 && Math.max(sz.x, sz.z) >= FLAT;
      const reach = Math.hypot(c.x - a.x, c.z - a.z);
      const onFloor = flat && box.min.y <= 0.02;
      // walls, floors and counters are too big to be the thing
      if (sz.x <= 1.6 && sz.z <= 1.6 && sz.y <= 2.2 && reach <= REACH && c.y < a.y + 0.3) {
        if (!onFloor) parts.push({ o, box, flat, reach, core: flat ? onTop(box, a) : reach <= CORE });
        else if (a.y <= LOW && onTop(box, a)) lying.push({ o, box, flat, reach, core: true });
      }
    }
    for (const ch of o.children) walk(ch);
  };
  walk(scene);
  if (lying.length) parts.push(lying.reduce((b, p) => (p.reach < b.reach ? p : b)));
  // a thing with nothing this close (hung in the air) starts from the nearest part
  let seeds = parts.filter((p) => p.core);
  if (!seeds.length && parts.length) seeds = [parts.reduce((b, p) => (p.reach < b.reach ? p : b))];
  const found = new Set(seeds),
    grow = [...seeds];
  // a part that touches the thing's own parts joins it. A flat piece the anchor does not stand on joins only through a
  // part that is not flat (two desk tops that touch are two things), and only a flat piece the anchor stands on passes
  // the outline on
  while (grow.length) {
    const p = grow.pop();
    for (const q of parts) {
      if (found.has(q) || !touches(p.box, q.box) || (q.flat && !q.core && p.flat)) continue;
      found.add(q);
      if (!q.flat || q.core) grow.push(q);
    }
  }
  return [...found].map((p) => p.o);
}
