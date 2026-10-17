// The dorm quarter's smaller buildings (the plan is dorm-quarter/plan.js), for dorm-quarter/blocks.js:
//   the villas: pale render, two storeys and a set-back roof pavilion; south a wall of glass behind deep terraces
//   with glass rails, timber louvres over the upper floor; north their door under a canopy with a timber screen
//   the common room: a one-storey pavilion, glazed on the promenade under a deep timber-lined canopy, its glazed door
//   in the middle
//   the tool shed in the allotments
// box(colour) and pane(lit) are the fronts' own collectors (blocks.js), lights the place's light set.
import * as THREE from 'three';
import { STEEL } from '../outdoor/furniture.js';
import { faces, faceAt, tOf } from '../outdoor/block-face.js';
import { groundFloor } from '../plaza/east-fronts.js';
import { apartmentDeck, flatRoof } from '../dorm-court/roofs.js';
import { hash2 } from '../outdoor/parts.js';
import { mound, LEAF } from '../outdoor/planting.js';
import { boards } from '../outdoor/park-kit.js';
import * as Q from './plan.js';

const PLINTH = '#6c7178',
  FRAME = '#4f565f',
  SILL = '#a7adb3',
  SLAB = '#9a9ea3',
  DECK = '#8d7b67',
  RENDER = '#dcd7cc',
  RENDER_DARK = '#c9c3b6',
  TIMBER = '#8f7a62',
  RAIL_GLASS = '#a9c0c9';

// a box on a face: u along it (centre), y up (bottom), o out from it (centre); w along, h up, t out
function onFace(add, F, u, y, o, w, h, t) {
  const [x, z] = faceAt(F, u, o);
  add(F.d[0] ? w : t, h, F.d[0] ? t : w, x, y, z);
}

