// The coast west and south of the station for the outdoor kit (scenes/outdoor/): the sea wall along the layout's
// coast line, two rows of armour rocks at its foot and a broken line of surf beyond them, the walks' kerbs, the
// terraces' rails and benches, the pines, shrubs and grove. The data is scenes/island-west.js; the forecourt builds
// it on its own ground (scenes/forecourt.js) and the monorail's run in on the island under the train
// (train/island.js), so the place passes its frame:
//
//   yield* coastSteps(root, { at, turn, sea, clip, layer })
//     at(x, z) -> [x, z]   an island point in the place's frame (a turn by a quarter and a shift: lengths stay)
//     turn                 how far that frame turns a heading (radians, as rotation.y)
//     sea                  the sea's level, the ground being y 0: the wall's height
//     clip(x, z)           false for a point in the place's frame to leave bare (the train's platforms stand there)
//     layer                the camera layer to draw on (the island map's only, for a place whose cameras never see it)
//
// Everything goes into three Parts collectors (one mesh each): stone (wall, coping, rocks, kerbs, rails, benches),
// planting, and surf.
import * as THREE from 'three';
import { Parts, hash2 } from './parts.js';
import { kerb } from './edges.js';
import { bench, STEEL } from './furniture.js';
import { TREES, cluster, mound, LEAF } from './planting.js';

const GREENS = [LEAF.mid, LEAF.deep, LEAF.fresh];
import { WEST_COAST, WEST_TREES, WEST_SHRUBS, WEST_BEDS, WALKS } from '../island-west.js';

const STONE = { wall: '#6c7177', coping: '#8d9194', rocks: ['#5f666e', '#6b7279', '#585e66', '#737a82'] };
const SURF = '#b9c6cc'; // the sea shader's own foam (places/train.js uFoam)
const ROCK_PITCH = 1.2;
const NO_CAST = { cast: false }; // the wall, rocks and surf would throw their shadows on the sea, which takes none
const FOAM = { cast: false, opts: { transparent: true, opacity: 0.3, depthWrite: false } }; // see-through, on the sea

// a box `len` long along the unit heading d (in the place's frame), w across, from y0 to y1, centred at c
function along(p, color, c, d, len, w, y0, y1, opts) {
  const g = new THREE.BoxGeometry(len, y1 - y0, w).rotateY(Math.atan2(-d[1], d[0]));
  p.geo(color, g.translate(c[0], (y0 + y1) / 2, c[1]), opts);
}

