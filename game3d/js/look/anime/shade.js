import*as o from"three";import{ANIME as c}from"./flags.js";export const U={uAShade:{value:new o.Color(.9,.97,1.2)},uALit:{value:new o.Color(1.03,1,.94)},uASat:{value:1.2},uASatAll:{value:1.12},uATerm:{value:.02},uASoft:{value:.06},uAMid:{value:.62},uAMidAt:{value:.32},uAHard:{value:.35},uAPaint:{value:1}};const l={toon:"ANIME_TOON",paint:"ANIME_PAINT"};export const wanted=()=>Object.keys(l).some(e=>c[e]);const s=`varying vec3 vAW; varying vec3 vAN; varying float vAK;
`,A=e=>`
#ifdef USE_INSTANCING
  vAW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vAW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
  vAN = normalize(mat3(modelMatrix) * objectNormal);
  vAK = ${e?"aLook.x":"0.0"};
`,v=`
uniform vec3 uAShade, uALit; uniform float uASat, uASatAll, uATerm, uASoft, uAMid, uAMidAt, uAHard, uAPaint;
varying vec3 vAW; varying vec3 vAN; varying float vAK;
float aH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float aN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aH(i), aH(i + vec2(1, 0)), f.x), mix(aH(i + vec2(0, 1)), aH(i + vec2(1, 1)), f.x), f.y); }
bool aKind(float k){ return abs(vAK - k) < 0.5; }
`,p=`
void aToonDir(inout IncidentLight L, vec3 n){
  float nl = dot(n, L.direction);
  float t = smoothstep(uATerm - uASoft, uATerm + uASoft, nl) * mix(uAMid, 1.0, smoothstep(uAMidAt - uASoft, uAMidAt + uASoft, nl));
  L.color *= t / max(nl, 0.02);
}
float aShadow(float s){
  s = mix(s, smoothstep(0.3, 0.7, s), uAHard);
  return s;
}
`;function m(){const e=o.ShaderChunk.lights_fragment_begin;if(!c.toon)return e;const i=e.indexOf("#if ( NUM_DIR_LIGHTS > 0 )"),r=e.indexOf("#endif",e.indexOf("#pragma unroll_loop_end",i));let a=e.slice(i,r);return a=a.replace(/\? (getShadow\(.*?\)) : 1\.0;/,"? aShadow( $1 ) : 1.0;"),a=a.replace("RE_Direct(",`aToonDir( directLight, geometryNormal );
		RE_Direct(`),e.slice(0,i)+a+e.slice(r)}const g=`
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
`,h=`
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
`,u=new WeakSet,S=e=>e&&(e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial);export function patchAnime(e){if(!S(e)||u.has(e)||e.userData.noAnime||(u.add(e),e.customProgramCacheKey!==o.Material.prototype.customProgramCacheKey&&e.customProgramCacheKey().includes("|anime:")))return!1;const i=e.onBeforeCompile,r=i!==o.Material.prototype.onBeforeCompile,a=e.customProgramCacheKey,n=Object.entries(l).filter(([t])=>c[t]).map(([,t])=>`#define ${t}
`).join("");return e.onBeforeCompile=function(t,f){if(r&&i.call(this,t,f),t.fragmentShader.includes("uAShade"))return;Object.assign(t.uniforms,U);const d=t.vertexShader.includes("attribute vec4 aLook");t.vertexShader=s+t.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
`+A(d)),t.fragmentShader=n+v+t.fragmentShader.replace("#include <lights_pars_begin>",`#include <lights_pars_begin>
`+p).replace("#include <lights_fragment_begin>",m()).replace("#include <alphamap_fragment>",g+"#include <alphamap_fragment>").replace("#include <opaque_fragment>",h+"#include <opaque_fragment>")},e.customProgramCacheKey=function(){return(r?a.call(this):"")+"|anime:"+n.replace(/\W+/g,".")},e.needsUpdate=!0,!0}export function patchAll(...e){let i=0;for(const r of e)r?.traverse?.(a=>{if(a.isMesh)for(const n of[].concat(a.material))patchAnime(n)&&i++});return i}
