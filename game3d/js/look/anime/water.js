// The fountain's water for the anime trial (#383), built over the plaza's fountain (scenes/plaza/fountain.js) without
// changing it: the trial takes its transparent water (the surfaces, curtains, foam and ripple rings) out of the
// fountain's group and puts three meshes in their place, each one draw call with its own small shader:
//   surface   the basin and both bowls: turquoise by depth (deeper toward the column), the sky at a glancing view,
//             ripple rings running out from where the water lands, a band of foam there, a pale line along the rim
//             and sparkles that come and go
//   ribbons   the falling water as streams, each a ribbon turned to the camera along an arc from a bowl's lip, with
//             streaks running down it
//   splashes  rings spreading where each stream lands, round a patch of white water
// Colours per phase of the day: look/anime/periods.js. Returns { set(look), stats } or null without a fountain.
import * as THREE from 'three';

// the fountain's measures (scenes/plaza/fountain.js): the rim's width, the basin's water level, the bowls
const RIM_W = 0.42,
  WATER = 0.34;
// each stream: [count, width, from (r, y), bend (r, y), lands (r, y), splash size, turn]
const STREAMS = [
  [12, 0.17, [1.55, 1.53], [1.86, 1.5], [1.98, WATER], 0.34, 0],
  [8, 0.12, [0.81, 2.31], [1.0, 2.3], [1.1, 1.5], 0.28, 0.2],
  [5, 0.06, [0.03, 2.64], [0.16, 3.3], [0.52, 2.28], 0.16, 0.5],
];
// each water surface: radius, height, the column's radius in it, where the falling water lands on it
const SURFACES = (IN) => [
  [IN, WATER, 1.05, 1.98],
  [1.46, 1.5, 0.3, 1.1],
  [0.74, 2.28, 0.12, 0.52],
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

const RIBBON_VERT = `
attribute vec3 aT; attribute vec3 aS; attribute float aHW; varying vec3 vS;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec3 t = normalize(mat3(modelMatrix) * aT);
  vec3 side = normalize(cross(t, cameraPosition - w.xyz));
  w.xyz += side * aS.x * aHW;
  vS = aS; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RIBBON_FRAG = `${COMMON}
varying vec3 vS;
void main(){
  float across = vS.x, u = vS.y;
  float core = 1.0 - smoothstep(0.25, 1.0, abs(across));
  float streak = wN(vec2(across * 2.5 + vS.z * 40.0, u * 4.5 - uTime * 2.6));
  float a = core * (0.5 + 0.5 * smoothstep(0.25, 0.8, streak)) * smoothstep(0.0, 0.06, u);
  vec3 col = mix(uShallow * 1.25, uFoam, 0.45 + 0.55 * streak);
  gl_FragColor = vec4(col * uLight, a * 0.9);
}`;

const SPLASH_VERT = `
attribute vec3 aQ; varying vec3 vQ;
void main(){ vQ = aQ; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SPLASH_FRAG = `${COMMON}
varying vec3 vQ;
void main(){
  float d = length(vQ.xy), a = 0.0;
  for (int k = 0; k < 3; k++) {
    float f = fract(uTime * 0.85 + vQ.z + float(k) / 3.0);
    a += (1.0 - smoothstep(0.0, 0.07, abs(d - 0.2 - f * 0.78))) * (1.0 - f) * 0.9;
  }
  a += (1.0 - smoothstep(0.08, 0.32, d)) * (0.65 + 0.35 * sin(uTime * 9.0 + vQ.z * 40.0));
  a *= 1.0 - smoothstep(0.92, 1.0, d);
  gl_FragColor = vec4(uFoam * uLight, clamp(a, 0.0, 1.0) * 0.9);
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

// quadratic arc in (r, y) at angle a, as a point in the fountain's frame
function arc(a, p0, p1, p2, u, out) {
  const v = 1 - u,
    r = v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0],
    y = v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1];
  return out.set(Math.cos(a) * r, y, Math.sin(a) * r);
}

function ribbons() {
  const pos = [],
    tan = [],
    s = [],
    hw = [],
    index = [],
    p = new THREE.Vector3(),
    q = new THREE.Vector3(),
    SEG = 12;
  let seed = 0;
  for (const [n, w, p0, p1, p2, , turn] of STREAMS)
    for (let i = 0; i < n; i++) {
      const a = ((i + turn) / n) * Math.PI * 2,
        first = pos.length / 3;
      seed += 0.137;
      for (let j = 0; j <= SEG; j++) {
        const u = j / SEG;
        arc(a, p0, p1, p2, u, p);
        arc(a, p0, p1, p2, Math.min(1, u + 0.02), q);
        if (u >= 1) arc(a, p0, p1, p2, 0.98, q).sub(p).negate().add(p);
        q.sub(p).normalize();
        const width = w * (1 + u * 0.6); // the stream spreads as it falls
        for (const side of [-1, 1]) {
          pos.push(p.x, p.y, p.z);
          tan.push(q.x, q.y, q.z);
          s.push(side, u, seed);
          hw.push(width * 0.5);
        }
        if (j < SEG) {
          const k = first + j * 2;
          index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
    }
  // aT: the arc's direction; aS: (side, along, the stream's seed); aHW: half the width
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(tan, 3));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 3));
  g.setAttribute('aHW', new THREE.Float32BufferAttribute(hw, 1));
  g.setIndex(index);
  return g;
}

function splashes() {
  const pos = [],
    q = [],
    index = [];
  let n = 0;
  for (const [count, , , , p2, size, turn] of STREAMS)
    for (let i = 0; i < count; i++) {
      const a = ((i + turn) / count) * Math.PI * 2,
        x = Math.cos(a) * p2[0],
        z = Math.sin(a) * p2[0],
        seed = (n * 0.618) % 1;
      for (const [u, v] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        pos.push(x + u * size, p2[1] + 0.012, z + v * size);
        q.push(u, v, seed);
      }
      const k = n * 4;
      index.push(k, k + 2, k + 1, k, k + 3, k + 2);
      n++;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aQ', new THREE.Float32BufferAttribute(q, 3));
  g.setIndex(index);
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
  const streams = new THREE.Mesh(
    ribbons(),
    material(RIBBON_VERT, RIBBON_FRAG, U, { side: THREE.DoubleSide, blending: THREE.NormalBlending }),
  );
  const splash = new THREE.Mesh(splashes(), material(SPLASH_VERT, SPLASH_FRAG, U));
  surface.renderOrder = 1;
  splash.renderOrder = 2;
  streams.renderOrder = 3;
  const t0 = performance.now();
  for (const m of [surface, streams, splash]) {
    m.name = 'anime:water';
    m.userData.noLook = m.userData.noInk = m.userData.noAO = true;
    m.frustumCulled = m !== streams; // the ribbons widen in the shader, past their box
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
    stats: { removed: old.length, triangles: [surface, streams, splash].map((m) => m.geometry.index.count / 3) },
  };
}
