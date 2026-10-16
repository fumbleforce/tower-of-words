import*as r from"three";import{Pass as s,FullScreenQuad as i}from"three/addons/postprocessing/Pass.js";const l="varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",o=`
#include <packing>
uniform sampler2D tDiffuse, tDepth;
uniform vec2 uTexel; uniform float uNear, uFar, uW, uSil, uCrease, uFade0, uFade1, uDark, uStrength;
varying vec2 vUv;
float iz(vec2 uv){ return -1.0 / perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
void main(){
  vec4 base = texture2D(tDiffuse, vUv);
  float d = texture2D(tDepth, vUv).x;
  if (d >= 1.0) { gl_FragColor = base; return; }
  float c = iz(vUv), z = 1.0 / c;
  vec2 o = uTexel * uW;
  float l = iz(vUv - vec2(o.x, 0.0)), r = iz(vUv + vec2(o.x, 0.0));
  float b = iz(vUv - vec2(0.0, o.y)), t = iz(vUv + vec2(0.0, o.y));
  // second differences of 1/z, relative: positive where this pixel is nearer than its neighbours' line (the near side)
  float sx = (2.0 * c - l - r) / c, sy = (2.0 * c - b - t) / c;
  float near = max(max(sx, sy), 0.0), turn = max(abs(sx), abs(sy));
  float sil = smoothstep(uSil, uSil * 2.0, near);
  float crease = smoothstep(uCrease, uCrease * 2.0, turn) * 0.7;
  float a = max(sil, crease) * uStrength * (1.0 - smoothstep(uFade0, uFade1, z));
  vec3 col = base.rgb;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 ink = max(mix(vec3(lum), col, 1.35), 0.0) * uDark;
  gl_FragColor = vec4(mix(col, ink, a), base.a);
}`;export class EdgePass extends s{constructor(e){super(),this.camera=e,this.mat=new r.ShaderMaterial({uniforms:{tDiffuse:{value:null},tDepth:{value:null},uTexel:{value:new r.Vector2(1,1)},uNear:{value:.1},uFar:{value:100},uW:{value:1},uSil:{value:.02},uCrease:{value:.004},uFade0:{value:28},uFade1:{value:70},uDark:{value:.32},uStrength:{value:1}},vertexShader:l,fragmentShader:o,depthTest:!1,depthWrite:!1}),this.quad=new i(this.mat)}setSize(e,t){const a=this.mat.uniforms;a.uTexel.value.set(1/e,1/t),a.uW.value=Math.min(3,Math.max(1.2,t/560))}render(e,t,a){const u=this.mat.uniforms;u.tDiffuse.value=a.texture,u.tDepth.value=a.depthTexture,u.uNear.value=this.camera.near,u.uFar.value=this.camera.far,e.setRenderTarget(this.renderToScreen?null:t),this.quad.render(e)}dispose(){this.mat.dispose(),this.quad.dispose()}}
