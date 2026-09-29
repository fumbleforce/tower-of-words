// Build-time draw-call merge for a place that never moves: every opaque, untextured mesh under `root` is baked into
// one mesh per material (and shadow setting). Textured signs, see-through glass and light pools stay as they are.
// Call it once at the end of a scene builder, before anything looks meshes up.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv'];

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const sets = new Map();
  root.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || Array.isArray(m) || m.transparent || m.map || o.name) return;
    const key = `${m.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!sets.has(key)) sets.set(key, []);
    sets.get(key).push(o);
  });
  for (const meshes of sets.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((o) => {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv)
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld));
    });
    const merged = new THREE.Mesh(mergeGeometries(parts), meshes[0].material);
    merged.castShadow = meshes[0].castShadow;
    merged.receiveShadow = meshes[0].receiveShadow;
    parts.forEach((g) => g.dispose());
    for (const o of meshes) o.parent.remove(o);
    root.add(merged);
  }
  // groups left empty by the merge
  const empty = [];
  root.traverse((o) => {
    if (o !== root && o.isGroup && !o.children.length) empty.push(o);
  });
  for (const o of empty) o.parent.remove(o);
}
