// Amakawa as the game builds it. The outdoor places' own scene builders (js/scenes/forecourt.js and the rest: the
// station with its platform shed and the beam curving in, head office, the plaza and its fountain, the shop street,
// the harbour, the old works...) each build their area in full detail in their own frame; they are set at their
// places on the island (island-layout.js CHUNKS) with the backdrop each carries of the rest of the island taken out.
// The far model (js/scenes/far-model.js) fills in everything between them, with its pieces inside the built areas
// cut away. Then rocks along the foot of the shore, more trees on the green the far model leaves bare, and far hazy
// hills on the horizon for depth.
//
// Scale and place: island units are the game's own (the train car is 8.2 long, a storey 2), 1:1 in the opening's
// world. The layout's beam (PATHS `beam`) starts at the opening's straight beam's end (joinX), its first leg along
// +x; the forecourt builds the rest of it, curving into the shed. The island's ground is 1.5 above the bay (the
// coast's sea wall); the opening's beam comes down to meet the forecourt's (stage.js beamY).
import * as THREE from 'three';
import * as LAYOUT from '../js/scenes/island-layout.js';
import { farModelSteps } from '../js/scenes/far-model.js';
import { coastLand } from '../js/scenes/island-west.js';
import { buildForecourt } from '../js/scenes/forecourt.js';
import { buildPlaza } from '../js/scenes/plaza.js';
import { buildShotengai } from '../js/scenes/shotengai.js';
import { buildEastLane } from '../js/scenes/east-lane.js';
import { buildEastCoast } from '../js/scenes/east-coast.js';
import { buildOfficeQuarter } from '../js/scenes/office-quarter.js';
import { buildHarbour } from '../js/scenes/harbour.js';
import { buildWorks } from '../js/scenes/works.js';
import { buildSports } from '../js/scenes/sports.js';
import { SKY_GLSL, solidMaterial, solidInstancedMaterial, logDepth } from './sky.js';
import { rng } from './paint.js';
import { loadPlantModels } from '../js/scenes/outdoor/plant-models.js';
import { loadStationModel } from '../js/scenes/station-model.js';
import { applyLook } from '../js/look/index.js';

export const WALL = 1.5; // the island's ground above the bay
export const DECK = 2.5; // the platforms (the car's floor) above the ground, scenes/station-shed.js
const PLACES = [
  ['forecourt', buildForecourt],
  ['plaza', buildPlaza],
  ['shotengai', buildShotengai],
  ['east_lane', buildEastLane],
  ['east_coast', buildEastCoast],
  ['office_quarter', buildOfficeQuarter],
  ['harbour', buildHarbour],
  ['works', buildWorks],
  ['sports', buildSports], // the pool, the courts and the gym's corner
];
// what a place builds of the rest of the island around it (its backdrop), taken out so the places don't overlap
// (the near ring of a place's skyline, its neighbours' walls, roofs and windows, stays: the far model is cut away there)
const BACKDROP = /^(skyline:(far|lit-far|lit|ground|tall)|far:|shops:far)/; // lit: the evening windows
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const DEBUG_STRIP = Q.has('strip');
const NO_SURF = Q.get('surf') === '0'; // ?surf=0: the look without its surface patterns (to find a shimmer)

