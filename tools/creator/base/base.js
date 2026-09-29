// Base bodies and layers for the character creator.
//
// A base body (art/parts/base/<id>.json + .png, built by build_base.py) is a closed, skin-only body on the shared
// skeleton of its source. Hair, clothes and facial hair go on top as layers: triangles of the source model (the
// creator's parts), drawn as they are. Nothing on the body has to be cut away, so there is nothing to leave a hole.
//
//   const lib = await loadLibrary();
//   const ch = await dressed(lib, 'eric', { base: 'eric-base', layers: ['hair', 'top', 'bottom', 'shoes', 'stubble'] });
import * as THREE from 'three';
import { ROOT, BONES, buildCharacter, partGeometry, partMaterial } from '../recipe.js';
import { disposeCharacter } from '../dispose.js';

const cache = {};
export async function loadBase(id) {
  if (!cache[id]) {
    const pending = (async () => {
      const url = ROOT + 'base/' + id + '.json';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      const d = await response.json();
      const tex = await new THREE.TextureLoader().loadAsync(ROOT + d.tex + '?v=' + Date.now());
      tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter;
      return { d, tex };
    })();
    cache[id] = pending;
    pending.catch(() => { if (cache[id] === pending) delete cache[id]; });
  }
  return cache[id];
}

// the base body as a skinned mesh on the character's skeleton
export function baseMesh(lib, ch, b) {
  const { d, tex } = b, n = d.T * 3;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(d.uv), 2));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  g.setAttribute('useTex', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(d.si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(d.sw), 4));
  const smooth = Array.isArray(d.normal) && d.normal.length === d.pos.length;
  if (d.normal !== undefined && !smooth) { g.dispose(); throw new Error(`${d.id}: malformed vertex normals`); }
  if (smooth) g.setAttribute('normal', new THREE.Float32BufferAttribute(d.normal, 3));
  else g.computeVertexNormals();   // older exports are triangle soup with flat normals
  const S = lib.src[d.source];
  const skinKey = d.skin.map((x) => Math.round(255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055)));
  const m = partMaterial(S, { slot: 'head', key: skinKey });
  m.map = tex; m.flatShading = !smooth; m.needsUpdate = true;
  const mesh = new THREE.SkinnedMesh(g, m);
  mesh.name = d.id; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.bind(ch.skeleton, new THREE.Matrix4());
  return mesh;
}

// a layer: triangles of the body's own source, pushed out along their normals by `lift` (stubble sits on the skin)
export function layerMesh(lib, ch, source, id, tris, key, lift = 0, fitted = null) {
  const part = { id, source, slot: 'hair', key, tris };
  const g = partGeometry(lib, part, lib.src[ch.recipe.body]);
  if (fitted) {
    const count = g.attributes.position.count;
    for (const [field, width] of [['pos', 3], ['normal', 3], ['si', 4], ['sw', 4]]) {
      if (!Array.isArray(fitted[field]) || fitted[field].length !== count * width || !fitted[field].every(Number.isFinite)) {
        g.dispose(); throw new Error(`${id}: invalid fitted ${field}`);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(fitted.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(fitted.normal, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(fitted.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(fitted.sw, 4));
    g.computeBoundingSphere();
  } else if (lift) {
    const p = g.attributes.position, nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + nr.getX(i) * lift, p.getY(i) + nr.getY(i) * lift, p.getZ(i) + nr.getZ(i) * lift);
  }
  const m = partMaterial(lib.src[source], part);
  m.side = THREE.DoubleSide;   // the inside of a sleeve or a hood shows where the layer is open
  const mesh = new THREE.SkinnedMesh(g, m);
  mesh.name = id; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.bind(ch.skeleton, new THREE.Matrix4());
  return mesh;
}

// The layers a source offers: its own hair (without the stubble), top, bottom, shoes, and Eric's stubble.
export function layersOf(lib, sid, b) {
  const stub = new Set(b.d.stubble || []), out = {};
  for (const slot of ['hair', 'top', 'bottom', 'shoes']) {
    const p = lib.byId[`${sid}-${slot}`]; if (!p) continue;
    out[slot] = { tris: p.tris.filter((t) => !stub.has(t)), key: p.key };
  }
  if (stub.size) out.stubble = { tris: [...stub], key: lib.byId[`${sid}-hair`].key, lift: 0.0025 };
  return out;
}

// A character on a base body with some of its source's layers on
export async function dressed(lib, sid, { base = sid + '-base', layers = [], height = 1, fit = null } = {}) {
  const b = await loadBase(base);
  let fitted;
  const L = layersOf(lib, sid, b);
  if (fit) {
    const response = await fetch(ROOT + 'base/' + fit + '.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`${fit}: HTTP ${response.status}`);
    fitted = await response.json();
    if (fitted.base !== base || fitted.source !== sid) throw new Error(`${fit}: wrong base or source`);
    for (const k of layers) {
      if (!L[k]) continue;
      const f = fitted.layers?.[k];
      if (!f || JSON.stringify(f.tris) !== JSON.stringify(L[k].tris)) throw new Error(`${fit}: ${k} triangle order differs`);
    }
  }
  const ch = await buildCharacter(lib, { body: sid, parts: {}, height });
  try {
    const body = baseMesh(lib, ch, b); ch.rig.add(body); ch.meshes.body = body;
    for (const k of layers) {
      const l = L[k]; if (!l) continue;
      const mesh = layerMesh(lib, ch, sid, `${sid}-${k}-layer`, l.tris, l.key, l.lift || 0, fitted?.layers[k]);
      ch.rig.add(mesh); ch.meshes[k] = mesh;
    }
    ch.base = b;
    return ch;
  } catch (error) {
    disposeCharacter(ch);
    throw error;
  }
}
