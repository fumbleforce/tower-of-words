// The anime trial's material patch (#383; look/anime/flags.js): one onBeforeCompile chained onto each lit material, on
// top of the world look's own patch (look/procedural.js), so nothing is swapped and the draw-call pass keeps its
// batches. Which tricks it carries is fixed by the URL, so each is a define:
//   ANIME_TOON    the sun's light in three tones (dark, a middle band past a soft terminator, full), the shadow and
//                 ambient side tinted cool and a little more saturated instead of greyed, the lit side warmer
//   ANIME_DAPPLE  under tree crowns the sun's shadow becomes leaf shade with light spots (look/anime/canopy.js map)
//   ANIME_PAINT   walls and stone a little darker at the foot and lighter up top, and a low-contrast colour drift
//                 across stone, paving and walls
// Every value lives in one uniform set (U) that the period drives (look/anime/periods.js), so a change of the time of
// day needs no recompile.
import * as THREE from 'three';
import { ANIME } from './flags.js';

export const U = {
  uAShade: { value: new THREE.Color(0.9, 0.97, 1.2) }, // the shadow side's multiplier (linear)
  uALit: { value: new THREE.Color(1.03, 1.0, 0.94) }, // the sunlit side's
  uASat: { value: 1.2 }, // saturation of the shadow side
  uASatAll: { value: 1.12 }, // and of the whole surface
  uATerm: { value: 0.02 }, // where the terminator sits (N.L)
  uASoft: { value: 0.06 }, // its half width
  uAMid: { value: 0.62 }, // the middle tone, as a share of full sun
  uAMidAt: { value: 0.32 }, // N.L where full sun begins
  uAHard: { value: 0.35 }, // cast shadow edges: 0 as rendered, 1 crisp
  uAPaint: { value: 1 },
  uADapple: { value: 0 }, // 0 until a place has a canopy map
  uACanopy: { value: null },
  uACanBox: { value: new THREE.Vector4(0, 0, 1, 1) }, // the map's x, z origin and its size in metres
  uACanTop: { value: 2.2 }, // receivers above this get no leaf shade (the crowns' own tops)
  uASunDir: { value: new THREE.Vector3(0.8, 0.52, -0.3).normalize() }, // toward the sun
};

const DEFS = { toon: 'ANIME_TOON', dapple: 'ANIME_DAPPLE', paint: 'ANIME_PAINT' };
export const wanted = () => Object.keys(DEFS).some((k) => ANIME[k]);

const VERT_PARS = 'varying vec3 vAW; varying vec3 vAN; varying float vAK;\n';
const vertMain = (look) => `
#ifdef USE_INSTANCING
  vAW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vAW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
  vAN = normalize(mat3(modelMatrix) * objectNormal);
  vAK = ${look ? 'aLook.x' : '0.0'};
`;

const FRAG_PARS = `
uniform vec3 uAShade, uALit, uASunDir; uniform float uASat, uASatAll, uATerm, uASoft, uAMid, uAMidAt, uAHard, uAPaint;
uniform float uADapple, uACanTop; uniform sampler2D uACanopy; uniform vec4 uACanBox;
varying vec3 vAW; varying vec3 vAN; varying float vAK;
float aH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float aN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aH(i), aH(i + vec2(1, 0)), f.x), mix(aH(i + vec2(0, 1)), aH(i + vec2(1, 1)), f.x), f.y); }
bool aKind(float k){ return abs(vAK - k) < 0.5; }
`;

// after the light structs: the sun's ramp and its shadow
const FRAG_LIGHTS = `
void aToonDir(inout IncidentLight L, vec3 n){
  float nl = dot(n, L.direction);
  float t = smoothstep(uATerm - uASoft, uATerm + uASoft, nl) * mix(uAMid, 1.0, smoothstep(uAMidAt - uASoft, uAMidAt + uASoft, nl));
  L.color *= t / max(nl, 0.02);
}
float aShadow(float s){
  s = mix(s, smoothstep(0.3, 0.7, s), uAHard);
#ifdef ANIME_DAPPLE
  if (uADapple > 0.0 && vAW.y < uACanTop && !aKind(18.0)) {
    vec2 q = vAW.xz - uASunDir.xz * (vAW.y / max(uASunDir.y, 0.15));
    vec2 uv = (q - uACanBox.xy) / uACanBox.zw;
    float m = texture2D(uACanopy, clamp(uv, 0.0, 1.0)).r;
    float e = aN(q * 1.7) * 0.6 + aN(q * 4.6 + 2.0) * 0.4;
    float mask = smoothstep(0.42, 0.62, m + (e - 0.5) * 0.5);
    float spots = smoothstep(0.68, 0.74, aN(q * 2.2 + 3.1)) + 0.8 * smoothstep(0.72, 0.78, aN(q * 5.3 + 9.2));
    s = mix(s, clamp(spots, 0.0, 1.0), mask * uADapple);
  }
#endif
  return s;
}
`;

