// Procedural materials in the shader (texture avenue 2, game3d/design/style/AVENUES.md). One function per material
// type, picked by a surface tag, driven by world position; no textures. Used by the game (look/index.js, every model
// in every place) and by the showcase room (showcase.html).
//   Tile: a shade shift per tile, soft mottling, fine flecks, the odd chipped corner and a darker rim at the grout.
//   Carpet: fibre noise, carpet tiles laid in alternating pile direction, and a worn path (showcase only).
//   Plaster: soft cloudy variation. Metal: brushed streaks along its length. Laminate: a faint grain. Fabric: a weave
//   with slubs. Plastic: a moulded grain. Ceramic: glaze clouds and speckles (plant pots, mugs). Card, painted wood
//   (doors), concrete, stone, soil and a generic painted finish for anything else.
// Fine detail fades out by screen-space derivative (so it doesn't shimmer), and uDetail scales the finest layers
// down for the lower quality tiers (phone).
// Materials are patched in place (patchMaterial), never swapped; what a mesh is made of is a vertex attribute
// (setSurface), so materials that differ only in colour still merge into one batch: code that holds on to a material (fades, clipping,
// colour changes) keeps working, and the draw-call pass in perf/batch.js keeps its batches. The same patch carries
// the baked light of look/bake.js (a per-vertex attribute, aBake; meshes without it are drawn as before).
// On/off at run time (Settings > Graphics > Surface detail): PROC.on is read when a material compiles, and the
// program cache key carries it, so setProcedural() only asks the materials to recompile.
import * as THREE from 'three';

const KIND = {
  tile: 1,
  grout: 1,
  carpet: 2,
  plaster: 3,
  wallcap: 3,
  frame: 3,
  metal: 4,
  drawerfront: 4,
  handle: 4,
  laminate: 5,
  fabric: 6,
  plastic: 7,
  monitor: 7,
  tower: 7,
  keys: 7,
  binder: 7,
  skirting: 7,
  card: 8,
  paper: 8,
  door: 9,
  ceramic: 10,
  concrete: 11,
  stone: 12,
  soil: 13,
  paint: 14,
};
export const KINDS = Object.keys(KIND);
const FN = {
  1: 'pTile',
  2: 'pCarpet',
  3: 'pPlaster',
  4: 'pMetal',
  5: 'pLaminate',
  6: 'pFabric',
  7: 'pPlastic',
  8: 'pCard',
  9: 'pDoor',
  10: 'pCeramic',
  11: 'pConcrete',
  12: 'pStone',
  13: 'pSoil',
  14: 'pPaint',
};

export const PROC = { on: true };
// shared by every procedural material
export const PU = {
  uDetail: { value: 1 },
  uWearA: { value: new THREE.Vector2(1e4, 1e4) },
  uWearB: { value: new THREE.Vector2(1e4, 1e4) }, // the carpet's worn path (off unless set)
};
// fine detail per quality tier: 0 low, 1 medium (phone), 2 high
export const setDetail = (tier) => {
  PU.uDetail.value = tier >= 2 ? 1 : tier === 1 ? 0.7 : 0.35;
};

