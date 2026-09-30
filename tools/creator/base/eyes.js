// Eye styles for a base body (creator-base-5: "Also need eyes customizable"; creator-base-6: "The new eyes are
// horrifying, they should be much closer to the existing anime eyes").
//
// Every style is the painted anime eye itself. 'original' leaves the painted eyes as they are. The other styles
// lift the painted eye off the face texture into a small picture (the eye's box, seen from the front), reshape that
// picture (wider, narrower, corner up or down) or take the other body's painted eye, erase the painted eye on the
// face and draw the picture back in its place. Lashes, highlights and shading are the painter's. Any style can
// recolour the iris. The right eye is the left one mirrored.
//
//   const eyes = customEyes(material, base.d, base.tex.image, { mio: baseMio, eric: baseEric });
//   eyes.set({ style: 'narrow', iris: '#3f8f5a' });
import * as THREE from 'three';

// shape: scale of the eye about the middle of its lower lid, and a turn of the outer corner (radians, up is +)
const SHAPES = {
  original: { label: 'As painted' },
  wide: { label: 'Wide', sx: 1.12, sy: 1.06 },
  narrow: { label: 'Narrow', sx: 1.04, sy: 0.8 },
  upturned: { label: 'Upturned', sx: 1, sy: 0.94, turn: 0.14 },
  droopy: { label: 'Droopy', sx: 1, sy: 0.9, turn: -0.12 },
};
const NAMES = { mio: 'Mio', eric: 'Eric' };
// the styles offered on a body: the shapes of its own eyes, then the other body's eyes as painted
export function eyeStyles(body) {
  const out = Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => [k, s.label]));
  for (const [k, name] of Object.entries(NAMES)) if (k !== body) out[k] = name + "'s eyes";
  return out;
}
export const IRIS = ['#2f6fb0', '#1f9aa3', '#6b4a2e', '#3f8f5a', '#7a4fb0', '#c08a2e', '#5c6670'];

const S = 256;
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

// The box an eye style works in (centre and half size, bind coordinates): the measured eye box grown so the whole
// painted eye with its lashes fits and a reshaped eye has room, stopping below the brows where a face has them.
export function eyeBox(d) {
  const { c, h } = d.face.eye, lo = [c[0] - h[0] * 1.3, c[1] - h[1] * 1.35];
  const hi = [c[0] + h[0] * 1.3, Math.min(c[1] + h[1] * 1.6, d.face.brows ? d.face.brows[0] - 0.003 : Infinity)];
  return { c: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2], h: [(hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2] };
}

