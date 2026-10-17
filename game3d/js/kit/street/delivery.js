// A delivery left at a shop's door, in the street style.
//   delivery(p, { at: [x, z], face, variant })   face: the way the labels look
// Variants: trolley (a two-wheeled hand truck loaded with parcels, a long garment box on top, standing on its toe
// plate and leaning back on its wheels, the handle toward the street), stack (two parcels on the ground, the top one
// a little turned, the kind set against a door to hold it open), roll (a parcel with a wrapped bolt of cloth across
// it). The parcels are taped, with a white shipping label
// on the face that looks out. Reports its footprint.
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL } from '../core/palette.js';

const BOX = ['#b59a76', '#a88d69', '#bfa684'],
  TAPE = '#d7c9a6',
  LABEL = '#f1efe8';

export const delivery = piece({
  id: 'street/delivery',
  family: 'street',
  label: 'Delivery',
  fidelity: 'finished',
  use: "delivery(p, { at: [x, z], face, variant: 'trolley' })",
  variants: {
    trolley: { w: 0.3, h: 0.8 },
    stack: { w: 0.34 },
    roll: { w: 0.34 },
  },
  vary: { tone: 0.04, wear: [0, 0.3], turn: 0.06 },
  build(k, o) {
    const r = k.r;
    // one taped parcel standing on y, its label on the +v face
    const parcel = (w, h, d, u, y, v, ry = 0) => {
      const c = BOX[Math.floor(r() * BOX.length)];
      k.box(c, w, h, d, u, y, v, { ry, round: 0.008, surf: 'card' });
      k.box(TAPE, w + 0.004, 0.004, 0.05, u, y + h, v, { ry, worn: false, cast: false });
      if (!k.phone)
        k.box(LABEL, w * 0.4, h * 0.3, 0.004, u, y + h * 0.45, v + d / 2 + 0.002, { ry, worn: false, cast: false });
    };
    if (o.variant === 'roll') {
      // a parcel with a bolt of cloth in its wrapping laid across it
      parcel(o.w, 0.2, 0.26, 0, 0, 0);
      k.geo(
        '#cfd7dc',
        new THREE.CylinderGeometry(0.055, 0.055, o.w + 0.24, k.seg(10, 6)).rotateZ(Math.PI / 2).translate(0, 0.255, 0),
        { surf: 'plastic' },
      );
      return;
    }
    if (o.variant === 'stack') {
      parcel(o.w, 0.2, 0.26, 0, 0, 0);
      parcel(o.w - 0.06, 0.16, 0.22, 0.01, 0.2, 0.01, 0.12);
      return;
    }
    // the hand truck: two rails up from the toe plate, cross bars, wheels behind on an axle, the loop handle
    const lean = 0.12, // the rails lean back toward -v as they rise
      back = (y) => -0.06 - y * lean;
    for (const s of [-1, 1]) {
      const u = s * (o.w / 2 - 0.02);
      k.bar(STEEL.dark, [u, 0.03, back(0)], [u, o.h, back(o.h)], 0.012, { n: 6 });
      k.cyl('#26292d', 0.07, 0.07, 0.035, u + s * 0.03, 0.0, -0.1, { n: 12 });
    }
    k.bar(STEEL.dark, [-o.w / 2 + 0.02, o.h, back(o.h)], [o.w / 2 - 0.02, o.h, back(o.h)], 0.012, { n: 6 });
    for (const y of [0.3, 0.55]) k.box(STEEL.dark, o.w - 0.04, 0.02, 0.02, 0, y, back(y));
    k.box(STEEL.mid, o.w, 0.015, 0.16, 0, 0, 0.02, { surf: 'metal' }); // the toe plate
    // the load: two parcels and a long flat box for garments laid across the top
    parcel(o.w - 0.02, 0.22, 0.18, 0, 0.015, 0.01);
    parcel(o.w - 0.06, 0.18, 0.16, 0, 0.235, -0.01, 0.06);
    parcel(o.w + 0.08, 0.07, 0.14, 0, 0.415, -0.02, -0.04);
  },
  footprint: (o) =>
    o.variant === 'trolley'
      ? [[-o.w / 2 - 0.06, o.w / 2 + 0.06, -0.2, 0.12]]
      : [[-o.w / 2 - (o.variant === 'roll' ? 0.12 : 0), o.w / 2 + (o.variant === 'roll' ? 0.12 : 0), -0.14, 0.14]],
});
