// Cel shading for every lit material in a scene, patched in at load (onBeforeCompile), so places and the Meshy
// characters get it without per-place edits. The light that reaches a surface is measured as a factor of its own
// colour, rounded to whole bands in log space (so it works the same in a dim lobby and a bright train), and put back
// with the light's hue. Darker bands lean toward a navy shadow colour. Optional extras: sparse hatching in the
// shadow band, a faint brushed variation on large surfaces, and a hard rim of window light.
//
// All materials share one uniform set (U), so a style can be tuned live: window.__style.U.uSStep.value = 1.2
import * as THREE from 'three';

export const U = {
  uSStep: { value: 1.0 },          // band width in stops (1 = each band twice as bright as the one below)
  uSSoft: { value: 1.0 },          // band edge softness in pixels
  uSKeep: { value: 0.12 },         // how much of the smooth gradient survives inside a band (1 = no global bands)
  uSHard: { value: 1.0 },          // per light: hard terminator and hard cast-shadow edges (0 = as lit today)
  uSTerm: { value: 0.05 },         // where the terminator sits (N.L)
  uSPool: { value: 0.0 },          // point-lamp pools as flat discs instead of smooth falloff
  uSShadow: { value: new THREE.Color(0.55, 0.62, 0.95) },  // multiplier in the shadow band (linear)
  uSTint: { value: 0.6 },          // how strongly the shadow band takes it
  uSDark: { value: new THREE.Vector2(0.3, 0.85) },         // light factor where the tint is full .. gone
  uSHatch: { value: 0 },           // hatching strength in shadow
  uSHatchScale: { value: 14 },     // lines per metre
  uSBrush: { value: 0 },           // brushed variation on surfaces
  uSRim: { value: 0 },             // rim light strength
  uSRimCol: { value: new THREE.Color(0.85, 0.92, 1.0) },
};

const VERT_PARS = 'varying vec3 vStyleW;\n';
const VERT_MAIN = `
#ifdef USE_INSTANCING
  vStyleW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vStyleW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
`;

const FRAG_PARS = `
uniform float uSStep, uSSoft, uSKeep, uSHard, uSTerm, uSPool, uSTint, uSHatch, uSHatchScale, uSBrush, uSRim;
uniform vec3 uSShadow, uSRimCol;
uniform vec2 uSDark;
varying vec3 vStyleW;
float sHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sHash(i), sHash(i + vec3(1,0,0)), f.x), mix(sHash(i + vec3(0,1,0)), sHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(sHash(i + vec3(0,0,1)), sHash(i + vec3(1,0,1)), f.x), mix(sHash(i + vec3(0,1,1)), sHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

// per-light shaping, placed after the light structs are declared
const FRAG_LIGHTS = `
float sHardS(float s){ return mix(s, smoothstep(0.35, 0.65, s), uSHard); }
void sToonLight(inout IncidentLight L, vec3 n){
  float nl = dot(n, L.direction), snl = clamp(nl, 0.0, 1.0);
  float h = smoothstep(uSTerm - 0.03, uSTerm + 0.03, nl) * mix(1.0, snl, 0.25);
  L.color *= mix(snl, h, uSHard) / max(snl, 0.03);
}
void sToonPoint(inout IncidentLight L, vec3 lc){
  float a = dot(L.color, vec3(0.3, 0.5, 0.2)) / max(dot(lc, vec3(0.3, 0.5, 0.2)), 1e-4);
  float q = smoothstep(0.08, 0.1, a) * 0.35 + smoothstep(0.32, 0.35, a) * 0.45 + smoothstep(0.7, 0.73, a) * 0.2;
  L.color *= mix(1.0, q / max(a, 1e-3), uSPool);
}
`;
function lightsChunk() {
  let c = THREE.ShaderChunk.lights_fragment_begin;
  c = c.replace(/\? (get\w*Shadow\(.*?\)) : 1\.0;/g, '? sHardS( $1 ) : 1.0;');
  c = c.replace(/getPointLightInfo\( pointLight, geometryPosition, directLight \);/, '$& sToonPoint( directLight, pointLight.color );');
  c = c.replace(/RE_Direct\( directLight,/g, 'sToonLight( directLight, geometryNormal ); RE_Direct( directLight,');
  return c;
}

const FRAG_MAIN = `
{
  const vec3 LW = vec3(0.2126, 0.7152, 0.0722);
  vec3 sEmis = totalEmissiveRadiance;
  vec3 sLit = max(outgoingLight - sEmis, vec3(0.0));
  float sLa = max(dot(diffuseColor.rgb, LW), 1e-3);
  float sF = max(dot(sLit, LW) / sLa, 1e-4);
  float sX = log2(sF) / uSStep;
  float sW = max(fwidth(sX) * uSSoft, 1e-3);
  float sQ = floor(sX) + smoothstep(0.5 - sW, 0.5 + sW, fract(sX));
  float sT = exp2(mix(sQ, sX, uSKeep) * uSStep);
  vec3 sCol = sLit * (sT / sF);
  float sDark = 1.0 - smoothstep(uSDark.x, uSDark.y, sT);
  sCol *= mix(vec3(1.0), uSShadow, sDark * uSTint);
  if (uSBrush > 0.0) {
    // long soft strokes: stretched along one world axis, faint
    vec3 p = vStyleW;
    float b = sNoise(vec3(p.x * 0.9, p.y * 6.0, p.z * 0.9)) * 0.6 + sNoise(vec3(p.x * 7.0, p.y * 0.8, p.z * 7.0)) * 0.4;
    sCol *= 1.0 + (b - 0.5) * uSBrush;
  }
  if (uSHatch > 0.0) {
    // sparse diagonal hatching in the shadow band, in patches
    float h = dot(vStyleW, vec3(0.62, 0.45, -0.64)) * uSHatchScale;
    float hw = fwidth(h);
    float line = smoothstep(0.36 - hw, 0.36 + hw, abs(fract(h) - 0.5));
    float hPatch = smoothstep(0.5, 0.62, sNoise(vStyleW * vec3(1.1, 2.0, 1.1)));
    sCol *= 1.0 - line * hPatch * sDark * uSHatch;
  }
  if (uSRim > 0.0) {
    vec3 sV = geometryViewDir;
    float r = 1.0 - abs(dot(normalize(normal), sV));
    float rim = smoothstep(0.72, 0.76, r);
    sCol += uSRimCol * rim * uSRim * sLa;
  }
  outgoingLight = sCol + sEmis;
}
`;

const patched = new WeakSet();
export function patchMaterial(m) {
  if (!m || patched.has(m)) return;
  patched.add(m);
  if (!(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
  if (m.userData.noStyle) return;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey.call(m);
  m.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT_PARS + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_MAIN);
    sh.fragmentShader = FRAG_PARS + sh.fragmentShader
      .replace('#include <lights_pars_begin>', '#include <lights_pars_begin>\n' + FRAG_LIGHTS)
      .replace('#include <lights_fragment_begin>', lightsChunk())
      .replace('#include <opaque_fragment>', FRAG_MAIN + '#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => prevKey + '|toon2';
  m.needsUpdate = true;
}

// patch everything lit in a scene; cheap to call again (already-patched materials are skipped)
export function patchScene(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material)) o.material.forEach(patchMaterial); else patchMaterial(o.material);
  });
}

export function setToon(p) {
  for (const [k, v] of Object.entries(p)) {
    const u = U[k]; if (!u) continue;
    if (u.value && u.value.isColor) u.value.setRGB(...v);
    else if (u.value && u.value.isVector2) u.value.set(...v);
    else u.value = v;
  }
}
