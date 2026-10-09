// A bike rack along a line, in the street style.
//   bikeRack(p, { from: [x, z], to: [x, z], variant })   the bikes stand across the line, on its +v side
// Variants: hoops (steel hoops, an upturned U every 0.9 m, a bike either side), slots (the front-wheel rack every
// Japanese station has: a low steel frame with a wheel slot every 0.45 m, the bikes standing in a close row).
// Reports the rack's strip as blocked and `bikes`: where each bike stands, facing the way its front wheel points.
import { piece } from '../core/piece.js';
import { STEEL } from '../core/palette.js';

const pitchOf = (o) => (o.variant === 'slots' ? 0.45 : 0.9);
const placesOf = (o) => {
  const n = Math.max(1, Math.floor(o.len / pitchOf(o) + 1e-6));
  const step = o.len / n;
  return Array.from({ length: n }, (_, i) => -o.len / 2 + step * (i + 0.5));
};

export const bikeRack = piece({
  id: 'street/bike-rack',
  family: 'street',
  label: 'Bike rack',
  fidelity: 'finished',
  run: true,
  use: "bikeRack(p, { from: [x0, z0], to: [x1, z1], variant: 'slots' })",
  variants: { hoops: { h: 0.75 }, slots: { h: 0.32 } },
  vary: { tone: 0.04, wear: [0.05, 0.4] },
  build(k, o) {
    const at = placesOf(o),
      metal = { surf: 'metal' };
    if (o.variant === 'hoops') {
      for (const u of at) {
        // an upturned U across the line: two legs and a round top
        for (const s of [-1, 1]) k.cyl(STEEL.pale, 0.024, 0.024, o.h - 0.12, u, 0, s * 0.3, { n: 8, ...metal });
        for (let i = 0; i < (k.phone ? 3 : 6); i++) {
          const n = k.phone ? 3 : 6,
            a0 = (i / n) * Math.PI,
            a1 = ((i + 1) / n) * Math.PI;
          const p0 = [u, o.h - 0.12 + Math.sin(a0) * 0.12, -Math.cos(a0) * 0.3],
            p1 = [u, o.h - 0.12 + Math.sin(a1) * 0.12, -Math.cos(a1) * 0.3];
          k.bar(STEEL.pale, p0, p1, 0.024, metal);
        }
        if (!k.phone) for (const s of [-1, 1]) k.cyl(STEEL.dark, 0.045, 0.045, 0.015, u, 0, s * 0.3, { n: 8 });
      }
      return;
    }
    // slots: two rails along the line on short feet, a wheel guide for each bike
    for (const v of [-0.18, 0.18]) k.box(STEEL.dark, o.len, 0.04, 0.04, 0, 0.06, v, metal);
    for (const u of [-o.len / 2 + 0.05, o.len / 2 - 0.05]) k.box(STEEL.dark, 0.05, 0.06, 0.44, u, 0, 0, metal);
    for (const u of at) {
      for (const s of [-1, 1]) k.bar(STEEL.pale, [u + s * 0.05, 0.08, -0.18], [u + s * 0.05, o.h, 0.1], 0.012, metal);
      k.bar(STEEL.pale, [u - 0.05, o.h, 0.1], [u + 0.05, o.h, 0.1], 0.012, metal);
      if (!k.phone) k.box('#e9e6dc', 0.06, 0.02, 0.005, u, 0.1, 0.205, { worn: false, cast: false }); // its number
    }
  },
  footprint: (o) => [[-o.len / 2, o.len / 2, -0.35, o.variant === 'slots' ? 0.25 : 0.35]],
  // a bike beside each hoop, along it; in a slot rack, its front wheel in the slot and the bike out on the +v side
  spots: (o) => ({
    bikes: placesOf(o).map((u) => (o.variant === 'slots' ? [u, 0.75, 0, Math.PI] : [u + 0.22, 0, 0, 0])),
  }),
});
