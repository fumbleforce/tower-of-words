// Avenue 4, vertex colour and baked light: at load, a pass writes a colour into every vertex of the room. No pattern,
// no textures; the flat faces get gradients.
//   - big faces (floor, walls, carpet) are subdivided first so a gradient has vertices to live on
//   - occlusion: a cheap estimate from the boxes around each vertex (every other mesh's bounding box, weighted by
//     how much it faces the vertex and how close it is), so corners, wall bottoms, under the desk and around the
//     props' feet go darker
//   - window: faces turned toward the window get warmer, and the floor shades from the window side to the far side
//   - repeated props (binders, chairs, boxes) each get a slightly different tint
// Characters, screens, glass and lamps are left alone. Runtime cost: none (vertex colours in the same materials).
import * as THREE from 'three';
import { R, WIN } from './room.js';

const SKIP = new Set(['screen', 'glass', 'print', 'char', 'decal', 'leaf']);
const STEP = 0.12;   // subdivision of big faces, metres

function subdivide(mesh) {
  const g = mesh.geometry;
  if (g.type !== 'BoxGeometry') return;
  const { width: w, height: h, depth: d } = g.parameters;
  if (Math.max(w, h, d) < 0.6) return;
  const seg = (v) => Math.min(60, Math.max(1, Math.round(v / STEP)));
  mesh.geometry = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  g.dispose();
}

// a small deterministic hash for per-object tints
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };

export function bakeRoom(root, { strength = 1 } = {}) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !SKIP.has(o.userData.surf)) meshes.push(o); });
  const lit = meshes.filter((o) => o.material.colorWrite !== false && !(o.material.emissiveIntensity > 0.5 && o.material.emissive && o.material.emissive.getHex()));
  for (const m of lit) subdivide(m);
  // occluders: world boxes of every visible mesh (the shadow-only shell excluded), a little shrunk
  const occ = [];
  for (const m of lit) {
    if (m.geometry.boundingBox === null) m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    const s = new THREE.Vector3(); b.getSize(s);
    if (Math.max(s.x, s.y, s.z) < 0.05) continue;   // tiny parts don't shade anything
    if (/tile|grout|carpet|plaster|skirting|wallcap/.test(m.userData.surf)) continue;   // the room shell is handled below
    occ.push({ m, b, c: b.getCenter(new THREE.Vector3()), size: Math.min(0.6, (s.x + s.y + s.z) / 3) });
  }
  // the parent group of each mesh identifies "the same object" (its own parts don't occlude it much)
  const owner = (m) => { let o = m; while (o.parent && o.parent !== root) o = o.parent; return o; };
  const winC = new THREE.Vector3((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, R.Z0);
  const warm = new THREE.Color(1.07, 1.0, 0.9), cool = new THREE.Color(0.93, 0.96, 1.04);
  const P = new THREE.Vector3(), Nn = new THREE.Vector3(), Q = new THREE.Vector3(), D = new THREE.Vector3(), nm = new THREE.Matrix3();
  // per-object tint for repeats: a small shift in lightness and hue
  const tintOf = new Map();
  for (const m of lit) {
    const ob = owner(m), key = ob.uuid;
    if (!tintOf.has(key)) {
      const r = hash(key + m.userData.surf);
      tintOf.set(key, ob.userData.repeat || /binder|card/.test(m.userData.surf) ? { l: (r - 0.5) * 0.14, h: (hash(key) - 0.5) * 0.03 } : null);
    }
  }
  const col = new THREE.Color();
  for (const m of lit) {
    const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
    const c = new Float32Array(n * 3);
    nm.getNormalMatrix(m.matrixWorld);
    const me = owner(m);
    // per-part tint (binders on a shelf are one object, so tint by part there)
    let tint = tintOf.get(me.uuid);
    if (/binder|card/.test(m.userData.surf)) { const r = hash(m.uuid); tint = { l: (r - 0.5) * 0.16, h: (hash(m.uuid + 'h') - 0.5) * 0.04 }; }
    const isFloor = /tile|grout|carpet/.test(m.userData.surf);
    for (let i = 0; i < n; i++) {
      P.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      Nn.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      // occlusion
      let o = 0;
      for (const b of occ) {
        if (b.m === m) continue;
        const same = owner(b.m) === me;
        b.b.clampPoint(P, Q);
        D.subVectors(Q, P); const d = D.length();
        if (d < 1e-3) { o += same ? 0.05 : 0.25; continue; }
        D.divideScalar(d);
        const facing = Math.max(0, Nn.dot(D));
        if (facing <= 0) continue;
        const s = b.size;
        o += facing * (s * s) / (s * s + d * d * 9) * (same ? 0.35 : 1);
      }
      let ao = 1 - Math.min(0.6, o * 1.2) * strength;
      // props near the floor: their lower parts darken toward it
      if (!isFloor && !/plaster|skirting|wallcap/.test(m.userData.surf)) ao *= 1 - 0.3 * Math.exp(-P.y / 0.12) * strength;
      // corners of the room: the floor darkens toward the two walls, walls toward the floor
      if (isFloor) { const dw = Math.min(P.z - (R.Z0 + R.T / 2), P.x - (R.X0 + R.T / 2)); ao *= 1 - 0.3 * Math.exp(-Math.max(0, dw) / 0.3) * strength; }
      if (/plaster|skirting/.test(m.userData.surf)) ao *= 1 - 0.25 * Math.exp(-P.y / 0.3) * strength;
      // window: warmth on faces that see it, floor gradient from the window wall to the far side
      D.subVectors(winC, P); const dwin = D.length(); D.normalize();
      const see = Math.max(0, Nn.dot(D)) * Math.exp(-dwin / 2.4);
      const k = isFloor ? THREE.MathUtils.clamp(1 - (P.z - R.Z0) / (R.Z1 - R.Z0), 0, 1) : see;
      col.setRGB(1, 1, 1).lerp(warm, 0.9 * k * strength);
      if (isFloor) col.lerp(cool, 0.5 * (1 - k) * strength).multiplyScalar(0.9 + 0.2 * k);
      col.multiplyScalar(ao);
      if (tint) { col.r *= 1 + tint.l + tint.h; col.g *= 1 + tint.l; col.b *= 1 + tint.l - tint.h; }
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  // materials: vertex colours on (cloned, so the shared props.js materials stay untouched for the other looks)
  const cache = new Map();
  for (const m of lit) {
    const src = m.material;
    if (!cache.has(src.uuid)) { const c = src.clone(); c.vertexColors = true; cache.set(src.uuid, c); }
    m.material = cache.get(src.uuid);
  }
  return lit.length;
}