// a senior villa: two storeys in pale render and a roof pavilion set back toward the north, a roof terrace before it
export function villa(p, k, { box, pane, lights }) {
  const [x0, x1, z0, z1] = k.rect,
    w = x1 - x0,
    d = z1 - z0,
    cx = (x0 + x1) / 2,
    fh = 2.0,
    H = 2 * fh;
  p.box(k.wall === 0 ? RENDER : '#e2dccf', w, H, d, cx, 0, (z0 + z1) / 2, { surf: 'plaster' });
  p.box(PLINTH, w + 0.06, 0.25, d + 0.06, cx, 0, (z0 + z1) / 2, { cast: false, surf: 'concrete' });
  p.box(RENDER_DARK, w + 0.1, 0.1, d + 0.1, cx, fh - 0.05, (z0 + z1) / 2, { cast: false });
  const F = faces(k.rect);
  // south: a wall of glass on both floors behind deep terraces with glass rails; timber louvres over the upper one
  const S = F.s,
    bays = 4,
    bw = w / bays;
  for (let s = 0; s < 2; s++) {
    const y = s * fh;
    for (let b = 0; b < bays; b++) {
      onFace(pane(hash2(b, s, x0) < 0.4), S, bw * (b + 0.5), y + 0.08, 0.02, bw - 0.18, 1.7, 0.05);
      onFace(box(FRAME, false), S, bw * b, y + 0.08, 0.05, 0.07, 1.7, 0.08);
    }
    onFace(box(FRAME, false), S, w, y + 0.08, 0.05, 0.07, 1.7, 0.08);
    onFace(box(FRAME, false), S, w / 2, y + 1.78, 0.05, w, 0.07, 0.08);
  }
  // the upper terrace: a slab out 1.4, a glass rail on posts; the ground floor's terrace in timber
  onFace(box(SLAB), S, w / 2, fh - 0.12, 0.7, w + 0.3, 0.14, 1.4);
  onFace(box(RAIL_GLASS, false), S, w / 2, fh + 0.02, 1.36, w + 0.2, 0.62, 0.03);
  onFace(box(STEEL.mid), S, w / 2, fh + 0.64, 1.36, w + 0.24, 0.035, 0.06);
  boards(p, [x0 + 0.2, x1, z1, z1 + 1.35], { y: 0.05, along: 'x', w: 0.28 });
  for (let i = 0; i < 14; i++)
    onFace(box(TIMBER, false), S, 0.4 + i * ((w - 0.8) / 13), fh + 1.15, 0.12, 0.06, 0.75, 0.1);
  // the roof: a coped parapet, the pavilion set back to the north with its own flat roof, a terrace before it
  const Hr = H + 0.14;
  apartmentDeck(p, k.rect, Hr, { wall: RENDER_DARK, seams: false });
  const pv = [x0 + 1.0, x1 - 2.4, z0 + 0.5, z0 + 3.4];
  p.box(RENDER, pv[1] - pv[0], 1.7, pv[3] - pv[2], (pv[0] + pv[1]) / 2, Hr, (pv[2] + pv[3]) / 2, { surf: 'plaster' });
  flatRoof(p, [pv[0] - 0.25, pv[1] + 0.25, pv[2] - 0.25, pv[3] + 0.6], Hr + 1.84, { edges: 'nsew', wall: RENDER_DARK });
  onFace(
    pane(hash2(x0, 1, 2) < 0.5),
    faces(pv).s,
    (pv[1] - pv[0]) / 2,
    Hr + 0.1,
    0.02,
    pv[1] - pv[0] - 0.6,
    1.45,
    0.05,
  );
  boards(p, [pv[0] + 0.2, pv[1] + 1.8, pv[3], z1 - 0.3], {
    y: Hr + 0.06,
    along: 'x',
    w: 0.3,
    tones: [DECK, '#86735f'],
  });
  // two chairs and a low table on the roof terrace, a pot either side of the pavilion's glass
  const tx = (pv[0] + pv[1]) / 2,
    tz = pv[3] + 1.3;
  p.box('#c9cdd0', 0.6, 0.04, 0.4, tx, Hr + 0.3, tz);
  for (const s of [-1, 1]) p.box('#6f5c49', 0.4, 0.35, 0.4, tx + s * 0.6, Hr, tz);
  for (const x of [pv[0] + 0.2, pv[1] - 0.2]) {
    p.geo('#7d8288', new THREE.CylinderGeometry(0.2, 0.16, 0.4, 8).translate(x, Hr + 0.2, pv[3] + 0.35));
    mound(p, x, pv[3] + 0.35, 0.24, LEAF.mid, { y: Hr + 0.4 });
  }
  // north: the door under a canopy, a timber screen beside it, small windows; the house front kit's door
  const N = F.n;
  groundFloor(p, N, { ...k, ground: 'house' }, fh, { box, pane, lights });
  const at = tOf(N, k.at);
  onFace(box(TIMBER, false), N, at + 1.15, 0, 0.12, 0.9, 1.9, 0.06);
  for (let i = 0; i < 6; i++) onFace(box('#6f5c49', false), N, at + 0.75 + i * 0.16, 0, 0.16, 0.05, 1.9, 0.03);
  for (const s of [0, 1])
    for (const u of [0.9, w - 0.9]) {
      if (s === 0 && Math.abs(u - at) < 1.6) continue;
      onFace(pane(hash2(u, s, x0) < 0.35), N, u, s * fh + 0.85, 0.02, 0.7, 0.85, 0.05);
      onFace(box(SILL, false), N, u, s * fh + 0.78, 0.06, 0.82, 0.06, 0.1);
    }
  // the ends: one tall window a floor
  for (const side of ['e', 'w'])
    for (const s of [0, 1]) {
      const f = F[side];
      onFace(pane(hash2(s, side.charCodeAt(0), x0) < 0.3), f, f.L * 0.62, s * fh + 0.3, 0.02, 0.8, 1.45, 0.05);
      onFace(box(SILL, false), f, f.L * 0.62, s * fh + 0.24, 0.06, 0.92, 0.06, 0.1);
    }
}

