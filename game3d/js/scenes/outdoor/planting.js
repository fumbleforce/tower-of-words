// Planting for the outdoor kit (scenes/outdoor/): a small family of trees, shrubs and hedges with their own shapes,
// so a place is planted rather than filled with one ball on a stick. Low-poly and flat-shaded like the rest of
// the world; every piece adds its geometry to a Parts collector (outdoor/parts.js), one mesh per colour.
// Trees (x, z, s = size, seed): keyaki (zelkova: a vase of branches, the street tree), sakura (low and wide),
// pine (a clipped black pine with cloud pads, for formal spots), ginkgo (a tall narrow cone), maple (small,
// several stems, one or two turning). Under them: mound (a clipped azalea dome), cluster (mounds of mixed sizes
// round a point), hedge (a clipped run, a little uneven), grass (an ornamental tuft), and beds: bed() lays the soil
// or ground cover of a planted rectangle, gravel() raked gravel, treePit() a street tree's square stone surround
// and iron grate, planter() a concrete planter box of clipped shrubs.
import * as THREE from 'three';
import { roundedBox } from '../../perf/rounded-box.js';
import { rng } from './parts.js';

export const LEAF = {
  deep: '#43603f',
  mid: '#4d6b47',
  fresh: '#577650',
  light: '#5f7d57',
  olive: '#6a7650',
  pine: '#3e584b',
  ginkgo: '#7f8c4e',
  rust: '#8a6552',
  cover: '#3f5840',
  bark: '#5d5249',
  barkGrey: '#6f6a64',
  soil: '#4b4540',
  mulch: '#57504a',
};
const GREENS = [LEAF.mid, LEAF.fresh, LEAF.deep, LEAF.light];

// a trunk or branch: a tapered cylinder from a to b ([x, y, z])
function limb(p, a, b, r0, r1, color = LEAF.bark) {
  const A = new THREE.Vector3(...a),
    B = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), 5);
  g.translate(0, A.distanceTo(B) / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()),
  );
  p.geo(color, g.translate(...a), { surf: 'bark' });
}
// a crown blob: a faceted ball (a dodecahedron: round enough in a cluster, 36 triangles) scaled to (sx, sy, sz),
// turned so no two show the same facets
function blob(p, x, y, z, r, color, { sx = 1, sy = 1, sz = 1, turn = 0 } = {}) {
  const g = new THREE.DodecahedronGeometry(r * 1.04, 0);
  g.rotateY(turn).rotateX(turn * 0.7);
  g.scale(sx, sy, sz);
  p.geo(color, g.translate(x, y, z), { surf: 'foliage' });
}

// zelkova: a clear trunk, three limbs opening into a vase, a broad crown of five blobs and a top
export function keyaki(p, x, z, s = 1, seed = 1) {
  if (p.planting?.tree(p, { species: 'keyaki', x, z, scale: s, seed })) return;
  const r = rng(seed),
    h = 1.15 * s;
  limb(p, [x, 0, z], [x, h, z], 0.1 * s, 0.075 * s, LEAF.barkGrey);
  const tones = [GREENS[seed % 4], GREENS[(seed + 1) % 4]];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r() * 0.6;
    const d = (0.5 + r() * 0.15) * s;
    const [bx, bz] = [x + Math.cos(a) * d, z + Math.sin(a) * d];
    if (i < 3)
      limb(
        p,
        [x, h * 0.92, z],
        [bx * 0.7 + x * 0.3, h + 0.55 * s, bz * 0.7 + z * 0.3],
        0.05 * s,
        0.03 * s,
        LEAF.barkGrey,
      );
    blob(p, bx, h + (0.75 + r() * 0.2) * s, bz, (0.5 + r() * 0.1) * s, tones[i % 2], { sy: 0.78, turn: a });
  }
  blob(p, x, h + 1.15 * s, z, 0.55 * s, tones[0], { sy: 0.7, turn: seed });
}

// cherry: a short leaning trunk and two limbs, a wide low crown of flattened blobs, one turning early
export function sakura(p, x, z, s = 1, seed = 1) {
  if (p.planting?.tree(p, { species: 'sakura', x, z, scale: s, seed })) return;
  const r = rng(seed + 11),
    lean = (r() - 0.5) * 0.3 * s;
  const top = [x + lean, 0.8 * s, z];
  limb(p, [x, 0, z], top, 0.1 * s, 0.07 * s, '#5a524d');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r() * 0.5;
    const d = (i ? 0.75 + r() * 0.2 : 0.1) * s;
    const [bx, bz] = [top[0] + Math.cos(a) * d, z + Math.sin(a) * d * 0.85];
    if (i && i < 4) limb(p, top, [bx * 0.6 + top[0] * 0.4, 1.2 * s, bz * 0.6 + z * 0.4], 0.05 * s, 0.03 * s, '#5a524d');
    const tone = i === 3 && seed % 2 ? LEAF.olive : [LEAF.fresh, LEAF.light, LEAF.mid][i % 3];
    blob(p, bx, (1.35 + r() * 0.15) * s, bz, (0.52 + r() * 0.08) * s, tone, { sy: 0.55, turn: a });
  }
}

