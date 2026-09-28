// Character parts and recipes (feasibility build, 2026-09-28).
//
// A part is a set of triangles cut from a source model (a Meshy character) plus the source's texture, UVs and skin
// weights. Every source is put on one shared skeleton: the bone names and bone axes of the Meshy API rig (Eric's),
// with the joints where that source has them. So one set of clips (Eric's idle and walk from the API library)
// drives every body, and a part can move from one body to another: each vertex is carried from its bone on the
// source body to the same bone on the host body, scaled by how big that bone's piece of body is on each.
//
//   const lib = await loadLibrary();
//   const ch = await buildCharacter(lib, { body: 'eric', parts: { hair: 'mio-hair', ... }, colours: { hair: '#223344' } });
//   scene.add(ch.root); ch.play('walk'); ... ch.update(dt);
import * as THREE from 'three';
import { GLTFLoader } from '../../game3d/vendor/loaders/GLTFLoader.js';
import { plainFace, reshapeJaw } from './mio-prep.js';

export const ROOT = new URL('../../art/parts/', import.meta.url).href;
export const SLOTS = ['hair', 'head', 'top', 'bottom', 'shoes', 'hands'];

// the shared skeleton: the Meshy API rig's 24 bones (parents are read from the reference source)
export const BONES = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
  'Spine02', 'Spine01', 'Spine', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'neck', 'Head', 'head_end', 'headfront'];
// Mixamo-style rigs (Meshy web app) onto the shared names; extra end bones fold into their parents
const MIXAMO = {
  Hips: 'Hips', Spine: 'Spine02', Spine1: 'Spine01', Spine2: 'Spine', Neck: 'neck', Head: 'Head', HeadTop_End: 'head_end', headfront: 'headfront',
  LeftShoulder: 'LeftShoulder', LeftArm: 'LeftArm', LeftForeArm: 'LeftForeArm', LeftHand: 'LeftHand', LeftHandMiddle4: 'LeftHand',
  RightShoulder: 'RightShoulder', RightArm: 'RightArm', RightForeArm: 'RightForeArm', RightHand: 'RightHand', RightHandMiddle4: 'RightHand',
  LeftUpLeg: 'LeftUpLeg', LeftLeg: 'LeftLeg', LeftFoot: 'LeftFoot', LeftToeBase: 'LeftToeBase', LeftToe_End: 'LeftToeBase',
  RightUpLeg: 'RightUpLeg', RightLeg: 'RightLeg', RightFoot: 'RightFoot', RightToeBase: 'RightToeBase', RightToe_End: 'RightToeBase',
};
const toShared = (name) => (/^mixamorig/.test(name) ? MIXAMO[name.replace(/^mixamorig:?/, '')] || name : name);
// which child gives a bone its direction (used to line up bone axes between rigs whose rest poses differ)
const AIM = { Spine02: 'Spine01', Spine01: 'Spine', Spine: 'neck', neck: 'Head', Head: 'head_end',
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };

