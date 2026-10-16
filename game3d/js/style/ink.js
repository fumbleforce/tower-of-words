import*as i from"three";import{Pass as n,FullScreenQuad as f}from"three/addons/postprocessing/Pass.js";const p=new WeakMap;function m(a){const e=(a.color?a.color.getHexString():"x")+(a.map?a.map.uuid:"")+(a.vertexColors?"v":"");let t=2166136261;for(let r=0;r<e.length;r++)t^=e.charCodeAt(r),t=Math.imul(t,16777619);return(8+(t>>>0)%240)/255}const x=new WeakMap;function o(a,e){const t=e?x:p;let r=t.get(a);return r||(r=new i.MeshNormalMaterial({flatShading:!!a.flatShading,side:a.side,transparent:!0,blending:i.NoBlending,depthWrite:!0,depthTest:!0}),r.opacity=e?1:a.userData.inkId??m(a),t.set(a,r)),r}function b(a){if(!a.visible||a.isPoints||a.isLine||a.isSprite)return!1;if(!a.isMesh)return!0;const e=Array.isArray(a.material)?a.material[0]:a.material;return!(!e||a.userData.noInk||e.userData.noInk||e.transparent&&(e.opacity<.9||!e.depthWrite)||e.depthWrite===!1||e.colorWrite===!1)}export class GBufferPass extends n{constructor(e,t){super(),this.scene=e,this.camera=t,this.needsSwap=!1,this.depthTexture=new i.DepthTexture(4,4),this.depthTexture.format=i.DepthStencilFormat,this.depthTexture.type=i.UnsignedInt248Type,this.rt=new i.WebGLRenderTarget(4,4,{minFilter:i.NearestFilter,magFilter:i.NearestFilter,depthTexture:this.depthTexture}),this._hidden=[],this._swapped=[]}get texture(){return this.rt.texture}setSize(e,t){this.rt.setSize(e,t)}render(e){const t=this._hidden,r=this._swapped;t.length=0,r.length=0,this.scene.traverseVisible(s=>{if(s===this.scene)return;if(!b(s)){s.visible&&(s.visible=!1,t.push(s));return}if(!s.isMesh)return;r.push(s,s.material);const u=!!s.isSkinnedMesh;s.material=Array.isArray(s.material)?s.material.map(d=>o(d,u)):o(s.material,u)});const l=this.scene.background,c=e.getClearColor(new i.Color),h=e.getClearAlpha(),v=e.autoClear;this.scene.background=null,e.setRenderTarget(this.rt),e.setClearColor(8355839,0),e.autoClear=!1,e.clear(),e.render(this.scene,this.camera),this.scene.background=l,e.setClearColor(c,h),e.autoClear=v;for(const s of t)s.visible=!0;for(let s=0;s<r.length;s+=2)r[s].material=r[s+1]}dispose(){this.rt.dispose(),this.depthTexture.dispose()}}const g="varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",T=`
#include <packing>
uniform sampler2D tDiffuse, tNormal, tDepth;
uniform vec2 uTexel;
uniform float uNear, uFar, uPR;
uniform float uSil, uSilChar, uCrease, uSilT, uCreaseT, uIdOn, uStrength, uNearRef, uTone, uWobble;
uniform vec3 uInk;
varying vec2 vUv;
float rz(vec2 uv){ float d = texture2D(tDepth, uv).x; return -1.0 / perspectiveDepthToViewZ(d, uNear, uFar); } // 1/z (positive)
vec4 nb(vec2 uv){ return texture2D(tNormal, uv); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  float dc = texture2D(tDepth, vUv).x;
  float rc = rz(vUv);
  float z = 1.0 / rc;
  // line weight: heavier close to the camera, with a slow wobble like a hand-held pen
  float nearK = clamp(uNearRef / z, 0.65, 1.6);
  float wob = 1.0;
  if (uWobble > 0.0) { vec2 q = vUv / uTexel * 0.012; wob = 1.0 + uWobble * (hash(floor(q)) - 0.5); }
  float isChar = step(0.985, texture2D(tNormal, vUv).a);
  float rs = max(mix(uSil, uSilChar, isChar) * uPR * nearK * wob, 0.75);
  // silhouettes: Laplacian of 1/z, near side only
  vec2 o = uTexel * rs;
  float l = rz(vUv - vec2(o.x, 0.0)), r = rz(vUv + vec2(o.x, 0.0)), d = rz(vUv - vec2(0.0, o.y)), u = rz(vUv + vec2(0.0, o.y));
  float lap = (l + r - 2.0 * rc) + (d + u - 2.0 * rc);
  float sil = smoothstep(uSilT, uSilT * 2.0, -lap / rc);
  // also the edge against empty background
  if (dc >= 1.0) sil = 0.0;
  // creases and colour edges: right and up neighbours only, so the line is one-sided and thin
  vec2 oc = uTexel * max(uCrease * uPR * wob, 0.75);
  vec4 nc = nb(vUv), nx = nb(vUv + vec2(oc.x, 0.0)), ny = nb(vUv + vec2(0.0, oc.y));
  vec4 nx2 = nb(vUv - vec2(oc.x, 0.0)), ny2 = nb(vUv - vec2(0.0, oc.y));
  vec3 n0 = nc.rgb * 2.0 - 1.0;
  float crease = 0.0, idE = 0.0;
  if (dc < 1.0) {
    float c1 = 1.0 - dot(n0, nx.rgb * 2.0 - 1.0), c2 = 1.0 - dot(n0, ny.rgb * 2.0 - 1.0);
    float c3 = 1.0 - dot(n0, nx2.rgb * 2.0 - 1.0), c4 = 1.0 - dot(n0, ny2.rgb * 2.0 - 1.0);
    crease = smoothstep(uCreaseT, uCreaseT * 1.8, max(max(c1, c2), max(c3, c4)) * 0.5 + max(c1, c2) * 0.5);
    // only where both sides are about the same depth (otherwise it's a silhouette's job)
    float dx = abs(rz(vUv + vec2(oc.x, 0.0)) - rc) / rc, dy = abs(rz(vUv + vec2(0.0, oc.y)) - rc) / rc;
    float same = 1.0 - smoothstep(0.01, 0.03, max(dx, dy));
    idE = uIdOn * same * step(0.5 / 255.0, max(abs(nc.a - nx.a), abs(nc.a - ny.a)));
    crease *= mix(0.6, 1.0, same);
  }
  float a = clamp(max(sil, max(crease * 0.8, idE * 0.7)), 0.0, 1.0) * uStrength;
  // the ink: a navy, or partly a much darker version of the colour under it
  vec3 ink = mix(uInk, col * 0.12, uTone);
  gl_FragColor = vec4(mix(col, ink, a), 1.0);
}`;export class InkPass extends n{constructor(e,t){super(),this.gbuf=e,this.camera=t,this.mat=new i.ShaderMaterial({uniforms:{tDiffuse:{value:null},tNormal:{value:e.texture},tDepth:{value:e.depthTexture},uTexel:{value:new i.Vector2},uNear:{value:.5},uFar:{value:200},uPR:{value:1},uSil:{value:1.5},uSilChar:{value:2.2},uCrease:{value:1},uSilT:{value:.02},uCreaseT:{value:.25},uIdOn:{value:1},uStrength:{value:1},uNearRef:{value:18},uTone:{value:.3},uWobble:{value:0},uInk:{value:new i.Color(.012,.014,.03)}},vertexShader:g,fragmentShader:T,depthTest:!1,depthWrite:!1}),this.quad=new f(this.mat)}set(e){const t=this.mat.uniforms;for(const[r,l]of Object.entries(e))t[r]&&(t[r].value&&t[r].value.isColor?t[r].value.setRGB(...l):t[r].value=l)}setSize(e,t){this.mat.uniforms.uTexel.value.set(1/e,1/t)}render(e,t,r){const l=this.mat.uniforms;l.tDiffuse.value=r.texture,l.uNear.value=this.camera.near,l.uFar.value=this.camera.far,l.uPR.value=Math.min(3,Math.max(.8,1/l.uTexel.value.y/900)),e.setRenderTarget(this.renderToScreen?null:t),this.quad.render(e)}dispose(){this.mat.dispose(),this.quad.dispose()}}