function lightsChunk() {
  let c = THREE.ShaderChunk.lights_fragment_begin;
  const a = c.indexOf('#if ( NUM_DIR_LIGHTS > 0 )'),
    b = c.indexOf('#endif', c.indexOf('#pragma unroll_loop_end', a));
  let dir = c.slice(a, b);
  dir = dir.replace(/\? (getShadow\(.*?\)) : 1\.0;/, '? aShadow( $1 ) : 1.0;');
  if (ANIME.toon) dir = dir.replace('RE_Direct(', 'aToonDir( directLight, geometryNormal );\n\t\tRE_Direct(');
  return c.slice(0, a) + dir + c.slice(b);
}

const FRAG_PAINT = `
#ifdef ANIME_PAINT
  if (aKind(3.0) || aKind(11.0) || aKind(12.0) || aKind(14.0) || aKind(17.0) || aKind(20.0) || aKind(21.0)) {
    float side = 1.0 - abs(normalize(vAN).y);
    float up = smoothstep(-0.1, 3.2, vAW.y);
    diffuseColor.rgb *= mix(1.0, mix(0.8, 1.07, up), side * uAPaint);
    vec2 p = vAW.xz + vAW.y * vec2(0.7, -0.45);
    float n = aN(p * 0.55) * 0.6 + aN(p * 1.8 + 4.0) * 0.4;
    float m = aN(p * 0.27 + 11.0);
    float l = dot(diffuseColor.rgb, vec3(0.3333));
    diffuseColor.rgb *= 1.0 + (n - 0.5) * 0.12 * uAPaint;
    diffuseColor.rgb += (m - 0.5) * vec3(0.06, 0.02, -0.05) * l * uAPaint;
  }
#endif
`;

const FRAG_OUT = `
#ifdef ANIME_TOON
{
  const vec3 LW = vec3(0.2126, 0.7152, 0.0722);
  vec3 aD = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  vec3 aI = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  aI = mix(vec3(dot(aI, LW)), aI, uASat) * uAShade;
  vec3 aC = aD * uALit + aI;
  aC = max(mix(vec3(dot(aC, LW)), aC, uASatAll), 0.0);
  outgoingLight = aC + totalEmissiveRadiance;
}
#endif
`;

const done = new WeakSet();
const LIT = (m) => m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial);

export function patchAnime(m) {
  if (!LIT(m) || done.has(m) || m.userData.noAnime) return false;
  done.add(m);
  const prev = m.onBeforeCompile,
    had = prev !== THREE.Material.prototype.onBeforeCompile,
    prevKey = m.customProgramCacheKey;
  const defs = Object.entries(DEFS)
    .filter(([k]) => ANIME[k])
    .map(([, d]) => `#define ${d}\n`)
    .join('');
  m.onBeforeCompile = function (sh, r) {
    if (had) prev.call(this, sh, r);
    if (sh.fragmentShader.includes('uAShade')) return;
    Object.assign(sh.uniforms, U);
    const look = sh.vertexShader.includes('attribute vec4 aLook');
    sh.vertexShader =
      VERT_PARS + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + vertMain(look));
    sh.fragmentShader =
      defs +
      FRAG_PARS +
      sh.fragmentShader
        .replace('#include <lights_pars_begin>', '#include <lights_pars_begin>\n' + FRAG_LIGHTS)
        .replace('#include <lights_fragment_begin>', lightsChunk())
        .replace('#include <alphamap_fragment>', FRAG_PAINT + '#include <alphamap_fragment>')
        .replace('#include <opaque_fragment>', FRAG_OUT + '#include <opaque_fragment>');
  };
  m.customProgramCacheKey = function () {
    return (had ? prevKey.call(this) : '') + '|anime:' + defs.length;
  };
  m.needsUpdate = true;
  return true;
}

// every lit material under these roots; cheap to call again (patched materials are skipped)
export function patchAll(...roots) {
  let n = 0;
  for (const r of roots)
    r?.traverse?.((o) => {
      if (o.isMesh) for (const m of [].concat(o.material)) if (patchAnime(m)) n++;
    });
  return n;
}
