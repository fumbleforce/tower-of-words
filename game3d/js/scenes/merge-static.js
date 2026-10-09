// Build-time draw-call merge for a place that never moves: every opaque, untextured mesh under `root` is baked into
// one mesh per material (and shadow setting). Textured signs, see-through glass and light pools stay as they are.
// Vertex colours (the plants' leaves) are kept: meshes with them merge only with each other.
// A big merged mesh is then cut into compact pieces (perf/tile-geometry.js), so what is off screen is culled.
// Call it once at the end of a scene builder, before anything looks meshes up.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { drain } from '../perf/slice.js';
import { tilePieces, pick, followPieces, tiling } from '../perf/tile-geometry.js';
import { hasTex } from '../perf/batch-snap.js';
import { shadowProxy, shadowGeometry, setShadowGeometry, positions } from '../perf/shadow-proxy.js';

const KEEP = ['position', 'normal', 'uv'];

// How a set is cut (perf/tile-geometry.js): what casts a shadow as the screen's tiling says (the draw-call pass merges
// those pieces again near each other, into the batches it builds for their shadows anyway); what doesn't, in pieces
// of tiling().rest triangles that draw themselves (batched, they would be held twice: perf/batch.js keeps its sources).
const cutFor = (o) => (o.castShadow ? tiling() : { max: tiling().rest });

export const mergeStatic = (root) => drain(mergeStaticSteps(root));

// the same, yielding after each mesh copied and each merged set (for builders that run in slices, js/perf/slice.js)
export function* mergeStaticSteps(root) {
  root.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const sets = new Map();
  root.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || Array.isArray(m) || m.transparent || m.map || o.name) return;
    const key = `${m.uuid}|${o.castShadow}|${o.receiveShadow}|${!!o.geometry.attributes.color}|${o.userData.surf || ''}`;
    if (!sets.has(key)) sets.set(key, []);
    sets.get(key).push(o);
  });
  for (const meshes of sets.values()) {
    // one mesh alone stays as it is, unless it is big enough to be cut into pieces
    const cut = cutFor(meshes[0]);
    if (meshes.length < 2 && !tilePieces(meshes[0].geometry, cut)) continue;
    const parts = [],
      shadows = [];
    // the shadow stand-ins (perf/shadow-proxy.js) merge along, each mesh without one casting its own triangles
    const proxied = meshes[0].castShadow && meshes.some(shadowProxy),
      uv = hasTex(meshes[0].material);
    for (const o of meshes) {
      const m = new THREE.Matrix4().multiplyMatrices(toLocal, o.matrixWorld);
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g.attributes))
        if (!KEEP.includes(name) && name !== 'color') g.deleteAttribute(name);
      // texture coordinates only where a texture reads them (zeros held for merging cost a ninth of the memory)
      if (!uv) g.deleteAttribute('uv');
      else if (!g.attributes.uv)
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      parts.push(g.applyMatrix4(m));
      if (proxied) shadows.push(positions(shadowGeometry(o)).applyMatrix4(m));
      yield; // a big set's copies take a phone's frame
    }
    const all = mergeGeometries(parts),
      shadow = proxied ? mergeGeometries(shadows) : null;
    // big ones in pieces, each with the part of the shadow stand-in round it
    const pieces = tilePieces(all, cut);
    const geos = pieces ? pieces.map((tris) => pick(all, tris)) : [all],
      cast = pieces && shadow ? followPieces(shadow, all, pieces) : [shadow];
    if (pieces) (all.dispose(), shadow?.dispose());
    geos.forEach((g, i) => {
      const merged = new THREE.Mesh(g, meshes[0].material);
      merged.castShadow = meshes[0].castShadow;
      merged.receiveShadow = meshes[0].receiveShadow;
      if (meshes[0].userData.surf) merged.userData.surf = meshes[0].userData.surf; // what they're made of (look/)
      setShadowGeometry(merged, cast[i]);
      if (pieces && !merged.castShadow) merged.userData.noBatch = true;
      root.add(merged);
    });
    parts.forEach((g) => g.dispose());
    shadows.forEach((g) => g.dispose());
    for (const o of meshes) o.parent.remove(o);
    yield;
  }
  // groups left empty by the merge
  const empty = [];
  root.traverse((o) => {
    if (o !== root && o.isGroup && !o.children.length) empty.push(o);
  });
  for (const o of empty) o.parent.remove(o);
}
