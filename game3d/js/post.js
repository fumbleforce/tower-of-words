import*as t from"three";import{EffectComposer as G}from"three/addons/postprocessing/EffectComposer.js";import{RenderPass as V}from"three/addons/postprocessing/RenderPass.js";import{GTAOPass as A}from"./perf/gtao.js";import{Pass as R,FullScreenQuad as S}from"three/addons/postprocessing/Pass.js";import{currentStyle as M,styleGrade as C,PALETTE as g}from"./style/index.js";import{patchScene as U,setToon as B,U as E}from"./style/toon.js";import{GBufferPass as _,InkPass as H}from"./style/ink.js";import{phoneTier as K}from"./perf/phone.js";import{animePasses as L}from"./look/anime/index.js";export const GRADE={exposure:1,temp:0,tint:0,sat:1,contrast:1,lift:[0,0,0],gain:[1,1,1],shadowTint:[0,0,0],highTint:[0,0,0],vignette:.22,bloom:.35,bloomThreshold:.85,bloomKnee:.35,bloomRadius:.8,focusY:.5,focusBand:.26,focusRamp:.32,blur:2.2,ao:1};const T={0:{ao:!1,bloom:0,blurTaps:0,dpr:1},1:{ao:!0,aoSamples:8,pdSamples:8,bloom:4,blurTaps:8,dpr:1.5},2:{ao:!0,aoSamples:16,pdSamples:16,bloom:5,blurTaps:12,dpr:2}},b="varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";class O extends R{constructor(){super(),this.levels=5,this.strength=.35,this.threshold=.85,this.knee=.35,this.radius=.8,this.rts=[];const e={type:t.HalfFloatType,depthBuffer:!1};for(let c=0;c<6;c++)this.rts.push(new t.WebGLRenderTarget(4,4,e));this.pre=new t.ShaderMaterial({uniforms:{tDiffuse:{value:null},uTexel:{value:new t.Vector2},uThreshold:{value:.85},uKnee:{value:.35}},vertexShader:b,fragmentShader:`uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uThreshold, uKnee; varying vec2 vUv;
        vec3 pick(vec2 uv){ vec3 c = texture2D(tDiffuse, uv).rgb; float l = max(c.r, max(c.g, c.b));
          float s = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee); s = s * s / (4.0 * uKnee + 1e-4);
          float w = max(s, l - uThreshold) / max(l, 1e-4); return c * w; }
        void main(){ vec2 o = uTexel;
          vec3 c = pick(vUv) * 4.0 + pick(vUv + vec2(-o.x, -o.y)) + pick(vUv + vec2(o.x, -o.y)) + pick(vUv + vec2(-o.x, o.y)) + pick(vUv + vec2(o.x, o.y));
          gl_FragColor = vec4(min(c / 8.0, vec3(24.0)), 1.0); }`,depthTest:!1,depthWrite:!1}),this.down=new t.ShaderMaterial({uniforms:{tDiffuse:{value:null},uTexel:{value:new t.Vector2}},vertexShader:b,fragmentShader:`uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
        void main(){ vec2 o = uTexel;
          vec3 c = texture2D(tDiffuse, vUv).rgb * 4.0 + texture2D(tDiffuse, vUv - o).rgb + texture2D(tDiffuse, vUv + o).rgb
            + texture2D(tDiffuse, vUv + vec2(o.x, -o.y)).rgb + texture2D(tDiffuse, vUv + vec2(-o.x, o.y)).rgb;
          gl_FragColor = vec4(c / 8.0, 1.0); }`,depthTest:!1,depthWrite:!1}),this.up=new t.ShaderMaterial({uniforms:{tDiffuse:{value:null},uTexel:{value:new t.Vector2},uRadius:{value:.8}},vertexShader:b,fragmentShader:`uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uRadius; varying vec2 vUv;
        void main(){ vec2 o = uTexel * uRadius;
          vec3 c = texture2D(tDiffuse, vUv + vec2(-2.0 * o.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(2.0 * o.x, 0.0)).rgb
            + texture2D(tDiffuse, vUv + vec2(0.0, -2.0 * o.y)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, 2.0 * o.y)).rgb
            + (texture2D(tDiffuse, vUv + o).rgb + texture2D(tDiffuse, vUv - o).rgb
            + texture2D(tDiffuse, vUv + vec2(o.x, -o.y)).rgb + texture2D(tDiffuse, vUv + vec2(-o.x, o.y)).rgb) * 2.0;
          gl_FragColor = vec4(c / 12.0, 1.0); }`,depthTest:!1,depthWrite:!1,blending:t.AdditiveBlending,transparent:!0}),this.quad=new S(null),this.needsSwap=!1}setSize(e,c){let r=Math.max(1,e>>1),a=Math.max(1,c>>1);for(const l of this.rts)l.setSize(r,a),r=Math.max(1,r>>1),a=Math.max(1,a>>1)}get texture(){return this.rts[0].texture}render(e,c,r){const a=this.quad,l=Math.min(this.levels,this.rts.length),i=e.autoClear;e.autoClear=!1,this.pre.uniforms.tDiffuse.value=r.texture,this.pre.uniforms.uTexel.value.set(1/r.width,1/r.height),this.pre.uniforms.uThreshold.value=this.threshold,this.pre.uniforms.uKnee.value=Math.max(.01,this.knee),a.material=this.pre,e.setRenderTarget(this.rts[0]),e.clear(),a.render(e),a.material=this.down;for(let s=1;s<l;s++){const n=this.rts[s-1];this.down.uniforms.tDiffuse.value=n.texture,this.down.uniforms.uTexel.value.set(1/n.width,1/n.height),e.setRenderTarget(this.rts[s]),e.clear(),a.render(e)}a.material=this.up,this.up.uniforms.uRadius.value=this.radius;for(let s=l-1;s>0;s--){const n=this.rts[s];this.up.uniforms.tDiffuse.value=n.texture,this.up.uniforms.uTexel.value.set(1/n.width,1/n.height),e.setRenderTarget(this.rts[s-1]),a.render(e)}e.autoClear=i}dispose(){for(const e of this.rts)e.dispose();this.pre.dispose(),this.down.dispose(),this.up.dispose(),this.quad.dispose()}}const W=`
uniform sampler2D tDiffuse, tBloom;
uniform vec2 uRes; uniform float uPR;
uniform float uExposure, uBloom, uTemp, uTint, uSat, uContrast, uVignette;
uniform vec3 uLift, uGain, uShadowTint, uHighTint;
uniform float uFocusY, uFocusBand, uFocusRamp, uBlur;
uniform int uTaps;
uniform float uPalAmt, uGrain, uTime;
uniform vec3 uPal0, uPal1, uPal2, uPal3;
varying vec2 vUv;

vec3 neutral(vec3 color){
  const float start = 0.76; const float desat = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= off;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start) return color;
  float d = 1.0 - start;
  float np = 1.0 - d * d / (peak + d - start);
  color *= np / peak;
  float g = 1.0 - 1.0 / (desat * (peak - np) + 1.0);
  return mix(color, vec3(np), g);
}
vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 hdr(vec2 uv){ vec3 c = texture2D(tDiffuse, uv).rgb; if (uBloom > 0.0) c += texture2D(tBloom, uv).rgb * uBloom; return c; }

void main(){
  vec3 c;
  float r = 0.0;
  if (uTaps > 0) {
    float dy = abs(vUv.y - uFocusY);
    r = uBlur * uPR * smoothstep(uFocusBand, uFocusBand + uFocusRamp, dy);
  }
  if (r < 0.35) c = hdr(vUv);
  else {
    // golden-angle disc, weighted toward the centre
    c = hdr(vUv) * 1.5; float wsum = 1.5;
    for (int i = 0; i < 12; i++) {
      if (i >= uTaps) break;
      float fi = float(i) + 0.5;
      float rr = sqrt(fi / float(uTaps)) * r;
      float a = fi * 2.39996;
      vec2 o = vec2(cos(a), sin(a)) * rr / uRes;
      c += hdr(vUv + o); wsum += 1.0;
    }
    c /= wsum;
  }
  c = neutral(c * uExposure);
  c = toSRGB(c);
  // white balance
  c *= vec3(1.0 + 0.10 * uTemp + 0.03 * uTint, 1.0 - 0.05 * uTint, 1.0 - 0.10 * uTemp + 0.03 * uTint);
  // lift / gain
  c = uGain * (c + uLift * (1.0 - c));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // split tone
  c += uShadowTint * pow(1.0 - l, 2.0) + uHighTint * l * l;
  // contrast around mid grey, then saturation
  c = (c - 0.45) * uContrast + 0.45;
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  // style study (?style=): map the tones toward the reference's navy, slate and pale palette, sparing warm skin
  if (uPalAmt > 0.0) {
    float pl = clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    vec3 pm = pl < 0.35 ? mix(uPal0, uPal1, pl / 0.35) : pl < 0.7 ? mix(uPal1, uPal2, (pl - 0.35) / 0.35) : mix(uPal2, uPal3, (pl - 0.7) / 0.3);
    float warm = smoothstep(0.04, 0.16, c.r - c.b);
    c = mix(c, pm + (c - vec3(pl)) * 0.6, uPalAmt * (1.0 - 0.7 * warm));
  }
  if (uGrain > 0.0) {
    float gn = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
    float gl = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c += (gn - 0.5) * uGrain * (1.0 - 0.6 * abs(gl * 2.0 - 1.0));
  }
  // vignette, rounder on a phone
  vec2 v = (vUv - 0.5) * vec2(uRes.x / max(uRes.x, uRes.y), uRes.y / max(uRes.x, uRes.y)) * 2.0;
  c *= 1.0 - uVignette * smoothstep(0.35, 1.25, dot(v, v));
  // a touch of dither so the dark gradients don't band
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;class q extends R{constructor(e){super(),this.bloom=e,this.mat=new t.ShaderMaterial({uniforms:{tDiffuse:{value:null},tBloom:{value:null},uRes:{value:new t.Vector2(1,1)},uPR:{value:1},uExposure:{value:1},uBloom:{value:0},uTemp:{value:0},uTint:{value:0},uSat:{value:1},uContrast:{value:1},uVignette:{value:.2},uLift:{value:new t.Vector3},uGain:{value:new t.Vector3(1,1,1)},uShadowTint:{value:new t.Vector3},uHighTint:{value:new t.Vector3},uFocusY:{value:.5},uFocusBand:{value:.26},uFocusRamp:{value:.3},uBlur:{value:2},uTaps:{value:0},uPalAmt:{value:0},uGrain:{value:0},uTime:{value:0},uPal0:{value:new t.Vector3(...g[0])},uPal1:{value:new t.Vector3(...g[1])},uPal2:{value:new t.Vector3(...g[2])},uPal3:{value:new t.Vector3(...g[3])}},vertexShader:b,fragmentShader:W,depthTest:!1,depthWrite:!1}),this.quad=new S(this.mat)}setSize(e,c){this.mat.uniforms.uRes.value.set(e,c)}render(e,c,r){const a=this.mat.uniforms;a.tDiffuse.value=r.texture,a.tBloom.value=this.bloom.enabled?this.bloom.texture:null,this.bloom.enabled||(a.uBloom.value=0),a.uExposure.value=e.toneMappingExposure*this.exposure,e.setRenderTarget(this.renderToScreen?null:c),this.quad.render(e)}dispose(){this.mat.dispose(),this.quad.dispose()}}export function makePost(h,e,c=2){const r=e.scene,a=e.camera,l=new G(h,new t.WebGLRenderTarget(4,4,{type:t.HalfFloatType,samples:4,depthTexture:new t.DepthTexture(4,4)}));l.addPass(new V(r,a)),e.beforeAO&&l.addPass(e.beforeAO);const i=M();let s=null,n=null;i&&(B(i.toon),U(r),s=new _(r,a),l.addPass(s));for(const f of L(e))l.addPass(f);const v=new A(r,a,4,4);v.updateGtaoMaterial({radius:.55,distanceExponent:1,thickness:.5,scale:1.2,samples:16,distanceFallOff:1}),v.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:5,rings:2,samples:16}),s&&v.setGBuffer(s.depthTexture,s.texture),l.addPass(v),i&&i.ink&&(n=new H(s,a),n.set(i.ink),l.addPass(n));const m=new O;l.addPass(m);const x=new q(m);x.exposure=1,l.addPass(x);const u=C({...GRADE,...e.grade||{}},i),o=x.mat.uniforms;i&&(o.uPalAmt.value=i.final.pal||0,o.uGrain.value=i.final.grain||0);function P(){x.exposure=u.exposure,o.uTemp.value=u.temp,o.uTint.value=u.tint,o.uSat.value=u.sat,o.uContrast.value=u.contrast,o.uVignette.value=u.vignette,o.uLift.value.fromArray(u.lift),o.uGain.value.fromArray(u.gain),o.uShadowTint.value.fromArray(u.shadowTint),o.uHighTint.value.fromArray(u.highTint),o.uFocusY.value=u.focusY,o.uFocusBand.value=u.focusBand,o.uFocusRamp.value=u.focusRamp,o.uBlur.value=u.blur,m.threshold=u.bloomThreshold,m.knee=u.bloomKnee,m.radius=u.bloomRadius,v.blendIntensity=u.ao}let p=c;function w(f){p=f in T?f:f?2:0;const d={...T[p],...K(p)};v.enabled=!!d.ao,d.ao&&(v.updateGtaoMaterial({samples:d.aoSamples}),v.updatePdMaterial({samples:d.pdSamples})),m.enabled=d.bloom>0,m.levels=d.bloom||1,o.uBloom.value=d.bloom>0?u.bloom:0,o.uTaps.value=d.blurTaps,o.uPR.value=h.getPixelRatio(),s&&(s.enabled=!!n||v.enabled)}P(),w(c);const y={composer:l,gtao:v,bloom:m,final:x,grade:u,setQuality:w,get quality(){return p},dpr:(f=p)=>(T[f]||T[2]).dpr,setGrade(f){Object.assign(u,f),P(),w(p)},render(){o.uPR.value=h.getPixelRatio(),i&&k(),l.render()}};let F=0;const D=new t.Vector3;function k(){if(F++%20===0&&U(r),o.uTime.value=(o.uTime.value+.618)%1,n){a.getWorldDirection(D);const f=D.y<-.05?a.position.y/-D.y:15;n.mat.uniforms.uNearRef.value=f}}return i&&(window.__style={id:i.id,name:i.name,toon:{U:E,set:B},ink:n,post:y,gbuf:s}),y}
