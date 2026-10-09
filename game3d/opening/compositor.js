// The last pass of every frame. Each shot is a layer: an optional 3D render (linear HDR, tone-mapped here, with a
// soft bloom read from its own mip levels) under an optional 2D canvas. Two layers at most are live at once, the
// shot going out (A) and the one coming in (B), and a transition mask decides per pixel which one shows.
// After that: flashes, chromatic aberration on impacts, a punch zoom, shake, vignette, grain and the fade to black.
import * as THREE from 'three';

// transition kinds (shots name them in `in: { type }`)
// ?shafts=0, ?grain=0: those passes off (to find a shimmer)
const QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const NO_SHAFTS = QS.get('shafts') === '0',
  NO_GRAIN = QS.get('grain') === '0';

export const TR = { cut: 0, fade: 1, wipe: 2, iris: 3, blinds: 4, dots: 5, whip: 6, zoom: 7, flash: 8 };

const VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uA3, uA2, uB3, uB2;
uniform float uHasA3, uHasB3, uHasA2, uHasB2;
uniform float uP;          // transition progress 0..1
uniform int uType;
uniform vec4 uParam;       // per type: wipe (angle, soft, band width, -), iris (cx, cy, soft, -), blinds (angle, count, -, -), dots (angle, cell px, -, -)
uniform vec3 uBandColor;
uniform vec2 uRes;
uniform float uTime, uFlash, uChroma, uFade, uZoom, uBloomA, uBloomB, uExpA, uExpB, uGrain, uVignette;
uniform vec3 uFlashColor;
uniform vec2 uShake;
uniform vec3 uFlareA, uFlareB;
uniform float uShafts;
uniform sampler2D uOv;
uniform float uHasOv;

