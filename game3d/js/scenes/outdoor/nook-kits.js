// The nook kits for places to stop (outdoor/nooks.js lays them out and says what each holds): drinks machines, a
// roadside shrine, a bench bay, a lookout. Each lays its props in the nook's frame through T (outdoor/nooks.js
// tools): u across, v ahead of Eric as he looks in.
import * as THREE from 'three';
import { bench as seat, bins, STEEL } from './furniture.js';
import { gravel, mound, cluster, LEAF } from './planting.js';
import { rng } from './parts.js';
import { JP_FONT } from '../../props.js';

export const STONE = '#9a9a94',
  WOOD = '#8a6a4e',
  RED = '#b8453d';

// drinks machines: n side by side, their fronts at v = back, facing Eric; the sorted bins at one end
const MACHINES = [
  ['#e1e4e6', RED],
  ['#e3e6e8', '#3f6f9e'],
  ['#2f6b55', '#e8e2c8'],
];
export function vending(T, { back = 1.0, n = 2, binSide = 1, seed = 1 }) {
  const W = 0.9,
    H = 1.83,
    D = 0.72,
    span = n * (W + 0.04);
  for (let i = 0; i < n; i++) {
    const u = -span / 2 + (W + 0.04) * (i + 0.5),
      [body, accent] = MACHINES[(i + seed) % MACHINES.length];
    T.box(body, W, H, D, u, 0, back + D / 2);
    T.box('#3a3f47', W + 0.02, 0.08, D + 0.02, u, 0, back + D / 2, { cast: false }); // the plinth
    T.box(accent, W + 0.02, 0.1, D + 0.02, u, H - 0.1, back + D / 2); // the top band
    T.face(drinksFace(accent, i + seed), W - 0.08, H - 0.2, u, 0.06 + (H - 0.2) / 2, back);
  }
  const bu = binSide * (span / 2 + 0.3);
  const [bx, bz] = T.P(bu, back + 0.2);
  bins(T.p, bx, bz, T.a + Math.PI);
  T.block([-span / 2 - 0.05, span / 2 + 0.05, back - 0.05, back + D + 0.05]);
  T.block([bu - 0.42, bu + 0.42, back + 0.02, back + 0.4]);
}
// a drinks machine's front: a lit header, three shelves of bottles and cans with their price buttons, the coin panel
// and the slot below
function drinksFace(accent, seed) {
  return (ctx, w, h) => {
    const r = rng(seed * 13 + 5);
    ctx.fillStyle = '#eef0f1';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, h * 0.09);
    ctx.fillStyle = '#ffffff';
    const [ja, en] = seed % 2 ? ['つめたい', 'Cold'] : ['のみもの', 'Drinks'];
    ctx.font = `700 ${Math.round(h * 0.04)}px ${JP_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ja, w * 0.36, h * 0.047);
    ctx.font = `600 ${Math.round(h * 0.03)}px sans-serif`;
    ctx.fillText(en, w * 0.78, h * 0.049);
    const cols = 5,
      cw = (w * 0.9) / cols,
      tones = ['#c44a3c', '#3f7fb0', '#e0b33b', '#4f8a4a', '#f2f2ee', '#7b4a32', '#e57f3a', '#2f3a5a'];
    for (let row = 0; row < 3; row++) {
      const y0 = h * (0.12 + row * 0.17);
      ctx.fillStyle = '#d7dbdf';
      ctx.fillRect(w * 0.04, y0, w * 0.92, h * 0.15);
      for (let c = 0; c < cols; c++) {
        const x = w * 0.05 + cw * c + cw * 0.18,
          bw = cw * 0.64,
          tall = r() < 0.5;
        ctx.fillStyle = tones[Math.floor(r() * tones.length)];
        const bh = h * (tall ? 0.11 : 0.08);
        ctx.fillRect(x, y0 + h * 0.12 - bh, bw, bh);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x + bw * 0.15, y0 + h * 0.12 - bh * 0.7, bw * 0.18, bh * 0.5);
        ctx.fillStyle = r() < 0.2 ? '#d9473c' : '#3a8f5a'; // the button: red sold out, green lit
        ctx.fillRect(x, y0 + h * 0.128, bw, h * 0.014);
      }
    }
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(w * 0.62, h * 0.66, w * 0.3, h * 0.13); // coins and notes
    ctx.fillStyle = '#9aa0a8';
    ctx.fillRect(w * 0.68, h * 0.69, w * 0.06, h * 0.04);
    ctx.fillRect(w * 0.78, h * 0.69, w * 0.1, h * 0.02);
    ctx.fillStyle = accent;
    ctx.fillRect(w * 0.08, h * 0.67, w * 0.46, h * 0.1);
    ctx.fillStyle = '#23272d';
    ctx.fillRect(w * 0.1, h * 0.84, w * 0.8, h * 0.11); // the slot
  };
}

// a roadside shrine: raked gravel, a small red torii at v 0.75, two stone lanterns, an offering box and the hokora on
// its plinth at v 1.7, shrubs behind (and a pine, `tree`)
export function shrine(T, { tree = 'pine', seed = 3, clusters = true }) {
  gravel(T.p, T.R([-1.15, 1.15, 0.35, 2.3]), { y: 0.02 });
  // the torii
  for (const u of [-0.5, 0.5]) {
    T.cyl('#2b2d31', 0.075, 0.075, 0.12, u, 0, 0.75, 8);
    T.cyl(RED, 0.05, 0.055, 1.42, u, 0.1, 0.75, 8);
    T.block([u - 0.1, u + 0.1, 0.65, 0.85]);
  }
  T.box('#2b2d31', 1.48, 0.07, 0.13, 0, 1.5, 0.75); // kasagi
  T.box(RED, 1.32, 0.07, 0.1, 0, 1.43, 0.75); // shimaki
  T.box(RED, 1.12, 0.05, 0.06, 0, 1.2, 0.75); // nuki
  T.box(RED, 0.06, 0.2, 0.06, 0, 1.23, 0.75); // gakuzuka
  T.geo('#d8c79a', new THREE.CylinderGeometry(0.025, 0.025, 0.95, 6).rotateZ(Math.PI / 2).translate(0, 1.05, 0.75));
  for (const u of [-0.22, 0.22]) T.box('#f4f3ee', 0.05, 0.14, 0.01, u, 0.9, 0.75, { cast: false }); // shide
  // the lanterns, the offering box, the plinth and the hokora
  T.lantern(-0.85, 1.4);
  T.lantern(0.85, 1.4);
  T.box('#6b5240', 0.36, 0.24, 0.24, 0, 0, 1.18);
  T.box('#3a3f47', 0.3, 0.02, 0.18, 0, 0.24, 1.18, { cast: false });
  T.box(STONE, 0.95, 0.38, 0.78, 0, 0, 1.75);
  T.box('#a9a9a2', 1.0, 0.05, 0.82, 0, 0.38, 1.75);
  T.box(WOOD, 0.56, 0.5, 0.46, 0, 0.43, 1.78);
  T.box('#5a4636', 0.42, 0.36, 0.02, 0, 0.48, 1.54); // the doors
  T.box('#c9a54a', 0.04, 0.06, 0.025, 0, 0.64, 1.53, { cast: false });
  for (const s of [-1, 1])
    T.geo('#55705f', new THREE.BoxGeometry(0.44, 0.045, 0.72).rotateZ(s * 0.55).translate(s * 0.18, 1.05, 1.76)); // the roof
  T.box('#3d4a43', 0.07, 0.07, 0.76, 0, 1.13, 1.76);
  for (const u of [-0.32, 0.32]) {
    T.cyl('#8d939b', 0.06, 0.05, 0.16, u, 0.43, 1.5, 6);
    mound(T.p, ...T.P(u, 1.5), 0.08, LEAF.fresh, { y: 0.58 });
  }
  T.block([-1.1, 1.1, 1.08, 2.2]);
  if (clusters) {
    cluster(T.p, ...T.P(-0.9, 2.45), { n: 4, r: 0.38, seed });
    cluster(T.p, ...T.P(0.9, 2.45), { n: 4, r: 0.36, seed: seed + 1 });
  }
  if (tree) T.tree(tree, 0, 2.7, 0.95, seed);
}

// a bench bay: the bench at v 1.0 looking back at Eric (out: at v 0.8 looking on, the way he looks: over a court,
// at the water), a clipped hedge behind it (back: false where something stands there already) and down its sides
// ('both', 'left', 'right' or 'none'), a tree over it at treeAt, a stone lantern at one end
export function bench(
  T,
  {
    tree = 'maple',
    treeAt = [0.9, 2.35],
    seed = 2,
    sides = 'both',
    back = true,
    out = false,
    lantern = true,
    len = 1.6,
  },
) {
  const bv = out ? 0.8 : 1.0;
  const [x, z] = T.P(0, bv);
  seat(T.p, x, z, out ? T.a : T.a + Math.PI, { len });
  T.block([-len / 2 - 0.05, len / 2 + 0.05, bv - 0.3, bv + 0.32]);
  if (back) {
    T.hedge(-1.6, 1.75, 1.6, 1.75, { seed });
    T.block([-1.6, 1.6, 1.5, 2.0]);
  }
  const us = { both: [-1.6, 1.6], left: [-1.6], right: [1.6] }[sides] || [];
  for (const u of us) {
    T.hedge(u, 0.15, u, 1.5, { seed: seed + (u > 0) });
    T.block([u - 0.25, u + 0.25, 0.15, 1.5]);
  }
  if (lantern) {
    T.lantern(-1.15, 1.2);
    T.block([-1.4, -0.9, 0.95, 1.45]);
  }
  if (tree) T.tree(tree, ...treeAt, 0.95, seed);
}

// a lookout at an edge: posts and two rails along v = edge, a coin telescope on its post, a bench beside it looking
// out, a small card naming the view
export function lookout(
  T,
  { edge = 1.2, span = 1.6, seed = 4, name = ['みはらし', 'Lookout'], seat: withSeat = true },
) {
  for (let u = -span; u <= span + 1e-6; u += span / 2) T.box(STEEL.mid, 0.05, 0.95, 0.05, u, 0, edge);
  for (const y of [0.92, 0.55])
    T.geo(STEEL.mid, new THREE.CylinderGeometry(0.025, 0.025, 2 * span, 6).rotateZ(Math.PI / 2).translate(0, y, edge));
  T.block([-span - 0.1, span + 0.1, edge - 0.1, edge + 0.1]);
  // the telescope: its post, the coin box, the body on a yoke tilted a little up, the eyepiece toward Eric
  const u = 0.55,
    v = edge - 0.4;
  T.cyl(STEEL.dark, 0.05, 0.07, 1.05, u, 0, v, 8);
  T.box('#3f6f9e', 0.2, 0.22, 0.16, u, 0.92, v);
  T.geo(
    '#3f6f9e',
    new THREE.CylinderGeometry(0.075, 0.095, 0.5, 10).rotateX(Math.PI / 2 - 0.12).translate(u, 1.24, v + 0.08),
  );
  T.geo('#23272d', new THREE.CylinderGeometry(0.045, 0.045, 0.1, 8).rotateX(Math.PI / 2).translate(u, 1.21, v - 0.2));
  T.box('#c9a54a', 0.06, 0.03, 0.01, u, 1.0, v - 0.085, { cast: false });
  T.block([u - 0.2, u + 0.2, v - 0.2, v + 0.2]);
  if (withSeat) {
    const [bx, bz] = T.P(-0.8, edge - 0.55);
    seat(T.p, bx, bz, T.a, { len: 1.3, back: true });
    T.block([-1.5, -0.1, edge - 0.85, edge - 0.25]);
  }
  T.card(name[0], name[1], 0.36, 0.18, -0.2, 0.75, edge - 0.03);
  void seed;
}
