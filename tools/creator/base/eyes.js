// Eye styles for a base body (creator-base-5: "Also need eyes customizable").
//
// 'original' keeps the eyes painted on the source face and can recolour the iris. The drawn styles erase the
// painted eyes inside each eye's box (base.d.face.eye, bind coordinates) and draw a new eye there from a canvas,
// projected straight from the front; the right eye is the left one mirrored. Blush and skin stay.
//
//   const eyes = customEyes(material, base.d);   eyes.set({ style: 'round', iris: '#3f8f5a' });
import * as THREE from 'three';

export const EYE_STYLES = { original: 'Original', round: 'Round', sharp: 'Sharp', sleepy: 'Sleepy' };
export const IRIS = ['#2f6fb0', '#1f9aa3', '#6b4a2e', '#3f8f5a', '#7a4fb0', '#c08a2e', '#5c6670'];

const S = 256;
// Canvas coordinates: x from the inner corner (0) to the outer corner (S), y from the top.
function draw(ctx, style, iris) {
  ctx.clearRect(0, 0, S, S);
  const dark = '#1d1b26';
  const c = new THREE.Color(iris), deep = c.clone().multiplyScalar(0.35), light = c.clone().lerp(new THREE.Color('#ffffff'), 0.25);
  const white = new globalThis.Path2D();
  let iy = 150, ix = 122, irx = 56, iry = 74;
  if (style === 'round') {
    white.ellipse(128, 142, 96, 88, 0, 0, Math.PI * 2);
  } else if (style === 'sharp') {
    white.moveTo(18, 150); white.bezierCurveTo(70, 70, 170, 58, 240, 92);
    white.bezierCurveTo(230, 170, 170, 222, 110, 214); white.bezierCurveTo(60, 206, 30, 180, 18, 150);
    irx = 50; iry = 70; iy = 146; ix = 126;
  } else {   // sleepy: the upper lid sits low over the iris
    white.moveTo(20, 128); white.lineTo(236, 116); white.bezierCurveTo(236, 200, 180, 226, 124, 226);
    white.bezierCurveTo(64, 226, 20, 196, 20, 128);
    iy = 168; iry = 64;
  }
  ctx.fillStyle = '#fbfbfd'; ctx.fill(white);
  ctx.save(); ctx.clip(white);
  const g = ctx.createLinearGradient(0, iy - iry, 0, iy + iry);
  g.addColorStop(0, '#' + deep.getHexString()); g.addColorStop(0.55, '#' + c.getHexString()); g.addColorStop(1, '#' + light.getHexString());
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#' + deep.clone().multiplyScalar(0.5).getHexString();
  ctx.beginPath(); ctx.ellipse(ix, iy + 4, irx * 0.42, iry * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(ix - irx * 0.35, iy - iry * 0.42, irx * 0.28, iry * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ix + irx * 0.4, iy + iry * 0.45, irx * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // lashes: a heavy upper line with a flick at the outer corner, a light lower line
  ctx.strokeStyle = dark; ctx.fillStyle = dark; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 30; ctx.beginPath();
  if (style === 'round') { ctx.moveTo(34, 112); ctx.bezierCurveTo(80, 44, 190, 40, 232, 108); ctx.lineTo(250, 78); }
  else if (style === 'sharp') { ctx.moveTo(18, 146); ctx.bezierCurveTo(70, 72, 170, 60, 240, 92); ctx.lineTo(254, 70); }
  else { ctx.moveTo(18, 130); ctx.lineTo(236, 116); ctx.lineTo(252, 132); }
  ctx.stroke();
  ctx.lineWidth = 9; ctx.beginPath();
  if (style === 'round') { ctx.moveTo(150, 226); ctx.quadraticCurveTo(206, 214, 222, 178); }
  else if (style === 'sharp') { ctx.moveTo(130, 214); ctx.quadraticCurveTo(200, 200, 226, 160); }
  else { ctx.moveTo(120, 228); ctx.quadraticCurveTo(200, 222, 230, 186); }
  ctx.stroke();
}

export function customEyes(material, d) {
  const face = d.face;
  if (!face?.eye) throw new Error(`${d.id}: no face layout; use a repaired base (source16 or later)`);
  const tone = d.construction?.repair?.texture?.skinTone || [240, 210, 195];
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const u = {
    uEyeMode: { value: 0 }, uIrisOn: { value: 0 }, uIris: { value: new THREE.Color('#2f6fb0') }, uEyeMap: { value: map },
    uEyeC: { value: new THREE.Vector2(...face.eye.c) }, uEyeH: { value: new THREE.Vector2(...face.eye.h) }, uFrontZ: { value: face.frontZ ?? 0 },
    uSkinTex: { value: new THREE.Color().setRGB(...tone.map((v) => v / 255), THREE.SRGBColorSpace) },
  };
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = 'varying vec3 vBindPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBindPos = position;');
    shader.fragmentShader = `varying vec3 vBindPos;
uniform float uEyeMode, uIrisOn, uFrontZ; uniform vec3 uIris, uSkinTex; uniform vec2 uEyeC, uEyeH; uniform sampler2D uEyeMap;
` + shader.fragmentShader
      .replace('diffuseColor.rgb *= mix( vec3( 1.0 ), texel.rgb, vUseTex );', `
 vec2 eyeUV = (vec2(abs(vBindPos.x), vBindPos.y) - (uEyeC - uEyeH)) / (2.0 * uEyeH);
 float inEye = step(uFrontZ, vBindPos.z) * step(0.0, eyeUV.x) * step(eyeUV.x, 1.0) * step(0.0, eyeUV.y) * step(eyeUV.y, 1.0);
 vec3 tc = texel.rgb;
 if (inEye > 0.5 && uEyeMode < 0.5 && uIrisOn > 0.5) {
   float hi = max(tc.r, max(tc.g, tc.b)), lo = min(tc.r, min(tc.g, tc.b));
   float sat = (hi - lo) / max(hi, 1e-4);
   float l = dot(tc, vec3(0.2126, 0.7152, 0.0722)), tl = dot(uIris, vec3(0.2126, 0.7152, 0.0722));
   float cool = step(tc.r + 0.02, tc.b);   // the painted irises are blue or teal; skin and blush are warm
   tc = mix(tc, clamp(uIris * (l / max(tl, 0.02)), 0.0, 1.0), smoothstep(0.25, 0.45, sat) * cool);
 }
 if (inEye > 0.5 && uEyeMode > 0.5 && (tc.r - tc.b < 0.24 || tc.r < 0.6)) tc = uSkinTex;   // erase the painted eye, keep skin and blush
 diffuseColor.rgb *= mix( vec3( 1.0 ), tc, vUseTex );`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 if (uEyeMode > 0.5) {
   vec2 eyeQ = (vec2(abs(vBindPos.x), vBindPos.y) - (uEyeC - uEyeH)) / (2.0 * uEyeH);
   if (vBindPos.z > uFrontZ && all(greaterThanEqual(eyeQ, vec2(0.0))) && all(lessThanEqual(eyeQ, vec2(1.0)))) {
     vec4 drawn = texture2D(uEyeMap, eyeQ);
     diffuseColor.rgb = mix(diffuseColor.rgb, drawn.rgb, drawn.a);
   }
 }`);
  };
  material.customProgramCacheKey = () => 'creator-eyes';
  material.needsUpdate = true;
  return {
    set({ style = 'original', iris = null } = {}) {
      u.uEyeMode.value = style === 'original' ? 0 : 1;
      u.uIrisOn.value = iris ? 1 : 0;
      if (iris) u.uIris.value.set(iris);
      if (style !== 'original') { draw(ctx, style, iris || '#2f6fb0'); map.needsUpdate = true; }
    },
    dispose() { map.dispose(); },
  };
}
