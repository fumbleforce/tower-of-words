// The fountain's water in the anime look (#383), built over the plaza's fountain (scenes/plaza/fountain.js) without
// changing it: its transparent water (the surfaces, curtains, foam and ripple rings) comes out of the fountain's
// group and two meshes take their place, each one draw call with its own small shader:
//   surface   the basin and both bowls: turquoise by depth (deeper toward the column), the sky at a glancing view,
//             ripple rings running out from where the water lands, a band of foam there, a pale line along the rim
//             and sparkles that come and go
//   falls     the falling water, as in the fountain before the anime look: from each bowl one unbroken curtain all
//             the way round, pouring over the lip and down into the water below, even, with streaks running down
//             it; and the small spout rising from the finial. Jørgen, 2026-10-10, on separate jets: "water is just
//             coming out of the air, it should look like before, with a continuous, even waterfall"
// Colours per phase of the day: look/anime/periods.js. Returns { set(look), stats } or null without a fountain.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// the fountain's measures (scenes/plaza/fountain.js): the rim's width, the basin's water level, the bowls
const RIM_W = 0.42,
  WATER = 0.34;
// each fall, as (r, y) points from the top down, turned round the column: the lower bowl's lip is at r 1.56, y 1.42
// to 1.54, the upper's at r 0.82, y 2.22 to 2.31, the finial's tip at y 2.66. A curtain starts on the lip's top,
// pours over its outer edge and lands in the water below (the basin at y 0.34, the lower bowl's at 1.5); the spout
// rises from the finial's tip. [profile, segments round, the streaks' direction (1 down, -1 up)]
const FALLS = [
  [
    [
      [1.5, 1.548],
      [1.575, 1.538],
      [1.62, 1.47],
      [1.66, 1.2],
      [1.7, 0.75],
      [1.72, WATER - 0.02],
    ],
    64,
    1,
  ],
  [
    [
      [0.77, 2.318],
      [0.835, 2.31],
      [0.87, 2.25],
      [0.9, 2.0],
      [0.92, 1.48],
    ],
    40,
    1,
  ],
  [
    [
      [0.035, 2.62],
      [0.05, 2.85],
      [0.075, 3.12],
    ],
    10,
    -1,
  ],
];
// each water surface: radius, height, the column's radius in it, where the falling water lands on it
const SURFACES = (IN) => [
  [IN, WATER, 1.05, 1.72],
  [1.46, 1.5, 0.3, 0.92],
  [0.74, 2.28, 0.12, 0.3],
];

const COMMON = `
uniform float uTime, uLight; uniform vec3 uShallow, uDeep, uSky, uFoam;
float wH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wH(i), wH(i + vec2(1, 0)), f.x), mix(wH(i + vec2(0, 1)), wH(i + vec2(1, 1)), f.x), f.y); }
`;

const SURFACE_VERT = `
attribute vec3 aW; varying vec3 vL; varying vec3 vWP; varying vec3 vW;
void main(){ vL = position; vW = aW; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const SURFACE_FRAG = `${COMMON}
varying vec3 vL; varying vec3 vWP; varying vec3 vW;
void main(){
  float r = length(vL.xz), ang = atan(vL.z, vL.x);
  float k = clamp((r - vW.x) / (vW.y - vW.x), 0.0, 1.0); // 0 at the column, 1 at the rim
  float deep = 1.0 - smoothstep(0.05, 1.0, k);
  vec3 col = mix(uShallow, uDeep, clamp(deep * 0.85 + (wN(vL.xz * 1.3) - 0.5) * 0.25, 0.0, 1.0));
  vec3 V = normalize(cameraPosition - vWP);
  col = mix(col, uSky, pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0) * 0.7);
  // rings running outward from where the streams land, broken into arcs
  float ph = (r - vW.z) * 7.5 - uTime * 2.2 + wN(vL.xz * 2.2) * 2.0;
  float ring = smoothstep(0.82, 0.96, 0.5 + 0.5 * sin(ph)) * step(vW.z, r);
  ring *= smoothstep(0.35, 0.62, wN(vec2(ang * 3.2, r * 1.5 - uTime * 0.35))) * (1.0 - k * 0.55);
  // inside the landing ring, softer rings running in
  float inner = smoothstep(0.88, 0.97, 0.5 + 0.5 * sin(r * 9.0 + uTime * 1.6)) * (1.0 - step(vW.z, r)) * 0.5;
  // foam where the water lands, churning
  float band = 1.0 - smoothstep(0.0, 0.17, abs(r - vW.z));
  float churn = wN(vec2(ang * 9.0 + uTime * 0.6, r * 10.0 - uTime * 2.4));
  float foam = band * smoothstep(0.45, 0.8, churn + band * 0.3) * 0.85;
  // a pale line along the rim and round the column
  float edge = smoothstep(vW.y - 0.09, vW.y, r) * 0.7 + (1.0 - smoothstep(vW.x, vW.x + 0.06, r)) * 0.5;
  col = mix(col, uFoam, clamp(ring * 0.45 + inner * 0.6 + foam + edge, 0.0, 1.0));
  // sparkles that come and go
  vec2 sc = vL.xz * 8.0, cell = floor(sc);
  float h = wH(cell + floor(uTime * 1.7 + wH(cell + 7.0) * 9.0));
  float sp = step(0.985, h) * (1.0 - smoothstep(0.04, 0.2, length(fract(sc) - 0.5)));
  col += sp * 0.9;
  float a = max(mix(0.6, 0.9, deep), max(foam, ring * 0.7));
  gl_FragColor = vec4(col * uLight, a);
}`;

const FALL_VERT = `
attribute float aDir; varying vec2 vUv; varying float vF, vDir;
void main(){
  vUv = uv; vDir = aDir;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vF = 1.0 - abs(dot(n, normalize(cameraPosition - w.xyz))); // 0 facing the camera, 1 at the curtain's sides
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const FALL_FRAG = `${COMMON}
varying vec2 vUv; varying float vF, vDir;
void main(){
  // u round the column, v down the fall (0 at the lip). Streaks of different lengths run down it; they change its
  // brightness and never cut it, so the curtain stays whole and even
  float u = vUv.x, v = vUv.y;
  float t = uTime * 1.6 * vDir;
  float streak = wN(vec2(u * 140.0, v * 3.0 - t)) * 0.65 + wN(vec2(u * 330.0, v * 6.0 - t * 1.4)) * 0.35;
  float a = (0.45 + 0.3 * vF) * (0.75 + 0.35 * streak);
  a *= vDir > 0.0 ? 1.0 : 1.0 - smoothstep(0.55, 1.0, v); // the spout thins out at its top
  vec3 col = mix(uShallow * 1.25, uFoam, 0.45 + 0.4 * smoothstep(0.35, 0.8, streak) + 0.15 * vF);
  gl_FragColor = vec4(col * uLight, a);
}`;

function material(vert, frag, uniforms, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    ...extra,
  });
}

