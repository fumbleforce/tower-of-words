import*as u from"three";const p=typeof location<"u"?new URLSearchParams(location.search):new URLSearchParams,B=p.get("shafts")==="0",b=p.get("grain")==="0";export const TR={cut:0,fade:1,wipe:2,iris:3,blinds:4,dots:5,whip:6,zoom:7,flash:8};const A=`
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,w=`
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
uniform sampler2D uDA, uDB;  // the slots' depth (logarithmic, the renderer's logarithmicDepthBuffer)
uniform float uFarA, uFarB, uInkA, uInkB, uInkW;

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
// the anime look's outlines (the game's look/anime/edges.js, here on the opening's logarithmic depth): on a flat
// surface 1/z changes linearly across the screen, so its second difference marks silhouettes (a big jump, near
// side) and creases (a small one); the line is a darker, slightly more saturated shade of the colour under it,
// thinning out with distance
float izL(sampler2D d, vec2 uv, float far) { return 1.0 / max(exp2(texture(d, uv).r * log2(far + 1.0)) - 1.0, 1e-4); }
vec3 inked(vec3 col, sampler2D d, vec2 uv, float far, float strength) {
  if (strength <= 0.0 || texture(d, uv).r >= 1.0) return col;
  float c = izL(d, uv, far), z = 1.0 / c;
  vec2 o = uInkW / uRes;
  float l = izL(d, uv - vec2(o.x, 0.0), far), r = izL(d, uv + vec2(o.x, 0.0), far);
  float b = izL(d, uv - vec2(0.0, o.y), far), t = izL(d, uv + vec2(0.0, o.y), far);
  float sx = (2.0 * c - l - r) / c, sy = (2.0 * c - b - t) / c;
  float near = max(max(sx, sy), 0.0), turn = max(abs(sx), abs(sy));
  float sil = smoothstep(0.02, 0.04, near);
  float crease = smoothstep(0.004, 0.008, turn) * 0.7;
  float a = max(sil, crease) * strength * (1.0 - smoothstep(28.0, 70.0, z));
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 ink = max(mix(vec3(lum), col, 1.35), 0.0) * 0.32;
  return mix(col, ink, a);
}
vec3 layerA(vec2 uv) {
  vec3 c = vec3(0.0);
  if (uHasA3 > 0.5) {
    vec3 h = inked(texture(uA3, uv).rgb, uDA, uv, uFarA, uInkA);
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
    vec3 h = inked(texture(uB3, uv).rgb, uDB, uv, uFarB, uInkB);
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
}`;export function makeCompositor(i,v,s){const x=()=>{const t=new u.WebGLRenderTarget(v,s,{type:u.HalfFloatType,samples:4,generateMipmaps:!0,minFilter:u.LinearMipmapLinearFilter,magFilter:u.LinearFilter});return t.texture.generateMipmaps=!0,t.depthTexture=new u.DepthTexture(v,s,u.FloatType),t},f=()=>{const t=document.createElement("canvas");t.width=v,t.height=s;const a=new u.CanvasTexture(t);return a.colorSpace=u.SRGBColorSpace,a.premultiplyAlpha=!0,a.generateMipmaps=!1,a.minFilter=u.LinearFilter,{cv:t,g:t.getContext("2d",{willReadFrequently:!0}),tex:a}},m=[0,1].map(()=>({rt:x(),c2:f()})),n=f(),l=new u.DataTexture(new Uint8Array([0,0,0,0]),1,1);l.needsUpdate=!0;const e={uA3:{value:l},uA2:{value:l},uB3:{value:l},uB2:{value:l},uHasA3:{value:0},uHasB3:{value:0},uHasA2:{value:0},uHasB2:{value:0},uP:{value:0},uType:{value:0},uParam:{value:new u.Vector4},uBandColor:{value:new u.Color("#ffffff")},uRes:{value:new u.Vector2(v,s)},uTime:{value:0},uFlash:{value:0},uFlashColor:{value:new u.Color("#ffffff")},uChroma:{value:0},uFade:{value:0},uZoom:{value:1},uShake:{value:new u.Vector2},uBloomA:{value:.25},uBloomB:{value:.25},uExpA:{value:1},uExpB:{value:1},uGrain:{value:.035},uVignette:{value:.35},uFlareA:{value:new u.Vector3},uFlareB:{value:new u.Vector3},uOv:{value:null},uHasOv:{value:0},uShafts:{value:B?0:1},uDA:{value:l},uDB:{value:l},uFarA:{value:1e4},uFarB:{value:1e4},uInkA:{value:0},uInkB:{value:0},uInkW:{value:Math.min(3,Math.max(1.2,s/560))}},g=new u.ShaderMaterial({vertexShader:A,fragmentShader:w,uniforms:e,glslVersion:u.GLSL3,depthTest:!1,depthWrite:!1}),h=new u.Mesh(new u.PlaneGeometry(2,2),g);h.frustumCulled=!1;const d=new u.Scene;d.add(h);const y=new u.Camera;return e.uOv.value=l,{slots:m,overlay:n,bindOverlay(t){e.uHasOv.value=t?1:0,e.uOv.value=t?n.tex:l,t&&(n.tex.needsUpdate=!0)},bind(t,a){const r=m[t],o=t===0?"A":"B";e[`u${o}3`].value=a.has3?r.rt.texture:l,e[`u${o}2`].value=a.has2?r.c2.tex:l,e[`uHas${o}3`].value=a.has3?1:0,e[`uHas${o}2`].value=a.has2?1:0,e[`uBloom${o}`].value=a.bloom??.6,e[`uExp${o}`].value=a.exposure??.9,e[`uD${o}`].value=a.has3?r.rt.depthTexture:l,e[`uFar${o}`].value=a.far??1e4,e[`uInk${o}`].value=a.has3?a.ink??0:0;const c=a.flare;e[`uFlare${o}`].value.set(c?c[0]:0,c?c[1]:0,c?c[2]:0),a.has2&&(r.c2.tex.needsUpdate=!0)},draw(t,a,r){e.uTime.value=t,e.uType.value=TR[a.type]??1,e.uP.value=a.p;const o=a.param||[0,.02,0,0];e.uParam.value.set(o[0]||0,o[1]||0,o[2]||0,o[3]||0),e.uBandColor.value.set(a.band||"#ffffff"),e.uFlash.value=r.flash||0,e.uFlashColor.value.set(r.flashColor||"#ffffff"),e.uChroma.value=r.chroma||0,e.uFade.value=r.fade||0,e.uZoom.value=r.zoom||1,e.uShake.value.set(...r.shake||[0,0]),e.uGrain.value=b?0:r.grain??.035,e.uVignette.value=r.vignette??.35,i.setRenderTarget(null),i.render(d,y)}}}