// the common room: one storey glazed on the promenade under a deep canopy lined in timber, its glazed door on the
// door axis; solid walls with high windows on the other sides; a flat roof with a little plant
export function commons(p, { box, pane, lights }) {
  const [x0, x1, z0, z1] = Q.COMMONS,
    w = x1 - x0,
    d = z1 - z0,
    cx = (x0 + x1) / 2,
    H = 2.4;
  p.box('#d3cfc6', w, H, d, cx, 0, (z0 + z1) / 2, { surf: 'plaster' });
  p.box(PLINTH, w + 0.06, 0.2, d + 0.06, cx, 0, (z0 + z1) / 2, { cast: false, surf: 'concrete' });
  const F = faces(Q.COMMONS),
    S = F.s;
  const at = tOf(S, Q.COMMONS_DOOR[0]);
  const bays = 5,
    bw = w / bays;
  for (let b = 0; b < bays; b++) {
    const u = bw * (b + 0.5);
    if (Math.abs(u - at) < bw / 2) continue;
    onFace(pane(true), S, u, 0.25, 0.02, bw - 0.2, 1.75, 0.05);
    onFace(box(FRAME, false), S, bw * b, 0.2, 0.05, 0.08, 1.85, 0.08);
  }
  onFace(box(FRAME, false), S, w, 0.2, 0.05, 0.08, 1.85, 0.08);
  // the glazed door pair, framed
  onFace(pane(true), S, at, 0.02, 0.02, 1.3, 1.95, 0.05);
  onFace(box(FRAME, false), S, at, 0.02, 0.05, 0.05, 1.95, 0.06);
  for (const s of [-1, 1]) onFace(box(FRAME, false), S, at + s * 0.68, 0.02, 0.05, 0.08, 2.0, 0.08);
  onFace(box(FRAME, false), S, at, 1.97, 0.05, 1.46, 0.08, 0.08);
  // the canopy: a deep slab lined in timber, on slim steel posts at its edge
  const out = 1.4;
  onFace(box('#9da1a6'), S, w / 2, H - 0.05, out / 2, w + 0.6, 0.18, out);
  onFace(box(TIMBER, false), S, w / 2, H - 0.08, out / 2, w + 0.5, 0.03, out - 0.1);
  for (const u of [0.3, at - 1.0, at + 1.0, w - 0.3])
    onFace(box(STEEL.dark), S, u, 0, out - 0.12, 0.07, H - 0.05, 0.07);
  // down lights under the canopy, their pools on the paving
  for (const u of [w * 0.2, at, w * 0.8]) {
    const g = [];
    onFace(
      (ww, h, t, x, y, z) => g.push(new THREE.BoxGeometry(ww, h, t).translate(x, y + h / 2, z)),
      S,
      u,
      H - 0.11,
      out / 2,
      0.22,
      0.03,
      0.22,
    );
    lights.glowParts.push(...g);
    const [lx, lz] = faceAt(S, u, out / 2);
    lights.lit.push([lx, lz, 1.0]);
  }
  // a name board by the door
  onFace(box('#e4e6e3', false), S, at + 1.35, 1.2, 0.04, 0.55, 0.32, 0.03);
  // high windows on the ends and the back
  for (const side of ['e', 'w', 'n']) {
    const f = F[side],
      m = Math.max(1, Math.floor(f.L / 1.6));
    for (let i = 0; i < m; i++) {
      const u = (f.L / m) * (i + 0.5);
      onFace(pane(true), f, u, 1.35, 0.02, 0.9, 0.55, 0.05);
      onFace(box(SILL, false), f, u, 1.29, 0.06, 1.0, 0.06, 0.1);
    }
  }
  flatRoof(p, [x0 - 0.1, x1 + 0.1, z0 - 0.1, z1 + 0.1], H + 0.14, {
    edges: 'nsew',
    units: [[x0 + 1.4, z0 + 0.8]],
    vents: [[x1 - 1.0, z0 + 1.2]],
  });
}

// the tool shed: timber boards under a pent roof, a door with a padlock, a water butt at its corner
export function shed(p) {
  const [x0, x1, z0, z1] = Q.SHED,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    w = x1 - x0,
    d = z1 - z0;
  p.box('#7b6a57', w, 1.6, d, cx, 0, cz, { surf: 'wood' });
  for (let x = x0 + 0.15; x < x1; x += 0.3) p.box('#6c5c4b', 0.03, 1.6, 0.02, x, 0, z1 + 0.005, { cast: false });
  p.geo('#5f646b', new THREE.BoxGeometry(w + 0.4, 0.06, d + 0.4).rotateX(-0.12).translate(cx, 1.72, cz), {});
  p.box('#5a4a3b', 0.8, 1.35, 0.04, cx, 0, z1 + 0.02);
  p.box(STEEL.dark, 0.06, 0.1, 0.03, cx + 0.3, 0.8, z1 + 0.05, { cast: false });
}
