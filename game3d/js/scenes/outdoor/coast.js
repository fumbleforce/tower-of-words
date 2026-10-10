// The island's coast for the outdoor kit (scenes/outdoor/): the sea wall along the layout's coast line, two rows of
// armour rocks at its foot and a broken line of surf beyond them (or, where it stands on a beach, planting at its
// foot), the walks' kerbs, the terraces' rails and benches, the pines, shrubs and beds. The default data is the coast
// west and south of the station (scenes/island-west.js); the forecourt builds it on its own ground
// (scenes/forecourt.js) and the monorail's run in on the island under the train (train/island.js). The seafront
// south of the shop street (outdoor/seafront.js) passes its own. The place passes its frame:
//
//   yield* coastSteps(root, { at, turn, sea, clip, layer, data })
//     at(x, z) -> [x, z]   an island point in the place's frame (a turn by a quarter and a shift: lengths stay)
//     turn                 how far that frame turns a heading (radians, as rotation.y)
//     sea                  the sea's level, the ground being y 0: the wall's height
//     clip(x, z)           false for a point in the place's frame to leave bare (the train's platforms stand there)
//     layer                the camera layer to draw on (the island map's only, for a place whose cameras never see it)
//     into                 a Parts collector the stone and the planting go into, built by the caller (the bands,
//                          scenes/bands.js, which merge with the place); the surf is built here either way
//     data                 { coast: [{ line, beach, plant }], walks, trees, shrubs, beds, drifts } (default WEST):
//                          each coast line runs with the sea on its right; beach: it stands on sand, no rocks or surf,
//                          planting at its foot; plant: a planted strip behind its coping (left bare where a terrace
//                          comes up to the wall, or on `paved` rects). beds [x0, z0, x1, z1]: ground cover with clipped mounds along the
//                          long side; drifts [x0, x1, z0, z1, back]: layered planting (forecourt/gardens.js drift)
//
// Everything goes into three Parts collectors (one mesh each): stone (wall, coping, rocks, kerbs, rails, benches),
// planting, and surf.
import * as THREE from 'three';
import { Parts, hash2 } from './parts.js';
import { kerb } from './edges.js';
import { bench, STEEL, PAINTED } from './furniture.js';
import { TREES, cluster, mound, LEAF } from './planting.js';
import { drift } from '../forecourt/gardens.js';

import { WEST_COAST, WEST_TREES, WEST_SHRUBS, WEST_BEDS, WEST_DRIFTS, WALKS } from '../island-west.js';

const GREENS = [LEAF.mid, LEAF.deep, LEAF.fresh];
export const WEST = {
  coast: [{ line: WEST_COAST, plant: true }],
  walks: WALKS,
  trees: WEST_TREES,
  shrubs: WEST_SHRUBS,
  beds: WEST_BEDS,
  drifts: WEST_DRIFTS,
};

const STONE = { wall: '#6c7177', coping: '#8d9194', rocks: ['#5f666e', '#6b7279', '#585e66', '#737a82'] };
const SEAM = '#7f7c76'; // the joints between a terrace's slabs
const SURF = '#dbe6ea'; // a little whiter than the sea shader's own foam (places/train.js uFoam), as it's thin
const ROCK_PITCH = 1.2;
const PIER_RUN = 8; // a pier at the line's ends and at a bend about every this far along it
const NO_CAST = { cast: false }; // the wall, rocks and surf would throw their shadows on the sea, which takes none
const FOAM = { transparent: true, depthWrite: false, side: THREE.DoubleSide }; // see-through, on the sea; each vertex carries its own opacity

// a box `len` long along the unit heading d (in the place's frame), w across, from y0 to y1, centred at c
export function along(p, color, c, d, len, w, y0, y1, opts) {
  const g = new THREE.BoxGeometry(len, y1 - y0, w).rotateY(Math.atan2(-d[1], d[0]));
  p.geo(color, g.translate(c[0], (y0 + y1) / 2, c[1]), opts);
}

