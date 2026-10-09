// The outdoor kit's plumbing (scenes/outdoor/): a collector that gathers boxes and small geometries per colour and
// hands back one mesh per colour, a seeded random, the layout helpers that put things on lines and in pairs, and
// merged light pools. Everything the kit builds goes through here, so a whole court of kerbs, trees and lamps
// costs a few meshes, and the place's merge pass (scenes/merge-static.js) folds them further.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { setShadowGeometry, positions } from '../../perf/shadow-proxy.js';

// a small seeded random in [0, 1): the same seed gives the same planting every build
export function rng(seed = 1) {
  let s = (Math.abs(Math.floor(seed * 7919)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
// a stable value in [0, 1) for a point (for per-tile or per-tree variation without a running random)
export const hash2 = (x, z, k = 0) => {
  const h = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

// Parts: geometry gathered with its colour in the vertices, so everything of one kind (shadow or not, what it's
// made of) is one mesh whatever its colours: a court's trees in five greens, its kerbs, benches and lamps cost a
// mesh or two, not one per colour. build(root) adds one mesh per kind.
//   p.box(color, w, h, d, x, y, z, { ry, cast, surf })   y is the bottom; ry turns it about its centre
//   p.geo(color, geometry, { cast, surf })               any geometry, already placed
const _c = new THREE.Color();
export class Parts {
  constructor({ planting = null } = {}) {
    this.planting = planting;
    this.sets = new Map();
  }
  // alpha: one opacity per vertex (a set whose geometry all has it draws with vertex alpha: the surf's fading edge)
  // shade: the geometry's own colours are multipliers on `color` (0.5 = as given; the Blender-built planting and bench,
  // outdoor/plant-models.js); such a geometry may come without normals, and gets flat ones here.
  // shadow: a lighter geometry in the same place to cast its shadow instead (perf/shadow-proxy.js)
  geo(color, g, { cast = true, surf = null, opts = null, alpha = null, shade = false, shadow = null } = {}) {
    const key = `${cast}|${surf}|${opts ? JSON.stringify(opts) : ''}|${!!alpha}`;
    // one attribute set for all: position, normal, colour (and uv, zeroed, so everything merges; dropped in build)
    if (alpha && alpha.length !== g.attributes.position.count)
      throw new Error('Parts.geo: alpha must have one value per vertex');
    if (!this.sets.has(key))
      this.sets.set(key, {
        cast,
        surf,
        opts,
        list: [],
        shadows: [],
        proxied: false,
      });
    const set = this.sets.get(key);
    // each piece's shadow stand-in, or null where the piece casts its own
    set.shadows.push(cast && shadow ? positions(shadow) : null);
    if (cast && shadow) set.proxied = true;
    if (g.index) {
      if (alpha) alpha = Array.from(g.index.array, (i) => alpha[i]);
      g = g.toNonIndexed();
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    const tint = shade ? g.attributes.color : null;
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    const n = g.attributes.position.count;
    _c.set(color);
    const k = alpha ? 4 : 3,
      col = new Float32Array(n * k);
    for (let i = 0; i < n; i++) {
      const [r, gg, b] = tint ? [2 * tint.getX(i), 2 * tint.getY(i), 2 * tint.getZ(i)] : [1, 1, 1];
      col.set(alpha ? [_c.r * r, _c.g * gg, _c.b * b, alpha[i]] : [_c.r * r, _c.g * gg, _c.b * b], i * k);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, k));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    set.list.push(g);
    return this;
  }
  box(color, w, h, d, x, y, z, { ry = 0, ...o } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    return this.geo(color, g.translate(x, y + h / 2, z), o);
  }
  build(root) {
    const out = [];
    // the benches' seats (furniture.js bench()), in root's frame, for the ambient crowd (crowd/still.js)
    if (this.seats) (root.userData.seats ||= []).push(...this.seats.splice(0));
    for (const { cast, surf, opts, list, shadows, proxied } of this.sets.values()) {
      const m = new THREE.Mesh(mergeGeometries(list), mat('#ffffff', { vertexColors: true, ...(opts || {}) }));
      // the zero uv held for merging goes, unless a builder wrote its own (diorama/root-bed.js's leaf cards)
      if (m.geometry.attributes.uv.array.every((v) => v === 0)) m.geometry.deleteAttribute('uv');
      if (proxied && cast) setShadowGeometry(m, mergeGeometries(shadows.map((p, i) => p || positions(list[i]))));
      list.forEach((g) => g.dispose());
      m.castShadow = cast;
      m.receiveShadow = true;
      if (surf) m.userData.surf = surf;
      root.add(m);
      out.push(m);
    }
    this.sets.clear();
    return out;
  }
}

// ---------- laying things out on purpose ----------
// Points along a straight line from a to b ([x, z]) at an even pitch, the run centred so both ends get the same
// margin. `inset` keeps clear of the ends; `skip` is a list of [from, to] distances along the line that stay empty
// (a door, a crossing, a gap in a hedge); `side` pushes every point off the line to the left (+) or right (-) of
// the direction of travel. Each point is { x, z, t (distance along), i, dir (the line's heading, radians) }.
export function along(a, b, { pitch = 3, inset = 0, skip = [], side = 0, count = null } = {}) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    L = Math.hypot(dx, dz);
  const ux = dx / L,
    uz = dz / L;
  const usable = L - 2 * inset;
  const n = count ?? Math.max(1, Math.floor(usable / pitch + 1e-6) + 1);
  const step = n > 1 ? (count ? usable / (n - 1) : pitch) : 0;
  const start = inset + (usable - step * (n - 1)) / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = start + step * i;
    if (skip.some(([s0, s1]) => t > s0 - 1e-6 && t < s1 + 1e-6)) continue;
    out.push({
      x: a[0] + ux * t - uz * side,
      z: a[1] + uz * t + ux * side,
      t,
      i,
      dir: Math.atan2(ux, uz),
    });
  }
  return out;
}
// two points mirrored about a centre across an axis ('x': left and right of it, 'z': in front and behind)
export const pair = (c, gap, axis = 'x') =>
  axis === 'x'
    ? [
        [c[0] - gap / 2, c[1]],
        [c[0] + gap / 2, c[1]],
      ]
    : [
        [c[0], c[1] - gap / 2],
        [c[0], c[1] + gap / 2],
      ];

// ---------- light ----------
// light pools on the ground under a set of lamps, in one mesh (one draw call however many lamps). Returns the mesh;
// set(k) changes their strength (the evening turns them up); userData.gain scales it on top (eveningLight's day 2,
// whose brighter dusk would wash weaker pools out). y: their height, just over the paving they light.
// POOL_Y: over the paving's highest parts (stones 0.006-0.008, tactile tiles 0.012, their ribs and dots 0.026). A pool
// level with the stones fights them for depth, and flickers in stripes as the camera moves (issue #100).
export const POOL_Y = 0.03;
export function pools(points, r = 0.9, { k = 0.2, color = '#ffcf94', y = POOL_Y } = {}) {
  const base = lightPool(0, 0, r, { k, color });
  const quads = points.map(([x, z, s = 1]) => {
    const g = new THREE.PlaneGeometry(2 * r * s, 2 * r * s);
    g.rotateX(-Math.PI / 2);
    return g.translate(x, y, z);
  });
  base.geometry.dispose();
  base.geometry = mergeGeometries(quads);
  quads.forEach((g) => g.dispose());
  base.rotation.set(0, 0, 0);
  base.position.set(0, 0, 0);
  const c0 = new THREE.Color(color);
  Object.assign(base.userData, { k, gain: 1 });
  base.userData.set = (kk) => {
    base.userData.k = kk;
    base.material.color.copy(c0).multiplyScalar(kk * base.userData.gain);
  };
  return base;
}
