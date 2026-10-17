// A sewing and alterations workroom's furniture, in the street style: the pieces the shop street's clothes shop
// shows through its side door (scenes/shotengai/tailor.js), for any later shop, club room or flat that needs them.
// Sizes are the island's (1 unit = 1.5 m, scenes/island-layout.js UNIT).
//   garmentRail(p, { at: [x, z], face, variant })   a steel rail on castors; face: the way its long side looks
//   dressForm(p, { at, face, variant })             a tailor's dummy on a tripod stand; face: the way its front looks
//   workTable(p, { at, face, variant })             a table; face: the side the worker stands at
//   fabricShelf(p, { at, face, variant })           open shelving against a wall; face: away from the wall
// Variants:
//   garmentRail: covered (finished alterations waiting to be collected, in clear covers with paper tickets),
//     garments (shirts, jackets and a dress on hangers), empty (bare hangers)
//   dressForm: pinned (a half-made jacket pinned on it, a tape measure round the neck), bare (the linen form alone),
//     draped (a length of cloth over one shoulder)
//   workTable: cutting (a long cutting table with a cutting mat, cloth laid out, a paper pattern, shears and a rule,
//     rolls of cloth on the shelf under it), sewing (a sewing machine, thread spools and a lamp on a smaller table),
//     pressing (a padded pressing top, a steam iron on its rest, folded garments)
//   fabricShelf: bolts (bolts of cloth on their ends and laid flat), spools (rows of thread), boxes (boxes of
//     notions); boxes of notions on top of each
// Each reports its footprint; nothing here glows.
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, TIMBER } from '../core/palette.js';

const CLOTH = ['#4d5f73', '#7a4a52', '#5d6f5a', '#c9c2b2', '#3f454d', '#8a7f9c', '#b5a487', '#6d8ea0'];
const LINEN = '#d9d0bd',
  PAPER = '#ecebe4',
  MAT = '#3f6a5a',
  TAPE = '#d8b84a';

export const garmentRail = piece({
  id: 'interior/garment-rail',
  family: 'interior',
  label: 'Garment rail',
  fidelity: 'finished',
  use: "garmentRail(p, { at: [x, z], face, variant: 'covered' })",
  variants: {
    covered: { len: 1.0, h: 1.07, n: 6, covers: true },
    garments: { len: 1.0, h: 1.07, n: 7, covers: false },
    empty: { len: 1.0, h: 1.07, n: 5, covers: false, bare: true },
  },
  vary: { tone: 0.03, wear: [0, 0.2] },
  build(k, o) {
    const { len, h, n } = o,
      r = k.r,
      half = len / 2;
    // the frame: two uprights on splayed feet with castors, the bar across their tops
    for (const s of [-1, 1]) {
      const u = s * half;
      k.box(STEEL.pale, 0.025, h, 0.025, u, 0.05, 0, { surf: 'metal' });
      k.box(STEEL.pale, 0.03, 0.025, 0.36, u, 0.05, 0, { surf: 'metal' });
      for (const v of [-0.16, 0.16]) k.cyl(STEEL.dark, 0.022, 0.022, 0.05, u, 0, v, { n: 8 });
    }
    k.bar(STEEL.pale, [-half - 0.02, h + 0.05, 0], [half + 0.02, h + 0.05, 0], 0.012);
    // what hangs from it: each on a hanger hook, its shoulders under the bar, turned a little
    const pitch = (len - 0.12) / n;
    for (let i = 0; i < n; i++) {
      const u = -half + 0.06 + pitch * (i + 0.5),
        turn = (r() - 0.5) * 0.25,
        color = CLOTH[Math.floor(r() * CLOTH.length)],
        long = r() < 0.3 ? 0.66 : 0.5;
      k.bar(STEEL.mid, [u, h + 0.05, 0], [u, h - 0.02, 0], 0.005, { n: 4 });
      const top = h - 0.03;
      // (the hanger: a thin bar across, its shoulders 0.28 wide)
      k.box(o.covers ? '#8d9196' : '#5c4f45', 0.012, 0.012, 0.28, u, top - 0.03, 0, { ry: turn, cast: false });
      if (o.bare) continue; // the empty hangers, waiting
      k.box(color, 0.07, long, 0.28, u, top - 0.04 - long, 0, { ry: turn, surf: 'fabric' });
      if (o.covers) {
        // the clear cover over it, a shade larger, and its paper ticket stapled at the shoulder
        k.box('#dfe6ea', 0.085, long + 0.08, 0.31, u, top - 0.1 - long, 0, {
          ry: turn,
          cast: false,
          opts: { transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.2 },
        });
        k.box(PAPER, 0.004, 0.07, 0.05, u + 0.045, top - 0.12, 0.08, { ry: turn, worn: false, cast: false });
      } else if (!k.phone && i % 3 === 1) k.box(PAPER, 0.004, 0.06, 0.04, u + 0.04, top - 0.1, 0.06, { cast: false });
    }
  },
  footprint: (o) => [[-o.len / 2 - 0.05, o.len / 2 + 0.05, -0.2, 0.2]],
});

