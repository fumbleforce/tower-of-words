// A planter, in the street style: a box or bowl lined up with the paving, filled with clipped shrubs (GUIDE: plants
// belong to the place's structure, in planters that line up with the paving, never in blob-shaped beds).
//   planter(p, { at: [x, z], face, variant })
// Variants: box (a concrete box of clipped shrubs), long (a long low trough along a front, a row of shrubs), round
// (a concrete bowl with one clipped dome), timber (a box clad in timber slats), seat (a concrete box with a timber
// bench along its front: you can sit on it). The shrubs here are clipped shapes in code; a place with the Blender
// plants can fill the `plant` spot with its own instead. Reports its footprint, `plant` (where the planting
// goes: [u, v] middle) and, for the seat, `seats`.
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STONE, TIMBER } from '../core/palette.js';

const GREENS = ['#4d6b47', '#43603f', '#577650', '#5f7d57'];
const FLOWERS = ['#c9607a', '#e0d2e8', '#d8a33a'];

// clipped shrubs over a soil top w x d at height y: domes in a row (n), a little different each
function shrubs(k, w, d, y, n) {
  const r = k.r;
  k.box('#4b4540', w, 0.02, d, 0, y - 0.02, 0, { surf: 'soil', cast: false });
  const count = k.phone ? Math.max(1, Math.ceil(n / 2)) : n,
    step = w / count;
  for (let i = 0; i < count; i++) {
    const rr = Math.min(step, d) * (0.5 + r() * 0.12),
      u = -w / 2 + step * (i + 0.5) + (r() - 0.5) * 0.06;
    // on the phone fewer shrubs, each stretched along the box so it is still full
    const sx = k.phone ? Math.max(rr, step * 0.48) : rr * 1.05;
    const g = new THREE.IcosahedronGeometry(1, k.phone ? 0 : 1).scale(sx, rr * 0.7, rr * 0.95);
    const spin = r() * 6;
    if (!k.phone) g.rotateY(spin); // (a stretched phone shrub stays along the box)
    k.geo(GREENS[Math.floor(r() * GREENS.length)], g.translate(u, y + rr * 0.45, (r() - 0.5) * 0.05), {
      surf: 'foliage',
    });
    // a few flowers on the high level
    if (k.high && r() < 0.5)
      for (let j = 0; j < 5; j++) {
        const a = r() * Math.PI * 2;
        const f = new THREE.IcosahedronGeometry(0.025, 0).translate(
          u + Math.cos(a) * rr * 0.7,
          y + rr * 0.75,
          Math.sin(a) * rr * 0.55,
        );
        k.geo(FLOWERS[i % FLOWERS.length], f, { cast: false, worn: false });
      }
  }
}

export const planter = piece({
  id: 'planting/planter',
  family: 'planting',
  label: 'Planter',
  fidelity: 'finished',
  use: "planter(p, { at: [x, z], face, variant: 'box' })",
  variants: {
    box: { w: 1.2, d: 0.6, h: 0.5, shrubs: 2 },
    long: { w: 2.4, d: 0.45, h: 0.4, shrubs: 5 },
    round: { r: 0.42, h: 0.45 },
    timber: { w: 1.0, d: 1.0, h: 0.55, shrubs: 1, timber: true },
    seat: { w: 1.8, d: 0.75, h: 0.45, shrubs: 3, seat: true },
  },
  vary: { tone: 0.04, wear: [0.05, 0.4], turn: 0 },
  build(k, o) {
    if (o.variant === 'round') {
      k.cyl(STONE.concrete, o.r, o.r * 0.8, o.h, 0, 0, 0, { n: 16, surf: 'concrete' });
      k.cyl(STONE.pale, o.r + 0.02, o.r + 0.02, 0.04, 0, o.h - 0.02, 0, { n: 16, surf: 'concrete' }); // its rim
      shrubs(k, o.r * 1.2, o.r * 1.2, o.h, 1);
      return;
    }
    const { w, d, h } = o,
      t = 0.07; // wall thickness
    if (o.timber) {
      k.box(STONE.dark, w, 0.06, d, 0, 0, 0);
      const n = Math.round(h / 0.11);
      for (let i = 0; i < n; i++) {
        const y = 0.06 + i * ((h - 0.06) / n),
          c = i % 3 === 1 ? TIMBER.pale : TIMBER.mid;
        k.box(c, w, (h - 0.06) / n - 0.012, d, 0, y, 0, { round: k.high ? 0.004 : 0 });
      }
      k.box(TIMBER.dark, w + 0.04, 0.035, d + 0.04, 0, h, 0);
    } else {
      // a concrete box with a pale coping
      for (const s of [-1, 1]) {
        k.box(STONE.concrete, w, h, t, 0, 0, s * (d / 2 - t / 2), { surf: 'concrete' });
        k.box(STONE.concrete, t, h, d - 2 * t, s * (w / 2 - t / 2), 0, 0, { surf: 'concrete' });
      }
      k.box(STONE.pale, w + 0.03, 0.04, d + 0.03, 0, h, 0, { round: 0.01, surf: 'concrete' });
      if (!k.phone) k.box(STONE.dark, w - 0.02, 0.03, d - 0.02, 0, 0, 0, { cast: false }); // a shadow gap at its foot
    }
    shrubs(k, w - 2 * t, d - 2 * t, h, o.shrubs);
    if (o.seat) {
      // a timber bench along the front, on two concrete brackets
      for (const s of [-1, 1])
        k.box(STONE.concrete, 0.08, h - 0.05, 0.36, s * (w / 2 - 0.25), 0, d / 2 + 0.18, { surf: 'concrete' });
      const n = k.phone ? 1 : 4;
      for (let i = 0; i < n; i++)
        k.box(TIMBER.mid, w - 0.1, 0.045, 0.36 / n - 0.012, 0, h - 0.05, d / 2 + 0.02 + (i + 0.5) * (0.36 / n), {
          round: 0.006,
        });
    }
  },
  footprint: (o) =>
    o.variant === 'round' ? [[-o.r, o.r, -o.r, o.r]] : [[-o.w / 2, o.w / 2, -o.d / 2, o.d / 2 + (o.seat ? 0.38 : 0)]],
  spots: (o) => ({
    plant: [[0, 0, o.h]],
    ...(o.seat ? { seats: [-0.5, 0, 0.5].map((u) => [u * (o.w / 2), o.d / 2 + 0.2, o.h, 0]) } : {}),
  }),
});