const VERT = `
attribute vec4 aLook; varying vec3 vPW; varying vec3 vPN; varying vec4 vLook;
`;
const VERT_MAIN = `
  vPW = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vPN = normalize(mat3(modelMatrix) * objectNormal);
  vLook = aLook;
`;
const FRAG = `
uniform float uDetail; uniform vec2 uWearA, uWearB;
varying vec3 vPW; varying vec3 vPN; varying vec4 vLook;
// the tile grid of a tile floor (origin x, z and size), from the mesh's aLook
#define uTileO vLook.yz
#define uTileS max(vLook.w, 0.01)
float ph(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float pn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ph(i), ph(i + vec2(1, 0)), f.x), mix(ph(i + vec2(0, 1)), ph(i + vec2(1, 1)), f.x), f.y); }
float pfbm(vec2 p){ return pn(p) * 0.55 + pn(p * 2.03 + 7.1) * 0.3 + pn(p * 4.1 + 3.3) * 0.15; }
// fade for a pattern of frequency f (per metre) on coordinates p: 1 while it's resolved, 0 once it would alias
float paa(vec2 p, float f){ vec2 w = fwidth(p) * f; return clamp(1.5 - max(w.x, w.y) * 2.2, 0.0, 1.0); }
// planar coordinates for a surface: the two axes across its dominant normal
vec2 pplane(vec3 p, vec3 n){ vec3 a = abs(n); return a.y > a.x && a.y > a.z ? p.xz : (a.x > a.z ? p.zy : p.xy); }
float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// speckles: sparse dots of frequency f, lighter and darker
float pspeck(vec2 p, float f, float k){ float n = pn(p * f); return (step(0.86, n) * k - step(n, 0.1) * k * 0.9) * paa(p, f); }

vec3 pTile(vec3 c){
  vec2 q = (vPW.xz - uTileO) / uTileS, cell = floor(q), uv = fract(q);
  float r = ph(cell + 3.7), r2 = ph(cell + 11.3);
  float shade = 1.0 + (r - 0.5) * 0.14;
  float mott = 1.0 + (pfbm(vPW.xz * 2.6 + cell * 1.7) - 0.5) * 0.12;
  float fleck = 1.0 + pspeck(vPW.xz, 55.0, 0.08) * uDetail;
  // darker rim toward the grout
  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)) * uTileS;
  float rim = mix(0.88, 1.0, smoothstep(0.004, 0.04, e));
  // a chipped corner on some tiles: a small ragged patch of paler backing with a dark lip
  float chip = 1.0;
  if (r2 > 0.7) {
    vec2 cn = vec2(step(0.5, ph(cell + 1.1)), step(0.5, ph(cell + 2.2)));
    vec2 d = abs(uv - cn) * uTileS;
    float k = d.x + d.y + (pn(vPW.xz * 90.0) - 0.5) * 0.02;
    chip = k < 0.07 ? 1.18 : mix(0.84, 1.0, smoothstep(0.07, 0.08, k));
  }
  return c * shade * mott * fleck * rim * chip;
}
vec3 pCarpet(vec3 c){
  vec2 p = vPW.xz;
  vec2 cell = floor(p / 0.5); float odd = mod(cell.x + cell.y, 2.0);
  // pile direction alternates per carpet tile: streaks along x or along z
  vec2 sp = odd > 0.5 ? vec2(p.x * 7.0, p.y * 60.0) : vec2(p.x * 60.0, p.y * 7.0);
  float pile = 1.0 + (pn(sp) - 0.5) * 0.1 * paa(p, 60.0) + (odd - 0.5) * 0.035;
  float fibre = 1.0 + ((pn(p * 170.0) - 0.5) * 0.22 * paa(p, 170.0) + (pn(p * 330.0 + 5.0) - 0.5) * 0.14 * paa(p, 330.0)) * uDetail;
  vec2 fq = fract(p / 0.5); float se = min(min(fq.x, 1.0 - fq.x), min(fq.y, 1.0 - fq.y)) * 0.5;
  float seam = mix(0.93, 1.0, smoothstep(0.0, 0.008, se));
  // wear: a paler, flatter band along a walk
  float w = exp(-pow(segDist(p, uWearA, uWearB) / 0.32, 2.0)) * (0.7 + pn(p * 3.0) * 0.6);
  vec3 col = c * pile * mix(fibre, 1.0, w * 0.6) * seam;
  return mix(col, vec3(dot(col, vec3(0.3, 0.5, 0.2))) * 1.18, w * 0.35);
}
vec3 pPlaster(vec3 c){
  vec2 p = pplane(vPW, vPN);
  float cloud = 1.0 + (pfbm(p * 1.6) - 0.5) * 0.14 + (pn(p * 9.0) - 0.5) * 0.05 * paa(p, 9.0);
  float grain = 1.0 + (pn(p * 80.0) - 0.5) * 0.04 * paa(p, 80.0) * uDetail;
  return c * cloud * grain;
}
vec3 pMetal(vec3 c){
  vec3 a = abs(vPN);
  // streaks along the length: vertical on sides, along x on tops
  vec2 p = a.y > 0.5 ? vec2(vPW.z * 240.0, vPW.x * 3.0) : (a.x > a.z ? vec2(vPW.z * 240.0, vPW.y * 3.0) : vec2(vPW.x * 240.0, vPW.y * 3.0));
  float s = (pn(p) - 0.5) * 0.14 * paa(p / 240.0, 240.0) + (pn(p * vec2(0.25, 1.0) + 9.0) - 0.5) * 0.08;
  return c * (1.0 + s);
}
vec3 pLaminate(vec3 c){
  vec2 p = vPW.xz;
  float g = pfbm(vec2(p.x * 1.5, p.y * 38.0));
  float ring = sin(p.y * 70.0 + g * 9.0) * 0.5 + 0.5;
  return c * (1.0 + (g - 0.5) * 0.1 + (ring - 0.5) * 0.05 * paa(p, 12.0));
}
vec3 pFabric(vec3 c){
  vec2 p = pplane(vPW, vPN);
  float f = 90.0, aa = paa(p, f) * uDetail;
  float weave = (sin(p.x * f * 6.283) * sin(p.y * f * 6.283)) * 0.07 * aa;
  // slubs and a coarser heather that stay visible from the play camera
  float slub = (pn(vec2(p.x * 40.0, p.y * 4.0)) - 0.5) * 0.14 + (pn(vec2(p.x * 3.0, p.y * 22.0) + 4.0) - 0.5) * 0.12;
  float heather = (pn(p * 200.0) - 0.5) * 0.12 * paa(p, 200.0) * uDetail + (pn(p * 28.0) - 0.5) * 0.1 * paa(p, 28.0);
  return c * (1.0 + weave + slub + heather);
}
vec3 pPlastic(vec3 c){ vec2 p = pplane(vPW, vPN); return c * (1.0 + (pfbm(p * 6.0) - 0.5) * 0.07 + (pn(p * 60.0) - 0.5) * 0.05 * paa(p, 60.0) * uDetail); }
vec3 pCard(vec3 c){ vec2 p = pplane(vPW, vPN); return c * (1.0 + (pfbm(p * 12.0) - 0.5) * 0.08 + (pn(vec2(p.x * 3.0, p.y * 120.0)) - 0.5) * 0.05 * paa(p, 120.0)); }
vec3 pDoor(vec3 c){ vec2 p = pplane(vPW, vPN); return c * (1.0 + (pfbm(vec2(p.x * 30.0, p.y * 1.2)) - 0.5) * 0.08 + (pn(vec2(p.x * 90.0, p.y * 3.0)) - 0.5) * 0.04 * paa(p, 90.0)); }
// glazed ceramic: soft clouds in the glaze, a few dark and light speckles, faint bands around the pot
vec3 pCeramic(vec3 c){
  vec2 p = pplane(vPW, vPN);
  float cloud = 1.0 + (pfbm(p * 7.0) - 0.5) * 0.12;
  float band = 1.0 + (pn(vec2(vPW.y * 30.0, 0.5)) - 0.5) * 0.06;
  return c * cloud * band * (1.0 + pspeck(p, 70.0, 0.14) * uDetail + pspeck(p + 3.1, 26.0, 0.08));
}
vec3 pConcrete(vec3 c){
  vec2 p = pplane(vPW, vPN);
  float cloud = 1.0 + (pfbm(p * 0.9) - 0.5) * 0.16 + (pfbm(p * 5.0 + 2.0) - 0.5) * 0.08;
  return c * cloud * (1.0 + pspeck(p, 45.0, 0.1) * uDetail);
}
// stone inlays: veined, cloudy
vec3 pStone(vec3 c){
  vec2 p = pplane(vPW, vPN);
  float v = abs(sin((p.x + p.y * 0.6) * 5.0 + pfbm(p * 2.2) * 7.0));
  return c * (1.0 + (pfbm(p * 3.0) - 0.5) * 0.14 - smoothstep(0.93, 1.0, v) * 0.1 + pspeck(p, 60.0, 0.06) * uDetail);
}
vec3 pSoil(vec3 c){ vec2 p = pplane(vPW, vPN); return c * (1.0 + (pn(p * 60.0) - 0.5) * 0.35 * paa(p, 60.0) + (pn(p * 14.0) - 0.5) * 0.2); }
// anything else: a painted finish, soft cloudy variation and a fine orange-peel
vec3 pPaint(vec3 c){
  vec2 p = pplane(vPW, vPN);
  return c * (1.0 + (pfbm(p * 2.5) - 0.5) * 0.1 + (pn(p * 45.0) - 0.5) * 0.05 * paa(p, 45.0) * uDetail);
}
`;