// the form's half-width at each height (u across, a little less front to back), hips to neck
const FORM = [
  [0.0, 0.0],
  [0.095, 0.01],
  [0.12, 0.07],
  [0.122, 0.13],
  [0.1, 0.22],
  [0.088, 0.26],
  [0.1, 0.33],
  [0.115, 0.38],
  [0.112, 0.43],
  [0.1, 0.47],
  [0.06, 0.5],
  [0.035, 0.52],
  [0.033, 0.57],
  [0.045, 0.58],
  [0.0, 0.59],
];
export const dressForm = piece({
  id: 'interior/dress-form',
  family: 'interior',
  label: 'Dress form',
  fidelity: 'finished',
  use: "dressForm(p, { at: [x, z], face, variant: 'pinned' })",
  variants: { pinned: { jacket: '#4d5f73' }, bare: { jacket: null }, draped: { jacket: null, drape: '#7a4a52' } },
  vary: { tone: 0.03, turn: 0.15 },
  build(k, o) {
    const hip = 0.52; // where the torso starts, on its pole
    // the tripod: three legs on castors, the pole up to the torso
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2,
        e = [Math.sin(a) * 0.17, Math.cos(a) * 0.17];
      k.bar(TIMBER.mid, [0, 0.08, 0], [e[0], 0.035, e[1]], 0.014, { n: 6 });
      k.cyl(STEEL.dark, 0.018, 0.018, 0.035, e[0], 0, e[1], { n: 6 });
    }
    k.bar(STEEL.pale, [0, 0.07, 0], [0, hip + 0.02, 0], 0.011, { n: 8 });
    // the torso: turned linen, wider than deep
    const pts = FORM.map(([r, y]) => new THREE.Vector2(r, y));
    const torso = new THREE.LatheGeometry(pts, k.seg(16, 10)).scale(1, 1, 0.78).translate(0, hip, 0);
    k.geo(LINEN, torso, { surf: 'fabric' });
    k.cyl('#7f7466', 0.028, 0.028, 0.03, 0, hip + 0.59, 0, { n: 8 }); // the cap on its neck
    if (o.drape) {
      // a length of cloth thrown over one shoulder, hanging down the front and the back
      for (const v of [-1, 1])
        k.box(o.drape, 0.16, 0.36, 0.012, 0.04, hip + 0.18, v * 0.1, { ry: 0.08, surf: 'fabric', cast: false });
      k.box(o.drape, 0.16, 0.012, 0.21, 0.04, hip + 0.54, 0, { ry: 0.08, surf: 'fabric' });
    }
    if (!o.jacket) return;
    // a jacket being fitted: the body a shade larger than the form from the hips to the shoulders, open at the
    // front, one sleeve basted on, the other not yet; pins in a line down the side seam
    const jacket = new THREE.LatheGeometry(
      FORM.slice(1, 10).map(([r, y]) => new THREE.Vector2(r + 0.012, y)),
      k.seg(16, 10),
      Math.PI * 0.12,
      Math.PI * 1.76,
    )
      .scale(1, 1, 0.8)
      .translate(0, hip, 0);
    k.geo(o.jacket, jacket, { surf: 'fabric' });
    k.bar(o.jacket, [0.11, hip + 0.46, 0], [0.15, hip + 0.16, 0.02], 0.042, { n: 8, surf: 'fabric' });
    if (!k.phone)
      for (let y = 0.12; y < 0.42; y += 0.06)
        k.box(y % 0.12 < 0.06 ? '#d8524a' : '#f4f2ec', 0.014, 0.014, 0.014, -0.128, hip + y, 0.01, { cast: false });
    // the tape measure round its neck, the ends hanging down the front
    k.geo(
      TAPE,
      new THREE.TorusGeometry(0.045, 0.006, 4, k.seg(12, 8)).rotateX(Math.PI / 2).translate(0, hip + 0.53, 0),
      {
        cast: false,
      },
    );
    for (const [s, l] of [
      [-1, 0.24],
      [1, 0.15],
    ])
      k.box(TAPE, 0.014, l, 0.004, s * 0.03, hip + 0.52 - l, 0.09, { worn: false, cast: false });
  },
  footprint: () => [[-0.18, 0.18, -0.18, 0.18]],
});

