// Ink lines as a post pass. A G-buffer pre-pass draws every opaque mesh with its view-space normal in RGB and a
// material id in alpha, plus depth. The ink pass then finds three kinds of edge:
//   silhouettes  a jump in depth (Laplacian of 1/z, so flat floors seen at an angle stay clean), drawn on the near
//                side only, thicker for things close to the camera
//   creases      a turn in the surface normal (box edges, folds), thinner
//   colour edges where one material meets another on the same surface (a poster on a wall), thinnest
// The pre-pass can also feed the AO pass, so with AO on the lines cost no extra scene draw.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// ---------- G-buffer: normals + material id + depth ----------
const idCache = new WeakMap();
function idFor(m) {
  // same colour and texture = same id, so parts of one colour don't get lines between them
  const key = (m.color ? m.color.getHexString() : 'x') + (m.map ? m.map.uuid : '') + (m.vertexColors ? 'v' : '');
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (8 + ((h >>> 0) % 240)) / 255;
}
const charCache = new WeakMap();
// characters (skinned meshes: Eric, Mio) get a reserved id, so the ink pass can give them a heavier outline
function gmat(m, ch) {
  const cache = ch ? charCache : idCache;
  let g = cache.get(m);
  if (!g) {
    g = new THREE.MeshNormalMaterial({
      flatShading: !!m.flatShading,
      side: m.side,
      transparent: true,
      blending: THREE.NoBlending,
      depthWrite: true,
      depthTest: true,
    });
    g.opacity = ch ? 1 : (m.userData.inkId ?? idFor(m));
    cache.set(m, g);
  }
  return g;
}
function inkable(o) {
  if (!o.visible) return false;
  if (o.isPoints || o.isLine || o.isSprite) return false;
  if (!o.isMesh) return true;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (!m || o.userData.noInk || m.userData.noInk) return false;
  if (m.transparent && (m.opacity < 0.9 || !m.depthWrite)) return false;
  if (m.depthWrite === false || m.colorWrite === false) return false;
  return true;
}

export class GBufferPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.needsSwap = false;
    this.depthTexture = new THREE.DepthTexture(4, 4);
    this.depthTexture.format = THREE.DepthStencilFormat;
    this.depthTexture.type = THREE.UnsignedInt248Type;
    this.rt = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthTexture: this.depthTexture,
    });
    this._hidden = [];
    this._swapped = [];
  }
  get texture() {
    return this.rt.texture;
  }
  setSize(w, h) {
    this.rt.setSize(w, h);
  }
  render(renderer) {
    const hidden = this._hidden,
      swapped = this._swapped;
    hidden.length = 0;
    swapped.length = 0;
    this.scene.traverseVisible((o) => {
      if (o === this.scene) return;
      if (!inkable(o)) {
        if (o.visible) {
          o.visible = false;
          hidden.push(o);
        }
        return;
      }
      if (!o.isMesh) return;
      swapped.push(o, o.material);
      const ch = !!o.isSkinnedMesh;
      o.material = Array.isArray(o.material) ? o.material.map((m) => gmat(m, ch)) : gmat(o.material, ch);
    });
    const bg = this.scene.background,
      oldClear = renderer.getClearColor(new THREE.Color()),
      oldA = renderer.getClearAlpha(),
      oldAuto = renderer.autoClear;
    this.scene.background = null;
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x7f7fff, 0);
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.scene.background = bg;
    renderer.setClearColor(oldClear, oldA);
    renderer.autoClear = oldAuto;
    for (const o of hidden) o.visible = true;
    for (let i = 0; i < swapped.length; i += 2) swapped[i].material = swapped[i + 1];
  }
  dispose() {
    this.rt.dispose();
    this.depthTexture.dispose();
  }
}

// ---------- the ink pass ----------
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
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
}`;

export class InkPass extends Pass {
  constructor(gbuf, camera) {
    super();
    this.gbuf = gbuf;
    this.camera = camera;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tNormal: { value: gbuf.texture },
        tDepth: { value: gbuf.depthTexture },
        uTexel: { value: new THREE.Vector2() },
        uNear: { value: 0.5 },
        uFar: { value: 200 },
        uPR: { value: 1 },
        uSil: { value: 1.5 },
        uSilChar: { value: 2.2 },
        uCrease: { value: 1 },
        uSilT: { value: 0.02 },
        uCreaseT: { value: 0.25 },
        uIdOn: { value: 1 },
        uStrength: { value: 1 },
        uNearRef: { value: 18 },
        uTone: { value: 0.3 },
        uWobble: { value: 0 },
        uInk: { value: new THREE.Color(0.012, 0.014, 0.03) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  set(p) {
    const u = this.mat.uniforms;
    for (const [k, v] of Object.entries(p)) {
      if (!u[k]) continue;
      if (u[k].value && u[k].value.isColor) u[k].value.setRGB(...v);
      else u[k].value = v;
    }
  }
  setSize(w, h) {
    this.mat.uniforms.uTexel.value.set(1 / w, 1 / h);
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.mat.uniforms;
    u.tDiffuse.value = readBuffer.texture;
    u.uNear.value = this.camera.near;
    u.uFar.value = this.camera.far;
    // line width follows the frame's height (a 900 px tall frame = 1), so a QHD screen or a phone gets the same look
    u.uPR.value = Math.min(3, Math.max(0.8, 1 / u.uTexel.value.y / 900));
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.mat.dispose();
    this.quad.dispose();
  }
}