// The painted eye on the character's left (image right) as a picture of its eye box: x from the inner corner (0) to
// the outer corner (S), y from the top. Each front-facing textured triangle over the box is drawn from the texture
// with its own affine map. Skin (and blush) is made transparent, so only the eye, lashes and brow-free lids remain.
export function captureEye(d, image) {
  const { c, h } = eyeBox(d), frontZ = d.face.frontZ ?? 0;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const W = image.width, H = image.height;
  const toCanvas = (x, y) => [((x - (c[0] - h[0])) / (2 * h[0])) * S, (1 - (y - (c[1] - h[1])) / (2 * h[1])) * S];
  for (let t = 0; t < d.T; t++) {
    if (d.useTex && d.useTex[t * 3] < 0.5) continue;
    const P = [0, 1, 2].map((k) => d.pos.slice(t * 9 + k * 3, t * 9 + k * 3 + 3));
    if (P.some((p) => p[2] < frontZ || p[0] < -0.01)) continue;   // the middle row sits on x = 0 (some at -0.001)
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    if (Math.max(...xs) < c[0] - h[0] || Math.min(...xs) > c[0] + h[0] || Math.max(...ys) < c[1] - h[1] || Math.min(...ys) > c[1] + h[1]) continue;
    const dst = P.map((p) => toCanvas(p[0], p[1]));
    const src = [0, 1, 2].map((k) => [d.uv[(t * 3 + k) * 2] * W, d.uv[(t * 3 + k) * 2 + 1] * H]);
    // affine map from texture pixels to canvas pixels
    const [[u0, v0], [u1, v1], [u2, v2]] = src, [[x0, y0], [x1, y1], [x2, y2]] = dst;
    const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
    if (Math.abs(den) < 1e-9) continue;
    const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / den, b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / den;
    const cc = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den, dd = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den;
    // the clip is grown by half a pixel from the centre so neighbouring triangles leave no seam
    const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, grow = (x, y) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / l * 0.8, y + (y - cy) / l * 0.8]; };
    ctx.save(); ctx.beginPath();
    dst.map(([x, y]) => grow(x, y)).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.clip();
    ctx.setTransform(a, b, cc, dd, x0 - a * u0 - cc * v0, y0 - b * u0 - dd * v0);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }
  // skin out: the same test the face shader uses to erase a painted eye (warm and light is skin or blush)
  const img = ctx.getImageData(0, 0, S, S), px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = lin(px[i]), b = lin(px[i + 2]);
    const skin = Math.min(1, Math.max(0, (r - b - 0.04) / 0.07)) * Math.min(1, Math.max(0, (r - 0.45) / 0.1));
    px[i + 3] = Math.round(px[i + 3] * (1 - skin));
  }
  ctx.putImageData(img, 0, 0);
  // the painted eye's own bounds in the picture (where anything is more than faint)
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (px[(y * S + x) * 4 + 3] > 60) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  canvas.bounds = x1 > x0 ? [x0, y0, x1 + 1, y1 + 1] : [0, 0, S, S];
  return canvas;
}

