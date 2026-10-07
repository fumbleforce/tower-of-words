// The shared look pass for every place: ambient occlusion, bloom on lamps and screens, and one final pass that
// tone-maps, grades the colour per place, adds a light tilt-shift blur toward the top and bottom of the frame
// and a soft vignette. Three quality tiers the shell can switch between:
//   0 low     grade and vignette only (no AO, no bloom, no blur), pixel ratio 1
//   1 medium  light AO (not on phones), bloom from half resolution, a light tilt-shift, pixel ratio up to 1.5
//   2 high    full AO, a deeper bloom chain, the full tilt-shift, pixel ratio up to 2
// Each place may carry a `grade` object (see GRADE below); anything it leaves out keeps the default.
//
// Use: const post = makePost(renderer, place, tier); post.composer.render(); post.setQuality(tier);
//      post.dpr(tier) gives the pixel-ratio cap for a tier.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { currentStyle, styleGrade, PALETTE } from './style/index.js';
import { patchScene, setToon, U as TOON_U } from './style/toon.js';
import { GBufferPass, InkPass } from './style/ink.js';
import { phoneTier } from './perf/phone.js';

// Neutral defaults. Values are in display space unless noted.
export const GRADE = {
  exposure: 1.0, // before tone mapping
  temp: 0, // -1 cool .. +1 warm (white balance)
  tint: 0, // -1 green .. +1 magenta
  sat: 1.0,
  contrast: 1.0,
  lift: [0, 0, 0], // added to the shadows
  gain: [1, 1, 1], // multiplies the highlights
  shadowTint: [0, 0, 0], // split toning: pushed into the darks
  highTint: [0, 0, 0], // and into the lights
  vignette: 0.22,
  bloom: 0.35,
  bloomThreshold: 0.85,
  bloomKnee: 0.35,
  bloomRadius: 0.8,
  focusY: 0.5, // tilt-shift: centre of the sharp band (0 bottom, 1 top)
  focusBand: 0.26, // half height of the sharp band
  focusRamp: 0.32, // how far the blur takes to reach full
  blur: 2.2, // max blur radius in CSS pixels
  ao: 1.0, // AO blend
};

const TIERS = {
  0: { ao: false, bloom: 0, blurTaps: 0, dpr: 1 },
  1: { ao: true, aoSamples: 8, pdSamples: 8, bloom: 4, blurTaps: 8, dpr: 1.5 },
  2: { ao: true, aoSamples: 16, pdSamples: 16, bloom: 5, blurTaps: 12, dpr: 2 },
};

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

