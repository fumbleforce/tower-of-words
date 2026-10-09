// A bollard, in the street style: across an opening that isn't for cars, or along a kerb.
//   bollard(p, { at: [x, z], variant })
// Variants: stone (granite with a chamfered top and a steel cap), steel (a round steel post with a reflective
// band), timber (a square timber post with a bevelled top, for gardens and the coast).
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, STONE, TIMBER } from '../core/palette.js';

export const bollard = piece({
  id: 'street/bollard',
  family: 'street',
  label: 'Bollard',
  fidelity: 'finished',
  use: "bollard(p, { at: [x, z], variant: 'stone' })",
  variants: {
    stone: { h: 0.55, r: 0.11 },
    steel: { h: 0.8, r: 0.06 },
    timber: { h: 0.6, r: 0.08 },
  },
  vary: { tone: 0.05, wear: [0, 0.45], scale: [0.97, 1.03], turn: 0.4 },
  build(k, o) {
    const { h, r } = o;
    if (o.variant === 'stone') {
      k.cyl(STONE.granite, r, r * 1.08, h - 0.07, 0, 0, 0, { n: 8, surf: 'stone' });
      k.cyl(STONE.granite, r * 0.82, r, 0.05, 0, h - 0.07, 0, { n: 8, surf: 'stone' });
      k.cyl(STEEL.pale, r * 0.55, r * 0.6, 0.025, 0, h - 0.02, 0, { n: 10, surf: 'metal' });
    } else if (o.variant === 'steel') {
      k.cyl(STEEL.dark, r * 1.6, r * 1.7, 0.02, 0, 0, 0, { n: 12, surf: 'metal' });
      k.cyl(STEEL.mid, r, r, h - 0.04, 0, 0.02, 0, { n: 12, surf: 'metal' });
      k.cyl('#d9d4c4', r * 1.02, r * 1.02, 0.06, 0, h - 0.18, 0, { n: 12, worn: false }); // the reflective band
      k.cyl(STEEL.mid, r * 0.4, r, 0.04, 0, h - 0.02, 0, { n: 12, surf: 'metal' });
    } else {
      k.box(TIMBER.mid, r * 2, h - 0.05, r * 2, 0, 0, 0, { round: 0.01 });
      const top = new THREE.CylinderGeometry(0.01, r * 1.414, 0.05, 4).rotateY(Math.PI / 4);
      k.geo(TIMBER.mid, top.translate(0, h - 0.025, 0)); // a four-sided bevelled top
      if (!k.phone) k.box(STEEL.dark, r * 2 + 0.006, 0.025, r * 2 + 0.006, 0, h - 0.16, 0);
    }
  },
  footprint: (o) => [[-o.r - 0.05, o.r + 0.05, -o.r - 0.05, o.r + 0.05]],
});
