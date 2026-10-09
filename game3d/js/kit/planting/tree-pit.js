// A street tree's pit, in the street style: the square in the paving a tree grows from. The tree itself comes from
// the place's planting (scenes/outdoor/planting.js, the Blender trees): the pit reports a `plant` spot for it.
//   treePit(p, { at: [x, z], variant })   y: the paving's height
// Variants: grate (a granite surround with an iron grate in rings), mulch (a steel edge round mulch, for a lane),
// guard (the grate with a steel tree guard of four posts and two rings), bench (a square timber bench round the
// pit, at seat height: you can sit on all four sides).
// Reports what blocks walking (the trunk; the guard; the bench), `plant`, and for the bench `seats`.
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, STONE, TIMBER } from '../core/palette.js';

// a seat on the bench's side that faces `a` (radians), d out from the trunk, the sitter looking away from it
const seatAt = (a, d) => [Math.sin(a) * d, Math.cos(a) * d, 0.45, a];

export const treePit = piece({
  id: 'planting/tree-pit',
  family: 'planting',
  label: 'Tree pit',
  fidelity: 'finished',
  use: "treePit(p, { at: [x, z], variant: 'grate' })",
  variants: {
    grate: { s: 1.4 },
    mulch: { s: 1.2 },
    guard: { s: 1.4, guard: true },
    bench: { s: 1.6, bench: true },
  },
  vary: { tone: 0.04, wear: [0.1, 0.45], turn: 0 },
  build(k, o) {
    const s = o.s,
      half = s / 2,
      rim = 0.12;
    if (o.variant === 'mulch') {
      for (const q of [-1, 1]) {
        k.box(STEEL.dark, s, 0.05, 0.008, 0, 0, q * half, { surf: 'metal' });
        k.box(STEEL.dark, 0.008, 0.05, s, q * half, 0, 0, { surf: 'metal' });
      }
      k.box('#57504a', s - 0.02, 0.025, s - 0.02, 0, 0, 0, { surf: 'mulch', cast: false });
    } else {
      // the granite surround, four kerbs mitred by overlap
      for (const q of [-1, 1]) {
        k.box(STONE.granite, s, 0.04, rim, 0, 0, q * (half - rim / 2), { surf: 'stone', round: 0.008 });
        k.box(STONE.granite, rim, 0.04, s - 2 * rim, q * (half - rim / 2), 0, 0, { surf: 'stone', round: 0.008 });
      }
      // the grate: a dark plate in rings of slots round the trunk
      const g = s - 2 * rim;
      k.box('#2a2c2e', g, 0.012, g, 0, 0.012, 0, { cast: false, surf: 'metal' });
      const rings = k.phone ? 2 : 4;
      for (let i = 1; i <= rings; i++) {
        const rr = 0.2 + ((g / 2 - 0.25) * i) / rings;
        const ring = new THREE.RingGeometry(rr - 0.012, rr + 0.012, k.seg(28, 12))
          .rotateX(-Math.PI / 2)
          .translate(0, 0.026, 0);
        k.geo('#4a4d50', ring, { cast: false, surf: 'metal' });
      }
      k.cyl('#3a3c3e', 0.17, 0.17, 0.016, 0, 0.012, 0, { n: 16, cast: false }); // the opening round the trunk
    }
    if (o.guard) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        k.cyl(STEEL.dark, 0.018, 0.018, 1.25, Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32, { n: 6, surf: 'metal' });
      }
      for (const y of [0.55, 1.2]) {
        const ring = new THREE.TorusGeometry(0.32, 0.014, k.seg(6, 4), k.seg(20, 10))
          .rotateX(Math.PI / 2)
          .translate(0, y, 0);
        k.geo(STEEL.dark, ring, { surf: 'metal' });
      }
    }
    if (o.bench) {
      // a square bench round the pit: four timber seats on steel legs, 0.42 deep, 0.45 high
      const out = half + 0.3,
        depth = 0.42,
        n = k.phone ? 1 : 3;
      for (let q = 0; q < 4; q++) {
        const ry = (q * Math.PI) / 2;
        const put = (w, h, d, u, y, v, color, opts) =>
          k.geo(color, new THREE.BoxGeometry(w, h, d).translate(u, y + h / 2, v).rotateY(ry), opts);
        for (let i = 0; i < n; i++)
          put(
            2 * out - depth,
            0.045,
            depth / n - 0.012,
            -depth / 2,
            0.405,
            out - depth + (i + 0.5) * (depth / n),
            q % 2 ? TIMBER.mid : TIMBER.pale,
          );
        for (const u of [-out + 0.25, out - depth - 0.2])
          put(0.06, 0.4, depth - 0.06, u, 0, out - depth / 2, STEEL.dark, { surf: 'metal' });
      }
    }
  },
  footprint: (o) =>
    o.bench
      ? [[-o.s / 2 - 0.3, o.s / 2 + 0.3, -o.s / 2 - 0.3, o.s / 2 + 0.3]]
      : o.guard
        ? [[-0.36, 0.36, -0.36, 0.36]]
        : [[-0.2, 0.2, -0.2, 0.2]],
  spots: (o) => ({
    plant: [[0, 0, 0]],
    ...(o.bench ? { seats: [0, 1, 2, 3].map((q) => seatAt((q * Math.PI) / 2, o.s / 2 + 0.3 - 0.21)) } : {}),
  }),
});
