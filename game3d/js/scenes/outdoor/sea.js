// Shared animated sea surface, originally the train bay shader.
import * as THREE from 'three';
export const SEA_PILLARS = 7;
const NP = SEA_PILLARS;

const SEA_VERT = /* glsl */ `
varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SEA_FRAG = /* glsl */ `
precision highp float;
varying vec3 vW;
uniform float uTime, uScroll, uSeaY, uBeamY, uCarHalfZ, uPillarTop, uQuality, uBeam2Z, uBlur, uBand;
uniform vec3 uShadowDir, uSunDir, uCamPos;
uniform float uPillarX[${NP}];
uniform vec3 uDeep, uMid, uShallow, uFoam, uShadow;

vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash2(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }

// distance from p to segment ab
float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

float ridge(vec2 p){ return 1.0 - abs(noise(p) * 1.6); }
float rfbm(vec2 p){ float a = 0.55, s = 0.0; for (int i = 0; i < 3; i++){ float r = ridge(p); s += a * r * r * r; p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.7; a *= 0.5; } return s; }
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// cellular noise: x = distance to the nearest cell point, y = distance to the edge between cells
vec2 cells(vec2 p, float t){
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 o = h22(i + g);
    o = 0.5 + 0.42 * sin(t + 6.2831 * o);
    float d = length(g + o - f);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(d1, d2 - d1);
}
// sea height: a long swell plus a shorter chop, drifting with the wind
float seaH(vec2 q, vec2 wind){
  return fbm(q * vec2(0.09, 0.16) + wind * 0.04) + 0.3 * fbm(q * vec2(0.7, 1.1) - wind * 0.12 + 5.0);
}
// broken crest strokes: thin ridges of a warped, stretched noise, cut into short pieces
float strokes(vec2 q, float sc, float th){
  vec2 w = vec2(noise(q * 0.21 * sc + 1.7), noise(q * 0.21 * sc - 4.2)) * 1.6;
  float r = ridge(q * vec2(0.28, 0.8) * sc + w);
  float line = smoothstep(th, th + 0.035, r);
  float brk = smoothstep(0.0, 0.22, noise(q * vec2(0.55, 0.3) * sc + 9.0));
  return line * brk;
}
float foamAt(vec2 q, float crest){
  float a = strokes(q, 4.2, 0.9);
  float b = strokes(q + 13.0, 7.5, 0.93) * 0.5;
  // whitecap patches, bunched where the swell is high
  float wc = smoothstep(0.62, 0.8, noise(q * vec2(0.45, 0.9) + 21.0) + noise(q * 1.7) * 0.35);
  a = max(a, wc * 0.85);
  // long thin streaks along the direction of travel
  float st = smoothstep(0.9, 0.97, ridge(q * vec2(0.09, 2.4) + vec2(0.0, 3.3))) * smoothstep(0.2, 0.55, noise(q * vec2(0.12, 0.5)));
  return max(max(a, b), st * 0.7) * crest;
}