const loader = new GLTFLoader();
const loadGLB = (u) => new Promise((ok, no) => loader.load(u, ok, undefined, no));
const getJSON = (u) => fetch(u, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

// ---------- sources ----------

// Load one source model and bring it into the shared form: positions in its bind pose, normalised to height 1
// with the feet at y = 0; skin indices on the shared bone list; per-triangle colour (Mio's palette faces) baked
// into vertex colours. `ref` is the reference source (Eric) whose bone axes everyone shares.
export async function loadSource(id, meta, ref = null) {
  const [gltf, tex, faces] = await Promise.all([
    loadGLB(ROOT + meta.glb),
    new THREE.TextureLoader().loadAsync(ROOT + meta.tex),
    meta.faces ? getJSON(ROOT + meta.faces) : null,
  ]);
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  gltf.scene.updateMatrixWorld(true);
  let sm = null; gltf.scene.traverse((o) => { if (o.isSkinnedMesh && !sm) sm = o; });
  if (faces) { plainFace(sm, faces.faces, faces.palette); reshapeJaw(sm); }
  const g = sm.geometry.index ? sm.geometry.toNonIndexed() : sm.geometry.clone();
  const n = g.attributes.position.count, T = n / 3;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(sm.bindMatrix);
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(sm.bindMatrix); v.toArray(pos, i * 3);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    v.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize(); v.toArray(nrm, i * 3);
  }
  // joints in the bind pose
  const bones = sm.skeleton.bones, J = {};
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  bones.forEach((b, i) => {
    const sh = toShared(b.name);
    if (!BONES.includes(sh) || /HandMiddle4|Toe_End/.test(b.name)) return;   // end bones only lend their weights
    m.copy(sm.skeleton.boneInverses[i]).invert(); m.decompose(p, q, s);
    J[sh] = { p: p.clone(), q: q.clone() };
  });
  for (const b of BONES) if (!J[b]) throw new Error(`${id}: no bone for ${b}`);
  const H = maxY - minY, off = new THREE.Vector3(J.Hips.p.x, minY, J.Hips.p.z);
  for (let i = 0; i < n * 3; i += 3) { pos[i] = (pos[i] - off.x) / H; pos[i + 1] = (pos[i + 1] - off.y) / H; pos[i + 2] = (pos[i + 2] - off.z) / H; }
  const P = {}, R = {};
  for (const b of BONES) { P[b] = J[b].p.clone().sub(off).divideScalar(H); R[b] = J[b].q.clone(); }
  // skin on the shared bones
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const map = bones.map((b) => BONES.indexOf(toShared(b.name)));
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
    si[i * 4 + k] = Math.max(0, map[g.attributes.skinIndex.getComponent(i, k)]);
    sw[i * 4 + k] = g.attributes.skinWeight.getComponent(i, k);
  }
  // per-vertex colour: the palette colour of the triangle, or white where the texture shows
  const col = new Float32Array(n * 3).fill(1), useTex = new Float32Array(n).fill(1), faceRGB = new Array(T).fill(null);
  if (faces) faces.faces.forEach((c, f) => {
    if (!c) return;
    faceRGB[f] = c;
    for (let k = 0; k < 3; k++) { const i = f * 3 + k; col[i * 3] = lin(c[0]); col[i * 3 + 1] = lin(c[1]); col[i * 3 + 2] = lin(c[2]); useTex[i] = 0; }
  });
  const src = { id, meta, tex, n, T, pos, nrm, uv: g.attributes.uv.array.slice(), col, useTex, si, sw, faceRGB, P, R, height: H,
    raw: { off, H, hipsRaw: J.Hips.p.clone() } };
  // bone frames: the reference's bone axes, turned so each bone points the way this source's bone points
  src.B = {};
  for (const b of BONES) {
    if (!ref) { src.B[b] = R[b].clone(); continue; }
    const c = AIM[b];
    const a = new THREE.Quaternion();
    if (c) {
      const dS = P[c].clone().sub(P[b]).normalize(), dR = ref.P[c].clone().sub(ref.P[b]).normalize();
      a.setFromUnitVectors(dR, dS);
    } else {
      // leaf bones and the hips follow their parent's turn
      const par = ref.parent[b];
      if (par && src.B[par]) a.copy(src.B[par]).multiply(ref.B[par].clone().invert());
    }
    src.B[b] = a.multiply(ref.B[b]);
  }
  src.parent = ref ? ref.parent : Object.fromEntries(bones.map((b) => [toShared(b.name), b.parent && b.parent.isBone ? toShared(b.parent.name) : null]));
  src.dom = dominantBones(src);
  return src;
}

// strongest bone of each vertex, and of each triangle (vote of its three vertices)
function dominantBones(src) {
  const vd = new Int16Array(src.n);
  for (let i = 0; i < src.n; i++) { let bi = 0; for (let k = 1; k < 4; k++) if (src.sw[i * 4 + k] > src.sw[i * 4 + bi]) bi = k; vd[i] = src.si[i * 4 + bi]; }
  const td = new Int16Array(src.T);
  for (let t = 0; t < src.T; t++) { const a = vd[t * 3], b = vd[t * 3 + 1], c = vd[t * 3 + 2]; td[t] = a === b || a === c ? a : b === c ? b : a; }
  return { vd, td };
}

// ---------- library ----------

export async function loadLibrary(url = ROOT + 'library.json') {
  const lib = await getJSON(url);
  lib.src = {};
  const refId = lib.reference;
  lib.src[refId] = await loadSource(refId, lib.sources[refId], null);
  await Promise.all(Object.keys(lib.sources).filter((k) => k !== refId).map(async (k) => { lib.src[k] = await loadSource(k, lib.sources[k], lib.src[refId]); }));
  lib.byId = Object.fromEntries((lib.parts || []).map((p) => [p.id, p]));
  for (const [k, s] of Object.entries(lib.src)) {
    s.slotOf = new Array(s.T).fill(null);
    for (const p of lib.parts || []) if (p.source === k) for (const t of p.tris) s.slotOf[t] = p.slot;
    s.fit = boneBoxes(s);
  }
  lib.clips = {};
  return lib;
}

