// A doorway with its canopy and light, in the street style: the one piece for the glazed double door with a canopy
// and a lamp that the audit found built about nine times (notes/architecture/world-kit.md, section 2).
//   doorway(p, { at: [x, z], face, y, variant })   at: the wall's outer face at the door's middle; face: outward.
// Variants: glazed (an office's automatic glass pair under a deep canopy with a downlight, on a granite landing),
// shop (one glazed door under a slim steel canopy on tie rods, a wall lantern), staff (a steel door with a vision
// panel under a small hood, a wall lantern), house (a timber door under a hood), porch (a timber door under a deeper
// roof on two posts). Everything stands on or proud of the wall's face, so it goes on any solid wall.
// Reports: enter (where Eric stands to go in, facing the door), tap (the door's handle); the porch's posts block
// walking; the downlight or lantern and the door's glass glow at night.
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, STONE, TIMBER, TRIM, PAINT } from '../core/palette.js';

const CANOPY = [STEEL.dark, PAINT.green, PAINT.blue, TRIM.fascia];

export const doorway = piece({
  id: 'building/door',
  family: 'building',
  label: 'Door with canopy',
  fidelity: 'finished',
  use: "doorway(p, { at: [x, z], face, variant: 'glazed' })",
  variants: {
    glazed: { w: 1.8, h: 2.2, leaves: 2, glazed: true, canopy: 'deep', out: 1.4, side: 0.8, lamp: 'down', step: 0.12 },
    shop: { w: 0.95, h: 2.1, leaves: 1, glazed: true, canopy: 'slim', out: 0.9, side: 0.35, lamp: 'wall', step: 0.06 },
    staff: {
      w: 0.9,
      h: 2.05,
      leaves: 1,
      leaf: '#6d747c',
      canopy: 'hood',
      out: 0.7,
      side: 0.25,
      lamp: 'wall',
      step: 0.1,
    },
    house: {
      w: 0.85,
      h: 2.0,
      leaves: 1,
      leaf: TIMBER.dark,
      canopy: 'hood',
      out: 0.65,
      side: 0.2,
      lamp: 'wall',
      step: 0.12,
    },
    porch: {
      w: 0.85,
      h: 2.0,
      leaves: 1,
      leaf: TIMBER.mid,
      canopy: 'porch',
      out: 1.3,
      side: 0.55,
      lamp: 'down',
      step: 0.15,
    },
  },
  vary: { tone: 0.03, wear: [0, 0.3] },
  preview: { wall: [4.2, 3.4] },
  build(k, o) {
    const { w, h, leaves } = o;
    const frame = o.glazed ? STEEL.pale : TRIM.frame,
      fw = 0.08,
      r = k.r;
    // the reveal and the frame
    k.box('#24282c', w, h, 0.01, 0, 0, 0.005, { cast: false });
    for (const s of [-1, 1]) k.box(frame, fw, h + fw, 0.1, (s * (w + fw)) / 2, 0, 0.05, { round: 0.01 });
    k.box(frame, w + 2 * fw, fw, 0.1, 0, h, 0.05, { round: 0.01 });
    // the leaves
    const lw = w / leaves;
    for (let i = 0; i < leaves; i++) {
      const u = -w / 2 + lw * (i + 0.5);
      if (o.glazed) {
        k.glass(new THREE.BoxGeometry(lw - 0.1, h - 0.12, 0.02).translate(u, h / 2, 0.03));
        k.lit(new THREE.PlaneGeometry(lw - 0.12, h - 0.16).translate(u, h / 2, 0.042));
        for (const s of [-1, 1]) k.box(frame, 0.05, h, 0.05, u + (s * (lw - 0.05)) / 2, 0, 0.04);
        k.box(frame, lw, 0.07, 0.05, u, 0, 0.04);
        k.box(frame, lw, 0.05, 0.05, u, h - 0.05, 0.04);
        if (leaves === 2) k.box('#f2f2ee', lw - 0.1, 0.06, 0.005, u, 1.2, 0.044, { worn: false, cast: false });
        const pull = u + (leaves === 2 ? (i ? -1 : 1) * (lw / 2 - 0.12) : lw / 2 - 0.14);
        k.bar(STEEL.pale, [pull, 0.85, 0.09], [pull, 1.45, 0.09], 0.014);
      } else {
        k.box(o.leaf, lw - 0.02, h - 0.02, 0.05, u, 0.01, 0.035, { round: 0.008 });
        if (o.canopy === 'hood' && !k.phone && o.leaf !== TIMBER.dark) {
          // a vision panel
          k.glass(new THREE.BoxGeometry(0.22, 0.5, 0.02).translate(u, 1.45, 0.06));
          k.box(TRIM.frame, 0.28, 0.56, 0.02, u, 1.17, 0.055);
        } else if (!k.phone) {
          // two raised panels
          for (const [y0, hh] of [
            [0.18, 0.75],
            [1.05, 0.75],
          ])
            k.box(o.leaf, lw - 0.22, hh, 0.02, u, y0, 0.065, { round: 0.006 });
        }
        k.box(STEEL.pale, 0.12, 0.025, 0.04, u + lw / 2 - 0.14, 1.0, 0.08, { cast: false }); // the lever
        if (k.high) k.box(STEEL.pale, 0.05, 0.12, 0.012, u + lw / 2 - 0.12, 0.95, 0.065, { cast: false });
      }
    }
    // the step or landing in front
    if (o.step) {
      const sw = w + (o.canopy === 'deep' ? 1.0 : 0.5);
      k.box(STONE.granite, sw, o.step, 0.7, 0, 0, 0.35, { surf: 'stone', round: 0.012 });
      if (o.canopy === 'deep') k.box('#5f6670', w + 0.2, 0.01, 0.55, 0, o.step, 0.33, { cast: false }); // a mat
    }
    canopy(k, o, h, w, r);
    // the lamp
    if (o.lamp === 'wall') {
      const u = w / 2 + 0.38,
        y = h - 0.06; // (its cap 1 cm under the top of a slim canopy it reaches into, not level with it)
      k.box(STEEL.dark, 0.1, 0.16, 0.04, u, y, 0.02); // the plate
      k.box(STEEL.dark, 0.03, 0.03, 0.12, u, y + 0.1, 0.08);
      k.box(STEEL.dark, 0.16, 0.03, 0.16, u, y + 0.27, 0.17);
      k.lamp(new THREE.BoxGeometry(0.13, 0.2, 0.13).translate(u, y + 0.17, 0.17), [u, 0.9, 1.2]);
    } else if (o.lamp === 'down') {
      k.lamp(new THREE.CylinderGeometry(0.09, 0.09, 0.02, k.seg(12)).translate(0, h + 0.17, o.out * 0.55), [
        0,
        o.out * 0.6,
        1.4,
      ]);
    }
  },
  footprint: (o) =>
    o.canopy === 'porch'
      ? [
          [-o.w / 2 - o.side, -o.w / 2 - o.side + 0.16, o.out - 0.16, o.out],
          [o.w / 2 + o.side - 0.16, o.w / 2 + o.side, o.out - 0.16, o.out],
        ]
      : [],
  spots: (o) => ({ enter: [[0, 0.75, 0, Math.PI]], tap: [[o.leaves === 2 ? 0 : o.w / 2 - 0.14, 0.12, 1.0, 0]] }),
});

