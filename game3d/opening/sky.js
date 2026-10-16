import*as t from"three";export const SUN=new t.Vector3(1,.15,-.14).normalize();export function logDepth(e){const o=e.vertexShader,a=e.fragmentShader,r=o.lastIndexOf("}"),i=o.includes("#include <common>")?"":`#include <common>
`;return e.vertexShader=i+`#include <logdepthbuf_pars_vertex>
`+o.slice(0,r)+`
  #include <logdepthbuf_vertex>
`+o.slice(r),e.fragmentShader=`#include <logdepthbuf_pars_fragment>
`+a.replace(/void\s+main\s*\(\s*\)\s*\{/,l=>l+`
  #include <logdepthbuf_fragment>`),e.needsUpdate=!0,e}const n=e=>new t.Color(e);export const SKY_UNIFORMS=()=>({uSun:{value:SUN.clone()},uTime:{value:0},uZenith:{value:n("#1f5bcc")},uUpper:{value:n("#4f91ea")},uHaze:{value:n("#dcd3ee")},uWarm:{value:n("#ffc78f")},uGlow:{value:n("#fff0d8")},uSkyGain:{value:1},uCloudCover:{value:.5},uCloudShade:{value:n("#a3b0ea")},uCloudLit:{value:n("#ffffff")},uCloudRim:{value:n("#ffe9dc")}}),SKY_GLSL=`
uniform vec3 uSun, uZenith, uUpper, uHaze, uWarm, uGlow, uCloudShade, uCloudLit, uCloudRim;
uniform float uTime, uSkyGain, uCloudCover;
// The sky without clouds: zenith to horizon, warm toward the sun, the sun's glow and disc.
vec3 skyBase(vec3 d, bool disc) {
  float e = clamp(d.y, -0.2, 1.0);
  float toSun = max(dot(d, uSun), 0.0);
  vec3 horizon = mix(uHaze, uWarm, pow(toSun, 3.0));
  vec3 c = mix(horizon, uUpper, smoothstep(0.0, 0.28, e));
  c = mix(c, uZenith, smoothstep(0.22, 0.85, e));
  c += uGlow * (pow(toSun, 9.0) * 0.55 + pow(toSun, 60.0) * 0.9);
  if (disc) c += uGlow * smoothstep(0.9993, 0.9996, toSun) * 14.0;
  return c * uSkyGain;
}
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// the cell index wraps every 256 cells before it is hashed: far out (the bay runs to x 1000 and the finer octaves
// multiply that) h21's fract(p * 456.21) ran out of float precision and the sea and clouds broke into square patches
float hw(vec2 i) { return h21(mod(i, 256.0)); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hw(i), hw(i + vec2(1, 0)), u.x), mix(hw(i + vec2(0, 1)), hw(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = r * p * 2.03 + 3.1; a *= 0.5; }
  return s;
}
`;const s=`
varying vec3 vDir;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDir = w.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z = gl_Position.w * 0.99999; // always behind everything
}`,v=`
precision highp float;
${SKY_GLSL}
varying vec3 vDir;
// cumulus density on the cloud deck seen along d
float cloudAt(vec2 p, float horizonBoost) {
  vec2 w = vec2(fbm(p * 0.7 + 11.0), fbm(p * 0.7 - 7.0));
  float n = fbm(p + w * 0.9 + vec2(uTime * 0.012, 0.0));
  return n + horizonBoost;
}
void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyBase(d, true);
  if (d.y > -0.02) {
    float y = max(d.y, 0.0);
    vec2 p = d.xz / (y + 0.09) * 0.75;
    float hb = 0.22 * (1.0 - smoothstep(0.0, 0.35, y)); // towering clouds low on the horizon
    float n = cloudAt(p, hb);
    float cov = 1.0 - uCloudCover;
    float body = smoothstep(cov, cov + 0.05, n);
    if (body > 0.001) {
      // light from the sun's side of the cloud: does the density fall off toward the sun?
      vec2 sd = normalize(uSun.xz + 1e-4) * 0.09;
      float n2 = cloudAt(p + sd, hb);
      float lit = clamp((n - n2) * 9.0 + 0.55, 0.0, 1.0);
      float band = smoothstep(0.42, 0.5, lit) * 0.6 + smoothstep(0.75, 0.82, lit) * 0.4; // cel steps
      float toSun = max(dot(d, uSun), 0.0);
      vec3 shade = mix(uCloudShade, uCloudRim * 0.9, pow(toSun, 8.0) * 0.45);
      vec3 cc = mix(shade, mix(uCloudLit, uCloudRim, pow(toSun, 8.0)), band) * uSkyGain * 1.05;
      // silver lining: thin edges glow toward the sun
      float edge = 1.0 - smoothstep(cov + 0.0, cov + 0.06, n);
      cc += uGlow * edge * pow(toSun, 5.0) * 2.5;
      // haze on clouds near the horizon
      cc = mix(cc, skyBase(d, false), (1.0 - smoothstep(0.0, 0.12, y)) * 0.55);
      c = mix(c, cc, body * smoothstep(-0.02, 0.02, d.y));
    }
  }
  gl_FragColor = vec4(c, 1.0);
}`;export function buildSky(e){const o=new t.ShaderMaterial({vertexShader:s,fragmentShader:v,uniforms:e,side:t.BackSide,depthWrite:!1}),a=new t.Mesh(new t.SphereGeometry(8e3,48,24),o);return a.frustumCulled=!1,a.renderOrder=-10,a.onBeforeRender=(r,i,l)=>a.position.copy(l.position),a}const u=`
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,f=`
precision highp float;
${SKY_GLSL}
uniform vec3 uDeep, uShallow;
uniform float uGlitter;
varying vec3 vW;
void main() {
  vec3 v = normalize(vW - cameraPosition);
  float dist = length(vW.xz - cameraPosition.xz);
  // small waves: two scrolling noise slopes, flattened with distance
  float t = uTime;
  vec2 p = vW.xz * 0.08;
  float e = 0.6;
  float fade = 1.0 / (1.0 + dist * 0.004);
  // slow swell: the pattern drifts gently instead of boiling
  vec2 drift = vec2(t * 0.035, t * 0.02);
  vec2 g1 = vec2(fbm(p + drift + vec2(e, 0.0)) - fbm(p + drift - vec2(e, 0.0)), fbm(p + drift + vec2(0.0, e)) - fbm(p + drift - vec2(0.0, e)));
  vec3 n = normalize(vec3(g1.x * 0.22 * fade, 1.0, g1.y * 0.22 * fade));
  vec3 r = reflect(v, n);
  r.y = max(abs(r.y), 0.12); // reflect the blue above the haze, not the white horizon
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-v, n), 0.0), 5.0);
  vec3 body = mix(uDeep, uShallow, smoothstep(0.0, 0.6, fres));
  vec3 sky = skyBase(r, false);
  vec3 c = mix(body, sky * vec3(0.8, 0.88, 1.0), fres * 0.7);
  // the sun's path: a warm sheen plus glitter points that change on twos
  float sp = max(dot(r, uSun), 0.0);
  vec3 sheen = mix(uWarm, vec3(1.0), 0.65); // nearly white, so its bloom doesn't fringe orange round dark pillars
  c += sheen * (pow(sp, 60.0) * 0.5 + pow(sp, 400.0) * 1.5);
  // glitter on the sun's path: points that swell and fade smoothly, each on its own slow cycle
  vec2 q = vW.xz * vec2(0.7, 1.6);
  vec2 cell = floor(q);
  float h = h21(cell);
  vec2 jit = vec2(h21(cell + 3.1), h21(cell + 7.7)) * 0.6 + 0.2;
  float dot_ = 1.0 - smoothstep(0.04, 0.13, length(fract(q) - jit));
  float near = 1.0 - smoothstep(120.0, 600.0, dist);
  float life = max(0.0, sin(t * (1.2 + h * 1.6) + h * 40.0));
  float glit = step(0.86, h) * dot_ * near * pow(sp, 40.0) * 6.0 * life * life * uGlitter;
  c += uGlow * glit;
  // aerial haze toward the horizon
  float hz = 1.0 - exp(-dist * 0.00022);
  c = mix(c, skyBase(normalize(vec3(v.x, 0.05, v.z)), false), clamp(hz, 0.0, 1.0));
  gl_FragColor = vec4(c, 1.0);
}`;export function buildSea(e,o){const a={...e,uDeep:{value:n("#0a4486")},uShallow:{value:n("#2a78bf")},uGlitter:{value:1}},r=logDepth(new t.ShaderMaterial({vertexShader:u,fragmentShader:f,uniforms:a})),i=new t.Mesh(new t.PlaneGeometry(3e4,3e4,1,1),r);return i.rotation.x=-Math.PI/2,i.position.y=o-.12,i.frustumCulled=!1,i}const d=`
attribute vec3 aTint;
attribute float aSeed;
varying vec3 vW, vN, vTint, vLocal, vScale;
varying float vSeed;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  // the box's own position and size, for edge distances in metres in the fragment shader
  vLocal = position;
  vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vTint = aTint;
  vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,h=`
precision highp float;
${SKY_GLSL}
uniform float uHazeK;
varying vec3 vW, vN, vTint, vLocal, vScale;
varying float vSeed;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vW - cameraPosition);
  float dist = length(vW - cameraPosition);
  float sun = max(dot(n, uSun), 0.0);
  vec3 c;
  if (n.y > 0.6) {
    c = vTint * 0.75 * (0.55 + 0.6 * sun);
  } else {
    float u = abs(n.x) > abs(n.z) ? vW.z : vW.x;
    float colW = 4.0, flH = 4.2;
    float fx = fract(u / colW + vSeed), fy = fract(vW.y / flH);
    // two kinds of facade: ribbon glass bands, or punched windows in a frame
    bool ribbon = fract(vSeed * 7.31) > 0.45;
    float win = ribbon ? step(0.22, fy) * step(fy, 0.94) : step(0.12, fx) * step(fx, 0.88) * step(0.2, fy) * step(fy, 0.9);
    vec3 r = reflect(v, n);
    r.y = abs(r.y) * 0.8 + 0.32;
    vec3 refl = skyBase(normalize(r), false);
    float cellH = h21(floor(vec2(u / colW + vSeed * 7.0, vW.y / flH)));
    vec3 glass = refl * vec3(0.34, 0.56, 0.86) * (0.6 + 0.45 * cellH) + vec3(0.0, 0.02, 0.05);
    vec3 wall = vTint * (0.36 + 0.95 * sun) * vec3(0.86, 0.9, 1.0) + uWarm * sun * 0.3;
    c = mix(wall, glass + uWarm * sun * 0.2, win * 0.92);
    float g = pow(max(dot(normalize(reflect(v, n)), uSun), 0.0), 160.0) * win;
    c += uGlow * g * 5.0;
    // sky light from above: the upper floors brighter
    c *= 0.72 + 0.45 * smoothstep(-10.0, 170.0, vW.y);
    // faces toward the open sky to the south read a touch lighter than the rest
    c *= 0.9 + 0.16 * max(n.z, 0.0);
    // drawn edges: a bright line on every vertical corner and a cornice band under the roof
    float ex = (0.5 - abs(vLocal.x)) * vScale.x, ez = (0.5 - abs(vLocal.z)) * vScale.z, ey = (1.0 - vLocal.y) * vScale.y;
    float corner = 1.0 - smoothstep(0.35, 0.9, abs(n.x) > abs(n.z) ? ez : ex);
    float cornice = 1.0 - smoothstep(0.6, 1.4, ey);
    c = mix(c, vTint * 0.9 + uWarm * 0.2, max(corner, cornice) * 0.75);
  }
  float hz = 1.0 - exp(-dist * uHazeK);
  c = mix(c, skyBase(normalize(vec3(v.x, 0.07, v.z)), false), clamp(hz, 0.0, 0.92));
  gl_FragColor = vec4(c, 1.0);
}`;export function buildingMaterial(e){return logDepth(new t.ShaderMaterial({vertexShader:d,fragmentShader:h,uniforms:{...e,uHazeK:{value:3e-4}}}))}const m=`
varying vec3 vW, vN;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`,c=`
precision highp float;
${SKY_GLSL}
uniform vec3 uColor;
uniform float uHazeK;
varying vec3 vW, vN;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vW - cameraPosition);
  float sun = max(dot(n, uSun), 0.0);
  vec3 c = uColor * (0.7 + 0.7 * smoothstep(0.0, 0.5, sun)) + uWarm * pow(sun, 2.0) * 0.1;
  float dist = length(vW - cameraPosition);
  float hz = 1.0 - exp(-dist * uHazeK);
  c = mix(c, skyBase(normalize(vec3(v.x, 0.07, v.z)), false), clamp(hz, 0.0, 0.95));
  gl_FragColor = vec4(c, 1.0);
}`;export function solidMaterial(e,o,a=3e-4){return logDepth(new t.ShaderMaterial({vertexShader:m,fragmentShader:c,uniforms:{...e,uColor:{value:n(o)},uHazeK:{value:a}}}))}const p=`
attribute vec3 aTint;
varying vec3 vW, vN, vTint;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;export function solidInstancedMaterial(e,o=3e-4){return logDepth(new t.ShaderMaterial({vertexShader:p,fragmentShader:c.replace("uniform vec3 uColor;","varying vec3 vTint;").replace("vec3 c = uColor *","vec3 c = vTint *").replace("varying vec3 vW, vN;","varying vec3 vW, vN;"),uniforms:{...e,uHazeK:{value:o}}}))}
