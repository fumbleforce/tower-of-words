// One loader for the Blender-built model sets (a GLB of named nodes, like tools/grounds/planting.py's planting.glb
// or the monorail): loaded once, a node's geometry by name, null until it has loaded or when it can't be fetched
// (patchy signal) or runs outside a browser (unit tests), so the builder falls back to its code-built shape.
//   const set = modelSet(url, { lighter: urlOfThePhoneCopy, read: (mesh) => ({ ...extra fields }) });
//   await set.load({ lighter });   set.get(name)   set.geometry(name, at, scale, ry)   set.set(nodes) (tests)
// outdoor/plant-models.js and train/models.js still have their own loaders; they move onto this one in the kit's
// planting stage and with #366 (notes/architecture/world-kit.md).
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/loaders/GLTFLoader.js';

const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _v = new THREE.Vector3(),
  _s = new THREE.Vector3(),
  UP = new THREE.Vector3(0, 1, 0);

export function modelSet(url, { lighter = null, read = null } = {}) {
  let nodes = null,
    loading = null;
  const set = {
    load({ lighter: lean = false } = {}) {
      if (typeof document === 'undefined') return Promise.resolve(null);
      return (loading ??= new GLTFLoader()
        .loadAsync(lean && lighter ? lighter : url)
        .then((g) => {
          const out = {};
          g.scene.traverse((o) => {
            if (o.isMesh) out[o.name] = { geometry: o.geometry, ...(read ? read(o) : {}) };
          });
          return (nodes = out);
        })
        .catch((e) => (console.warn(String(url), e), null)));
    },
    set(n) {
      nodes = n;
      loading = Promise.resolve(n);
    },
    get: (name) => nodes?.[name] ?? null,
    get ready() {
      return !!nodes;
    },
    // a copy of one node's geometry, scaled (a number or [sx, sy, sz]), turned ry about y and moved to `at`
    geometry(name, at = [0, 0, 0], scale = 1, ry = 0) {
      const n = nodes?.[name];
      if (!n) return null;
      _m.compose(
        _v.set(...at),
        _q.setFromAxisAngle(UP, ry),
        typeof scale === 'number' ? _s.setScalar(scale) : _s.set(...scale),
      );
      return n.geometry.clone().applyMatrix4(_m);
    },
  };
  return set;
}
