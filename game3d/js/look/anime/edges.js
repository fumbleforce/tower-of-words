// Outlines for the anime trial (#383): one screen-space pass that reads the depth the main render already has (the
// composer's targets keep it as a texture, post.js; the hover outline reads the same, perf/outline.js), so it costs
// no second draw of the scene. On any flat surface 1/z changes linearly across the screen, so its second difference
// is zero there and not zero where the surface turns: a large jump marks a silhouette, a smaller one a crease
// (where the surface's normal turns, which is what a normal buffer would show). The line is drawn on the near side
// only, a darker and slightly more saturated shade of the colour under it, never black, thinning with distance.
// It goes right after the main render and the hover outline, before the ambient occlusion (post.js).
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
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
}`;

export class EdgePass extends Pass {
  constructor(camera) {
    super();
    this.camera = camera;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.1 },
        uFar: { value: 100 },
        uW: { value: 1 }, // sample distance in pixels: the line's width
        uSil: { value: 0.02 },
        uCrease: { value: 0.004 },
        uFade0: { value: 28 },
        uFade1: { value: 70 },
        uDark: { value: 0.32 },
        uStrength: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  setSize(w, h) {
    const u = this.mat.uniforms;
    u.uTexel.value.set(1 / w, 1 / h);
    u.uW.value = Math.min(3, Math.max(1.2, h / 560)); // the same weight on a phone and a large screen
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.mat.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.tDepth.value = readBuffer.depthTexture;
    u.uNear.value = this.camera.near;
    u.uFar.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.mat.dispose();
    this.quad.dispose();
  }
}
