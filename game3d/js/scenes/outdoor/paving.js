// Paving for the outdoor kit (scenes/outdoor/): fields of real stones and bricks laid in a pattern, with borders,
// instead of one flat colour per zone. A field is a grout bed and its stones on top, a hair apart so the joints
// show; every stone gets its own tone from a small family, so a court reads as laid by hand. One mesh for all the
// stones of a place (vertex colours) and one per grout colour, whatever the number of fields.
//   const pv = paver();
//   pv.field([x0, x1, z0, z1], { pattern: 'bond', module: [0.6, 0.3], tones: GRANITE.pale });
//   pv.border([x0, x1, z0, z1], { w: 0.3, tones: GRANITE.edge, sides: 'nsw' });   a soldier course round a field
//   pv.tactile([[x, z], [x, z], ...]);           the yellow guide line, with dot pads at the ends and turns
//   pv.build(root)
// Patterns: grid (stack bond), bond (running bond, courses along x), bondZ (courses along z), herringbone (90°),
// soldier (narrow stones across a band: for borders). module = [length, width] of one stone.
import * as THREE from 'three';
import { mat } from '../../props.js';
import { hash2 } from './parts.js';

// the stone families, pale to dark, all cool greys so the zones differ by pattern and border, not by colour
export const GRANITE = {
  pale: ['#a3a09b', '#9d9a95', '#a8a6a1', '#98958f'],
  mid: ['#8c8b8a', '#868583', '#92908c', '#807f7d'],
  dark: ['#76787d', '#717378', '#7c7e83', '#6d7075'],
  edge: ['#b3b2ad', '#adaca7', '#b8b6b0'],
  brick: ['#858583', '#7f807f', '#8b8b89', '#7a7b7a'],
  tactile: ['#ae9b5e', '#a9965a', '#b3a063'],
};
const GROUT = '#6f6f70';

// the stones of a pattern that fall in a rectangle: [x0, x1, z0, z1] each, clipped to it
function stones([x0, x1, z0, z1], pattern, [a, b], origin) {
  const out = [];
  const [ox, oz] = origin || [x0, z0];
  const clip = (s0, s1, t0, t1) => {
    const c = [Math.max(s0, x0), Math.min(s1, x1), Math.max(t0, z0), Math.min(t1, z1)];
    if (c[1] - c[0] > 0.02 && c[3] - c[2] > 0.02) out.push(c);
  };
  const lo = (v, o, s) => o + Math.floor((v - o) / s) * s;
  if (pattern === 'herringbone') {
    // 90° herringbone of a w x 2w stone: stairs of one stone along and one across, repeated every (2w, -2w)
    const w = b;
    const n = Math.ceil((x1 - x0 + z1 - z0) / w) + 4;
    const k0 = Math.floor((x0 - ox + z0 - oz) / w) - 2;
    for (let k = k0; k < k0 + n; k++)
      for (let m = -n; m <= n; m++) {
        const X = ox + (k + 2 * m) * w,
          Z = oz + (k - 2 * m) * w;
        if (X > x1 + 2 * w || X < x0 - 3 * w || Z > z1 + 2 * w || Z < z0 - 3 * w) continue;
        clip(X, X + 2 * w, Z, Z + w);
        clip(X, X + w, Z + w, Z + 3 * w);
      }
    return out;
  }
  const alongZ = pattern === 'bondZ';
  const [sa, sb] = alongZ ? [b, a] : [a, b]; // stone size in x, in z
  const bond = pattern === 'bond' || pattern === 'bondZ';
  if (!alongZ) {
    for (let z = lo(z0, oz, sb); z < z1; z += sb) {
      const row = Math.round((z - oz) / sb);
      const shift = bond && row % 2 ? sa / 2 : 0;
      for (let x = lo(x0, ox + shift, sa); x < x1; x += sa) clip(x, x + sa, z, z + sb);
    }
  } else {
    for (let x = lo(x0, ox, sa); x < x1; x += sa) {
      const col = Math.round((x - ox) / sa);
      const shift = col % 2 ? sb / 2 : 0;
      for (let z = lo(z0, oz + shift, sb); z < z1; z += sb) clip(x, x + sa, z, z + sb);
    }
  }
  return out;
}