function roughBody(kind) {
  // tile: a little gloss variation per tile; metal: streaks in the gloss too; ceramic: a glaze; carpet and fabric stay matte
  if (kind === 1)
    return 'roughnessFactor = clamp(roughnessFactor + (ph(floor((vPW.xz - uTileO) / uTileS) + 5.1) - 0.5) * 0.12, 0.05, 1.0);';
  if (kind === 4)
    return 'roughnessFactor = clamp(roughnessFactor - 0.25 + (pn(vPW.xz * vec2(3.0, 200.0) + vPW.y * 200.0) - 0.5) * 0.15, 0.2, 1.0);';
  if (kind === 10)
    return 'roughnessFactor = clamp(roughnessFactor - 0.12 + (pfbm(pplane(vPW, vPN) * 7.0) - 0.5) * 0.2, 0.15, 1.0);';
  return '';
}

export const kindOf = (surf) => KIND[surf] || 0;
export const takes = (m) =>
  !!m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) && !m.isShaderMaterial;
const PATCHED = new WeakSet();
export const isPatched = (m) => PATCHED.has(m);

// every kind in one shader, picked per vertex: materials that differ only in colour still share a batch in the
// draw-call pass (perf/batch.js), whatever each mesh is made of
function pick() {
  let f = 'int lookK = int(vLook.x + 0.5);\n';
  for (const [k, fn] of Object.entries(FN))
    f += `${k === '1' ? '' : 'else '}if (lookK == ${k}) diffuseColor.rgb = ${fn}(diffuseColor.rgb);\n`;
  return f;
}
function roughPick() {
  let f = '';
  for (const k of [1, 4, 10]) f += `if (lookK == ${k}) { ${roughBody(k)} }\n`;
  return f;
}