vec3 aces(vec3 x) {
  // Narkowicz's fit of the ACES curve
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// a lens flare from the sun at f.xy (uv), strength f.z: a glow, a horizontal streak and ghosts toward the centre
vec3 flare(vec2 uv, vec3 f) {
  if (f.z <= 0.001) return vec3(0.0);
  vec2 a = vec2(uRes.x / uRes.y, 1.0);
  vec2 d = (uv - f.xy) * a;
  float r = length(d);
  vec3 c = vec3(1.0, 0.86, 0.68) * (exp(-r * 9.0) * 0.55 + exp(-r * 40.0) * 0.6);
  c += vec3(1.0, 0.9, 0.8) * exp(-abs(d.y) * 260.0) * exp(-abs(d.x) * 2.2) * 0.35;
  vec2 axis = (vec2(0.5) - f.xy);
  for (int i = 1; i <= 4; i++) {
    float k = float(i) * 0.42;
    vec2 gp = f.xy + axis * k;
    float gr = length((uv - gp) * a);
    float size = 0.02 + 0.03 * mod(float(i) * 1.7, 1.0);
    vec3 tint = i == 1 ? vec3(0.5, 0.8, 1.0) : i == 2 ? vec3(1.0, 0.6, 0.85) : i == 3 ? vec3(0.55, 1.0, 0.85) : vec3(0.7, 0.75, 1.0);
    c += tint * (1.0 - smoothstep(size * 0.7, size, gr)) * 0.07;
  }
  return c * f.z;
}
// light shafts from the sun at f.xy: bright sky smeared toward the sun, strength f.z
vec3 shafts(sampler2D t, vec2 uv, vec3 f) {
  if (f.z <= 0.001 || uShafts < 0.5) return vec3(0.0);
  vec2 d = (f.xy - uv) / 28.0;
  vec2 p = uv;
  vec3 acc = vec3(0.0);
  float w = 1.0;
  for (int i = 0; i < 28; i++) {
    p += d;
    vec3 c = textureLod(t, clamp(p, 0.0, 1.0), 2.0).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    acc += vec3(1.0, 0.94, 0.84) * max(l - 0.95, 0.0) * w;
    w *= 0.95;
  }
  return acc / 28.0 * f.z * 2.4;
}
vec3 layerA(vec2 uv) {
  vec3 c = vec3(0.0);
  if (uHasA3 > 0.5) {
    vec3 h = texture(uA3, uv).rgb;
    vec3 bl = textureLod(uA3, uv, 3.0).rgb * 0.3 + textureLod(uA3, uv, 5.0).rgb * 0.4 + textureLod(uA3, uv, 6.5).rgb * 0.3;
    c = aces((h + max(bl - 0.9, 0.0) * uBloomA + shafts(uA3, uv, uFlareA)) * uExpA);
    c += flare(uv, uFlareA);
  }
  if (uHasA2 > 0.5) { vec4 o = texture(uA2, uv); c = c * (1.0 - o.a) + o.rgb; }
  return c;
}
vec3 layerB(vec2 uv) {
  vec3 c = vec3(0.0);
  if (uHasB3 > 0.5) {
    vec3 h = texture(uB3, uv).rgb;
    vec3 bl = textureLod(uB3, uv, 3.0).rgb * 0.3 + textureLod(uB3, uv, 5.0).rgb * 0.4 + textureLod(uB3, uv, 6.5).rgb * 0.3;
    c = aces((h + max(bl - 0.9, 0.0) * uBloomB + shafts(uB3, uv, uFlareB)) * uExpB);
    c += flare(uv, uFlareB);
  }
  if (uHasB2 > 0.5) { vec4 o = texture(uB2, uv); c = c * (1.0 - o.a) + o.rgb; }
  return c;
}

// which layer shows at this pixel: 0 = A, 1 = B; band = how much of the edge colour
float mask(vec2 uv, out float band) {
  band = 0.0;
  float p = uP;
  vec2 a = vec2(uRes.x / uRes.y, 1.0);
  vec2 q = (uv - 0.5) * a;
  if (uType == 0) return step(1.0, p);
  if (uType == 1) return p;
  if (uType == 2) {
    vec2 d = vec2(cos(uParam.x), sin(uParam.x));
    float L = 0.5 * (abs(d.x) * a.x + abs(d.y) * a.y);
    float soft = uParam.y, bw = uParam.z;
    float e = mix(-L - soft - bw, L + soft, p);
    float s = dot(q, d);
    band = (bw > 0.0) ? (smoothstep(e - 0.002, e, s) - smoothstep(e + bw, e + bw + 0.002, s)) : 0.0;
    return 1.0 - smoothstep(e - soft, e, s);
  }
  if (uType == 3) {
    vec2 c = (uParam.xy - 0.5) * a;
    float R = length(a) + 0.1;
    float r = p * R;
    float dd = length(q - c);
    band = smoothstep(r - 0.03, r - 0.025, dd) * (1.0 - smoothstep(r - 0.005, r, dd)) * step(0.001, p) * (1.0 - step(0.999, p));
    return 1.0 - smoothstep(r - uParam.z, r, dd);
  }
  if (uType == 4) {
    vec2 d = vec2(cos(uParam.x), sin(uParam.x));
    float s = dot(q, d) / (0.5 * (abs(d.x) * a.x + abs(d.y) * a.y)) * 0.5 + 0.5; // 0..1 across
    float n = uParam.y;
    float idx = floor(s * n), f = fract(s * n);
    float lag = 0.6;
    float lp = clamp((p * (1.0 + lag) - idx / n * lag), 0.0, 1.0);
    return step(f, lp);
  }
  if (uType == 5) {
    float ang = uParam.x, cell = uParam.y / uRes.y;
    mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    vec2 g = R * q / cell;
    vec2 id = floor(g), f = fract(g) - 0.5;
    vec2 cc = transpose(R) * ((id + 0.5) * cell);
    float sweep = (cc.x / a.x + 0.5); // left to right
    float r = clamp(p * 2.2 - sweep * 1.2, 0.0, 1.0) * 0.75;
    return step(length(f), r);
  }
  return p;
}

void main() {
  vec2 uv = vUv;
  uv = (uv - 0.5) / uZoom + 0.5 + uShake;
  vec3 col;
  if (uType == 6 && uP > 0.0 && uP < 1.0) {
    // whip pan: A leaves to the left, B arrives from the right, smeared along the move
    float e = smoothstep(0.0, 1.0, uP);
    float off = e;
    float blur = sin(uP * 3.14159) * 0.12;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float o = (float(i) / 11.0 - 0.5) * blur;
      vec2 u = vec2(uv.x + off + o, uv.y);
      acc += (u.x < 1.0) ? layerA(clamp(u, 0.0, 1.0)) : layerB(clamp(vec2(u.x - 1.0, u.y), 0.0, 1.0));
    }
    col = acc / 12.0;
  } else if (uType == 7 && uP > 0.0 && uP < 1.0) {
    // punch: A rushes toward us, B settles from big, smeared toward the centre
    bool first = uP < 0.5;
    float k = first ? uP * 2.0 : (1.0 - uP) * 2.0;
    float z = 1.0 + (first ? 0.25 : 0.18) * k * k;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 10; i++) {
      float s = z * (1.0 + float(i) * 0.012 * k);
      vec2 u = (uv - 0.5) / s + 0.5;
      acc += first ? layerA(u) : layerB(u);
    }
    col = acc / 10.0;
    col = mix(col, vec3(1.0), smoothstep(0.35, 0.5, uP) * (1.0 - smoothstep(0.5, 0.7, uP)) * 0.85);
  } else if (uType == 8 && uP > 0.0 && uP < 1.0) {
    col = uP < 0.5 ? layerA(uv) : layerB(uv);
    float w = 1.0 - abs(uP - 0.5) * 2.0;
    col = mix(col, vec3(1.0), smoothstep(0.0, 1.0, w));
  } else {
    float band;
    float m = (uP <= 0.0) ? 0.0 : (uP >= 1.0 ? 1.0 : mask(uv, band));
    if (uP <= 0.0 || uP >= 1.0) band = 0.0;
    if (uChroma > 0.001) {
      vec2 dir = (uv - 0.5) * uChroma;
      vec3 cA = vec3(layerA(uv + dir).r, layerA(uv).g, layerA(uv - dir).b);
      vec3 cB = m > 0.0 ? vec3(layerB(uv + dir).r, layerB(uv).g, layerB(uv - dir).b) : vec3(0.0);
      col = mix(cA, cB, m);
    } else {
      vec3 cA = m < 1.0 ? layerA(uv) : vec3(0.0);
      vec3 cB = m > 0.0 ? layerB(uv) : vec3(0.0);
      col = mix(cA, cB, m);
    }
    col = mix(col, uBandColor, band);
  }
  col = mix(col, uFlashColor, uFlash);
  // the overlay (the lyrics) over everything, unaffected by the transition and the punch zoom
  if (uHasOv > 0.5) { vec4 o = texture(uOv, vUv); col = col * (1.0 - o.a) + o.rgb; }
  // vignette, grain (new grain on twos), the fade
  vec2 vq = vUv - 0.5;
  col *= 1.0 - uVignette * smoothstep(0.35, 0.95, length(vq * vec2(1.0, 0.8)) * 1.25);
  col = toSRGB(clamp(col, 0.0, 1.0));
  float gt = floor(uTime * 12.0);
  float n = hash(vUv * uRes + gt * 17.0) - 0.5;
  col += n * uGrain;
  col *= 1.0 - uFade;
  outColor = vec4(col, 1.0);
}`;

export function makeCompositor(renderer, rtW, rtH) {
  const mkRT = () => {
    const rt = new THREE.WebGLRenderTarget(rtW, rtH, {
      type: THREE.HalfFloatType,
      samples: 4,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    });
    rt.texture.generateMipmaps = true;
    return rt;
  };
  const mkCV = () => {
    const cv = document.createElement('canvas');
    cv.width = rtW;
    cv.height = rtH;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.premultiplyAlpha = true;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return { cv, g: cv.getContext('2d'), tex };
  };
  const slots = [0, 1].map(() => ({ rt: mkRT(), c2: mkCV() }));
  const overlay = mkCV();
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  blank.needsUpdate = true;

  const uniforms = {
    uA3: { value: blank }, uA2: { value: blank }, uB3: { value: blank }, uB2: { value: blank },
    uHasA3: { value: 0 }, uHasB3: { value: 0 }, uHasA2: { value: 0 }, uHasB2: { value: 0 },
    uP: { value: 0 }, uType: { value: 0 }, uParam: { value: new THREE.Vector4() },
    uBandColor: { value: new THREE.Color('#ffffff') },
    uRes: { value: new THREE.Vector2(rtW, rtH) },
    uTime: { value: 0 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color('#ffffff') },
    uChroma: { value: 0 }, uFade: { value: 0 }, uZoom: { value: 1 }, uShake: { value: new THREE.Vector2() },
    uBloomA: { value: 0.25 }, uBloomB: { value: 0.25 }, uExpA: { value: 1 }, uExpB: { value: 1 },
    uGrain: { value: 0.035 }, uVignette: { value: 0.35 },
    uFlareA: { value: new THREE.Vector3() }, uFlareB: { value: new THREE.Vector3() },
    uOv: { value: null }, uHasOv: { value: 0 },
    uShafts: { value: NO_SHAFTS ? 0 : 1 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.Camera();

  uniforms.uOv.value = blank;
  return {
    slots,
    overlay,
    // has: whether the overlay canvas holds anything this frame
    bindOverlay(has) {
      uniforms.uHasOv.value = has ? 1 : 0;
      uniforms.uOv.value = has ? overlay.tex : blank;
      if (has) overlay.tex.needsUpdate = true;
    },
    // which: 0 or 1; state: { has3, has2, bloom, exposure }
    bind(which, state) {
      const s = slots[which];
      const L = which === 0 ? 'A' : 'B';
      uniforms[`u${L}3`].value = state.has3 ? s.rt.texture : blank;
      uniforms[`u${L}2`].value = state.has2 ? s.c2.tex : blank;
      uniforms[`uHas${L}3`].value = state.has3 ? 1 : 0;
      uniforms[`uHas${L}2`].value = state.has2 ? 1 : 0;
      uniforms[`uBloom${L}`].value = state.bloom ?? 0.6;
      uniforms[`uExp${L}`].value = state.exposure ?? 0.9;
      const f = state.flare;
      uniforms[`uFlare${L}`].value.set(f ? f[0] : 0, f ? f[1] : 0, f ? f[2] : 0);
      if (state.has2) s.c2.tex.needsUpdate = true;
    },
    // tr: { type, p, param: [4], band: '#hex' }; fx: { flash, flashColor, chroma, fade, zoom, shake: [x, y], grain, vignette }
    draw(T, tr, fx) {
      uniforms.uTime.value = T;
      uniforms.uType.value = TR[tr.type] ?? 1;
      uniforms.uP.value = tr.p;
      const pr = tr.param || [0, 0.02, 0, 0];
      uniforms.uParam.value.set(pr[0] || 0, pr[1] || 0, pr[2] || 0, pr[3] || 0);
      uniforms.uBandColor.value.set(tr.band || '#ffffff');
      uniforms.uFlash.value = fx.flash || 0;
      uniforms.uFlashColor.value.set(fx.flashColor || '#ffffff');
      uniforms.uChroma.value = fx.chroma || 0;
      uniforms.uFade.value = fx.fade || 0;
      uniforms.uZoom.value = fx.zoom || 1;
      uniforms.uShake.value.set(...(fx.shake || [0, 0]));
      uniforms.uGrain.value = NO_GRAIN ? 0 : fx.grain ?? 0.035;
      uniforms.uVignette.value = fx.vignette ?? 0.35;
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    },
  };
}
