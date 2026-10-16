// Mio's face and jaw fixes, copied unchanged from game3d/js/mio.js (plainFace, reshapeJaw) so her parts carry
// the same face the game shows. They run on her raw mesh before it is cut. Keep in step with the game's copy.
import * as THREE from 'three';

export function plainFace(mesh, faces, palette) {
  const g = mesh.geometry, pos = g.attributes.position, idx = g.index.array;
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const headBones = new Set([names.indexOf('mixamorigHead'), names.indexOf('headfront')]);
  const skin = palette.reduce((a, c) => (c[0] - c[2] > a[0] - a[2] ? c : a)).join();
  const map = new Map(), uid = new Int32Array(pos.count), groups = [];
  for (let i = 0; i < pos.count; i++) {
    const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(4)).join();
    if (!map.has(k)) { map.set(k, groups.length); groups.push([]); }
    uid[i] = map.get(k); groups[uid[i]].push(i);
  }
  const P = groups.map((gr) => new THREE.Vector3().fromBufferAttribute(pos, gr[0]));
  const N = P.map(() => new THREE.Vector3());
  const onFace = new Uint8Array(P.length), onOther = new Uint8Array(P.length);
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), c = new THREE.Vector3();
  for (let f = 0; f < idx.length / 3; f++) {
    const [a, b, d] = [uid[idx[f * 3]], uid[idx[f * 3 + 1]], uid[idx[f * 3 + 2]]];
    e1.subVectors(P[b], P[a]); e2.subVectors(P[d], P[a]); const n = e1.cross(e2);
    c.copy(P[a]).add(P[b]).add(P[d]).divideScalar(3);
    const col = faces[f];
    const isFace = col ? col.join() === skin : Math.abs(c.x) < 0.31 && c.y < 1.8 && n.z > 0.3 * n.length();
    for (const u of [a, b, d]) { N[u].add(n); if (isFace) onFace[u] = 1; else onOther[u] = 1; }
  }
  const sel = [];
  for (let u = 0; u < P.length; u++) {
    const i = groups[u][0]; let bi = 0;
    for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, bi)) bi = k;
    const p = P[u], n = N[u].normalize();
    if (headBones.has(si.getComponent(i, bi)) && onFace[u] && n.z > 0.45 && p.y > 1.38 && p.y < 1.87 && Math.abs(p.x) < 0.36 && p.z > 0.25) sel.push(u);
  }
  const Y0 = 1.65, basis = (p) => [1, p.y - Y0, (p.y - Y0) ** 2, p.x * p.x];
  const A = [0, 1, 2, 3].map(() => [0, 0, 0, 0, 0]);
  for (const u of sel) { const r = basis(P[u]); for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) A[i][j] += r[i] * r[j]; A[i][4] += r[i] * P[u].z; } }
  for (let i = 0; i < 4; i++) {
    let m = i; for (let k = i + 1; k < 4; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
    [A[i], A[m]] = [A[m], A[i]];
    for (let k = 0; k < 4; k++) if (k !== i) { const t = A[k][i] / A[i][i]; for (let j = i; j < 5; j++) A[k][j] -= t * A[i][j]; }
  }
  const coef = A.map((r, i) => r[4] / r[i]);
  const k = 0.3, mx2 = sel.reduce((s, u) => s + P[u].x ** 2, 0) / sel.length;
  coef[0] += (1 - k) * coef[3] * mx2; coef[3] *= k;
  const kv = 0.3, my2 = sel.reduce((s, u) => s + (P[u].y - Y0) ** 2, 0) / sel.length;
  coef[0] += (1 - kv) * coef[2] * my2; coef[2] *= kv;
  const surf = (p) => basis(p).reduce((s, v, i) => s + v * coef[i], 0);
  for (const u of sel) {
    const p = P[u];
    const r = Math.hypot(p.x / 0.31, (p.y - Y0) / 0.22);
    const w = onOther[u] ? 0 : 1 - THREE.MathUtils.smoothstep(r, 0.85, 1.1);
    const z = p.z + w * (surf(p) - p.z);
    for (const i of groups[u]) pos.setZ(i, z);
  }
  pos.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere();
}

export function reshapeJaw(mesh) {
  const g = mesh.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const names = mesh.skeleton.bones.map((b) => b.name);
  const head = new Set([names.indexOf('mixamorigHead'), names.indexOf('headfront')]);
  const map = new Map(), groups = [];
  for (let i = 0; i < pos.count; i++) {
    const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(4)).join();
    if (!map.has(k)) { map.set(k, groups.length); groups.push([]); }
    groups[map.get(k)].push(i);
  }
  const dom = (i) => { let bi = 0; for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, bi)) bi = k; return si.getComponent(i, bi); };
  const V = groups.map((gr) => ({ gr, p: new THREE.Vector3().fromBufferAttribute(pos, gr[0]), head: head.has(dom(gr[0])) }));
  const EYE = 1.62, L = 1.08, CH = 0.8;
  const low = V.filter((v) => v.head && v.p.y < EYE && v.p.z > -0.1);
  const front = low.filter((v) => v.p.z > 0.28);
  const minY = Math.min(...front.map((v) => v.p.y));
  const tip = front.filter((v) => Math.abs(v.p.x) < 0.08 && v.p.y < minY + 0.02);
  const side = front.filter((v) => Math.abs(v.p.x) > 0.08 && Math.abs(v.p.x) < 0.25 && v.p.y < minY + 0.12).sort((a, b) => a.p.y - b.p.y).slice(0, 2);
  const jawY = side.length ? side.reduce((s, v) => s + v.p.y, 0) / side.length : minY;
  const lift = tip.length ? CH * Math.max(0, jawY - tip[0].p.y) : 0;
  for (const v of tip) v.p.y += lift;
  for (const v of low) if (!tip.includes(v) && Math.abs(v.p.x) < 0.08 && v.p.z > 0.12 && v.p.z <= 0.28 && v.p.y < minY + 0.05) v.p.y += lift * 0.5;
  for (const v of low) v.p.y = EYE - (EYE - v.p.y) * L;
  for (const v of V) if (v.head && v.p.z > -0.1 && v.p.y < EYE) for (const i of v.gr) { pos.setY(i, v.p.y); pos.setZ(i, v.p.z); }
  pos.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere();
}