export const workTable = piece({
  id: 'interior/work-table',
  family: 'interior',
  label: 'Work table',
  fidelity: 'finished',
  use: "workTable(p, { at: [x, z], face, variant: 'cutting' })",
  variants: {
    cutting: { w: 1.2, d: 0.6, h: 0.6, top: '#c8c4ba' },
    sewing: { w: 0.7, d: 0.36, h: 0.5, top: TIMBER.pale },
    pressing: { w: 0.9, d: 0.42, h: 0.6, top: '#c8c4ba' },
  },
  vary: { tone: 0.03, wear: [0, 0.25] },
  build(k, o) {
    const { w, d, h } = o,
      r = k.r;
    // the top, its legs and a shelf rail low down between them
    k.box(o.top, w, 0.035, d, 0, h - 0.035, 0, { round: 0.006, surf: 'laminate' });
    for (const su of [-1, 1])
      for (const sv of [-1, 1]) k.box(STEEL.mid, 0.035, h - 0.035, 0.035, su * (w / 2 - 0.04), 0, sv * (d / 2 - 0.04));
    if (o.variant === 'cutting') {
      k.box(TIMBER.mid, w - 0.08, 0.02, d - 0.08, 0, 0.12, 0, { surf: 'timber' }); // the shelf under it
      // rolls of cloth on the shelf
      for (let i = 0; i < 3; i++)
        k.geo(
          CLOTH[Math.floor(r() * CLOTH.length)],
          new THREE.CylinderGeometry(0.05, 0.05, w * 0.7, k.seg(10, 6))
            .rotateZ(Math.PI / 2)
            .translate((r() - 0.5) * 0.1, 0.19, -d / 2 + 0.12 + i * 0.12),
          { surf: 'fabric' },
        );
      // on top: a green cutting mat, cloth laid out on it, the paper pattern pinned over the cloth, shears, a rule
      const y = h;
      k.box(MAT, w - 0.14, 0.006, d - 0.1, 0, y, 0, { worn: false, cast: false });
      const cloth = CLOTH[Math.floor(r() * 3)];
      k.box(cloth, w * 0.62, 0.008, d * 0.66, -w * 0.08, y + 0.006, 0.02, { ry: 0.04, surf: 'fabric', cast: false });
      k.box(PAPER, w * 0.3, 0.004, d * 0.4, -w * 0.12, y + 0.014, 0.04, { ry: -0.12, worn: false, cast: false });
      if (!k.phone) {
        k.box('#3a3e44', 0.16, 0.012, 0.025, w * 0.3, y + 0.008, d * 0.12, { ry: 0.5, cast: false }); // the shears' blades
        k.box('#2d3138', 0.06, 0.016, 0.05, w * 0.3 + 0.08, y + 0.008, d * 0.12 - 0.05, { ry: 0.5, cast: false });
        k.box('#b9bdc2', w * 0.7, 0.006, 0.035, 0, y + 0.008, -d / 2 + 0.07, { worn: false, cast: false }); // the rule
        k.box('#e6e1d4', 0.05, 0.01, 0.05, w * 0.38, y + 0.006, -d * 0.2, { cast: false }); // tailor's chalk
        k.cyl('#a8584e', 0.035, 0.04, 0.03, -w * 0.4, y + 0.006, -d * 0.22, { n: 8 }); // the pincushion
      }
      return;
    }
    if (o.variant === 'pressing') {
      // a padded pressing top, the steam iron on its rest, the water bottle, garments folded at the end
      k.box('#d9d4c8', w - 0.06, 0.03, d - 0.06, 0, h, 0, { round: 0.01, surf: 'fabric' });
      k.box(STEEL.dark, 0.14, 0.012, 0.09, w / 2 - 0.16, h + 0.03, -0.06, { cast: false }); // the rest
      k.box('#e3e1da', 0.15, 0.05, 0.07, w / 2 - 0.16, h + 0.042, -0.06, { round: 0.02, surf: 'plastic' });
      k.box('#3e434d', 0.08, 0.03, 0.025, w / 2 - 0.17, h + 0.09, -0.06, { cast: false }); // its handle
      k.cyl('#b9d2dc', 0.025, 0.025, 0.1, -w / 2 + 0.08, h + 0.03, -d / 2 + 0.08, { n: 8 });
      for (let i = 0; i < 3; i++)
        k.box(CLOTH[Math.floor(r() * CLOTH.length)], 0.22, 0.025, 0.18, -w / 2 + 0.22, h + 0.03 + i * 0.026, 0.04, {
          ry: (r() - 0.5) * 0.1,
          surf: 'fabric',
        });
      return;
    }
    // sewing: the machine (its bed, pillar, arm and head, a handwheel), spools on a peg stand, a small lamp
    const y = h,
      mc = '#e3e1da';
    k.box(mc, 0.3, 0.05, 0.14, 0, y, 0, { round: 0.015, surf: 'plastic' });
    k.box(mc, 0.07, 0.15, 0.1, 0.1, y + 0.05, -0.01, { round: 0.015, surf: 'plastic' });
    k.box(mc, 0.28, 0.06, 0.1, 0.0, y + 0.18, -0.01, { round: 0.02, surf: 'plastic' });
    k.box(mc, 0.06, 0.12, 0.09, -0.12, y + 0.08, -0.01, { round: 0.015, surf: 'plastic' });
    k.geo(
      '#8d939b',
      new THREE.CylinderGeometry(0.04, 0.04, 0.02, k.seg(12, 8)).rotateZ(Math.PI / 2).translate(0.16, y + 0.17, -0.01),
    );
    k.box('#4d5f73', 0.2, 0.012, 0.102, 0.0, y + 0.215, -0.01, { worn: false, cast: false }); // its coloured band
    k.box(STEEL.pale, 0.01, 0.05, 0.01, -0.12, y + 0.04, 0.02, { cast: false }); // the needle bar
    k.box(CLOTH[1], 0.22, 0.006, 0.16, -0.16, y + 0.004, 0.05, { ry: 0.2, surf: 'fabric', cast: false }); // cloth under the foot
    if (!k.phone)
      for (let i = 0; i < 4; i++) {
        const u = w / 2 - 0.08 - (i % 2) * 0.05,
          v = -d / 2 + 0.07 + Math.floor(i / 2) * 0.05;
        k.cyl(CLOTH[(i * 3) % CLOTH.length], 0.015, 0.015, 0.04, u, y, v, { n: 6 });
      }
    // the lamp on its arm, clamped at the back
    k.bar(STEEL.dark, [-w / 2 + 0.08, y, -d / 2 + 0.05], [-w / 2 + 0.1, y + 0.3, -d / 2 + 0.07], 0.008, { n: 4 });
    k.bar(STEEL.dark, [-w / 2 + 0.1, y + 0.3, -d / 2 + 0.07], [-w / 2 + 0.22, y + 0.28, -0.02], 0.008, { n: 4 });
    k.cyl(STEEL.dark, 0.03, 0.05, 0.05, -w / 2 + 0.24, y + 0.24, -0.01, { n: 8 });
  },
  footprint: (o) => [[-o.w / 2, o.w / 2, -o.d / 2, o.d / 2]],
});

