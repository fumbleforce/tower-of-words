import*as i from"three";export const U={uSStep:{value:1},uSSoft:{value:1},uSKeep:{value:.12},uSHard:{value:1},uSTerm:{value:.05},uSPool:{value:0},uSShadow:{value:new i.Color(.55,.62,.95)},uSTint:{value:.6},uSDark:{value:new i.Vector2(.3,.85)},uSHatch:{value:0},uSHatchScale:{value:14},uSBrush:{value:0},uSRim:{value:0},uSRimCol:{value:new i.Color(.85,.92,1)}};const l=`varying vec3 vStyleW;
`,n=`
#ifdef USE_INSTANCING
  vStyleW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vStyleW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
`,c=`
uniform float uSStep, uSSoft, uSKeep, uSHard, uSTerm, uSPool, uSTint, uSHatch, uSHatchScale, uSBrush, uSRim;
uniform vec3 uSShadow, uSRimCol;
uniform vec2 uSDark;
varying vec3 vStyleW;
float sHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(sHash(i), sHash(i + vec3(1,0,0)), f.x), mix(sHash(i + vec3(0,1,0)), sHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(sHash(i + vec3(0,0,1)), sHash(i + vec3(1,0,1)), f.x), mix(sHash(i + vec3(0,1,1)), sHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
`,u=`
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
`;function f(){let e=i.ShaderChunk.lights_fragment_begin;return e=e.replace(/\? (get\w*Shadow\(.*?\)) : 1\.0;/g,"? sHardS( $1 ) : 1.0;"),e=e.replace(/getPointLightInfo\( pointLight, geometryPosition, directLight \);/,"$& sToonPoint( directLight, pointLight.color );"),e=e.replace(/RE_Direct\( directLight,/g,"sToonLight( directLight, geometryNormal ); RE_Direct( directLight,"),e}const h=`
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
`,s=new WeakSet;export function patchMaterial(e){if(!e||s.has(e)||(s.add(e),!(e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial))||e.userData.noStyle)return;const o=e.onBeforeCompile,a=e.customProgramCacheKey.call(e);e.onBeforeCompile=function(t,r){o&&o.call(this,t,r),Object.assign(t.uniforms,U),t.vertexShader=l+t.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
`+n),t.fragmentShader=c+t.fragmentShader.replace("#include <lights_pars_begin>",`#include <lights_pars_begin>
`+u).replace("#include <lights_fragment_begin>",f()).replace("#include <opaque_fragment>",h+"#include <opaque_fragment>")},e.customProgramCacheKey=()=>a+"|toon2",e.needsUpdate=!0}export function patchScene(e){e.traverse(o=>{o.isMesh&&(Array.isArray(o.material)?o.material.forEach(patchMaterial):patchMaterial(o.material))})}export function setToon(e){for(const[o,a]of Object.entries(e)){const t=U[o];t&&(t.value&&t.value.isColor?t.value.setRGB(...a):t.value&&t.value.isVector2?t.value.set(...a):t.value=a)}}