// For each bone, the box (in that bone's own frame) of the body around it: the vertices it moves most, leaving out
// the hair (and, for the head bones, everything except the face), so a part can be scaled to the host's body.
function boneBoxes(src) {
  const out = {}, v = new THREE.Vector3(), inv = {};
  for (const b of BONES) { out[b] = { min: new THREE.Vector3(Infinity, Infinity, Infinity), max: new THREE.Vector3(-Infinity, -Infinity, -Infinity), n: 0 }; inv[b] = src.B[b].clone().invert(); }
  const headish = new Set(['Head', 'head_end', 'headfront']);
  for (let t = 0; t < src.T; t++) {
    const slot = src.slotOf[t];
    if (!slot || slot === 'hair') continue;
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k, b = BONES[src.dom.vd[i]];
      if (headish.has(b) && slot !== 'head') continue;
      v.fromArray(src.pos, i * 3).sub(src.P[b]).applyQuaternion(inv[b]);
      out[b].min.min(v); out[b].max.max(v); out[b].n++;
    }
  }
  // the three head bones share one box (the face and ears)
  const hb = { min: new THREE.Vector3(Infinity, Infinity, Infinity), max: new THREE.Vector3(-Infinity, -Infinity, -Infinity), n: 0 };
  for (let t = 0; t < src.T; t++) if (src.slotOf[t] === 'head') for (let k = 0; k < 3; k++) {
    const i = t * 3 + k; v.fromArray(src.pos, i * 3).sub(src.P.Head).applyQuaternion(inv.Head); hb.min.min(v); hb.max.max(v); hb.n++;
  }
  out.Head = hb;
  return out;
}

// the matrix that carries a point on bone b of body S to the same place on body H
function carry(S, H, b) {
  const bb = b === 'head_end' || b === 'headfront' ? 'Head' : b;   // the three head bones move as one
  const fs = S.fit[bb], fh = H.fit[bb];
  const cS = new THREE.Vector3(), cH = new THREE.Vector3(), r = new THREE.Vector3(1, 1, 1);
  if (fs.n > 8 && fh.n > 8) {
    cS.copy(fs.min).add(fs.max).multiplyScalar(0.5);
    cH.copy(fh.min).add(fh.max).multiplyScalar(0.5);
    const es = fs.max.clone().sub(fs.min), eh = fh.max.clone().sub(fh.min);
    for (let i = 0; i < 3; i++) r.setComponent(i, THREE.MathUtils.clamp(eh.getComponent(i) / Math.max(es.getComponent(i), 1e-4), 0.55, 1.8));
  }
  const M = new THREE.Matrix4().makeTranslation(-S.P[bb].x, -S.P[bb].y, -S.P[bb].z);
  M.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(S.B[bb].clone().invert()));
  M.premultiply(new THREE.Matrix4().makeTranslation(-cS.x, -cS.y, -cS.z));
  M.premultiply(new THREE.Matrix4().makeScale(r.x, r.y, r.z));
  M.premultiply(new THREE.Matrix4().makeTranslation(cH.x, cH.y, cH.z));
  M.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(H.B[bb]));
  M.premultiply(new THREE.Matrix4().makeTranslation(H.P[bb].x, H.P[bb].y, H.P[bb].z));
  const N = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(H.B[bb].clone().multiply(S.B[bb].clone().invert())));
  return { M, N };
}

// ---------- building ----------

