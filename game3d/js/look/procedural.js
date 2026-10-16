import*as l from"three";import{EXTERIOR_SURFACES as s}from"./exterior.js";const i={tile:1,grout:1,carpet:2,plaster:3,wallcap:3,frame:3,metal:4,drawerfront:4,handle:4,laminate:5,fabric:6,plastic:7,monitor:7,tower:7,keys:7,binder:7,skirting:7,card:8,paper:8,door:9,ceramic:10,concrete:11,stone:12,soil:13,paint:14,grass:15,asphalt:16,cladding:17,foliage:18,bark:19,roof:20,paving:21};export const KINDS=Object.keys(i);const f={1:"pTile",2:"pCarpet",3:"pPlaster",4:"pMetal",5:"pLaminate",6:"pFabric",7:"pPlastic",8:"pCard",9:"pDoor",10:"pCeramic",11:"pConcrete",12:"pStone",13:"pSoil",14:"pPaint",15:"pGrass",16:"pAsphalt",17:"pCladding",18:"pFoliage",19:"pBark",20:"pRoof",21:"pPaving"};export const PROC={on:!0},PU={uDetail:{value:1},uWearA:{value:new l.Vector2(1e4,1e4)},uWearB:{value:new l.Vector2(1e4,1e4)}},setDetail=e=>{PU.uDetail.value=e>=2?1:e===1?.7:.35};const u=`
attribute vec4 aLook; varying vec3 vPW; varying vec3 vPN; varying vec4 vLook;
`,d=`
  vPW = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vPN = normalize(mat3(modelMatrix) * objectNormal);
  vLook = aLook;
`,m=`
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
${s}
`;function h(e){return e===1?"roughnessFactor = clamp(roughnessFactor + (ph(floor((vPW.xz - uTileO) / uTileS) + 5.1) - 0.5) * 0.12, 0.05, 1.0);":e===4?"roughnessFactor = clamp(roughnessFactor - 0.25 + (pn(vPW.xz * vec2(3.0, 200.0) + vPW.y * 200.0) - 0.5) * 0.15, 0.2, 1.0);":e===10?"roughnessFactor = clamp(roughnessFactor - 0.12 + (pfbm(pplane(vPW, vPN) * 7.0) - 0.5) * 0.2, 0.15, 1.0);":""}export const kindOf=e=>i[e]||0,takes=e=>!!e&&(e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial)&&!e.isShaderMaterial;const v=new WeakSet;export const isPatched=e=>v.has(e);function x(){let e=`int lookK = int(vLook.x + 0.5);
`;for(const[a,r]of Object.entries(f))e+=`${a==="1"?"":"else "}if (lookK == ${a}) diffuseColor.rgb = ${r}(diffuseColor.rgb);
`;return e}function g(){let e="";for(const a of[1,4,10])e+=`if (lookK == ${a}) { ${h(a)} }
`;return e}export function setSurface(e,a,r=null){const o=i[a]||0,p=e.attributes.position.count,t=new Float32Array(p*4),c=r||[0,0,.8];for(let n=0;n<p;n++)t[n*4]=o,t[n*4+1]=c[0],t[n*4+2]=c[1],t[n*4+3]=c[2];return e.setAttribute("aLook",new l.BufferAttribute(t,4)),o}export function patchMaterial(e){if(!takes(e))return!1;if(v.has(e))return!0;v.add(e);const a=e.onBeforeCompile,r=e.customProgramCacheKey,o=a!==l.Material.prototype.onBeforeCompile;return e.onBeforeCompile=function(p,t){o&&a.call(this,p,t),Object.assign(p.uniforms,PU),p.vertexShader=u+`attribute vec3 aBake; varying vec3 vBake;
`+p.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
`+d+`  vBake = aBake;
`);let c=`#include <color_fragment>
diffuseColor.rgb *= 1.0 - vBake;
`;PROC.on?c+=x():c+=`int lookK = 0;
`,p.fragmentShader=m+`varying vec3 vBake;
`+p.fragmentShader.replace("#include <color_fragment>",c).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
`+(PROC.on&&this.isMeshStandardMaterial?g():""))},e.customProgramCacheKey=function(){return(o?r.call(this):"")+"|look"+(PROC.on?1:0)},e.defaultAttributeValues={...e.defaultAttributeValues||{},aBake:[0,0,0],aLook:[0,0,0,.8]},e.userData.look=!0,e.needsUpdate=!0,!0}export function setProcedural(e,a=[]){PROC.on=!!e;for(const r of a)r&&r.traverse(o=>{const p=o.material?[].concat(o.material):[];for(const t of p)t&&t.userData&&t.userData.look&&(t.needsUpdate=!0)})}
