// Everything outside the train: the sea far below, the monorail beam and the pillars that pass under it.
// The train stands still in the world and the world moves past it (sea texture scroll, pillars).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { monorailParts } from './models.js';

export const SEA_Y = -17; // sea level, far below the car floor (y = 0)
export const BEAM_TOP = -0.16; // top of the straddle beam: the car rides low on it, its skirt down either side (#359)
export const SPEED = 9; // world units per second
export const PILLAR_GAP = 19; // distance between pillars
export const BEAM2_Z = -7.5; // the parallel line for trains going the other way
const NP = 7; // pillars kept alive around the train

// Direction the sea shader throws shadows along (toward the sun). It is steeper than the key light
// so the pillar and train shadows land on the water that the camera can actually see.
export const SEA_SHADOW_DIR = new THREE.Vector3(-0.36, 1.0, 0.62).normalize();

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
  float foam = 0.0;
  for (int k = 0; k < 6; k++) foam += foamAt(q + vec2(uBlur * (float(k) / 5.0 - 0.5), 0.0), crest);
  foam *= 1.0 / 6.0;

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

export function buildWorld(scene, { sunDir }) {
  const root = new THREE.Group();
  scene.add(root);

  const lin = (h) => new THREE.Color(h);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420, 1, 1),
    new THREE.ShaderMaterial({
      vertexShader: SEA_VERT,
      fragmentShader: SEA_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uSeaY: { value: SEA_Y },
        uBeamY: { value: BEAM_TOP },
        uCarHalfZ: { value: 1.3 },
        uBeam2Z: { value: BEAM2_Z },
        uBlur: { value: 0.14 },
        uBand: { value: 5.2 },
        uPillarTop: { value: BEAM_TOP - 0.6 },
        uQuality: { value: 1 },
        uShadowDir: { value: SEA_SHADOW_DIR.clone() },
        uSunDir: { value: sunDir.clone() },
        uCamPos: { value: new THREE.Vector3() },
        uPillarX: { value: new Array(NP).fill(0) },
        uDeep: { value: lin('#0c4478') },
        uMid: { value: lin('#17639c') },
        uShallow: { value: lin('#4796c4') },
        uFoam: { value: lin('#f2f9ff') },
        uShadow: { value: lin('#3a5f9a') },
      },
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_Y;
  sea.userData.noAO = true;
  root.add(sea);

  // The Blender-built beam segments, pillars and feet (models.js), when they loaded; else the older code-made ones
  const M = monorailParts();
  // Concrete beam: one long rounded box. Joint plates slide along it to show speed.
  const concrete = new THREE.MeshStandardMaterial({ color: '#8b939e', roughness: 0.92 });
  const concreteDark = new THREE.MeshStandardMaterial({ color: '#737c88', roughness: 0.95 });
  const beam = new THREE.Mesh(new RoundedBoxGeometry(160, 0.9, 0.62, 3, 0.1), concrete);
  beam.position.set(0, BEAM_TOP - 0.45, 0);
  beam.receiveShadow = true;
  // the parallel guideway for trains going the other way, further off
  const beam2 = beam.clone();
  beam2.position.z = BEAM2_Z;
  if (!M) root.add(beam, beam2);
  // Blender beam: 9.5 m segments, each with its joint at its start, that slide along under the train (update) and
  // stop at the line's end (placeEnd); one instanced mesh per line
  const SEG = 9.5,
    NSEG = 12;
  const segs = M
    ? [0, BEAM2_Z].map((z) => {
        const im = new THREE.InstancedMesh(M.beam.geometry, M.beam.material, NSEG);
        im.receiveShadow = true;
        im.frustumCulled = false;
        im.userData.noBatch = true; // moves every frame: never merged (js/perf/batch.js)
        im.userData.z = z;
        root.add(im);
        return im;
      })
    : [];
  const _m = new THREE.Matrix4(),
    _p = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _s = new THREE.Vector3();
  function placeSegs(scroll) {
    const span = SEG * NSEG;
    for (const im of segs) {
      for (let i = 0; i < NSEG; i++) {
        const x0 = ((((i * SEG - scroll) % span) + span) % span) - span / 2;
        const k = Math.max(0, Math.min(1, (end - x0) / SEG));
        _p.set(x0, BEAM_TOP, im.userData.z);
        _s.set(Math.max(k, 1e-4), k > 0 ? 1 : 1e-4, 1);
        im.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }

  // where the line ends (setRide): the beams stop at a buffer block; past it no pillars or joints
  let end = Infinity;
  const plateMat = new THREE.MeshStandardMaterial({ color: '#c9ccd0' });
  const buffers = [0, BEAM2_Z].map((z) => {
    const b = new THREE.Group();
    const block = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.15, 0.9, 2, 0.08), concreteDark);
    block.position.y = BEAM_TOP - 0.3;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.7), plateMat);
    plate.position.set(-0.37, BEAM_TOP - 0.1, 0);
    b.add(block, plate);
    b.position.set(0, 0, z);
    b.visible = false;
    root.add(b);
    return b;
  });
  function placeEnd() {
    const open = !(end < 80);
    for (const bm of [beam, beam2]) {
      bm.scale.x = open ? 1 : Math.max(0.001, (end + 80) / 160);
      bm.position.x = open ? 0 : (end - 80) / 2;
    }
    for (const b of buffers) {
      b.visible = !open;
      b.position.x = end + 0.35;
    }
  }

  const joints = new THREE.Group();
  if (!M) root.add(joints);
  const jointGeo = new THREE.BoxGeometry(0.05, 0.92, 0.64);
  const JN = 16,
    JGAP = 9.5;
  for (let i = 0; i < JN; i++) {
    const j = new THREE.Mesh(jointGeo, concreteDark);
    j.position.set(0, BEAM_TOP - 0.45, 0);
    j.userData.noBatch = true; // slides by every frame (update()): never merged (js/perf/batch.js)
    joints.add(j);
  }

  // Pillars: a tapered column with a hammerhead cap under the beam, and a foot where it stands in the sea. The feet
  // ride on their own group (feet), which follows the sea's level on the run in (setRide): the column runs on down
  // under the water, and the sea's foam collar always rings a foot.
  const pillars = [],
    feet = [];
  const colH = BEAM_TOP - 0.9 - 0.45 - (SEA_Y - 1);
  // Blender pillar: column, collar, hammerhead and bearings in one mesh, in the world's heights; its foot apart
  const mono = (name) => {
    const m = new THREE.Mesh(M[name].geometry, M[name].material);
    m.name = name;
    return m;
  };
  const colGeo = new THREE.CylinderGeometry(0.36, 0.46, colH, 10, 1);
  const capGeo = new RoundedBoxGeometry(1.1, 0.5, 1.5, 3, 0.12);
  const footGeo = new THREE.CylinderGeometry(0.72, 0.8, 0.8, 12, 1);
  for (let i = 0; i < NP; i++) {
    const g = new THREE.Group(),
      base = new THREE.Group();
    const col = M ? mono('pillar') : new THREE.Mesh(colGeo, concrete);
    if (!M) col.position.y = SEA_Y - 1 + colH / 2;
    const cap = new THREE.Mesh(capGeo, concrete);
    cap.position.y = BEAM_TOP - 0.9 - 0.2;
    const foot = M ? mono('foot') : new THREE.Mesh(footGeo, concreteDark);
    foot.position.y = SEA_Y + 0.1;
    for (const m of M ? [col, foot] : [col, cap, foot]) {
      m.castShadow = false;
      m.receiveShadow = false;
      const c2 = m.clone();
      c2.position.z = BEAM2_Z;
      (m === foot ? base : g).add(m, c2);
    }
    g.add(base);
    feet.push(base);
    root.add(g);
    pillars.push(g);
  }

  const u = sea.material.uniforms;
  const span = PILLAR_GAP * NP;
  function update(t, camera) {
    const scroll = t * SPEED;
    u.uTime.value = t;
    u.uScroll.value = scroll;
    u.uCamPos.value.copy(camera.position);
    for (let i = 0; i < NP; i++) {
      // pillar world x, wrapping around the train
      let x = i * PILLAR_GAP - (scroll % span);
      x = (((x % span) + span) % span) - span / 2 + 4;
      pillars[i].position.x = x;
      pillars[i].visible = x < end - 0.8;
      u.uPillarX.value[i] = x;
    }
    if (M) placeSegs(scroll);
    const jspan = JGAP * JN;
    joints.children.forEach((j, idx) => {
      const i = idx;
      let x = i * JGAP - (scroll % jspan);
      j.position.x = (((x % jspan) + jspan) % jspan) - jspan / 2;
      j.visible = j.position.x < end;
    });
  }

  // How close the nearest pillar is to passing under the middle of the car (0..1), for light flicker.
  function pillarNear() {
    let m = 0;
    for (const p of pillars) m = Math.max(m, 1 - Math.min(1, Math.abs(p.position.x + 1.5) / 1.2));
    return m;
  }

  return {
    root,
    sea,
    update,
    movers: [...pillars, ...feet, ...buffers], // for the draw-call pass (place.perfMovers)
    // the run in to the station (train/island.js): the sea's level under the car, and where the line ends ahead
    // (Infinity: on over the bay)
    setRide(seaY, lineEnd) {
      sea.position.y = seaY;
      u.uSeaY.value = seaY;
      for (const f of feet) f.position.y = seaY - SEA_Y;
      u.uBand.value = (5.2 * (0.4 - seaY)) / (0.4 - SEA_Y);
      if (lineEnd !== end) {
        end = lineEnd;
        placeEnd();
      }
    },
    pillarNear,
    setQuality: (q) => {
      u.uQuality.value = q ? 1 : 0.6;
    },
  };
}