// surf: a flat ribbon on the water whose edge by the stone is bright and whose far edge has faded out (vertex alpha)
function ribbon(surf, ins, outs, sea, y = 0.02) {
  const pos = [],
    al = [];
  for (let k = 0; k + 1 < ins.length; k++)
    for (const [p, w] of [
      [ins[k], 0.8],
      [outs[k], 0],
      [ins[k + 1], 0.8],
      [outs[k], 0],
      [outs[k + 1], 0],
      [ins[k + 1], 0.8],
    ]) {
      pos.push(p[0], sea + y, p[1]);
      al.push(w);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  surf.geo(SURF, g, { cast: false, opts: FOAM, alpha: al });
}
// the surf round a rock of radius r at (x, z): an arc about the sea-side heading `h`, a gap left in it
function arc(surf, x, z, r, h, rnd, sea) {
  const span = 1.4 + rnd * 0.7,
    start = h - span + (rnd - 0.5) * 0.5,
    steps = 9,
    cut = 3 + (Math.floor(rnd * 97) % 3), // the arc breaks here, and again a few steps on
    w = 0.05 + rnd * 0.05;
  let ins = [],
    outs = [];
  for (let k = 0; k <= steps; k++) {
    const a = start + ((2 * span) / steps) * k,
      c = Math.cos(a),
      s = Math.sin(a);
    if (k !== cut && k !== cut + 1) {
      // hugging the stone's waterline, the inner edge just under it
      ins.push([x + c * r * 0.9, z + s * r * 0.8]);
      outs.push([x + c * (r * 1.02 + w), z + s * (r * 0.92 + w)]);
    } else if (ins.length) {
      if (ins.length > 1) ribbon(surf, ins, outs, sea);
      ins = [];
      outs = [];
    }
  }
  if (ins.length > 1) ribbon(surf, ins, outs, sea);
}
// a run of surf along the wall's foot from a to b, n the way the sea lies, thin at both ends
function foot(surf, a, b, n, sea) {
  const ins = [],
    outs = [];
  for (let k = 0; k <= 4; k++) {
    const t = k / 4,
      p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
      w = 0.03 + 0.1 * Math.sin(Math.PI * t);
    ins.push(p);
    outs.push([p[0] + n[0] * w, p[1] + n[1] * w]);
  }
  ribbon(surf, ins, outs, sea, 0.015);
}

// the sea wall, piece by piece; the sea lies to the right of the way the line runs. Behind its coping (plant) a strip
// of ground cover with clipped mounds at an uneven pitch, so the lawn meets the wall along planting; on a beach,
// clumps of shrubs at its foot instead of rocks and surf
function* wall(stone, green, surf, at, sea, clip, { line: pts, beach = false, plant = false }, bare) {
  const line = pts.map(([x, z]) => at(x, z));
  let run = PIER_RUN; // the length since the last pier
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i],
      b = line[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
      n = [-d[1], d[0]],
      P = (u, o) => [a[0] + d[0] * u + n[0] * o, a[1] + d[1] * u + n[1] * o],
      // the same point in the island frame (the place's frame only turns and shifts it)
      I = (u, o) => {
        const [ia, ib] = [pts[i], pts[i + 1]],
          e = [(ib[0] - ia[0]) / L, (ib[1] - ia[1]) / L];
        return [ia[0] + e[0] * u - e[1] * o, ia[1] + e[1] * u + e[0] * o];
      };
    along(stone, STONE.coping, P(L / 2, 0), d, L + 0.6, 0.6, -0.05, 0.2, NO_CAST);
    along(stone, STONE.wall, P(L / 2, 0.18), d, L + 0.3, 0.36, sea - 0.4, -0.05, NO_CAST);
    // a square pier where the line starts and ends and at a bend every PIER_RUN or so, so the joints read as built
    const pier = (q) =>
      stone.box(STONE.coping, 0.75, 0.32 - sea, 0.75, q[0], sea - 0.1, q[1], {
        ry: Math.atan2(-d[1], d[0]),
        ...NO_CAST,
      });
    if (run >= PIER_RUN) (pier(a), (run = 0));
    run += L;
    if (i + 2 === line.length) pier(b); // and one at the line's end
    if (plant) {
      // the strip of ground cover in runs between the terraces that come up to the wall, each piece a little past
      // its ends so the strip runs on unbroken round the bends; its top 6 mm under the terraces' paving (0.05), which
      // its ends run in under
      const free = (u) => !bare(...I(u, -1.15)),
        E = 0.45;
      for (let u0 = -E; u0 < L + E;) {
        let u1 = u0;
        while (u1 < L + E && free(Math.min(u1 + 0.25, L + E))) u1 += 0.25;
        u1 = Math.min(u1, L + E);
        if (u1 - u0 > 0.3) along(green, LEAF.cover, P((u0 + u1) / 2, -1.15), d, u1 - u0, 1.1, -0.04, 0.044, NO_CAST);
        u0 = u1 + 0.25;
      }
      for (let u = 1; u < L - 1; u += 1.6 + hash2(u, i, 41) * 1.8) {
        const o = -1.15 + (hash2(i, u, 43) - 0.5) * 0.4,
          [x, z] = P(u, o);
        if (hash2(x, z, 45) < 0.7 && clip(x, z) && !bare(...I(u, o)))
          mound(green, x, z, 0.32 + hash2(z, x, 47) * 0.22, GREENS[(i + Math.round(u)) % 3]);
      }
    }
    if (!beach) {
      // a thin broken line along the wall's foot, in runs of uneven length with gaps between
      for (let u = hash2(i, L, 71) * 1.2; u < L - 0.4; u += 1.2 + hash2(u, i, 73) * 1.6) {
        const len = Math.min(0.9 + hash2(i, u, 75) * 1.6, L - u);
        foot(surf, P(u, 0.4), P(u + len, 0.4), n, sea);
      }
    }
    if (beach) {
      // groups of two to four shrubs of mixed size at uneven gaps, now and then a rock among them
      for (let u = 1.1 + hash2(i, L, 48) * 1.5; u < L - 0.8; u += 2.2 + hash2(u, i, 49) * 2.6) {
        const [x, z] = P(u, 0.8 + hash2(i, u, 51) * 0.6);
        if (!clip(x, z)) continue;
        const n = 2 + Math.floor(hash2(x, z, 53) * 3),
          r = 0.26 + hash2(z, x, 55) * 0.16;
        cluster(green, x, z, { n, r, spread: 0.35 + r, seed: Math.round(u * 7) + i, y: sea + 0.05 });
        if (hash2(u, z, 57) < 0.35) {
          const [rx, rz] = P(u + 0.9, 0.7 + hash2(u, i, 59) * 0.5),
            g = new THREE.DodecahedronGeometry(0.3 + hash2(rx, rz, 61) * 0.2, 0).scale(1.15, 0.6, 1);
          stone.geo(STONE.rocks[Math.floor(hash2(rz, rx, 63) * 4)], g.translate(rx, sea + 0.08, rz), NO_CAST);
        }
      }
      yield;
      continue;
    }
    // the rocks: two rows, the inner one leaning on the wall, the outer one half in the sea, staggered, with rubble
    // between the big ones
    for (const [row, off, lift, r0] of [
      [0, 0.85, 0.3, 0.43],
      [1, 1.8, 0.0, 0.5],
    ])
      for (let u = (row ? ROCK_PITCH / 2 : 0) + 0.4; u < L - 0.3; u += ROCK_PITCH * (0.75 + hash2(u, i, 21) * 0.5)) {
        // the outer row thins out here and there; sizes vary by a quarter either way
        if (row && hash2(u, i, 23) < 0.15) continue;
        const [x, z] = P(u, off + (hash2(i, u, row) - 0.5) * 0.4),
          r = r0 * (0.5 + hash2(u, i, 7) * 0.7);
        const g = new THREE.DodecahedronGeometry(r, 0)
          .rotateY(hash2(x, z, 3) * 6.3)
          .rotateX(hash2(z, x, 5) * 0.8)
          .scale(1.15, 0.5 + hash2(x, z, 19) * 0.3, 1);
        stone.geo(STONE.rocks[Math.floor(hash2(x, z, 9) * 4)], g.translate(x, sea + lift - r * 0.15, z), NO_CAST);
        if (hash2(z, u, 37) < 0.5) {
          const [rx, rz] = P(u + ROCK_PITCH * 0.5, off + 0.35 + hash2(u, z, 39) * 0.3);
          const rub = new THREE.DodecahedronGeometry(0.16 + hash2(rx, rz, 1) * 0.12, 0).rotateY(hash2(rz, rx, 2) * 6);
          stone.geo(
            STONE.rocks[Math.floor(hash2(rx, rz, 4) * 4)],
            rub.scale(1, 0.6, 1).translate(rx, sea + 0.05, rz),
            NO_CAST,
          );
        }
        // surf round the outer rocks: a broken arc on the sea side, hugging the stone
        if (row && hash2(x, z, 29) < 0.7) arc(surf, x, z, r, Math.atan2(n[1], n[0]), hash2(z, x, 31), sea);
      }
    yield;
  }
}

