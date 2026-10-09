// Litter bins, in the street style.
//   bin(p, { at: [x, z], face, variant })   face: the way the openings look
// Variants: sorted (the pair every Japanese street has: cans and bottles in blue, burnables in green, rounded
// steel with a label band), round (a single steel litter bin on a short pedestal with a domed lid), station (three
// sorted bins under a small roof, a park's or a station's). Reports its footprint, and `tap`: where to stand to use it.
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, PAINT } from '../core/palette.js';

const BANDS = { cans: '#4f7396', burn: '#5f7d58', plastic: '#c9a23c', paper: '#8d6f9a' };

export const bin = piece({
  id: 'street/bin',
  family: 'street',
  label: 'Litter bin',
  fidelity: 'finished',
  use: "bin(p, { at: [x, z], face, variant: 'sorted' })",
  variants: {
    sorted: { kinds: ['cans', 'burn'], w: 0.36, h: 0.78 },
    round: { h: 0.82 },
    station: { kinds: ['cans', 'plastic', 'burn'], w: 0.38, h: 0.82, roof: true },
  },
  vary: { tone: 0.04, wear: [0.05, 0.4], turn: 0.05 },
  build(k, o) {
    const r = k.r;
    if (o.variant === 'round') {
      k.cyl(STEEL.dark, 0.12, 0.15, 0.12, 0, 0, 0, { n: 12, surf: 'metal' });
      k.cyl(STEEL.mid, 0.23, 0.21, o.h - 0.2, 0, 0.12, 0, { n: 14, surf: 'metal' });
      if (!k.phone) for (const y of [0.3, o.h - 0.2]) k.cyl(STEEL.dark, 0.235, 0.235, 0.03, 0, y, 0, { n: 14 });
      const dome = new THREE.SphereGeometry(0.235, k.seg(14), k.seg(6, 3), 0, Math.PI * 2, 0, Math.PI / 2);
      k.geo(STEEL.dark, dome.scale(1, 0.45, 1).translate(0, o.h - 0.08, 0), { surf: 'metal' });
      k.box('#1d2024', 0.22, 0.09, 0.02, 0, o.h - 0.12, 0.215, { cast: false }); // the opening
      return;
    }
    const n = o.kinds.length,
      w = o.w,
      gap = 0.04,
      total = n * w + (n - 1) * gap;
    o.kinds.forEach((kind, i) => {
      const u = -total / 2 + w / 2 + i * (w + gap);
      k.box('#9298a0', w, o.h, w * 0.85, u, 0, 0, { round: 0.03, surf: 'metal' });
      k.box(BANDS[kind], w + 0.01, 0.1, w * 0.85 + 0.01, u, o.h - 0.24, 0, { worn: false, round: 0.01 });
      k.box('#7f858d', w + 0.02, 0.05, w * 0.85 + 0.02, u, o.h, 0, { round: 0.015, surf: 'metal' }); // the lid
      // the opening: round for cans, a slot for the rest
      if (kind === 'cans')
        k.geo('#1d2024', new THREE.CircleGeometry(0.06, k.seg(12)).translate(u, o.h - 0.1, (w * 0.85) / 2 + 0.002), {
          cast: false,
        });
      else k.box('#1d2024', w * 0.6, 0.05, 0.01, u, o.h - 0.13, (w * 0.85) / 2, { cast: false });
      if (!k.phone)
        k.box('#e9e6dc', w * 0.5, 0.06, 0.005, u, 0.32, (w * 0.85) / 2 + 0.002, { worn: false, cast: false }); // its label
    });
    if (o.roof) {
      const d = w * 0.85;
      for (const s of [-1, 1])
        k.box(STEEL.dark, 0.05, o.h + 0.5, 0.05, s * (total / 2 + 0.08), 0, -d / 2 + 0.03, { surf: 'metal' });
      const roof = new THREE.BoxGeometry(total + 0.36, 0.04, d + 0.3).rotateX(0.18).translate(0, o.h + 0.52, 0.05);
      k.geo(r() < 0.5 ? PAINT.green : STEEL.mid, roof, { surf: 'metal' });
      if (!k.phone) k.box('#e9e6dc', total, 0.12, 0.01, 0, o.h + 0.3, -d / 2 + 0.01, { worn: false, cast: false }); // its sign
    }
  },
  footprint: (o) => {
    if (o.variant === 'round') return [[-0.25, 0.25, -0.25, 0.25]];
    const total = o.kinds.length * o.w + (o.kinds.length - 1) * 0.04 + (o.roof ? 0.25 : 0);
    return [[-total / 2, total / 2, -0.2, 0.2]];
  },
  spots: () => ({ tap: [[0, 0.55, 0, Math.PI]] }),
});