// black pine, clipped: a trunk that bends twice and flat cloud pads on short branches
export function pine(p, x, z, s = 1, seed = 1) {
  if (p.planting?.tree(p, { species: 'pine', x, z, scale: s, seed })) return;
  const r = rng(seed + 23);
  const pts = [
    [x, 0, z],
    [x + 0.12 * s, 0.6 * s, z + 0.04 * s],
    [x - 0.06 * s, 1.2 * s, z - 0.05 * s],
    [x + 0.05 * s, 1.75 * s, z],
  ];
  for (let i = 0; i < 3; i++) limb(p, pts[i], pts[i + 1], (0.09 - i * 0.02) * s, (0.07 - i * 0.02) * s, '#4f4945');
  const pads = [
    [0.55, 0.85, 0.42],
    [-0.5, 1.15, 0.4],
    [0.35, 1.5, 0.36],
    [-0.2, 1.85, 0.3],
    [0.05, 2.05, 0.26],
  ];
  pads.forEach(([dx, y, rr], i) => {
    const a = seed + i * 2.1;
    const px = x + dx * s * Math.cos(a * 0.3),
      pz = z + dx * s * Math.sin(a * 0.3) * 0.6;
    if (i < 3) limb(p, [x, y * s - 0.1 * s, z], [px, y * s - 0.05 * s, pz], 0.035 * s, 0.025 * s, '#4f4945');
    blob(p, px, y * s, pz, rr * s * (0.95 + r() * 0.1), i % 2 ? LEAF.pine : '#44604f', {
      sy: 0.38,
      turn: a,
    });
  });
}

// ginkgo: a straight trunk and a tall narrow crown, yellow-green in October
export function ginkgo(p, x, z, s = 1, seed = 1) {
  if (p.planting?.tree(p, { species: 'ginkgo', x, z, scale: s, seed })) return;
  limb(p, [x, 0, z], [x, 1.4 * s, z], 0.08 * s, 0.05 * s, LEAF.barkGrey);
  const tone = seed % 3 ? LEAF.ginkgo : '#76844a';
  [
    [0.95, 0.46],
    [1.45, 0.4],
    [1.9, 0.3],
    [2.25, 0.18],
  ].forEach(([y, rr], i) => blob(p, x, y * s, z, rr * s, tone, { sy: 1.05, turn: seed + i }));
}

// maple: three thin stems and a small crown; one blob turning
export function maple(p, x, z, s = 1, seed = 1) {
  if (p.planting?.tree(p, { species: 'maple', x, z, scale: s, seed })) return;
  const r = rng(seed + 41);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + seed;
    limb(
      p,
      [x, 0, z],
      [x + Math.cos(a) * 0.25 * s, 0.9 * s, z + Math.sin(a) * 0.2 * s],
      0.04 * s,
      0.025 * s,
      '#57504a',
    );
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r();
    const tone = i === 1 ? LEAF.rust : [LEAF.fresh, LEAF.light, LEAF.mid][i % 3];
    blob(p, x + Math.cos(a) * 0.35 * s, (1.05 + r() * 0.2) * s, z + Math.sin(a) * 0.3 * s, 0.36 * s, tone, {
      sy: 0.7,
      turn: a,
    });
  }
}

export const TREES = { keyaki, sakura, pine, ginkgo, maple };

// ---------- shrubs ----------
// a clipped dome sitting on the ground (azalea, box): r across, a little flattened
export function mound(p, x, z, r = 0.35, color = LEAF.mid, { y = 0, squash = 0.62, turn = 0 } = {}) {
  blob(p, x, y + r * squash * 0.72, z, r, color, { sy: squash, turn: turn || x * 3.1 + z * 1.7 });
}
// mounds of mixed sizes round a point: the biggest in the middle, smaller ones round it, never in a row
export function cluster(p, x, z, { n = 4, r = 0.4, spread = 0.55, seed = 1, tones = GREENS, y = 0 } = {}) {
  const q = rng(seed + 57);
  mound(p, x, z, r, tones[seed % tones.length], { y });
  for (let i = 1; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 2 + q() * 0.9;
    const d = spread * (0.75 + q() * 0.35);
    mound(p, x + Math.cos(a) * d, z + Math.sin(a) * d * 0.8, r * (0.5 + q() * 0.3), tones[(seed + i) % tones.length], {
      y,
    });
  }
}
// a clipped hedge from a to b (axis-aligned), in segments that differ a little in height and tone
export function hedge(p, a, b, { w = 0.5, h = 0.55, y = 0, tones = [LEAF.deep, LEAF.mid], seg = 1.1, seed = 1 } = {}) {
  if (p.planting?.hedge(p, { a, b, w, h, y, seed })) return;
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  const L = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
  const n = Math.max(1, Math.round(L / seg)),
    step = L / n;
  const q = rng(seed + 71);
  const s0 = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  for (let i = 0; i < n; i++) {
    const hh = h * (0.94 + q() * 0.1),
      len = step + 0.06;
    const g = roundedBox(alongX ? len : w, hh, alongX ? w : len, 1, 0.12);
    const c = s0 + step * (i + 0.5);
    p.geo(tones[Math.floor(q() * tones.length)], g.translate(alongX ? c : a[0], y + hh / 2, alongX ? a[1] : c), {
      surf: 'foliage',
    });
  }
}
// an ornamental grass tuft: thin leaning blades
export function grass(p, x, z, { h = 0.45, color = '#6d7a58', seed = 1 } = {}) {
  const q = rng(seed + 91);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + q();
    const g = new THREE.ConeGeometry(0.035, h * (0.8 + q() * 0.4), 3);
    g.translate(0, (h * (0.8 + q() * 0.4)) / 2, 0);
    g.rotateZ(Math.cos(a) * 0.35).rotateX(Math.sin(a) * 0.35);
    p.geo(color, g.translate(x + Math.cos(a) * 0.05, 0, z + Math.sin(a) * 0.05), { cast: false, surf: 'foliage' });
  }
}