// one part as geometry in the host's bind space
function partGeometry(lib, part, H, fit = {}) {
  const S = lib.src[part.source], tris = part.tris, n = tris.length * 3;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const use = new Float32Array(n), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const same = S === H;
  const car = same ? null : Object.fromEntries(BONES.map((b) => [b, carry(S, H, b)]));
  const a = new THREE.Vector3(), acc = new THREE.Vector3(), na = new THREE.Vector3(), nacc = new THREE.Vector3();
  let o = 0;
  for (const t of tris) for (let k = 0; k < 3; k++, o++) {
    const i = t * 3 + k;
    if (same) { for (let c = 0; c < 3; c++) { pos[o * 3 + c] = S.pos[i * 3 + c]; nrm[o * 3 + c] = S.nrm[i * 3 + c]; } }
    else {
      acc.set(0, 0, 0); nacc.set(0, 0, 0); let wsum = 0;
      for (let q = 0; q < 4; q++) {
        const w = S.sw[i * 4 + q]; if (w <= 0) continue;
        const c = car[BONES[S.si[i * 4 + q]]];
        acc.addScaledVector(a.fromArray(S.pos, i * 3).applyMatrix4(c.M), w);
        nacc.addScaledVector(na.fromArray(S.nrm, i * 3).applyMatrix3(c.N), w); wsum += w;
      }
      acc.divideScalar(wsum || 1); nacc.normalize();
      acc.toArray(pos, o * 3); nacc.toArray(nrm, o * 3);
    }
    uv[o * 2] = S.uv[i * 2]; uv[o * 2 + 1] = S.uv[i * 2 + 1];
    for (let c = 0; c < 3; c++) col[o * 3 + c] = S.col[i * 3 + c];
    use[o] = S.useTex[i];
    for (let c = 0; c < 4; c++) { si[o * 4 + c] = S.si[i * 4 + c]; sw[o * 4 + c] = S.sw[i * 4 + c]; }
  }
  // fit tweak: scale and offset around the part's own centre
  if (fit.scale && fit.scale !== 1 || fit.offset) {
    const box = new THREE.Box3().setFromArray(pos), cen = box.getCenter(new THREE.Vector3());
    const sc = fit.scale || 1, of = fit.offset || [0, 0, 0];
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) pos[i * 3 + c] = cen.getComponent(c) + (pos[i * 3 + c] - cen.getComponent(c)) * sc + of[c];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('useTex', new THREE.BufferAttribute(use, 1));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.computeBoundingSphere();
  return g;
}

// The part material: the source texture (and palette colours), the source's look, and a tint that replaces the
// part's main colour (its key) while keeping each texel's shade. Colours far from the key (trim, soles, eyes) stay.
export function partMaterial(S, part) {
  const u = {
    uKey: { value: new THREE.Color().setRGB(...part.key.map((x) => x / 255), THREE.SRGBColorSpace) },
    uTint: { value: new THREE.Color(1, 1, 1) }, uAmt: { value: 0 }, uThr: { value: part.slot === 'head' || part.slot === 'hands' ? 0.16 : 0.2 },
    uSat: { value: S.meta.look ? S.meta.look.sat : 1 }, uCool: { value: new THREE.Vector3(...(S.meta.look ? S.meta.look.mul : [1, 1, 1])) },
  };
  const m = new THREE.MeshLambertMaterial({ map: S.tex, vertexColors: true, flatShading: !!S.meta.flat });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute float useTex;\nvarying float vUseTex;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvUseTex = useTex;');
    sh.fragmentShader = 'varying float vUseTex;\nuniform vec3 uKey, uTint, uCool;\nuniform float uAmt, uThr, uSat;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `
#ifdef USE_MAP
 vec4 texel = texture2D( map, vMapUv );
 diffuseColor.rgb *= mix( vec3( 1.0 ), texel.rgb, vUseTex );
#endif`)
      .replace('#include <color_fragment>', `#include <color_fragment>
 {
  vec3 c = diffuseColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat) * uCool;
  // distance to the key in gamma space, so dark colours are compared fairly
  float d = distance(pow(max(c, 0.0), vec3(1.0 / 2.2)), pow(uKey, vec3(1.0 / 2.2)));
  float k = uAmt * (1.0 - smoothstep(uThr, uThr * 1.8, d));
  float r = clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)) / max(dot(uKey, vec3(0.2126, 0.7152, 0.0722)), 1e-4), 0.35, 2.2);
  diffuseColor.rgb = mix(c, uTint * r, k);
 }`);
  };
  m.userData.u = u;
  return m;
}

// the shared skeleton with the host body's joints
function makeRig(H, ref) {
  const rig = new THREE.Group(); rig.name = 'rig';
  const bones = {};
  for (const b of BONES) { bones[b] = new THREE.Bone(); bones[b].name = b; }
  for (const b of BONES) {
    const par = ref.parent[b];
    if (par) {
      bones[par].add(bones[b]);
      const ip = H.B[par].clone().invert();
      bones[b].position.copy(H.P[b]).sub(H.P[par]).applyQuaternion(ip);
      bones[b].quaternion.copy(ip.multiply(H.B[b]));
    } else { rig.add(bones[b]); bones[b].position.copy(H.P[b]); bones[b].quaternion.copy(H.B[b]); }
  }
  rig.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(BONES.map((b) => bones[b]));
  return { rig, bones, skeleton };
}

