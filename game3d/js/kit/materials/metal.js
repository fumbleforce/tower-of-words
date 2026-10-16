import*as t from"three";import{skyEnv as l,phoneSized as a}from"./env.js";import{localHorizon as f}from"./glass.js";import{keepPatch as u}from"./patch.js";export const FINISH={brushed:{roughness:.38,metalness:.8,envK:1},painted:{roughness:.32,metalness:.15,envK:1.4,phonePlain:!0},glass:{roughness:.1,metalness:.2,envK:1.1}},FINISH_KEYS=["finish","envK","horizon"];export function finishLook(n){const e=FINISH[n];if(!e)throw new Error("unknown finish "+n);return e.phonePlain&&a()?{roughness:e.roughness,metalness:0}:{roughness:e.roughness,metalness:e.metalness}}export function applyFinish(n,{finish:e,envK:r,horizon:s}={}){const o=FINISH[e];if(!o)throw new Error("unknown finish "+e);return n.userData.finish=e,o.phonePlain&&a()||(Object.assign(n,{envMap:l(),envMapIntensity:r??o.envK}),s&&f(n,s)),n}const i=new t.Color("#8c4f2e");export function wornMetal(n,e=null){return e&&Object.assign(n,{map:e,roughness:1}),n.onBeforeCompile=r=>{const s=e?`
diffuseColor.rgb = mix( diffuseColor.rgb, rustColor * wear.r * 1.25, wear.g );`:"";let o=r.fragmentShader.replace("#include <color_fragment>",`float alphaBeforeColor = diffuseColor.a;
#include <color_fragment>
#ifdef USE_COLOR_ALPHA
float metalClass = vColor.a;
diffuseColor.a = alphaBeforeColor;
#else
float metalClass = 1.0;
#endif`+s);e&&(r.uniforms.rustColor={value:i},o=(`uniform vec3 rustColor;
`+o).replace("#include <map_fragment>",`vec4 wear = texture2D( map, vMapUv );
diffuseColor.rgb *= wear.r * 1.25;`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
roughnessFactor = roughness * wear.b;`)),r.fragmentShader=o.replace("#include <metalnessmap_fragment>","float metalnessFactor = metalness * metalClass"+(e?" * ( 1.0 - wear.g );":";"))},n.customProgramCacheKey=()=>e?"mono-wear":"mono-metal",u(n)}
