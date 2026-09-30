// Shader and texture warm-up for a place built ahead: its shader programs are compiled and its textures uploaded
// while the player is still in the previous place, so entering it doesn't stall on first use (the fast test's
// 100 to 250 ms entry frames were 60 to 80% shader compile; notes/PERF.md).
//
//   await warmPlace(renderer, place, { extra, overrides })
//     extra: objects that will join the place's scene (Eric, Mio); overrides: the materials whole-scene passes draw
//     every mesh with (GTAO's normals, the outline's depth and mask), from the place being played: the next place's
//     passes are new objects with the same settings, so the programs match
//
// Programs are compiled with renderer.compileAsync (KHR_parallel_shader_compile: the driver compiles in the
// background and the page doesn't wait on it), a few materials at a time between frames (js/perf/slice.js). The
// render target is set to a scratch half-float target while compiling, as the RenderPass draws the scene into the
// composer's target (no tone mapping, linear output) and a program compiled for the canvas would not match.
// The full-screen passes of the post-processing and outline use the same shader source in every place and no scene
// lights, so the first place compiles them and the others reuse them from three's program cache.
import * as THREE from 'three';
import { nextFrame } from './slice.js';

const SLICE_MS = 6,
  PER_CALL = 4;
let scratch = null;

// one key per program a mesh can need: the material and what of the mesh changes its program
const keyOf = (o, m) =>
  `${m.id}${o.isSkinnedMesh ? 's' : ''}${o.isInstancedMesh ? 'i' : ''}${o.isBatchedMesh ? 'b' : ''}` +
  `${o.geometry?.attributes?.color ? 'c' : ''}${o.geometry?.morphAttributes?.position ? 'm' : ''}` +
  `${o.receiveShadow ? 'r' : ''}`;

// The shadow pass draws casters with three's own depth material, set up per caster by WebGLShadowMap's
// getDepthMaterial (the caster's map, alpha test and side, flipped); compile() never sees those. A stand-in with the
// same settings compiles the same program, which the shadow pass then finds in the program cache. Stand-ins are
// kept (one per kind of caster) so their programs stay in use. Only the directional and spot light depth material:
// no point light casts shadows in the day.
const FLIP = {
  [THREE.FrontSide]: THREE.BackSide,
  [THREE.BackSide]: THREE.FrontSide,
  [THREE.DoubleSide]: THREE.DoubleSide,
};
const depthStandIns = new Map();
function depthStandIn(o, m) {
  const side = m.shadowSide ?? FLIP[m.side];
  const alphaTest = m.alphaToCoverage ? 0.5 : m.alphaTest;
  const k = `${side}${m.map ? 'm' : ''}${m.alphaMap ? 'a' : ''}${alphaTest > 0 ? 't' : ''}${m.displacementMap ? 'd' : ''}`;
  let d = depthStandIns.get(k);
  if (!d) depthStandIns.set(k, (d = new THREE.MeshDepthMaterial({ side, alphaTest })));
  // this place's textures (not the last place's, which would stay in memory)
  Object.assign(d, { map: m.map, alphaMap: m.alphaMap, displacementMap: m.displacementMap });
  return [`depth${k}${keyOf(o, d).replace(/^\d+/, '')}`, wearing(o, d)];
}

// a stand-in for a mesh (skinning, instancing and morphs come from it) drawn with another material
function wearing(o, m) {
  const proxy = Object.create(o);
  proxy.material = m;
  return proxy;
}

// the meshes whose programs the place's camera will need, one per program key, the casters' depth stand-ins, the
// meshes again in each override material (the passes that draw the whole scene in one material), and every texture
function collect(roots, camera, overrides) {
  const seen = new Set(),
    list = [],
    textures = new Set();
  for (const root of roots)
    root.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || !o.material) return;
      // merged away (layer 31 only): not drawn by the place's camera, nor by the shadow pass
      if (!o.layers.test(camera.layers)) return;
      for (const m of [].concat(o.material)) {
        const k = keyOf(o, m);
        if (o.castShadow && !o.isSprite) {
          const [dk, proxy] = depthStandIn(o, m);
          if (!seen.has(dk)) (seen.add(dk), list.push(proxy));
        }
        if (o.isMesh && m.allowOverride !== false)
          for (const om of overrides) {
            const ok = keyOf(o, om);
            if (!seen.has(ok)) (seen.add(ok), list.push(wearing(o, om)));
          }
        if (seen.has(k)) continue;
        seen.add(k);
        list.push(o);
        for (const v of Object.values(m)) if (v && v.isTexture) textures.add(v);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u?.value?.isTexture) textures.add(u.value);
      }
    });
  return { list, textures };
}

export async function warmPlace(renderer, place, { extra = [], overrides = [] } = {}) {
  const t0 = performance.now();
  const { scene, camera } = place;
  // the draw-call pass (office) swaps in its merged materials in slices after the build: wait for it
  while (place.perf?.busy?.()) await nextFrame();
  const { list, textures } = collect([scene, ...extra.filter(Boolean)], camera, overrides);
  scratch = scratch || new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const pending = [];
  let busy = 0;
  for (let i = 0; i < list.length;) {
    const ts = performance.now();
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(scratch);
    try {
      // compile() walks what it is given with traverse() (and gathers the target scene's lights once a call): a
      // stand-in walks the next few meshes, lit by the place's scene
      while (i < list.length && performance.now() - ts < SLICE_MS) {
        const chunk = list.slice(i, (i += PER_CALL));
        pending.push(renderer.compileAsync({ traverse: (f) => chunk.forEach(f), traverseVisible() {} }, camera, scene));
      }
    } finally {
      renderer.setRenderTarget(prev);
    }
    busy += performance.now() - ts;
    await nextFrame();
  }
  for (const tex of textures) {
    const ts = performance.now();
    renderer.initTexture(tex);
    busy += performance.now() - ts;
    if (performance.now() - ts > 2) await nextFrame();
  }
  await Promise.all(pending);
  // ready in the driver is not yet usable: the first use of a program (three reads its link log and uniform list,
  // WebGLProgram.getUniforms) still waited 10 to 20 ms a program in Chrome. Do that here too, a program or two a slice.
  const programs = new Set();
  for (const o of list)
    for (const m of [].concat(o.material)) {
      const p = renderer.properties.get(m).programs;
      if (p) for (const prog of p.values()) programs.add(prog);
    }
  let ts = performance.now();
  for (const prog of programs) {
    const t = performance.now();
    prog.getUniforms();
    busy += performance.now() - t;
    if (performance.now() - ts > SLICE_MS) {
      await nextFrame();
      ts = performance.now();
    }
  }
  return {
    programs: list.length,
    textures: textures.size,
    busyMs: Math.round(busy),
    ms: Math.round(performance.now() - t0),
  };
}