// a Parts collector that takes island-frame geometry and lays it in the place's frame (at: a turn by a quarter and a
// shift), so kit pieces that lay out along x and z (forecourt/gardens.js drift) keep their own layout in any place
function inFrame(p, at) {
  const o = at(0, 0),
    ex = at(1, 0),
    ez = at(0, 1);
  const M = new THREE.Matrix4()
    .makeBasis(
      new THREE.Vector3(ex[0] - o[0], 0, ex[1] - o[1]),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(ez[0] - o[0], 0, ez[1] - o[1]),
    )
    .setPosition(o[0], 0, o[1]);
  return {
    geo: (color, g, opts) => p.geo(color, g.applyMatrix4(M), opts),
    box(color, w, h, d, x, y, z, { ry = 0, ...opts } = {}) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (ry) g.rotateY(ry);
      return this.geo(color, g.translate(x, y + h / 2, z), opts);
    },
  };
}

// the four sides of a rect [x0, z0, x1, z1] in the island frame: the fixed coordinate and the span along the side
const sides = ([x0, z0, x1, z1]) => ({
  n: { fixed: z0, axis: 'x', lo: x0, hi: x1 },
  s: { fixed: z1, axis: 'x', lo: x0, hi: x1 },
  w: { fixed: x0, axis: 'z', lo: z0, hi: z1 },
  e: { fixed: x1, axis: 'z', lo: z0, hi: z1 },
});
// the stretches of side `s` that another walk covers: it touches the side's line and overlaps it along it
function cuts(s, others) {
  return others
    .map(({ rect: [x0, z0, x1, z1] }) => {
      const [f0, f1, a0, a1] = s.axis === 'x' ? [z0, z1, x0, x1] : [x0, x1, z0, z1];
      return f0 - 0.01 <= s.fixed && s.fixed <= f1 + 0.01 ? [Math.max(s.lo, a0), Math.min(s.hi, a1)] : null;
    })
    .filter((c) => c && c[1] > c[0])
    .sort((p, q) => p[0] - q[0]);
}

