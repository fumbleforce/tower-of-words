// Avenue 2, procedural materials in the shader. One function per material type, picked by the surface tag, driven by
// world position; no textures. Tile: a shade shift per tile, soft mottling, fine flecks, the odd chipped corner and a
// darker rim at the grout. Carpet: fibre noise, carpet tiles laid in alternating pile direction, and a worn path from
// the door to the chair. Plaster: soft cloudy variation. Metal: brushed streaks along its length. Laminate: a faint
// grain. Fabric: a weave with slubs. Plastic, ceramic, card: a very light mottle.
// Fine detail fades out by screen-space derivative (so it doesn't shimmer), and uDetail scales the finest layers
// down for the low tier (phone).
import * as THREE from 'three';

const KIND = { tile: 1, grout: 1, carpet: 2, plaster: 3, wallcap: 3, metal: 4, drawerfront: 4, handle: 4, laminate: 5, fabric: 6, plastic: 7, monitor: 7, tower: 7, keys: 7, ceramic: 7, card: 8, binder: 7, skirting: 7, frame: 3, door: 9 };

export const PU = {
  uDetail: { value: 1 },
  uTileO: { value: new THREE.Vector2(-2.6, -2.0) }, uTileS: { value: 0.8 },
  uWearA: { value: new THREE.Vector2(-2.3, 0.6) }, uWearB: { value: new THREE.Vector2(1.1, -0.85) },
};

const VERT = `
varying vec3 vPW; varying vec3 vPN;
`;
const VERT_MAIN = `
  vPW = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vPN = normalize(mat3(modelMatrix) * objectNormal);
`;
const FRAG = `
uniform float uDetail, uTileS; uniform vec2 uTileO, uWearA, uWearB;
varying vec3 vPW; varying vec3 vPN;
float ph(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float pn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ph(i), ph(i + vec2(1, 0)), f.x), mix(ph(i + vec2(0, 1)), ph(i + vec2(1, 1)), f.x), f.y); }
float pfbm(vec2 p){ return pn(p) * 0.55 + pn(p * 2.03 + 7.1) * 0.3 + pn(p * 4.1 + 3.3) * 0.15; }
// fade for a pattern of frequency f (per metre) on coordinates p: 1 while it's resolved, 0 once it would alias
float paa(vec2 p, float f){ vec2 w = fwidth(p) * f; return clamp(1.5 - max(w.x, w.y) * 2.2, 0.0, 1.0); }
// planar coordinates for a surface: the two axes across its dominant normal
vec2 pplane(vec3 p, vec3 n){ vec3 a = abs(n); return a.y > a.x && a.y > a.z ? p.xz : (a.x > a.z ? p.zy : p.xy); }
float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

vec3 pTile(vec3 c){
  vec2 q = (vPW.xz - uTileO) / uTileS, cell = floor(q), uv = fract(q);
  float r = ph(cell + 3.7), r2 = ph(cell + 11.3);
  float shade = 1.0 + (r - 0.5) * 0.14;
  float mott = 1.0 + (pfbm(vPW.xz * 2.6 + cell * 1.7) - 0.5) * 0.12;
  float fl = pn(vPW.xz * 55.0) ; float fleck = 1.0 + (step(0.84, fl) * 0.08 - step(fl, 0.12) * 0.07) * paa(vPW.xz, 55.0) * uDetail;
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
  // wear: a paler, flatter band along the walk from the door to the chair
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
  float slub = (pn(vec2(p.x * 40.0, p.y * 4.0)) - 0.5) * 0.12;
  float heather = (pn(p * 200.0) - 0.5) * 0.12 * paa(p, 200.0) * uDetail;
  return c * (1.0 + weave + slub + heather);
}
vec3 pPlastic(vec3 c){ vec2 p = pplane(vPW, vPN); return c * (1.0 + (pfbm(p * 6.0) - 0.5) * 0.03); }
vec3 pCard(vec3 c){ vec2 p = pplane(vPW, vPN); return c * (1.0 + (pfbm(p * 12.0) - 0.5) * 0.08 + (pn(vec2(p.x * 3.0, p.y * 120.0)) - 0.5) * 0.05 * paa(p, 120.0)); }
vec3 pDoor(vec3 c){ vec2 p = pplane(vPW, vPN); return c * (1.0 + (pfbm(vec2(p.x * 30.0, p.y * 1.2)) - 0.5) * 0.06); }
`;

function body(kind) {
  const fn = { 1: 'pTile', 2: 'pCarpet', 3: 'pPlaster', 4: 'pMetal', 5: 'pLaminate', 6: 'pFabric', 7: 'pPlastic', 8: 'pCard', 9: 'pDoor' }[kind];
  return `diffuseColor.rgb = ${fn}(diffuseColor.rgb);`;
}
function roughBody(kind) {
  // tile: a little gloss variation per tile; metal: streaks in the gloss too; carpet and fabric stay matte
  if (kind === 1) return 'roughnessFactor = clamp(roughnessFactor + (ph(floor((vPW.xz - uTileO) / uTileS) + 5.1) - 0.5) * 0.12, 0.05, 1.0);';
  if (kind === 4) return 'roughnessFactor = clamp(roughnessFactor - 0.25 + (pn(vPW.xz * vec2(3.0, 200.0) + vPW.y * 200.0) - 0.5) * 0.15, 0.2, 1.0);';
  return '';
}

export function proceduralMaterial(src, surf) {
  const kind = KIND[surf];
  if (!kind || !src.isMeshStandardMaterial) return src;
  const m = src.clone();
  if (surf === 'metal' || surf === 'drawerfront') m.metalness = Math.max(m.metalness, 0.25);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, PU);
    sh.vertexShader = VERT + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_MAIN);
    sh.fragmentShader = FRAG + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + body(kind))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + roughBody(kind));
  };
  m.customProgramCacheKey = () => 'proc' + kind;
  return m;
}
