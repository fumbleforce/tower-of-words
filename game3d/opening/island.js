// Amakawa as the game builds it: the whole island's far model (js/scenes/far-model.js: every building of the
// island layout at its real height with its window rows, the land, the trees over the south half's green and the
// north half's woods), set into the opening's bay. The layout's monorail beam (island-layout.js, `beam`) is lined
// up with the opening's straight beam, so the line runs on round its curve into the platform shed's south end.
// Around it: the land raised on a rocky edge (the picked island map has rocks all round), the beach, and far hazy
// mountains on the horizon behind for depth. The far model's colours are the game's muted daytime ones; the
// opening's shader lifts them into the morning light and adds the bay's haze.
import * as THREE from 'three';
import * as LAYOUT from '../js/scenes/island-layout.js';
import { farModelSteps } from '../js/scenes/far-model.js';
import { coastLand } from '../js/scenes/island-west.js';
import { SKY_GLSL, solidMaterial, solidInstancedMaterial } from './sky.js';
import { rng } from './paint.js';

const VERT = /* glsl */ `
varying vec3 vW, vN, vC;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vC = color;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */ `
precision highp float;
${SKY_GLSL}
uniform float uHazeK;
varying vec3 vW, vN, vC;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vW - cameraPosition);
  // the game's colours, a little brighter and more saturated for the morning
  vec3 base = vC;
  float l = dot(base, vec3(0.299, 0.587, 0.114));
  base = max(mix(vec3(l), base, 2.0) * 1.12, 0.0);
  // greens greener: the far model's grass and trees lean grey
  if (base.g > base.r * 1.05 && base.g > base.b) base *= vec3(0.7, 1.12, 0.78);
  float sun = max(dot(n, uSun), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  vec3 c = base * (0.34 + 0.3 * sky) + base * uWarm * sun * 1.1;
  // walls facing away from the sun pick up the blue of the sky
  c += vec3(0.02, 0.04, 0.08) * (1.0 - sun) * (1.0 - n.y);
  float dist = length(vW - cameraPosition);
  float hz = 1.0 - exp(-dist * uHazeK);
  c = mix(c, skyBase(normalize(vec3(v.x, 0.07, v.z)), false), clamp(hz, 0.0, 0.9));
  gl_FragColor = vec4(c, 1.0);
}`;

const SCALE = 2; // world units per island unit: the head office's twelve storeys stand about 48 high
const LAND_Y = -9; // the island's ground, on its rocky edge 8 above the sea

export function buildIsland(uniforms, { joinX, seaY }) {
  // the layout in its own frame: the far model's toLocal is the identity
  const L = { ...LAYOUT, toLocal: (c, x, z) => [x, z] };
  const it = farModelSteps({ chunk: '-', near: -1, box: [0, 0, 0, 0], skip: [] }, L);
  let r;
  while (!(r = it.next()).done);
  const far = r.value.mesh;
  // drop the far model's own flat sea (the bay is ours)
  {
    const g = far.geometry;
    const P = g.attributes.position.array,
      N = g.attributes.normal.array,
      C = g.attributes.color.array;
    const keep = [];
    for (let t = 0; t < P.length; t += 9) if (!(P[t + 1] < -0.46 && P[t + 4] < -0.46 && P[t + 7] < -0.46)) keep.push(t);
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
  }
  far.material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...uniforms, uHazeK: { value: 0.00014 } }, vertexColors: true });
  far.frustumCulled = false;

  // line the layout's beam up with ours: its first leg runs along +x and starts at (joinX, z = 0)
  const beam = LAYOUT.PATHS.find((p) => p.id === 'beam').line;
  const [a, b] = beam;
  const yaw = Math.atan2(b[1] - a[1], b[0] - a[0]); // the first leg's heading in the island frame
  const group = new THREE.Group();
  group.rotation.y = yaw; // turns the island frame so that heading points along world +x
  group.scale.setScalar(SCALE);
  group.updateMatrix();
  const p0 = new THREE.Vector3(a[0], 0, a[1]).applyMatrix4(group.matrix);
  group.position.set(joinX - p0.x, LAND_Y + 0.42 * SCALE, -p0.z);
  group.updateMatrix();
  group.add(far);
  const toWorld = (x, z, y = 0) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrix);

  // the rocky edge: the land's outline dropped to the sea, then boulders along its foot
  const land = coastLand(LAYOUT.COAST.line);
  {
    const shape = new THREE.Shape(land.map(([x, z]) => new THREE.Vector2(x, z)));
    const h = (LAND_Y - seaY + 0.42 * SCALE) / SCALE + 0.2;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(Math.PI / 2); // shape's y (= -z) to world z; extrusion downward
    const cliffM = solidMaterial(uniforms, '#6f7b88', 0.00014);
    cliffM.side = THREE.DoubleSide;
    const cliff = new THREE.Mesh(geo, cliffM);
    cliff.position.y = -0.43;
    group.add(cliff);
    const r = rng(23);
    const rocks = [];
    for (let i = 0; i < land.length - 2; i++) {
      const [x0, z0] = land[i],
        [x1, z1] = land[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      for (let d = 0; d < len; d += 1.6) {
        const k = d / len;
        const nx = -(z1 - z0) / len,
          nz = (x1 - x0) / len;
        const off = (r() - 0.2) * 2.2;
        rocks.push([x0 + (x1 - x0) * k + nx * off, z0 + (z1 - z0) * k + nz * off, 1.4 + r() * 2.2, r()]);
      }
    }
    const ico = new THREE.DodecahedronGeometry(1, 0);
    const rockTint = new Float32Array(rocks.length * 3);
    const greys = ['#8c96a3', '#7f8a98', '#99a2ad'].map((h) => new THREE.Color(h));
    rocks.forEach((rk, i) => {
      const c = greys[i % 3];
      rockTint.set([c.r, c.g, c.b], i * 3);
    });
    ico.setAttribute('aTint', new THREE.InstancedBufferAttribute(rockTint, 3));
    const im = new THREE.InstancedMesh(ico, solidInstancedMaterial(uniforms, 0.00014), rocks.length);
    const m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      e = new THREE.Euler();
    const footY = (seaY - group.position.y) / SCALE;
    rocks.forEach(([x, z, s, ro], i) => {
      q.setFromEuler(e.set(ro * 3, ro * 7, ro * 5));
      im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, footY + s * 0.5, z), q, new THREE.Vector3(s, s * 0.8, s)));
    });
    im.frustumCulled = false;
    group.add(im);
  }
  // more trees: the picked map is thick with them, the far model thins them out for speed. Every free spot of
  // land on a loose grid (not on a building, a path or the beach) gets a crown, the north half densest.
  {
    const shapes = (list) => list.map((p) => (p.rect ? [[p.rect[0], p.rect[1]], [p.rect[2], p.rect[1]], [p.rect[2], p.rect[3]], [p.rect[0], p.rect[3]]] : p.poly || null)).filter(Boolean);
    const inPoly = (poly, x, z) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, zi] = poly[i],
          [xj, zj] = poly[j];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
      }
      return c;
    };
    const blocked = shapes(LAYOUT.BUILDINGS).map((p) => {
      // grown a little so crowns don't poke through walls
      const cx = p.reduce((a, q) => a + q[0], 0) / p.length,
        cz = p.reduce((a, q) => a + q[1], 0) / p.length;
      return p.map(([x, z]) => [cx + (x - cx) * 1.12 + Math.sign(x - cx) * 1.2, cz + (z - cz) * 1.12 + Math.sign(z - cz) * 1.2]);
    });
    const lines = LAYOUT.PATHS.filter((p) => p.line);
    const flatAreas = shapes(LAYOUT.PATHS.filter((p) => !p.line)).concat(shapes(LAYOUT.SAND || []));
    const circles = LAYOUT.PATHS.filter((p) => p.circle).map((p) => p.circle);
    const nearLine = (x, z) =>
      lines.some((p) => {
        const w = (p.w || 2) / 2 + 0.8;
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
    for (let x = -165; x < 145; x += 3.1)
      for (let z = -205; z < 50; z += 3.1) {
        const px = x + (r() - 0.5) * 2.4,
          pz = z + (r() - 0.5) * 2.4;
        const north = pz < -95;
        if (r() > (north ? 0.85 : 0.42)) continue;
        if (!inPoly(land, px, pz)) continue;
        if (blocked.some((p) => inPoly(p, px, pz))) continue;
        if (flatAreas.some((p) => inPoly(p, px, pz))) continue;
        if (circles.some(([cx, cz, cr]) => Math.hypot(px - cx, pz - cz) < cr + 1)) continue;
        if (nearLine(px, pz)) continue;
        crowns.push([px, pz, 1.1 + r() * 1.3, greens[Math.floor(r() * greens.length)]]);
      }
    const ico = new THREE.IcosahedronGeometry(1, 1);
    const tint = new Float32Array(crowns.length * 3);
    const tm = new THREE.InstancedMesh(ico, solidInstancedMaterial(uniforms, 0.00014), crowns.length);
    const m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion();
    crowns.forEach(([x, z, s, c], i) => {
      tm.setMatrixAt(i, m4.compose(new THREE.Vector3(x, -0.42 + s * 0.9, z), q, new THREE.Vector3(s, s * 0.9, s)));
      tint.set([c.r, c.g, c.b], i * 3);
    });
    ico.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    tm.frustumCulled = false;
    group.add(tm);
  }

  // the beach south of the shop street
  for (const poly of LAYOUT.SAND || []) {
    const pts = Array.isArray(poly[0]) ? poly : poly.poly || [];
    if (pts.length < 3) continue;
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const sm = solidMaterial(uniforms, '#f1e3c4', 0.00022);
    sm.side = THREE.DoubleSide;
    const m = new THREE.Mesh(geo, sm);
    m.position.y = -0.4;
    group.add(m);
  }

  // the rest of the beam: the layout's curve from the join into the shed, on pillars
  const curve = new THREE.Group();
  {
    const conc = new THREE.MeshStandardMaterial({ color: '#7d8796', roughness: 0.9 });
    const pts = beam.map(([x, z]) => toWorld(x, z));
    for (const p of pts) p.y = -0.16;
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i],
        B = pts[i + 1];
      const len = A.distanceTo(B);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.5, 0.96, 0.96), conc);
      m.position.copy(A).lerp(B, 0.5);
      m.position.y = -0.16 - 0.48;
      m.rotation.y = -Math.atan2(B.z - A.z, B.x - A.x);
      curve.add(m);
      for (let d = 12; d < len; d += 19) {
        const P = A.clone().lerp(B, d / len);
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, -1.12 - seaY, 10), conc);
        col.position.set(P.x, (seaY - 1.12) / 2, P.z);
        curve.add(col);
      }
    }
  }

  // far mountains on the horizon past the island: the bay's other shore, soft in the haze
  const ridge = new THREE.Group();
  {
    const r = rng(41);
    const mat = solidMaterial(uniforms, '#7393b8', 0.00011);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat);
      const w = 500 + r() * 900,
        h = 120 + r() * 260;
      m.scale.set(w * 0.7, h, w);
      m.position.set(joinX + 4600 + r() * 2200, seaY - h * 0.15, (i - 8) * 620 + (r() - 0.5) * 300);
      ridge.add(m);
    }
  }

  // where things are, in the world: the head office, the shed's south end, the island's middle
  const B = Object.fromEntries(LAYOUT.BUILDINGS.map((b) => [b.id, b]));
  const centre = (id) => {
    const f = LAYOUT.footprint(B[id]);
    const x = f.reduce((s, p) => s + p[0], 0) / f.length,
      z = f.reduce((s, p) => s + p[1], 0) / f.length;
    return toWorld(x, z).setY(LAND_Y);
  };
  const hq = centre('head_office');
  hq.userData = { height: (B.head_office.storeys * (B.head_office.floorH || 1.9)) * SCALE };
  const anchors = { hq, shed: centre('platform_shed'), mid: toWorld(20, -60).setY(LAND_Y), landY: LAND_Y };

  return { group, curve, ridge, anchors };
}