export const fabricShelf = piece({
  id: 'interior/fabric-shelf',
  family: 'interior',
  label: 'Fabric shelf',
  fidelity: 'finished',
  use: "fabricShelf(p, { at: [x, z], face, variant: 'bolts' })",
  variants: {
    bolts: { w: 0.8, h: 1.2, d: 0.26, levels: 4 },
    spools: { w: 0.8, h: 1.2, d: 0.2, levels: 5, spools: true },
    boxes: { w: 0.8, h: 1.2, d: 0.26, levels: 4, boxes: true },
  },
  vary: { tone: 0.03, wear: [0, 0.2] },
  build(k, o) {
    const { w, h, d, levels } = o,
      r = k.r;
    // the uprights and the shelves, the back toward the wall (-v)
    for (const s of [-1, 1]) k.box(STEEL.pale, 0.03, h, d, s * (w / 2 - 0.015), 0, 0, { surf: 'metal' });
    const gap = (h - 0.06) / levels;
    for (let i = 0; i <= levels; i++)
      k.box('#b7bcc2', w - 0.03, 0.02, d, 0, 0.04 + i * gap - (i === levels ? 0.02 : 0), 0, { surf: 'metal' });
    // the bolts: flat boards of cloth on their long edge, side by side, a few laid flat on top of each other
    for (let i = 0; i < levels; i++) {
      const y = 0.06 + i * gap;
      if (o.spools || o.boxes) {
        // rows of thread spools in every colour, or labelled boxes of notions
        if (o.spools)
          for (let u = -w / 2 + 0.06; u < w / 2 - 0.05; u += k.phone ? 0.08 : 0.045)
            k.cyl(CLOTH[Math.floor(r() * CLOTH.length)], 0.017, 0.017, 0.06, u, y, 0, { n: 6 });
        else
          for (const u of [-0.25, 0.02, 0.27])
            k.box('#b8ab92', 0.22, Math.min(gap - 0.06, 0.2), d - 0.05, u * w, y, 0, { round: 0.006, surf: 'card' });
        continue;
      }
      if (i % 2 === 0) {
        let u = -w / 2 + 0.06;
        while (u < w / 2 - 0.07) {
          const t = 0.04 + r() * 0.025;
          k.box(CLOTH[Math.floor(r() * CLOTH.length)], t, gap - 0.06, d - 0.04, u + t / 2, y, 0.005, {
            surf: 'fabric',
          });
          u += t + 0.008;
        }
      } else
        for (let j = 0; j < 4; j++)
          k.box(
            CLOTH[Math.floor(r() * CLOTH.length)],
            w * 0.42,
            0.035,
            d - 0.05,
            (j % 2 ? 0.2 : -0.2) * w,
            y + Math.floor(j / 2) * 0.037,
            0,
            {
              ry: (r() - 0.5) * 0.05,
              surf: 'fabric',
            },
          );
    }
    // boxes of notions on top, a label on each
    for (const [u, bw] of [
      [-0.2, 0.22],
      [0.12, 0.3],
    ]) {
      k.box('#b8ab92', bw, 0.12, d - 0.04, u * w, h, 0, { round: 0.006, surf: 'card' });
      if (!k.phone)
        k.box(PAPER, bw * 0.5, 0.04, 0.004, u * w, h + 0.04, (d - 0.04) / 2 + 0.002, { worn: false, cast: false });
    }
  },
  footprint: (o) => [[-o.w / 2, o.w / 2, -o.d / 2, o.d / 2]],
});