// ---------- beds ----------
// the ground of a planted rectangle: soil or mulch, and ground cover (low evergreen planting) over most of it
export function bed(p, [x0, x1, z0, z1], { y = 0.1, cover = true, soil = LEAF.mulch, coverTone = LEAF.cover } = {}) {
  p.box(soil, x1 - x0, 0.04, z1 - z0, (x0 + x1) / 2, y - 0.04, (z0 + z1) / 2, { cast: false, surf: 'soil' });
  if (cover) {
    const i = 0.12;
    p.geo(
      coverTone,
      roundedBox(x1 - x0 - 2 * i, 0.09, z1 - z0 - 2 * i, 1, 0.04).translate((x0 + x1) / 2, y + 0.02, (z0 + z1) / 2),
      {
        cast: false,
        surf: 'foliage',
      },
    );
  }
}
// a street tree's pit: a square stone surround flush with the paving and a dark iron grate with its bars
export function treePit(p, x, z, { s = 1.1, frame = '#8f9092', grate = '#3c4046' } = {}) {
  const f = 0.1,
    h = s / 2;
  p.box(grate, s - 2 * f, 0.012, s - 2 * f, x, 0, z, { cast: false });
  for (const d of [-1, 1]) {
    p.box(frame, s, 0.02, f, x, 0, z + d * (h - f / 2), { cast: false });
    p.box(frame, f, 0.02, s - 2 * f, x + d * (h - f / 2), 0, z, { cast: false });
  }
  // the grate's rings of bars
  for (const k of [0.3, 0.62]) {
    const q = (s / 2 - f) * k + 0.08;
    for (const d of [-1, 1]) {
      p.box('#565b62', 2 * q, 0.016, 0.03, x, 0, z + d * q, { cast: false });
      p.box('#565b62', 0.03, 0.016, 2 * q, x + d * q, 0, z, { cast: false });
    }
  }
}
// pale gravel raked in lines along x over its soil (a bed's ground, a garden court); y: its top
export function gravel(p, [x0, x1, z0, z1], { y = 0 } = {}) {
  p.box(LEAF.mulch, x1 - x0, 0.04, z1 - z0, (x0 + x1) / 2, y - 0.04, (z0 + z1) / 2, { cast: false, surf: 'soil' });
  p.box('#a4a6a3', x1 - x0, 0.02, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, { cast: false });
  for (let z = z0 + 0.12; z < z1 - 0.06; z += 0.16)
    p.box('#939591', x1 - x0 - 0.04, 0.006, 0.025, (x0 + x1) / 2, y + 0.02, z, { cast: false });
}
// a planter box of pale concrete on a doorstep or a court: its four sides, soil, clipped shrubs down its length
export function planter(p, [x0, x1, z0, z1], { h = 0.45, seed = 1, color = '#a9aaa8' } = {}) {
  const t = 0.08,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  for (const s of [-1, 1]) {
    p.box(color, x1 - x0, h, t, cx, 0, s < 0 ? z0 + t / 2 : z1 - t / 2, { surf: 'concrete' });
    p.box(color, t, h, z1 - z0 - 2 * t, s < 0 ? x0 + t / 2 : x1 - t / 2, 0, cz, { surf: 'concrete' });
  }
  p.box(LEAF.soil, x1 - x0 - 2 * t, 0.03, z1 - z0 - 2 * t, cx, h - 0.06, cz, { cast: false, surf: 'soil' });
  const alongX = x1 - x0 >= z1 - z0,
    L = alongX ? x1 - x0 : z1 - z0,
    n = Math.max(1, Math.round((L - 0.2) / 0.36));
  const q = rng(seed + 33);
  for (let i = 0; i < n; i++) {
    const u = (alongX ? x0 : z0) + 0.1 + ((L - 0.2) * (i + 0.5)) / n;
    const tone = GREENS[(i + seed) % GREENS.length];
    mound(p, alongX ? u : cx, alongX ? cz : u, 0.17 + q() * 0.07, tone, { y: h - 0.06 });
  }
}