// ---------- bloom: soft threshold, a dual-filter (Kawase) down/up chain, added back onto the frame ----------
class BloomPass extends Pass {
  constructor() {
    super();
    this.levels = 5;
    this.strength = 0.35;
    this.threshold = 0.85;
    this.knee = 0.35;
    this.radius = 0.8;
    this.rts = [];
    const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false };
    for (let i = 0; i < 6; i++) this.rts.push(new THREE.WebGLRenderTarget(4, 4, rtOpts));
    this.pre = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uThreshold: { value: 0.85 },
        uKnee: { value: 0.35 },
      },
      vertexShader: VERT,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uThreshold, uKnee; varying vec2 vUv;
        vec3 pick(vec2 uv){ vec3 c = texture2D(tDiffuse, uv).rgb; float l = max(c.r, max(c.g, c.b));
          float s = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee); s = s * s / (4.0 * uKnee + 1e-4);
          float w = max(s, l - uThreshold) / max(l, 1e-4); return c * w; }
        void main(){ vec2 o = uTexel;
          vec3 c = pick(vUv) * 4.0 + pick(vUv + vec2(-o.x, -o.y)) + pick(vUv + vec2(o.x, -o.y)) + pick(vUv + vec2(-o.x, o.y)) + pick(vUv + vec2(o.x, o.y));
          gl_FragColor = vec4(min(c / 8.0, vec3(24.0)), 1.0); }`,
      depthTest: false,
      depthWrite: false,
    });
    this.down = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: VERT,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;
        void main(){ vec2 o = uTexel;
          vec3 c = texture2D(tDiffuse, vUv).rgb * 4.0 + texture2D(tDiffuse, vUv - o).rgb + texture2D(tDiffuse, vUv + o).rgb
            + texture2D(tDiffuse, vUv + vec2(o.x, -o.y)).rgb + texture2D(tDiffuse, vUv + vec2(-o.x, o.y)).rgb;
          gl_FragColor = vec4(c / 8.0, 1.0); }`,
      depthTest: false,
      depthWrite: false,
    });
    this.up = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 0.8 } },
      vertexShader: VERT,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uRadius; varying vec2 vUv;
        void main(){ vec2 o = uTexel * uRadius;
          vec3 c = texture2D(tDiffuse, vUv + vec2(-2.0 * o.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(2.0 * o.x, 0.0)).rgb
            + texture2D(tDiffuse, vUv + vec2(0.0, -2.0 * o.y)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, 2.0 * o.y)).rgb
            + (texture2D(tDiffuse, vUv + o).rgb + texture2D(tDiffuse, vUv - o).rgb
            + texture2D(tDiffuse, vUv + vec2(o.x, -o.y)).rgb + texture2D(tDiffuse, vUv + vec2(-o.x, o.y)).rgb) * 2.0;
          gl_FragColor = vec4(c / 12.0, 1.0); }`,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    this.quad = new FullScreenQuad(null);
    this.needsSwap = false; // the result is read by the final pass from this.texture
  }
  setSize(w, h) {
    let W = Math.max(1, w >> 1),
      H = Math.max(1, h >> 1);
    for (const rt of this.rts) {
      rt.setSize(W, H);
      W = Math.max(1, W >> 1);
      H = Math.max(1, H >> 1);
    }
  }
  get texture() {
    return this.rts[0].texture;
  }
  render(renderer, writeBuffer, readBuffer) {
    const q = this.quad,
      n = Math.min(this.levels, this.rts.length);
    const old = renderer.autoClear;
    renderer.autoClear = false;
    this.pre.uniforms.tDiffuse.value = readBuffer.texture;
    this.pre.uniforms.uTexel.value.set(1 / readBuffer.width, 1 / readBuffer.height);
    this.pre.uniforms.uThreshold.value = this.threshold;
    this.pre.uniforms.uKnee.value = Math.max(0.01, this.knee);
    q.material = this.pre;
    renderer.setRenderTarget(this.rts[0]);
    renderer.clear();
    q.render(renderer);
    q.material = this.down;
    for (let i = 1; i < n; i++) {
      const src = this.rts[i - 1];
      this.down.uniforms.tDiffuse.value = src.texture;
      this.down.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      renderer.setRenderTarget(this.rts[i]);
      renderer.clear();
      q.render(renderer);
    }
    q.material = this.up;
    this.up.uniforms.uRadius.value = this.radius;
    for (let i = n - 1; i > 0; i--) {
      const src = this.rts[i];
      this.up.uniforms.tDiffuse.value = src.texture;
      this.up.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      renderer.setRenderTarget(this.rts[i - 1]);
      q.render(renderer); // added onto the level above
    }
    renderer.autoClear = old;
  }
  dispose() {
    for (const rt of this.rts) rt.dispose();
    this.pre.dispose();
    this.down.dispose();
    this.up.dispose();
    this.quad.dispose();
  }
}

// ---------- final: bloom add, tilt-shift, tone map, grade, vignette, to the screen ----------
const FINAL_FRAG = `
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
}`;

class FinalPass extends Pass {
  constructor(bloom) {
    super();
    this.bloom = bloom;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPR: { value: 1 },
        uExposure: { value: 1 },
        uBloom: { value: 0 },
        uTemp: { value: 0 },
        uTint: { value: 0 },
        uSat: { value: 1 },
        uContrast: { value: 1 },
        uVignette: { value: 0.2 },
        uLift: { value: new THREE.Vector3() },
        uGain: { value: new THREE.Vector3(1, 1, 1) },
        uShadowTint: { value: new THREE.Vector3() },
        uHighTint: { value: new THREE.Vector3() },
        uFocusY: { value: 0.5 },
        uFocusBand: { value: 0.26 },
        uFocusRamp: { value: 0.3 },
        uBlur: { value: 2 },
        uTaps: { value: 0 },
        uPalAmt: { value: 0 },
        uGrain: { value: 0 },
        uTime: { value: 0 },
        uPal0: { value: new THREE.Vector3(...PALETTE[0]) },
        uPal1: { value: new THREE.Vector3(...PALETTE[1]) },
        uPal2: { value: new THREE.Vector3(...PALETTE[2]) },
        uPal3: { value: new THREE.Vector3(...PALETTE[3]) },
      },
      vertexShader: VERT,
      fragmentShader: FINAL_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  setSize(w, h) {
    this.mat.uniforms.uRes.value.set(w, h);
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.mat.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tBloom.value = this.bloom.enabled ? this.bloom.texture : null;
    if (!this.bloom.enabled) u.uBloom.value = 0;
    u.uExposure.value = renderer.toneMappingExposure * this.exposure;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.mat.dispose();
    this.quad.dispose();
  }
}

export function makePost(renderer, place, tier = 2) {
  const scene = place.scene,
    camera = place.camera;
  const composer = new EffectComposer(
    renderer,
    // with its depth as a texture: the outline reads it instead of drawing the scene's depth again (perf/outline.js)
    new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(4, 4),
    }),
  );
  composer.addPass(new RenderPass(scene, camera));
  if (place.beforeAO) composer.addPass(place.beforeAO);
  // style study (?style=1..6): cel shading patched into every lit material, and a G-buffer that feeds both the ink
  // lines and the AO pass (so AO doesn't draw the scene a second time)
  const S = currentStyle();
  let gbuf = null,
    ink = null;
  if (S) {
    setToon(S.toon);
    patchScene(scene);
    gbuf = new GBufferPass(scene, camera);
    composer.addPass(gbuf);
  }
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.updateGtaoMaterial({
    radius: 0.55,
    distanceExponent: 1.0,
    thickness: 0.5,
    scale: 1.2,
    samples: 16,
    distanceFallOff: 1.0,
  });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16 });
  if (gbuf) gtao.setGBuffer(gbuf.depthTexture, gbuf.texture);
  composer.addPass(gtao);
  if (S && S.ink) {
    ink = new InkPass(gbuf, camera);
    ink.set(S.ink);
    composer.addPass(ink);
  }
  const bloom = new BloomPass();
  composer.addPass(bloom);
  const final = new FinalPass(bloom);
  final.exposure = 1;
  composer.addPass(final);

  const g = styleGrade({ ...GRADE, ...(place.grade || {}) }, S);
  const u = final.mat.uniforms;
  if (S) {
    u.uPalAmt.value = S.final.pal || 0;
    u.uGrain.value = S.final.grain || 0;
  }
  function applyGrade() {
    final.exposure = g.exposure;
    u.uTemp.value = g.temp;
    u.uTint.value = g.tint;
    u.uSat.value = g.sat;
    u.uContrast.value = g.contrast;
    u.uVignette.value = g.vignette;
    u.uLift.value.fromArray(g.lift);
    u.uGain.value.fromArray(g.gain);
    u.uShadowTint.value.fromArray(g.shadowTint);
    u.uHighTint.value.fromArray(g.highTint);
    u.uFocusY.value = g.focusY;
    u.uFocusBand.value = g.focusBand;
    u.uFocusRamp.value = g.focusRamp;
    u.uBlur.value = g.blur;
    bloom.threshold = g.bloomThreshold;
    bloom.knee = g.bloomKnee;
    bloom.radius = g.bloomRadius;
    gtao.blendIntensity = g.ao;
  }
  let cur = tier;
  function setQuality(q) {
    cur = q in TIERS ? q : q ? 2 : 0;
    const T = { ...TIERS[cur], ...phoneTier(cur) };
    gtao.enabled = !!T.ao;
    if (T.ao) {
      gtao.updateGtaoMaterial({ samples: T.aoSamples });
      gtao.updatePdMaterial({ samples: T.pdSamples });
    }
    bloom.enabled = T.bloom > 0;
    bloom.levels = T.bloom || 1;
    u.uBloom.value = T.bloom > 0 ? g.bloom : 0;
    u.uTaps.value = T.blurTaps;
    u.uPR.value = renderer.getPixelRatio();
    if (gbuf) gbuf.enabled = !!ink || gtao.enabled;
  }
  applyGrade();
  setQuality(tier);
  const post = {
    composer,
    gtao,
    bloom,
    final,
    grade: g,
    setQuality,
    get quality() {
      return cur;
    },
    // pixel-ratio cap for a tier
    dpr: (q = cur) => (TIERS[q] || TIERS[2]).dpr,
    // change the grade live (a place can shift it with the time of day)
    setGrade(patch) {
      Object.assign(g, patch);
      applyGrade();
      setQuality(cur);
    },
    render() {
      u.uPR.value = renderer.getPixelRatio();
      if (S) styleFrame();
      composer.render();
    },
  };
  // style study: characters and props added after load get patched too; the line weight follows the camera distance
  let sf = 0;
  const fwd = new THREE.Vector3();
  function styleFrame() {
    if (sf++ % 20 === 0) patchScene(scene);
    u.uTime.value = (u.uTime.value + 0.618) % 1;
    if (ink) {
      camera.getWorldDirection(fwd);
      const d = fwd.y < -0.05 ? camera.position.y / -fwd.y : 15;
      ink.mat.uniforms.uNearRef.value = d;
    }
  }
  if (S) window.__style = { id: S.id, name: S.name, toon: { U: TOON_U, set: setToon }, ink, post, gbuf };
  return post;
}