export function paver({ y = 0 } = {}) {
  const pos = [],
    col = [],
    grout = new Map();
  const c = new THREE.Color();
  const quad = (x0, x1, z0, z1, h, color) => {
    const v = [
      [x0, z0],
      [x0, z1],
      [x1, z1],
      [x0, z0],
      [x1, z1],
      [x1, z0],
    ];
    for (const [x, z] of v) (pos.push(x, y + h, z), col.push(color.r, color.g, color.b));
  };
  // a raised block (tactile bars and dots): its top and four sides
  const block = (x0, x1, z0, z1, h0, h1, color) => {
    quad(x0, x1, z0, z1, h1, color);
    const s = color.clone().multiplyScalar(0.82);
    const side = (ax, az, bx, bz) => {
      for (const [x, h, z] of [
        [ax, h0, az],
        [bx, h1, bz],
        [ax, h1, az],
        [ax, h0, az],
        [bx, h0, bz],
        [bx, h1, bz],
      ])
        (pos.push(x, y + h, z), col.push(s.r, s.g, s.b));
    };
    side(x0, z1, x1, z1);
    side(x1, z0, x0, z0);
    side(x0, z0, x0, z1);
    side(x1, z1, x1, z0);
  };
  const tone = (tones, x, z, vary, seed) => {
    const h = hash2(x, z, seed);
    c.set(tones[Math.floor(h * tones.length) % tones.length]);
    const j = 1 + (hash2(z, x, seed + 3) - 0.5) * vary;
    return c.clone().multiplyScalar(j);
  };
  const bed = (rect, color) => {
    if (!grout.has(color)) grout.set(color, []);
    grout.get(color).push(rect);
  };
  return {
    // a paved field: grout bed plus stones in a pattern. gap: the joint width; origin: where the pattern starts
    // (fields that share an origin line up across a seam)
    field(
      rect,
      {
        pattern = 'grid',
        module = [0.6, 0.6],
        tones = GRANITE.pale,
        vary = 0.06,
        gap = 0.018,
        origin,
        groutColor = GROUT,
        seed = 1,
        h = 0.006,
      } = {},
    ) {
      bed(rect, groutColor);
      for (const [x0, x1, z0, z1] of stones(rect, pattern, module, origin)) {
        const t = tone(tones, (x0 + x1) / 2, (z0 + z1) / 2, vary, seed);
        quad(x0 + gap / 2, x1 - gap / 2, z0 + gap / 2, z1 - gap / 2, h, t);
      }
      return this;
    },
    // a soldier course round a rectangle, `w` wide, inside it, on the named sides (n = z0, s = z1, w = x0, e = x1)
    border(
      [x0, x1, z0, z1],
      { w = 0.3, sides = 'nsew', stone = 0.15, tones = GRANITE.edge, seed = 5, h = 0.008 } = {},
    ) {
      const o = { module: [stone, w], tones, seed, h, vary: 0.04 };
      const zA = sides.includes('n') ? z0 + w : z0,
        zB = sides.includes('s') ? z1 - w : z1;
      if (sides.includes('n')) this.field([x0, x1, z0, z0 + w], { ...o, pattern: 'grid', module: [stone, w] });
      if (sides.includes('s')) this.field([x0, x1, z1 - w, z1], { ...o, pattern: 'grid', module: [stone, w] });
      if (sides.includes('w')) this.field([x0, x0 + w, zA, zB], { ...o, pattern: 'grid', module: [w, stone] });
      if (sides.includes('e')) this.field([x1 - w, x1, zA, zB], { ...o, pattern: 'grid', module: [w, stone] });
      return this;
    },
    // the yellow tactile guide line through points (axis-aligned legs): ribbed blocks along it, dotted pads
    // (warning blocks) at both ends and every turn. Blocks are 0.3 square, as on every Japanese pavement.
    tactile(points, { s = 0.3, tones = GRANITE.tactile } = {}) {
      const pad = ([x, z]) => {
        const t = tone(tones, x, z, 0.04, 9);
        for (const [dx, dz] of [
          [-1, -1],
          [0, -1],
          [-1, 0],
          [0, 0],
        ]) {
          const bx = x + dx * s,
            bz = z + dz * s;
          quad(bx + 0.008, bx + s - 0.008, bz + 0.008, bz + s - 0.008, 0.012, t);
          for (let i = 0; i < 3; i++)
            for (let k = 0; k < 3; k++) {
              const cx = bx + (i + 0.5) * (s / 3),
                cz = bz + (k + 0.5) * (s / 3);
              block(cx - 0.025, cx + 0.025, cz - 0.025, cz + 0.025, 0.012, 0.026, t);
            }
        }
      };
      points.forEach(pad);
      for (let i = 0; i + 1 < points.length; i++) {
        const [a, b] = [points[i], points[i + 1]];
        const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
        const L = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
        const dir = Math.sign(alongX ? b[0] - a[0] : b[1] - a[1]);
        for (let t = s; t < L - s - 1e-3; t += s) {
          const x = alongX ? a[0] + dir * t + (dir < 0 ? -s : 0) : a[0] - s / 2;
          const z = alongX ? a[1] - s / 2 : a[1] + dir * t + (dir < 0 ? -s : 0);
          const tt = tone(tones, x, z, 0.04, 11);
          quad(x + 0.008, x + s - 0.008, z + 0.008, z + s - 0.008, 0.012, tt);
          for (const r of [0.25, 0.5, 0.75]) {
            // ribs run along the line
            if (alongX) block(x + 0.03, x + s - 0.03, z + r * s - 0.018, z + r * s + 0.018, 0.012, 0.026, tt);
            else block(x + r * s - 0.018, x + r * s + 0.018, z + 0.03, z + s - 0.03, 0.012, 0.026, tt);
          }
        }
      }
      return this;
    },
    // everything laid so far: one grout slab mesh per colour (0.1 thick, top at y) and one mesh of stones
    build(root) {
      const out = [];
      for (const [color, rects] of grout) {
        const geos = rects.map(([x0, x1, z0, z1]) =>
          new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0).translate((x0 + x1) / 2, y - 0.05, (z0 + z1) / 2),
        );
        const g = geos.length > 1 ? mergeAll(geos) : geos[0];
        const m = new THREE.Mesh(g, mat(color));
        m.receiveShadow = true;
        m.userData.surf = 'concrete';
        root.add(m);
        out.push(m);
      }
      if (pos.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, mat('#ffffff', { vertexColors: true }));
        m.receiveShadow = true;
        m.userData.surf = 'concrete';
        root.add(m);
        out.push(m);
      }
      return out;
    },
  };
}

function mergeAll(geos) {
  const g = new THREE.BufferGeometry();
  const parts = geos.map((x) => x.toNonIndexed());
  const n = parts.reduce((s, p) => s + p.attributes.position.count, 0);
  const P = new Float32Array(n * 3),
    N = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) {
    P.set(p.attributes.position.array, o * 3);
    N.set(p.attributes.normal.array, o * 3);
    o += p.attributes.position.count;
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  geos.forEach((x) => x.dispose());
  return g;
}