// the sea wall, piece by piece; the sea lies to the right of the way the line runs. Behind its coping a strip of
// ground cover with clipped mounds at an uneven pitch, so the lawn meets the wall along planting
function* wall(stone, green, surf, at, sea, clip) {
  const line = WEST_COAST.map(([x, z]) => at(x, z));
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i],
      b = line[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
      n = [-d[1], d[0]],
      P = (u, o) => [a[0] + d[0] * u + n[0] * o, a[1] + d[1] * u + n[1] * o];
    along(stone, STONE.coping, P(L / 2, 0), d, L + 0.6, 0.6, -0.05, 0.2, NO_CAST);
    along(stone, STONE.wall, P(L / 2, 0.18), d, L + 0.3, 0.36, sea - 0.4, -0.05, NO_CAST);
    // a square pier at each corner of the line, so the joints read as built
    stone.box(STONE.coping, 0.75, 0.32 - sea, 0.75, a[0], sea - 0.1, a[1], { ry: Math.atan2(-d[1], d[0]), ...NO_CAST });
    along(green, LEAF.cover, P(L / 2, -1.15), d, L - 0.4, 1.1, -0.04, 0.05, NO_CAST);
    for (let u = 1; u < L - 1; u += 1.6 + hash2(u, i, 41) * 1.8) {
      const [x, z] = P(u, -1.15 + (hash2(i, u, 43) - 0.5) * 0.4);
      if (hash2(x, z, 45) < 0.7 && clip(x, z))
        mound(green, x, z, 0.32 + hash2(z, x, 47) * 0.22, GREENS[(i + Math.round(u)) % 3]);
    }
    // the rocks: two rows, the inner one leaning on the wall, the outer one half in the sea, staggered, with rubble
    // between the big ones
    for (const [row, off, lift, r0] of [
      [0, 0.85, 0.3, 0.5],
      [1, 1.8, 0.0, 0.6],
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
        // foam where the outer rocks meet the water: low flat patches, not on every rock
        if (row && hash2(x, z, 29) < 0.55) {
          const f = new THREE.DodecahedronGeometry(r * (0.55 + hash2(z, x, 31) * 0.45), 0)
            .scale(1.5, 0.03, 1)
            .rotateY(Math.atan2(-d[1], d[0]));
          const [fx, fz] = P(u + (hash2(x, z, 33) - 0.5) * 0.8, off + r * 0.9);
          surf.geo(SURF, f.translate(fx, sea + 0.02, fz), FOAM);
        }
      }
    yield;
  }
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

// the walks' kerbs (each side less where another walk meets it, and less its open sides), the terraces' rails on
// their seaward sides and two benches on each, a step back from the rail
function walks(stone, at, turn, clip) {
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
    for (const k of w.terrace) {
      const [A, B] = rails[k].map(([x, z]) => at(x, z)),
        L = Math.hypot(B[0] - A[0], B[1] - A[1]),
        d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      along(stone, STEEL.mid, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], d, L, 0.06, 0.88, 0.94);
      for (let u = 0; u <= L + 0.01; u += L / Math.round(L / 1.2))
        stone.box(STEEL.dark, 0.06, 0.94, 0.06, A[0] + d[0] * u, 0, A[1] + d[1] * u);
    }
    for (const z of [z0 + 0.9, z1 - 1.1]) bench(stone, ...at(x0 + 1.1, z), w.look + turn, { len: 1.5 });
  }
}

export function* coastSteps(root, { at, turn = 0, sea = -0.2, clip = () => true, layer = null }) {
  const stone = new Parts(),
    green = new Parts(),
    surf = new Parts();
  yield* wall(stone, green, surf, at, sea, clip);
  walks(stone, at, turn, clip);
  yield;
  WEST_TREES.forEach(([kind, x, z, s], i) => {
    const [lx, lz] = at(x, z);
    if (clip(lx, lz)) TREES[kind](green, lx, lz, s, 3 + i);
  });
  // the beds by the line: ground cover with clipped mounds along them
  WEST_BEDS.forEach(([x0, z0, x1, z1], b) => {
    const A = at(x0, z0),
      B = at(x1, z1);
    const cx = (A[0] + B[0]) / 2,
      cz = (A[1] + B[1]) / 2,
      w = Math.abs(B[0] - A[0]),
      dd = Math.abs(B[1] - A[1]);
    green.box(LEAF.cover, w, 0.08, dd, cx, -0.03, cz, { cast: false });
    for (let k = 0.6; k < z1 - z0 - 0.4; k += 1.1 + hash2(b, k, 51) * 0.6) {
      const [mx, mz] = at((x0 + x1) / 2, z0 + k);
      if (clip(mx, mz)) mound(green, mx, mz, 0.3 + hash2(k, b, 53) * 0.2, GREENS[(b + Math.round(k)) % 3]);
    }
  });
  WEST_SHRUBS.forEach(([x, z], i) => {
    const [lx, lz] = at(x, z);
    if (clip(lx, lz)) cluster(green, lx, lz, { n: 4, r: 0.38, spread: 0.7, seed: 20 + i });
  });
  yield;
  const meshes = [...stone.build(root), ...green.build(root), ...surf.build(root)];
  meshes.forEach((m, i) => {
    m.name = `coast:${i}`; // named: the place's merge pass leaves it as it is
    if (layer === null) return;
    m.layers.set(layer);
    m.userData.noBatch = true;
  });
  return meshes;
}