// The eye picture drawn into this face's eye box. Another body's eye is first scaled (evenly) to the width of this
// face's own painted eye and stood on the same lower lid. Then the shape: scaled about the middle of the lower lid and
// the outer corner turned up or down. If that would leave the box, the eye is shrunk evenly until it fits.
function shape(ctx, eye, s, own) {
  ctx.clearRect(0, 0, S, S);
  if (!eye) return;
  const [ex0, ey0, ex1, ey1] = eye.bounds, [ox0, , ox1, oy1] = own.bounds;
  const k = (ox1 - ox0) / (ex1 - ex0), ax = (ox0 + ox1) / 2, ay = oy1;
  const m = new globalThis.DOMMatrix().translate(ax, ay).rotate(-(s.turn || 0) * 180 / Math.PI).scale(s.sx || 1, s.sy || 1)
    .scale(k).translate(-(ex0 + ex1) / 2, -ey1);
  const corners = [[ex0, ey0], [ex1, ey0], [ex0, ey1], [ex1, ey1]].map(([x, y]) => m.transformPoint(new globalThis.DOMPoint(x, y)));
  let fit = 1;
  for (const p of corners) {
    if (p.y < 1) fit = Math.min(fit, (ay - 1) / (ay - p.y));
    if (p.x < 1) fit = Math.min(fit, (ax - 1) / (ax - p.x));
    if (p.x > S - 1) fit = Math.min(fit, (S - 1 - ax) / (p.x - ax));
  }
  ctx.setTransform(new globalThis.DOMMatrix().translate(ax, ay).scale(fit).translate(-ax, -ay).multiply(m));
  ctx.drawImage(eye, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// the iris recolour, shared by the painted and the drawn eye: saturated cool texels take the new hue, keeping their shade
const RECOLOUR = `
vec3 creatorIris(vec3 tc) {
  if (uIrisOn < 0.5) return tc;
  float hi = max(tc.r, max(tc.g, tc.b)), lo = min(tc.r, min(tc.g, tc.b));
  float sat = (hi - lo) / max(hi, 1e-4);
  float l = dot(tc, vec3(0.2126, 0.7152, 0.0722)), tl = dot(uIris, vec3(0.2126, 0.7152, 0.0722));
  float cool = step(tc.r + 0.02, tc.b);   // the painted irises are blue or teal; skin and blush are warm
  return mix(tc, clamp(uIris * (l / max(tl, 0.02)), 0.0, 1.0), smoothstep(0.25, 0.45, sat) * cool);
}`;

export function customEyes(material, d, image, others = {}) {
  const face = d.face;
  if (!face?.eye) throw new Error(`${d.id}: no face layout; use a repaired base (source16 or later)`);
  const tone = d.construction?.repair?.texture?.skinTone || [240, 210, 195];
  const box = eyeBox(d), own = captureEye(d, image), captured = { [d.source]: own };
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const u = {
    uEyeMode: { value: 0 }, uIrisOn: { value: 0 }, uIris: { value: new THREE.Color('#2f6fb0') }, uEyeMap: { value: map },
    uEyeC: { value: new THREE.Vector2(...box.c) }, uEyeH: { value: new THREE.Vector2(...box.h) }, uFrontZ: { value: face.frontZ ?? 0 },
    uSkinTex: { value: new THREE.Color().setRGB(...tone.map((v) => v / 255), THREE.SRGBColorSpace) },
  };
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = 'varying vec3 vBindPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindPos = position;');
    shader.fragmentShader = `varying vec3 vBindPos;
uniform float uEyeMode, uIrisOn, uFrontZ; uniform vec3 uIris, uSkinTex; uniform vec2 uEyeC, uEyeH; uniform sampler2D uEyeMap;
${RECOLOUR}
` + shader.fragmentShader
      .replace('diffuseColor.rgb *= mix( vec3( 1.0 ), texel.rgb, vUseTex );', `
 vec2 eyeUV = (vec2(abs(vBindPos.x), vBindPos.y) - (uEyeC - uEyeH)) / (2.0 * uEyeH);
 float inEye = step(uFrontZ, vBindPos.z) * step(0.0, eyeUV.x) * step(eyeUV.x, 1.0) * step(0.0, eyeUV.y) * step(eyeUV.y, 1.0);
 vec3 tc = texel.rgb;
 if (inEye > 0.5 && uEyeMode < 0.5) tc = creatorIris(tc);
 if (inEye > 0.5 && uEyeMode > 0.5 && (tc.r - tc.b < 0.24 || tc.r < 0.6)) tc = uSkinTex;   // erase the painted eye, keep skin and blush
 diffuseColor.rgb *= mix( vec3( 1.0 ), tc, vUseTex );`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 if (uEyeMode > 0.5) {
   vec2 eyeQ = (vec2(abs(vBindPos.x), vBindPos.y) - (uEyeC - uEyeH)) / (2.0 * uEyeH);
   if (vBindPos.z > uFrontZ && all(greaterThanEqual(eyeQ, vec2(0.0))) && all(lessThanEqual(eyeQ, vec2(1.0)))) {
     vec4 drawn = texture2D(uEyeMap, eyeQ);
     diffuseColor.rgb = mix(diffuseColor.rgb, creatorIris(drawn.rgb), drawn.a);
   }
 }`);
  };
  material.customProgramCacheKey = () => 'creator-eyes';
  material.needsUpdate = true;
  return {
    set({ style = 'original', iris = null } = {}) {
      const other = NAMES[style] && style !== d.source;
      if (other && !captured[style] && others[style]) captured[style] = captureEye(others[style].d, others[style].tex.image);
      const eye = other ? captured[style] : own, s = other ? {} : SHAPES[style] || SHAPES.original;
      u.uEyeMode.value = style === 'original' || !eye ? 0 : 1;
      u.uIrisOn.value = iris ? 1 : 0;
      if (iris) u.uIris.value.set(iris);
      if (u.uEyeMode.value) { shape(ctx, eye, s, own); map.needsUpdate = true; }
    },
    picture: () => canvas,
    dispose() { map.dispose(); },
  };
}