// The far model's colours, lifted into the morning, lit, and hazed like the bay
const FAR_VERT = /* glsl */ `
varying vec3 vW, vN, vC;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vC = color;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FAR_FRAG = /* glsl */ `
precision highp float;
${SKY_GLSL}
uniform float uHazeK;
varying vec3 vW, vN, vC;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vW - cameraPosition);
  vec3 base = vC;
  float l = dot(base, vec3(0.299, 0.587, 0.114));
  base = max(mix(vec3(l), base, 1.7) * 1.05, 0.0);
  if (base.g > base.r * 1.05 && base.g > base.b) base *= vec3(0.72, 1.1, 0.8);
  float sun = max(dot(n, uSun), 0.0);
  vec3 c = base * (0.36 + 0.3 * (0.5 + 0.5 * n.y)) + base * uWarm * sun * 1.0;
  float dist = length(vW - cameraPosition);
  c = mix(c, skyBase(normalize(vec3(v.x, 0.07, v.z)), false), clamp(1.0 - exp(-dist * uHazeK), 0.0, 0.9));
  gl_FragColor = vec4(c, 1.0);
}`;

const inPoly = (poly, x, z) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};

// a place's area on the island: its view rectangle (CHUNKS[].view, its own frame) turned into island points
function areaOf(name) {
  const c = LAYOUT.CHUNKS[name];
  const [x0, x1, z0, z1] = c.view;
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ].map(([x, z]) => LAYOUT.toIsland(name, x, z));
}

// a place's walked area on the island (CHUNKS[].walk, else its view): what it builds there is its own; what it builds
// inside another place's walked area is its stand-in for that neighbour (low pads, placeholder trees), dropped here
// because the neighbour builds the real thing (Jørgen 2026-10-09: grey plates over the forecourt garden)
function walkOf(name) {
  const c = LAYOUT.CHUNKS[name];
  const [x0, x1, z0, z1] = c.walk || c.view;
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ].map(([x, z]) => LAYOUT.toIsland(name, x, z));
}
function inside(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

export async function buildIsland(uniforms, { joinX, seaY }) {
  // the game's Blender-built trees, hedges and benches, which the place builders use when they're loaded
  await loadPlantModels({ lighter: false });
  await loadStationModel({ lighter: false }); // Honsha station, built in Blender (scenes/station-model.js)
  const isl = new THREE.Group(); // the island frame: x east, z south, y 0 the ground
  const groundY = seaY + WALL;

  // ---------- the places, as the game builds them ----------
  const areas = [];
  const placed = {};
  const ringPts = [];
  const seenMeshes = new Map(); // name|count|instances -> boxes seen
  const walks = Object.fromEntries(PLACES.map(([n]) => [n, walkOf(n)]));
  for (const [name, build] of PLACES) {
    let w;
    try {
      w = build();
    } catch (e) {
      console.warn('opening: place', name, e);
      continue;
    }
    // the game's look on its materials: surface patterns, soft baked light, small modelled detail (look/index.js)
    try {
      applyLook({ scene: w.scene, sun: w.sun, people: {}, floorY: 0 }, null, NO_SURF ? { surf: false } : {});
    } catch (e) {
      console.warn('opening: look', name, e);
    }
    const root = w.root;
    const drop = [];
    const box = new THREE.Box3(),
      size = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if ((o.isMesh || o.isInstancedMesh) && BACKDROP.test(o.name || '')) drop.push(o);
      else if (o.isMesh && !o.isInstancedMesh) {
        // the unnamed backdrop pieces: a place's own sea and outer ground, far wider than the place
        box.setFromObject(o).getSize(size);
        if (Math.max(size.x, size.z) > 250 || (o.material?.isMeshBasicMaterial && Math.max(size.x, size.z) > 100)) drop.push(o);
      }
      if (o.isLight && !o.isPointLight) drop.push(o); // the places' own suns; the bay's light is ours
    });
    const foreign = (x, z) => {
      const [ix, iz] = LAYOUT.toIsland(name, x, z);
      return !inside(walks[name], ix, iz) && PLACES.some(([n]) => n !== name && inside(walks[n], ix, iz));
    };
    const ctr = new THREE.Vector3(),
      m4 = new THREE.Matrix4(),
      zero = new THREE.Matrix4().makeScale(0, 0, 0);
    let hidden = 0;
    root.traverse((o) => {
      if (drop.includes(o) || o.isLight) return;
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4);
          ctr.setFromMatrixPosition(m4.premultiply(o.matrixWorld));
          if (foreign(ctr.x, ctr.z)) {
            o.setMatrixAt(i, zero);
            hidden++;
          }
        }
        o.instanceMatrix.needsUpdate = true;
      } else if (o.isMesh) {
        box.setFromObject(o).getCenter(ctr);
        if (foreign(ctr.x, ctr.z)) drop.push(o);
      }
    });
    if (DEBUG_STRIP) console.info('opening strip', name, 'stand-ins in other places:', hidden, 'instances');
    for (const o of drop) o.parent?.remove(o);
    if (DEBUG_STRIP) console.info('opening strip', name, drop.filter((o) => !o.isLight).map((o) => `${o.name || '(unnamed)'} ${o.material?.type || ''} ${new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).toArray().map(Math.round).join('x')}`).join(' | '));
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    const c = LAYOUT.CHUNKS[name];
    const holder = new THREE.Group();
    holder.name = 'place:' + name;
    holder.position.set(c.at[0], 0, c.at[1]);
    holder.rotation.y = (-c.turn * Math.PI) / 180;
    holder.scale.setScalar(c.scale);
    holder.add(root);
    isl.add(holder);
    // a piece another place built already (the station and its shed come with more than one place): keep one copy,
    // two identical meshes in one spot flicker against each other
    holder.updateMatrixWorld(true);
    const repeats = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      const bb = new THREE.Box3().setFromObject(o);
      // same name, vertex count and instance count, and a box within 5 cm (places built turned differ by float noise)
      const key = `${o.name}|${o.geometry.attributes.position?.count}|${o.isInstancedMesh ? o.count : 1}`;
      const box = [...bb.min.toArray(), ...bb.max.toArray()];
      const list = seenMeshes.get(key) || seenMeshes.set(key, []).get(key);
      if (list.some((q) => q.every((v, i) => Math.abs(v - box[i]) < 0.05))) repeats.push(o);
      else list.push(box);
    });
    for (const o of repeats) o.parent?.remove(o);
    // the step comes after the copies are found (their boxes must match): each place half a millimetre up and
    // across from the last, so a wall or a lawn two places both build never lies in exactly one plane. Kept well
    // under the game's own layer spacing (paving 6 mm over the ground, tiles 22-26 mm): a 6 mm step put the plaza's
    // slab exactly on the forecourt's paving, and later places' lawns over the fountain's tiles (Jørgen 2026-10-09)
    holder.position.x += areas.length * 0.0005;
    holder.position.y = areas.length * 0.0005;
    holder.position.z += areas.length * 0.0005;
    holder.updateMatrixWorld(true);
    // a place's ground reaching beyond its own walked area (its lawn or slab under the neighbours) goes down 4 cm
    // and 5 mm more per place, so in a neighbour's area the neighbour's own ground, paving and tiles always lie on
    // top, and two places' sunk lawns never lie within 5 mm of each other
    const own = walks[name];
    const corner = new THREE.Vector3();
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      const bb = new THREE.Box3().setFromObject(o);
      if (bb.max.y - bb.min.y > 0.05) return;
      const reaches = [
        [bb.min.x, bb.min.z],
        [bb.max.x, bb.min.z],
        [bb.max.x, bb.max.z],
        [bb.min.x, bb.max.z],
      ].some(([x, z]) => !inside(own, x, z)); // boxes are in the island frame here (isl joins the world group later)
      if (!reaches) return;
      const lift = o.parent.getWorldScale(corner).y;
      o.position.y -= (0.04 + areas.length * 0.005) / lift;
      o.updateMatrixWorld(true);
    });
    if (DEBUG_STRIP && repeats.length) console.info('opening repeats', name, repeats.length, repeats.slice(0, 12).map((o) => o.name || '(unnamed)').join(' | '));
    // where the near ring stands, in the island frame: those buildings come out of the far model below
    // (every place's own buildings count, not only its near ring: some stand outside the place's area, where the
    // far model would otherwise draw them a second time)
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      const p = o.geometry.attributes.position,
        v = new THREE.Vector3();
      const step = Math.max(3, Math.floor(p.count / 3000)); // a sample is enough to find the footprints it stands on
      for (let i = 0; i < p.count; i += step) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        if (v.y > 1.2) ringPts.push([v.x, v.z]); // walls and roofs, not the ground, lamps or benches
      }
    });
    placed[name] = w;
    areas.push(areaOf(name));
  }
  const inBuilt = (x, z) => areas.some((ar) => inPoly(ar, x, z));
  // the layout's buildings a place already shows (some of its wall or roof points well inside the footprint)
  const ringed = LAYOUT.BUILDINGS.map((bb) => LAYOUT.footprint(bb)).filter((f) => {
    const xs = f.map((q) => q[0]),
      zs = f.map((q) => q[1]);
    const x0 = Math.min(...xs) + 0.3,
      x1 = Math.max(...xs) - 0.3,
      z0 = Math.min(...zs) + 0.3,
      z1 = Math.max(...zs) - 0.3;
    return ringPts.some(([x, z]) => x > x0 && x < x1 && z > z0 && z < z1);
  });
  // walls lie on the outline, so the test is the footprint's box with a little margin (the grid's buildings are boxes)
  const ringBoxes = ringed.map((f) => {
    const xs = f.map((q) => q[0]),
      zs = f.map((q) => q[1]);
    return [Math.min(...xs) - 0.5, Math.max(...xs) + 0.5, Math.min(...zs) - 0.5, Math.max(...zs) + 0.5];
  });
  const inRinged = (x, z) => ringBoxes.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

  // ---------- the far model between them ----------
  {
    const L = { ...LAYOUT, toLocal: (c, x, z) => [x, z] };
    const it = farModelSteps({ chunk: '-', near: -1, box: [0, 0, 0, 0], skip: [] }, L);
    let r;
    while (!(r = it.next()).done);
    const far = r.value.mesh;
    const g = far.geometry;
    const P = g.attributes.position.array,
      N = g.attributes.normal.array,
      C = g.attributes.color.array;
    const keep = [];
    for (let t = 0; t < P.length; t += 9) {
      const y = (P[t + 1] + P[t + 4] + P[t + 7]) / 3;
      if (y < -0.46) continue; // its own flat sea
      const isLand = Math.abs(y + 0.42) < 0.01 && Math.abs(N[t + 1]) > 0.9;
      if (isLand) {
        keep.push(t);
        continue;
      }
      const cx = (P[t] + P[t + 3] + P[t + 6]) / 3,
        cz = (P[t + 2] + P[t + 5] + P[t + 8]) / 3;
      if (!inBuilt(cx, cz) && !inRinged(cx, cz)) keep.push(t);
    }
    const pick = (A) => {
      const out = new Float32Array(keep.length * 9);
      keep.forEach((t, i) => out.set(A.subarray(t, t + 9), i * 9));
      return out;
    };
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(pick(P), 3));
    g2.setAttribute('normal', new THREE.BufferAttribute(pick(N), 3));
    g2.setAttribute('color', new THREE.BufferAttribute(pick(C), 3));
    far.geometry = g2;
    far.position.y = -0.06; // a hair below the places' ground, so their paving and grass always win
    far.material = logDepth(new THREE.ShaderMaterial({ vertexShader: FAR_VERT, fragmentShader: FAR_FRAG, uniforms: { ...uniforms, uHazeK: { value: 0.00014 } }, vertexColors: true }));
    isl.add(far);
  }

  // ---------- the shore: the land's edge dropped to the bay, rocks along its foot ----------
  const land = coastLand(LAYOUT.COAST.line);
  {
    const shape = new THREE.Shape(land.map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL + 0.6, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(Math.PI / 2);
    const cm = solidMaterial(uniforms, '#7a8592', 0.00014);
    cm.side = THREE.DoubleSide;
    const cliff = new THREE.Mesh(geo, cm);
    cliff.position.y = -0.5;
    isl.add(cliff);
    const r = rng(23);
    const rocks = [];
    for (let i = 0; i < land.length - 2; i++) {
      const [x0, z0] = land[i],
        [x1, z1] = land[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const nx = -(z1 - z0) / len,
        nz = (x1 - x0) / len;
      for (let d = 0; d < len; d += 0.9) {
        const k = d / len;
        const off = (r() - 0.25) * 1.6;
        rocks.push([x0 + (x1 - x0) * k + nx * off, z0 + (z1 - z0) * k + nz * off, 0.45 + r() * 0.75, r()]);
      }
    }
    const ico = new THREE.DodecahedronGeometry(1, 0);
    const tint = new Float32Array(rocks.length * 3);
    const greys = ['#8c96a3', '#7f8a98', '#99a2ad'].map((h) => new THREE.Color(h));
    rocks.forEach((_, i) => tint.set(greys[i % 3].toArray(), i * 3));
    ico.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    const im = new THREE.InstancedMesh(ico, solidInstancedMaterial(uniforms, 0.00014), rocks.length);
    const m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler();
    rocks.forEach(([x, z, s, ro], i) => {
      q.setFromEuler(e.set(ro * 3, ro * 7, ro * 5));
      im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, -WALL + s * 0.35, z), q, new THREE.Vector3(s, s * 0.8, s)));
    });
    im.frustumCulled = false;
    isl.add(im);
  }

  // ---------- more trees on the open green the far model leaves bare, outside the built places ----------
  {
    const blocked = LAYOUT.BUILDINGS.map((bb) => LAYOUT.footprint(bb));
    const paths = LAYOUT.PATHS.filter((p) => p.rect || p.poly).map((p) =>
      p.rect
        ? [
            [p.rect[0], p.rect[1]],
            [p.rect[2], p.rect[1]],
            [p.rect[2], p.rect[3]],
            [p.rect[0], p.rect[3]],
          ]
        : p.poly,
    );
    const lines = LAYOUT.PATHS.filter((p) => p.line);
    const nearLine = (x, z) =>
      lines.some((p) => {
        const w = (p.w || 2) / 2 + 0.6;
        for (let i = 0; i < p.line.length - 1; i++) {
          const [ax, az] = p.line[i],
            [bx, bz] = p.line[i + 1];
          const dx = bx - ax,
            dz = bz - az,
            L2 = dx * dx + dz * dz || 1;
          const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
          if (Math.hypot(x - ax - dx * k, z - az - dz * k) < w) return true;
        }
        return false;
      });
    const r = rng(77);
    const crowns = [];
    const greens = ['#3f9a55', '#4daa5c', '#2f8a52', '#5cb565', '#358f4d'].map((h) => new THREE.Color(h));
    for (let x = -165; x < 145; x += 2.6)
      for (let z = -205; z < 50; z += 2.6) {
        const px = x + (r() - 0.5) * 2,
          pz = z + (r() - 0.5) * 2;
        if (r() > (pz < -95 ? 0.8 : 0.45)) continue;
        if (!inPoly(land, px, pz) || inBuilt(px, pz)) continue;
        if (blocked.some((p) => inPoly(p, px, pz)) || paths.some((p) => inPoly(p, px, pz)) || nearLine(px, pz)) continue;
        crowns.push([px, pz, 0.9 + r() * 1.1, greens[Math.floor(r() * greens.length)]]);
      }
    const ico = new THREE.IcosahedronGeometry(1, 1);
    const tint = new Float32Array(crowns.length * 3);
    const tm = new THREE.InstancedMesh(ico, solidInstancedMaterial(uniforms, 0.00014), crowns.length);
    const m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion();
    crowns.forEach(([x, z, s, c], i) => {
      tm.setMatrixAt(i, m4.compose(new THREE.Vector3(x, s * 0.9, z), q, new THREE.Vector3(s, s * 0.95, s)));
      tint.set(c.toArray(), i * 3);
    });
    ico.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    tm.frustumCulled = false;
    isl.add(tm);
  }

  // ---------- into the bay: the layout's beam starts at joinX, its first leg along +x ----------
  const beam = LAYOUT.PATHS.find((p) => p.id === 'beam').line;
  const [a, b] = beam;
  const group = new THREE.Group();
  group.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0]);
  group.updateMatrix();
  const p0 = new THREE.Vector3(a[0], 0, a[1]).applyMatrix4(group.matrix);
  group.position.set(joinX - p0.x, groundY, -p0.z);
  group.updateMatrix();
  group.add(isl);
  group.updateMatrixWorld(true);
  const toWorld = (x, z, y = 0) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrix);

  // far hills on the horizon past the island, soft in the haze
  const ridge = new THREE.Group();
  {
    const r = rng(41);
    const mat = solidMaterial(uniforms, '#7393b8', 0.00011);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat);
      const w = 500 + r() * 900,
        h = 120 + r() * 260;
      m.scale.set(w * 0.7, h, w);
      m.position.set(joinX + 4200 + r() * 2200, seaY - h * 0.15, (i - 8) * 620 + (r() - 0.5) * 300);
      ridge.add(m);
    }
  }

  // where things are, in the world
  const B = Object.fromEntries(LAYOUT.BUILDINGS.map((bb) => [bb.id, bb]));
  const centre = (id) => {
    const f = LAYOUT.footprint(B[id]);
    return toWorld(f.reduce((s, p) => s + p[0], 0) / f.length, f.reduce((s, p) => s + p[1], 0) / f.length, 0);
  };
  const hq = centre('head_office');
  hq.userData = { height: B.head_office.storeys * (B.head_office.floorH || 1.9) };
  const shedRect = B.platform_shed.rect; // [x0, z0, x1, z1], the shed runs north-south
  const shedN = toWorld((shedRect[0] + shedRect[2]) / 2, shedRect[1], 0),
    shedS = toWorld((shedRect[0] + shedRect[2]) / 2, shedRect[3], 0);
  const fountain = LAYOUT.PATHS.find((p) => p.id === 'fountain_plaza').circle;
  const anchors = {
    hq,
    shed: shedN.clone().lerp(shedS, 0.5),
    shedN,
    shedS,
    fountain: toWorld(fountain[0], fountain[1], 0),
    mid: toWorld(10, -70, 0),
    groundY,
    toWorld,
    // a point in a place's own frame (the frame its builder and game3d/tools/*-views.json use), in the world
    inPlace: (name, x, z, y = 0) => toWorld(...LAYOUT.toIsland(name, x, z), y * LAYOUT.CHUNKS[name].scale),
  };
  return { group, ridge, anchors, placed };
}