// a terrace's rail from A to B (in the place's frame): a painted steel top rail (kit/materials/) on posts about 1.2
// apart
export function rail(stone, A, B) {
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]),
    d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
  along(stone, STEEL.mid, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], d, L, 0.06, 0.88, 0.94, PAINTED);
  for (let u = 0; u <= L + 0.01; u += L / Math.round(L / 1.2))
    stone.box(STEEL.dark, 0.06, 0.94, 0.06, A[0] + d[0] * u, 0, A[1] + d[1] * u, PAINTED);
}

const SLAB = 1.1;
function seams(stone, at, [x0, z0, x1, z1]) {
  const line = (A, B) => {
    const [a, b] = [at(...A), at(...B)],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    along(
      stone,
      SEAM,
      [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
      L,
      0.05,
      -0.13,
      -0.118,
      NO_CAST,
    );
  };
  for (let x = x0 + SLAB; x < x1 - 0.3; x += SLAB) line([x, z0], [x, z1]);
  for (let z = z0 + SLAB; z < z1 - 0.3; z += SLAB) line([x0, z], [x1, z]);
}

// the walks' kerbs (each side less where another walk meets it, and less its open sides), the terraces' rails on
// their seaward sides and two benches on each, a step back from the rail
function walks(stone, at, turn, clip, WALKS) {
  const list = Object.values(WALKS);
  for (const w of list) {
    for (const [k, s] of Object.entries(sides(w.rect))) {
      if ((w.open || '').includes(k)) continue;
      const pt = (v) => (s.axis === 'x' ? at(v, s.fixed) : at(s.fixed, v));
      let v = s.lo;
      for (const [c0, c1] of [
        ...cuts(
          s,
          list.filter((o) => o !== w),
        ),
        [s.hi, s.hi],
      ]) {
        const A = pt(v),
          B = pt(c0);
        if (c0 - v > 0.1 && clip((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)) kerb(stone, A, B, { w: 0.18 });
        v = Math.max(v, c1);
      }
    }
    // benches a walk asks for, [x, z, look]; a walk whose middle is clipped keeps only its kerbs
    const [wx0, wz0, wx1, wz1] = w.rect;
    if (!clip(...at((wx0 + wx1) / 2, (wz0 + wz1) / 2))) continue;
    for (const [x, z, look] of w.benches || []) bench(stone, ...at(x, z), look + turn, { len: 1.5 });
    // a paved place (a terrace, a square) is laid in slabs: a fine dark seam every SLAB both ways
    if (w.slabs) seams(stone, at, w.rect);
    if (!w.terrace) continue;
    const [x0, z0, x1, z1] = w.rect,
      g = 0.15; // the rail stands this far in from the edge
    const rails = {
      w: [
        [x0 + g, z0 + g],
        [x0 + g, z1 - g],
      ],
      s: [
        [x0 + g, z1 - g],
        [x1 - g, z1 - g],
      ],
    };
    for (const k of w.terrace) rail(stone, ...rails[k].map(([x, z]) => at(x, z)));
    for (const z of [z0 + 0.9, z1 - 1.1]) bench(stone, ...at(x0 + 1.1, z), w.look + turn, { len: 1.5 });
  }
}

export function* coastSteps(
  root,
  { at, turn = 0, sea = -0.2, clip = () => true, layer = null, data = WEST, into = null },
) {
  const stone = into || new Parts(),
    green = into || new Parts(),
    surf = new Parts();
  // where a terrace comes up to the wall, the planted strip behind the coping stops (island frame)
  const terraces = Object.values(data.walks || {}).filter((w) => w.terrace);
  const near = ([x0, z0, x1, z1], x, z, m) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
  const bare = (x, z) =>
    terraces.some((w) => near(w.rect, x, z, 0.5)) || (data.paved || []).some((r) => near(r, x, z, 0.3));
  for (const c of data.coast) yield* wall(stone, green, surf, at, sea, clip, c, bare);
  walks(stone, at, turn, clip, data.walks || {});
  yield;
  (data.trees || []).forEach(([kind, x, z, s], i) => {
    const [lx, lz] = at(x, z);
    if (clip(lx, lz)) TREES[kind](green, lx, lz, s, 3 + i);
  });
  // the beds: ground cover with clipped mounds along the long side
  (data.beds || []).forEach(([x0, z0, x1, z1], b) => {
    const A = at(x0, z0),
      B = at(x1, z1);
    const cx = (A[0] + B[0]) / 2,
      cz = (A[1] + B[1]) / 2,
      w = Math.abs(B[0] - A[0]),
      dd = Math.abs(B[1] - A[1]);
    if (clip(cx, cz)) green.box(LEAF.cover, w, 0.08, dd, cx, -0.03, cz, { cast: false });
    const alongZ = z1 - z0 >= x1 - x0;
    for (let k = 0.6; k < (alongZ ? z1 - z0 : x1 - x0) - 0.4; k += 1.1 + hash2(b, k, 51) * 0.6) {
      const [mx, mz] = alongZ ? at((x0 + x1) / 2, z0 + k) : at(x0 + k, (z0 + z1) / 2);
      if (clip(mx, mz)) mound(green, mx, mz, 0.3 + hash2(k, b, 53) * 0.2, GREENS[(b + Math.round(k)) % 3]);
    }
  });
  // the drifts, laid out in the island frame and turned into the place's
  const framed = inFrame(green, at);
  for (const [i, [x0, x1, z0, z1, back]] of (data.drifts || []).entries())
    if (clip(...at((x0 + x1) / 2, (z0 + z1) / 2))) drift(framed, [x0, x1, z0, z1], { back, seed: 40 + i });
  (data.shrubs || []).forEach(([x, z], i) => {
    const [lx, lz] = at(x, z);
    if (clip(lx, lz)) cluster(green, lx, lz, { n: 4, r: 0.38, spread: 0.7, seed: 20 + i });
  });
  yield;
  const meshes = [...(into ? [] : [...stone.build(root), ...green.build(root)]), ...surf.build(root)];
  meshes.forEach((m, i) => {
    m.name = `coast:${i}`; // named: the place's merge pass leaves it as it is
    if (layer === null) return;
    m.layers.set(layer);
    m.userData.noBatch = true;
  });
  return meshes;
}