// Eric's clips (the Meshy API library) for a host body: bone turns carry over as they are; the hips' height and
// sway are scaled to the host's leg length; scale and other position tracks are dropped.
export async function clipsFor(lib, H) {
  const ref = lib.src[lib.reference], out = {};
  for (const [name, file] of Object.entries(lib.anims)) {
    lib.clips[file] = lib.clips[file] || loadGLB(ROOT + file);
    const g = await lib.clips[file];
    g.scene.updateMatrixWorld(true);
    const hipsNode = g.scene.getObjectByName('Hips');
    const arm = hipsNode.parent.matrixWorld, armQ = new THREE.Quaternion(); arm.decompose(new THREE.Vector3(), armQ, new THREE.Vector3());
    const k = H.P.Hips.y / ref.P.Hips.y;
    const tracks = [];
    for (const tr of g.animations[0].tracks) {
      const [node, prop] = tr.name.split('.');
      if (!BONES.includes(node)) continue;
      if (prop === 'quaternion') {
        const t = tr.clone();
        if (node === 'Hips') { const q = new THREE.Quaternion(); for (let i = 0; i < t.values.length; i += 4) { q.fromArray(t.values, i).premultiply(armQ).toArray(t.values, i); } }
        tracks.push(t);
      } else if (prop === 'position' && node === 'Hips') {
        const vals = tr.values.slice(), v = new THREE.Vector3();
        for (let i = 0; i < vals.length; i += 3) {
          v.fromArray(vals, i).applyMatrix4(arm).sub(ref.raw.off).divideScalar(ref.raw.H).sub(ref.P.Hips).multiplyScalar(k).add(H.P.Hips);
          v.toArray(vals, i);
        }
        tracks.push(new THREE.VectorKeyframeTrack('Hips.position', tr.times.slice(), vals));
      }
    }
    out[name] = new THREE.AnimationClip(name, g.animations[0].duration, tracks);
  }
  return out;
}

// A recipe: { body, parts: { slot: partId }, colours: { hair, top, bottom, shoes, skin }, fit: { slot: { scale, offset } }, height }
export async function buildCharacter(lib, recipe) {
  const H = lib.src[recipe.body], ref = lib.src[lib.reference];
  const { rig, bones, skeleton } = makeRig(H, ref);
  const meshes = {};
  for (const slot of SLOTS) {
    const id = recipe.parts && recipe.parts[slot];
    if (!id) continue;
    const part = lib.byId[id]; if (!part) throw new Error('no part ' + id);
    const g = partGeometry(lib, part, H, (recipe.fit || {})[slot]);
    const mat = partMaterial(lib.src[part.source], part);
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.name = id; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.bind(skeleton, new THREE.Matrix4());
    rig.add(mesh); meshes[slot] = mesh;
  }
  const root = new THREE.Group(), holder = new THREE.Group();
  holder.scale.setScalar(recipe.height || 1.2); holder.add(rig); root.add(holder);
  const ch = { root, rig, bones, skeleton, meshes, recipe, mixer: new THREE.AnimationMixer(rig), actions: {}, cur: null };
  setColours(ch, recipe.colours || {});
  const clips = await clipsFor(lib, H);
  for (const [k, c] of Object.entries(clips)) ch.actions[k] = ch.mixer.clipAction(c);
  ch.play = (name, fade = 0.2) => {
    const a = ch.actions[name]; if (!a || a === ch.cur) return;
    a.reset().fadeIn(ch.cur ? fade : 0).play(); if (ch.cur) ch.cur.fadeOut(fade); ch.cur = a;
  };
  ch.update = (dt) => { ch.mixer.update(dt); if (ch.cur && bones.Hips) { bones.Hips.position.x = H.P.Hips.x; bones.Hips.position.z = H.P.Hips.z; } };
  ch.bindPose = () => { ch.mixer.stopAllAction(); ch.cur = null; skeleton.pose(); };
  return ch;
}

// tint per slot; skin tints the head and hands; null or '' leaves the part's own colour
export function setColours(ch, colours) {
  for (const [slot, mesh] of Object.entries(ch.meshes)) {
    const want = slot === 'head' || slot === 'hands' ? colours.skin : colours[slot];
    const u = mesh.material.userData.u;
    if (want) { u.uTint.value.set(want); u.uAmt.value = 1; } else u.uAmt.value = 0;
  }
}

// skin tones the creator offers (kept in a natural range)
export const SKIN_TONES = ['#f7e3d8', '#f3d3c0', '#e8bfa3', '#d9a47f', '#c08560', '#9c6644', '#7a4b2e'];