function falls() {
  const parts = FALLS.map(([profile, segments, dir]) => {
    const g = new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      segments,
    );
    g.setAttribute(
      'aDir',
      new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(dir), 1),
    );
    return g;
  });
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return g;
}

function surfaces(IN) {
  const parts = SURFACES(IN).map(([r, y, inner, lands]) => {
    const g = new THREE.CircleGeometry(r, 72).rotateX(-Math.PI / 2).translate(0, y + 0.004, 0);
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const n = g.attributes.position.count,
      w = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) w.set([inner, r, lands], i * 3);
    g.setAttribute('aW', new THREE.BufferAttribute(w, 3));
    return g;
  });
  // one geometry: the three discs' vertices and indices one after another
  const g = new THREE.BufferGeometry(),
    pos = [],
    w = [],
    index = [];
  let base = 0;
  for (const p of parts) {
    pos.push(...p.attributes.position.array);
    w.push(...p.attributes.aW.array);
    for (const i of p.index.array) index.push(base + i);
    base += p.attributes.position.count;
    p.dispose();
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aW', new THREE.Float32BufferAttribute(w, 3));
  g.setIndex(index);
  return g;
}

export function animeFountain(scene, basin) {
  const ripple = scene.getObjectByName('fountain:ripple');
  const group = ripple?.parent;
  if (!group) return null;
  // the fountain's own water: its transparent meshes
  const old = group.children.filter((o) => o.isMesh && o.material?.transparent);
  for (const o of old) group.remove(o);
  const U = {
    uTime: { value: 0 },
    uLight: { value: 1 },
    uShallow: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color() },
    uSky: { value: new THREE.Color() },
    uFoam: { value: new THREE.Color() },
  };
  const surface = new THREE.Mesh(surfaces(basin - RIM_W), material(SURFACE_VERT, SURFACE_FRAG, U));
  const fall = new THREE.Mesh(falls(), material(FALL_VERT, FALL_FRAG, U, { side: THREE.DoubleSide }));
  surface.renderOrder = 1;
  fall.renderOrder = 2;
  const t0 = performance.now();
  for (const m of [surface, fall]) {
    m.name = 'anime:water';
    m.userData.noLook = m.userData.noInk = m.userData.noAO = true;
    group.add(m);
  }
  surface.onBeforeRender = () => (U.uTime.value = (performance.now() - t0) / 1000);
  return {
    set(look, dusk) {
      U.uShallow.value.set(look.water.shallow);
      U.uDeep.value.set(look.water.deep);
      U.uSky.value.set(look.water.sky);
      U.uFoam.value.set(look.water.foam);
      U.uLight.value = dusk ? 0.75 : 1;
    },
    stats: {
      removed: old.length,
      triangles: [surface, fall].map((m) => m.geometry.index.count / 3),
    },
  };
}
