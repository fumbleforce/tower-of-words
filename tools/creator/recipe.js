// Character parts and recipes (feasibility build, 2026-09-28).
//
// A part is a set of triangles cut from a source model (a Meshy character) plus the source's texture, UVs and skin
// weights. Every source is put on one shared skeleton (tools/characters/idle/rig.js: sources, the library, the rig
// and the clips, which the idle bake uses too). So one set of clips drives every body, and a part can move from one
// body to another: each vertex is carried from its bone on the source body to the same bone on the host body,
// scaled by how big that bone's piece of body is on each.
//
//   const lib = await loadLibrary();
//   const ch = await buildCharacter(lib, { body: 'eric', parts: { hair: 'mio-hair', ... }, colours: { hair: '#223344' } });
//   scene.add(ch.root); ch.play('walk'); ... ch.update(dt);
import * as THREE from 'three';
import { BONES, makeRig, clipsFor } from '../characters/idle/rig.js';

export { ROOT, BONES, loadSource, loadLibrary, makeRig, clipsFor } from '../characters/idle/rig.js';
export const SLOTS = ['hair', 'head', 'top', 'bottom', 'shoes', 'hands'];
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
    // The head keeps its shape: one scale, from the depth of the whole head (face plus hair; width and height
    // are thrown off by buns and spikes). The chin lines up; left-right and front-back centre on the whole head.
    if (bb === 'Head') {
      const ks = S.fit.Skull, kh = H.fit.Skull;
      r.setScalar(THREE.MathUtils.clamp((kh.max.z - kh.min.z) / Math.max(ks.max.z - ks.min.z, 1e-4), 0.55, 1.8));
      cS.set((ks.min.x + ks.max.x) / 2, fs.min.y, (ks.min.z + ks.max.z) / 2);
      cH.set((kh.min.x + kh.max.x) / 2, fh.min.y, (kh.min.z + kh.max.z) / 2);
    }
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
export function partGeometry(lib, part, H, fit = {}) {
  const S = lib.src[part.source], tris = part.tris, n = tris.length * 3;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const use = new Float32Array(n), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const same = S === H, rigid = part.slot === 'hair' || part.slot === 'head';
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
        // hair and faces move as one rigid piece with the head: per-bone boxes tore their lower strands apart
        const c = rigid ? car.Head : car[BONES[S.si[i * 4 + q]]];
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
  // Meshy's idle clip swings the hips round and bends over within a few seconds (the game holds one frame of it too)
  const IDLE_HOLD = 0.4;
  ch.play = (name, fade = 0.2) => {
    const a = ch.actions[name]; if (!a || a === ch.cur) return;
    a.reset(); if (name === 'idle') { a.time = IDLE_HOLD; a.timeScale = 0; }
    a.fadeIn(ch.cur ? fade : 0).play(); if (ch.cur) ch.cur.fadeOut(fade); ch.cur = a;
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