function canopy(k, o, h, w, r) {
  const c0 = -w / 2 - o.side,
    c1 = w / 2 + o.side,
    cw = c1 - c0,
    out = o.out,
    y = h + 0.2;
  if (o.canopy === 'deep') {
    // (the slab stops a centimetre inside its dark front and ends: in their planes it flickered)
    k.box(TRIM.canopy, cw - 0.02, 0.07, out - 0.01, 0, y, (out - 0.01) / 2, { surf: 'metal' });
    k.box(TRIM.fascia, cw, 0.36, 0.08, 0, y - 0.12, out - 0.04, { round: 0.01 });
    for (const s of [-1, 1]) k.box(TRIM.fascia, 0.08, 0.36, out, (s * (cw - 0.08)) / 2, y - 0.12, out / 2);
    if (!k.phone)
      for (let u = c0 + 0.45; u < c1 - 0.3; u += 0.45)
        k.box('#959ba3', 0.03, 0.03, out - 0.1, u, y - 0.03, out / 2, { cast: false });
  } else if (o.canopy === 'slim') {
    const col = CANOPY[Math.floor(r() * CANOPY.length)];
    k.box(col, cw, 0.05, out, 0, y, out / 2, { surf: 'metal' });
    k.box(col, cw, 0.14, 0.03, 0, y - 0.07, out - 0.015);
    for (const s of [-1, 1])
      k.bar(
        STEEL.dark,
        [(s * cw) / 2 - s * 0.1, y + 0.02, out - 0.05],
        [(s * cw) / 2 - s * 0.1, y + 0.75, 0.02],
        0.012,
      );
  } else if (o.canopy === 'hood' || o.canopy === 'porch') {
    // a small pitched roof falling away from the wall, on brackets (posts for the porch)
    const pitch = 0.32,
      col = o.canopy === 'porch' ? '#55595d' : o.leaf === TIMBER.dark ? '#5b5f63' : STEEL.mid;
    const g = new THREE.BoxGeometry(cw, 0.05, out / Math.cos(pitch)).rotateX(pitch).translate(0, y + 0.14, out / 2);
    k.geo(col, g, { surf: 'roof' });
    // its ledger on the wall and the porch's beam stop a centimetre in from the roof's ends (level with them they flickered)
    k.box(TIMBER.pale, cw - 0.02, 0.06, 0.06, 0, y - 0.03, 0.03, { round: 0.01 });
    if (o.canopy === 'porch') {
      for (const s of [-1, 1]) k.box(TIMBER.mid, 0.12, y, 0.12, s * (cw / 2 - 0.08), 0, out - 0.08, { round: 0.01 });
      k.box(TIMBER.mid, cw - 0.02, 0.1, 0.1, 0, y - 0.06, out - 0.08, { round: 0.01 });
    } else {
      for (const s of [-1, 1]) {
        const u = s * (cw / 2 - 0.06);
        k.bar(TIMBER.mid, [u, y - 0.45, 0.02], [u, y + 0.02, out - 0.1], 0.025, { n: 6 });
      }
    }
  }
}