// The per-mesh surface: a constant vertex attribute aLook = (kind, tile origin x, z, tile size). A mesh without it
// (or kind 0) is drawn as before. Geometry shared with a mesh of another kind must be copied first (look/index.js).
export function setSurface(geometry, surf, tile = null) {
  const k = KIND[surf] || 0,
    n = geometry.attributes.position.count,
    a = new Float32Array(n * 4);
  const t = tile || [0, 0, 0.8];
  for (let i = 0; i < n; i++) {
    a[i * 4] = k;
    a[i * 4 + 1] = t[0];
    a[i * 4 + 2] = t[1];
    a[i * 4 + 3] = t[2];
  }
  geometry.setAttribute('aLook', new THREE.BufferAttribute(a, 4));
  return k;
}

// Patch a lit material in place: it reads the surface patterns (aLook) and the baked light (aBake, 1 minus the
// vertex's colour; look/bake.js). Meshes without those attributes read 0 and look as before. Patching twice is a no-op.
export function patchMaterial(m) {
  if (!takes(m)) return false;
  if (PATCHED.has(m)) return true;
  PATCHED.add(m);
  const prev = m.onBeforeCompile,
    prevKey = m.customProgramCacheKey;
  const had = prev !== THREE.Material.prototype.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) {
    if (had) prev.call(this, sh, r);
    Object.assign(sh.uniforms, PU);
    sh.vertexShader =
      VERT +
      'attribute vec3 aBake; varying vec3 vBake;\n' +
      sh.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n' + VERT_MAIN + '  vBake = aBake;\n',
      );
    let f = '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - vBake;\n';
    if (PROC.on) f += pick();
    else f += 'int lookK = 0;\n';
    sh.fragmentShader =
      FRAG +
      'varying vec3 vBake;\n' +
      sh.fragmentShader
        .replace('#include <color_fragment>', f)
        .replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\n' + (PROC.on && this.isMeshStandardMaterial ? roughPick() : ''),
        );
  };
  m.customProgramCacheKey = function () {
    return (had ? prevKey.call(this) : '') + '|look' + (PROC.on ? 1 : 0);
  };
  // a mesh without aLook / aBake reads 0 (no change); without this WebGL would keep whatever value the slot had last
  m.defaultAttributeValues = { ...(m.defaultAttributeValues || {}), aBake: [0, 0, 0], aLook: [0, 0, 0, 0.8] };
  m.userData.look = true; // the draw-call pass reads userData as part of a material's settings
  m.needsUpdate = true;
  return true;
}

// Switch the surface patterns on or off in these scenes: every patched material recompiles (same objects).
export function setProcedural(on, scenes = []) {
  PROC.on = !!on;
  for (const s of scenes)
    s &&
      s.traverse((o) => {
        const ms = o.material ? [].concat(o.material) : [];
        for (const m of ms) if (m && m.userData && m.userData.look) m.needsUpdate = true;
      });
}