void main(){
  vec2 p = vW.xz;
  vec2 q = p + vec2(uScroll, 0.0);
  vec2 wind = vec2(uTime * 0.5, uTime * 0.22);

  // lit height field: soft facets of the swell catch the low sun
  float e = 0.25;
  float h0 = seaH(q, wind), hx = seaH(q + vec2(e, 0.0), wind), hz = seaH(q + vec2(0.0, e), wind);
  vec3 n = normalize(vec3(-(hx - h0) / e * 1.8, 1.0, -(hz - h0) / e * 1.8));
  vec3 L = normalize(uSunDir);
  float lit = clamp(dot(n, L), 0.0, 1.0);
  float big = fbm(q * 0.02 + 3.1);
  vec3 col = mix(uDeep, uMid, smoothstep(-0.35, 0.3, big));
  col = mix(col, uShallow, smoothstep(0.55, 0.95, lit) * 0.7);
  col = mix(col, uDeep * 0.8, smoothstep(0.5, 0.25, lit) * 0.45);

  // foam on the crests, blurred along the direction of travel
  float crest = smoothstep(0.05, 0.35, h0) * (0.4 + 0.6 * smoothstep(-0.2, 0.3, fbm(q * 0.04 - 7.0)));
  // (each tap is a dozen noise lookups and comes out 0 where crest is 0: those pixels skip them, same result, #630)
  float foam = 0.0;
  if (crest > 0.0) {
    for (int k = 0; k < 6; k++) foam += foamAt(q + vec2(uBlur * (float(k) / 5.0 - 0.5), 0.0), crest);
    foam *= 1.0 / 6.0;
  }

  // foam collars where the pillars stand in the water: a crisp ring round the foot (radius 0.8), like the crest
  // strokes, not a soft disc (that read as a blur where the run in brings a foot to the frame's edge)
  for (int i = 0; i < ${NP}; i++){
    for (int k = 0; k < 2; k++){ // both lines' pillars
      vec2 pc = vec2(uPillarX[i], k == 0 ? 0.0 : uBeam2Z);
      float d = length((p - pc) * vec2(1.0, 1.2));
      foam = max(foam, smoothstep(1.12, 1.02, d + h0 * 0.3) * 0.9);
    }
  }
  col = mix(col, uFoam, clamp(foam, 0.0, 1.0) * 0.72);

  // shadows of the beam, the train and the pillars, thrown along the (steep) sea sun
  vec2 sh = uShadowDir.xz / uShadowDir.y;
  float hBeam = uBeamY - 0.45 - uSeaY;
  vec2 pb = p + sh * hBeam;
  float shade = smoothstep(0.5, 0.26, abs(pb.y));
  float hCar = 0.4 - uSeaY;
  vec2 pcar = p + sh * hCar;
  shade = max(shade, smoothstep(0.5, 0.26, abs(pb.y - uBeam2Z)));
  shade = max(shade, smoothstep(uCarHalfZ + 0.3, uCarHalfZ - 0.25, abs(pcar.y)) * 0.85);
  float hTop = uPillarTop - uSeaY;
  for (int i = 0; i < ${NP}; i++){
    vec2 base = vec2(uPillarX[i], 0.0);
    float d = segDist(p, base, base - sh * hTop);
    shade = max(shade, smoothstep(0.55, 0.3, d));
  }
  // the train and its beam throw one long soft band on the water, well off to the side of the car (it runs 17 m up;
  // the band comes in as the line comes down to the island, setRide)
  shade = max(shade, 0.75 * smoothstep(2.6, 1.1, abs(p.y - uBand)));
  col = mix(col, col * uShadow, shade * 0.78);

  // sun glints off the wave facets
  vec3 V = normalize(uCamPos - vW);
  vec3 R = reflect(-normalize(vec3(-0.25, 0.5, -0.8)), n); // glints from the sky ahead, so they reach the camera
  float spec = pow(max(dot(R, V), 0.0), 240.0);
  float tw = 0.6 + 0.4 * sin(uTime * 9.0 + hash(floor(q * 3.0)) * 30.0);
  col += vec3(1.0, 0.96, 0.88) * spec * 0.6 * tw * (1.0 - shade) * uQuality;

  // haze: the bay sits far below, a little softened by the air
  col = mix(col, vec3(0.38, 0.5, 0.56), 0.16);
  // a warm sheen toward the low sun (top of the frame), deeper water toward the viewer
  col += vec3(0.95, 0.7, 0.42) * 0.14 * smoothstep(8.0, -22.0, p.y) * (0.5 + 0.5 * lit);
  col *= 1.0 - 0.16 * smoothstep(-4.0, 22.0, p.y);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function seaMaterial(uniforms) {
  const material = new THREE.ShaderMaterial({ vertexShader: SEA_VERT, fragmentShader: SEA_FRAG, uniforms });
  material.userData.seaSurface = true;
  return material;
}

// A coast has no monorail shadows. Keep the same wave/foam/glint material with those features off-island.
export function coastalSea(root, sunDir, { y = -0.195, size = 800 } = {}) {
  const mat = seaMaterial({
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uSeaY: { value: y },
    uBeamY: { value: y },
    uCarHalfZ: { value: 0 },
    uPillarTop: { value: y },
    uBeam2Z: { value: -10000 },
    uBlur: { value: 0.08 },
    uBand: { value: -10000 },
    uQuality: { value: 1 },
    uShadowDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunDir: { value: sunDir },
    uCamPos: { value: new THREE.Vector3() },
    uPillarX: { value: new Array(NP).fill(-10000) },
    uDeep: { value: new THREE.Color('#175c78') },
    uMid: { value: new THREE.Color('#287e96') },
    uShallow: { value: new THREE.Color('#69b1bd') },
    uFoam: { value: new THREE.Color('#e5f3ee') },
    uShadow: { value: new THREE.Color('#4c7b92') },
  });
  mat.fragmentShader = mat.fragmentShader
    .replace(
      'uniform vec3 uDeep, uMid, uShallow, uFoam, uShadow;',
      'uniform vec3 uDeep, uMid, uShallow, uFoam, uShadow; uniform vec3 uHaze; uniform float uFogNear, uFogFar;',
    )
    .replace('col = mix(col, col * uShadow, shade * 0.78);', 'shade = 0.0;')
    .replace(
      'gl_FragColor = vec4(col, 1.0);',
      'col = mix(col, uHaze, smoothstep(uFogNear, uFogFar, length(uCamPos - vW))); gl_FragColor = vec4(col, 1.0);',
    );
  mat.uniforms.uHaze = { value: new THREE.Color('#b9ccd2') };
  mat.uniforms.uFogNear = { value: 70 };
  mat.uniforms.uFogFar = { value: 140 };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.userData.noAO = true;
  mesh.onBeforeRender = (_r, scene, camera) => {
    camera.getWorldPosition(mat.uniforms.uCamPos.value);
    if (scene.fog) {
      mat.uniforms.uHaze.value.copy(scene.fog.color);
      mat.uniforms.uFogNear.value = scene.fog.near;
      mat.uniforms.uFogFar.value = scene.fog.far;
    }
  };
  root.add(mesh);
  return {
    update: (t) => {
      mat.uniforms.uTime.value = t;
    },
  };
}
