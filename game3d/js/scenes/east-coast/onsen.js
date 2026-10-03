// The onsen (onsen_main, docs/game/island.md "Sports and baths"), seen from its court and shut on day 1: only its
// front is built, nothing behind the door. In the island frame (east-coast/plan.js):
//   the precinct wall: white plaster on a stone base under a tiled cap, round the court and the garden west of the
//   hall, the red gate in its south side on the door's axis
//   the red gate: two round vermilion posts on stones, a tie beam, a dark top beam and a small tiled gable; its two
//   leaves stand open, swung in against the wall; by its west post a tall board with the name, おんせん
//   the court: a stone walk from the gate to the porch, raked gravel either side, a big black pine and a set of rocks
//   to the west, a maple to the east, a stone lantern either side of the walk by the porch; a moss garden with
//   maples and a pine behind the west wall's corner
//   the hall: two storeys of white plaster between dark timber posts, a dark timber skirt, lattice windows over paper
//   screens (lit after work), a tiled pent roof along the front over the ground floor and a tiled gable roof over
//   all; the entrance porch on the axis under its own tiled roof, two paper lanterns on its posts, the name
//   board standing on its eave, the sliding lattice doors shut with a 準備中 CLOSED card on the glass (after work on
//   day 2, a boiler-repair notice instead)
//   the bath courtyards east of the hall toward the sea, behind bamboo fences: a rock-edged pool in each
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tiledRoof, slope } from '../dorm-court/roofs.js';
import { stoneLantern, STEEL } from '../outdoor/furniture.js';
import { gravel, bed, pine, maple, mound, LEAF } from '../outdoor/planting.js';
import { rock, rocks } from '../forecourt/gardens.js';
import { GRANITE } from '../outdoor/paving.js';
import * as P from './plan.js';

const C = {
  plaster: '#e4e0d7',
  timber: '#4f5763', // the sento's grey-blue stain
  dark: '#3a3f47',
  base: '#8b8d90',
  cap: '#565d67',
  red: '#b4442f',
  redDark: '#8e3526',
  bamboo: ['#9aa27c', '#8b9470'],
  glass: '#5d6a72',
  water: '#4f7c86',
};
const NAME = { kana: 'おんせん', en: 'ONSEN' }; // on the gate's board (the kana only) and the porch's
const [HX0, HX1, HZ0, HZ1] = P.HALL,
  GX = P.GX,
  WZ = P.WALL_Z;

// a run of the precinct wall from a to b (axis-aligned), less the gaps [from, to] along it
function wall(p, a, b, gaps = []) {
  const alongX = a[1] === b[1],
    [lo, hi] = alongX ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  let v = lo;
  for (const [g0, g1] of [...gaps, [hi, hi]].sort((q, r) => q[0] - r[0])) {
    const L = g0 - v,
      c = v + L / 2;
    if (L > 0.05) {
      const put = (color, w, h, y, d = w) =>
        alongX ? p.box(color, L, h, d, c, y, a[1]) : p.box(color, d, h, L, a[0], y, c);
      put(C.base, 0.36, 0.32, 0);
      put(C.plaster, 0.28, 1.28, 0.32);
      put(C.cap, 0.5, 0.08, 1.6);
      put(C.dark, 0.2, 0.1, 1.68);
    }
    v = g1;
  }
}

// a bamboo fence from a to b, h high: slats of two greens on a top rail
function fence(p, a, b, h = 2.0) {
  const alongX = a[1] === b[1],
    [lo, hi] = alongX ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  let i = 0;
  for (let v = lo; v < hi - 0.01; v += 0.24, i++) {
    const w = Math.min(0.24, hi - v),
      c = v + w / 2;
    if (alongX) p.box(C.bamboo[i % 2], w, h, 0.08, c, 0, a[1]);
    else p.box(C.bamboo[i % 2], 0.08, h, w, a[0], 0, c);
  }
  const L = hi - lo,
    m = (lo + hi) / 2;
  for (const y of [h * 0.35, h * 0.75, h])
    if (alongX) p.box(C.dark, L, 0.05, 0.12, m, y - 0.05, a[1]);
    else p.box(C.dark, 0.12, 0.05, L, a[0], y - 0.05, m);
}

function gate(p, signs) {
  const g = P.GATE.w / 2;
  for (const s of [-1, 1]) {
    const x = GX + s * g;
    p.box(C.base, 0.42, 0.14, 0.42, x, 0, WZ);
    p.geo(C.red, new THREE.CylinderGeometry(0.13, 0.14, 2.6, 10).translate(x, 1.4, WZ));
    // its leaf, swung in against the wall's inside
    p.box(C.redDark, 1.12, 2.0, 0.06, x - s * 0.06, 0.08, WZ - 0.12 - 0.56, { ry: Math.PI / 2 });
  }
  p.box(C.red, 2 * g + 0.5, 0.14, 0.12, GX, 1.95, WZ);
  p.box(C.dark, 2 * g + 0.9, 0.16, 0.24, GX, 2.55, WZ);
  tiledRoof(p, {
    x0: GX - g - 0.55,
    x1: GX + g + 0.55,
    zf: WZ + 0.7,
    zb: WZ - 0.7,
    eave: 2.72,
    ridge: 3.12,
    walls: [GX - g, GX + g],
    wallZ: [WZ - 0.1, WZ + 0.1],
    wallTop: 2.7,
    gableWall: C.red,
  });
  // the name, on a tall board standing by the gate's west post, the kana top to bottom
  signs.upright(NAME.kana, '#26354d', 0.42, 1.5, [GX - g - 0.75, 1.05, WZ + 0.3], 0);
  p.box(C.dark, 0.08, 0.3, 0.08, GX - g - 0.75, 0, WZ + 0.3);
}

function court(p, pv, lights) {
  // the stone walk, large dark slabs in a pale border, gate to porch
  const walk = [GX - 1, GX + 1, HZ1 + 0.15, WZ];
  pv.field([walk[0] + 0.15, walk[1] - 0.15, walk[2], walk[3]], {
    pattern: 'bondZ',
    module: [0.9, 0.45],
    tones: GRANITE.dark,
    origin: [walk[0], walk[2]],
  });
  for (const x of [walk[0], walk[1] - 0.15])
    pv.field([x, x + 0.15, walk[2], walk[3]], { pattern: 'grid', module: [0.15, 0.3], tones: GRANITE.edge, h: 0.007 });
  // raked gravel either side, a moss garden behind the west half
  gravel(p, [P.COURT[0] + 0.25, walk[0], HZ1, WZ - 0.25]);
  gravel(p, [walk[1], P.COURT[1] - 0.1, HZ1, WZ - 0.25]);
  bed(p, [P.COURT[0] + 0.25, HX0, P.PRECINCT[2] + 0.25, HZ1], { y: 0.04 });
  // the pine and the rocks to the west, the maple to the east, clipped azaleas along the gravel's edges
  pine(p, P.COURT[0] + 4.2, HZ1 + 3.0, 1.35, 151);
  rocks(p, GX - 6.2, WZ - 1.4, 0.45, 152);
  rock(p, P.COURT[0] + 2.0, WZ - 1.1, 0.3, 1);
  maple(p, P.COURT[1] - 2.0, WZ - 2.2, 0.95, 153);
  for (const [x, z, r, i] of [
    [GX - 1.6, WZ - 0.7, 0.3, 0],
    [GX - 2.2, WZ - 0.6, 0.24, 1],
    [GX + 1.6, WZ - 0.7, 0.3, 2],
    [GX + 2.3, WZ - 0.65, 0.22, 3],
    [P.COURT[0] + 1.0, HZ1 + 0.8, 0.32, 0],
    [P.COURT[0] + 6.5, HZ1 + 0.6, 0.28, 2],
  ])
    mound(p, x, z, r, [LEAF.deep, LEAF.mid, LEAF.fresh, LEAF.light][i], { squash: 0.7 });
  for (const s of [-1, 1]) stoneLantern(p, lights, GX + s * 2.4, HZ1 + 2.0);
  // the moss garden behind: maples and a pine
  maple(p, P.COURT[0] + 2.4, HZ1 - 3.2, 1.0, 154);
  pine(p, P.COURT[0] + 6.0, HZ1 - 6.5, 1.1, 155);
  maple(p, P.COURT[0] + 5.2, HZ1 - 1.6, 0.85, 156);
}

// the hall's front: posts, skirt, windows (lattice over paper), the pent roof, the porch and its door
function hall(p, shoji, signs, lights) {
  const cx = (HX0 + HX1) / 2,
    cz = (HZ0 + HZ1) / 2,
    W = HX1 - HX0,
    D = HZ1 - HZ0,
    H = 4.1,
    f = HZ1 + 0.03; // just out from the south face
  p.box(C.base, W + 0.2, 0.25, D + 0.2, cx, 0, cz);
  p.box(C.plaster, W, H - 0.25, D, cx, 0.25, cz);
  // the posts, the skirt, the floor beam
  const bays = 6,
    bw = W / bays;
  for (let i = 0; i <= bays; i++) p.box(C.timber, 0.16, H - 0.25, 0.1, HX0 + i * bw, 0.25, f);
  p.box(C.timber, W, 0.65, 0.06, cx, 0.25, f);
  p.box(C.timber, W + 0.1, 0.16, 0.12, cx, 2.2, f);
  // windows in the ground floor's bays and the upper storey's, but the door's bays below and the board's above
  const door = Math.floor(bays / 2); // the porch spans the two middle bays
  const win = (x0, x1, y0, y1) => {
    shoji.push(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.02).translate((x0 + x1) / 2, (y0 + y1) / 2, f + 0.01));
    p.box(C.dark, x1 - x0 + 0.1, 0.07, 0.06, (x0 + x1) / 2, y0 - 0.07, f + 0.03);
    p.box(C.dark, x1 - x0 + 0.1, 0.07, 0.06, (x0 + x1) / 2, y1, f + 0.03);
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.round((x1 - x0) / 0.12))
      p.box(C.dark, 0.035, y1 - y0, 0.04, x, y0, f + 0.04);
  };
  for (let i = 0; i < bays; i++) {
    const x0 = HX0 + i * bw + 0.3,
      x1 = HX0 + (i + 1) * bw - 0.3;
    if (i !== door - 1 && i !== door) win(x0, x1, 0.95, 1.85);
    if (i !== door - 1 && i !== door) win(x0, x1, 2.95, 3.65);
  }
  // the pent roof along the front over the ground floor, either side of the porch
  slope(p, HX0 - 0.25, P.PORCH[0] - 0.25, HZ1 + 0.95, 2.3, HZ1, 2.72);
  slope(p, P.PORCH[1] + 0.25, HX1 + 0.25, HZ1 + 0.95, 2.3, HZ1, 2.72);
  tiledRoof(p, {
    x0: HX0 - 0.55,
    x1: HX1 + 0.55,
    zf: HZ1 + 0.75,
    zb: HZ0 - 0.75,
    eave: H,
    ridge: H + 1.8,
    walls: [HX0, HX1],
    wallZ: [HZ0, HZ1],
    wallTop: H,
    gableWall: C.plaster,
  });
  // the porch: a stone step, two posts, its roof high and short (so the door shows under it from the court's
  // camera), lanterns on the posts, the name board standing on its eave
  const [px0, px1, , pz1] = P.PORCH;
  p.box(C.base, px1 - px0, 0.14, pz1 - HZ1, GX, 0, (HZ1 + pz1) / 2);
  for (const x of [px0 + 0.12, px1 - 0.12]) {
    p.box(C.timber, 0.16, 2.8, 0.16, x, 0.14, pz1 - 0.15);
    lights.glowParts.push(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 10).translate(x, 1.85, pz1 - 0.15));
    p.geo(C.dark, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8).translate(x, 2.05, pz1 - 0.15));
    lights.lit.push([x, pz1 + 0.2, 0.9]);
  }
  p.box(C.timber, px1 - px0, 0.14, 0.14, GX, 2.8, pz1 - 0.15);
  slope(p, px0 - 0.25, px1 + 0.25, pz1 + 0.2, 2.95, HZ1, 3.3);
  signs.board(NAME.kana, NAME.en, '#26354d', 2.2, 0.5, [GX, 3.22, pz1 + 0.12], 0);
  for (const s of [-0.7, 0.7]) p.box(C.dark, 0.05, 0.3, 0.05, GX + s, 2.92, pz1 + 0.08, { cast: false });
  // the doors: two sliding leaves of lattice over glass in a dark frame, shut
  for (const s of [-1, 1]) {
    const x = GX + s * 0.5;
    p.box(C.glass, 0.96, 1.9, 0.03, x, 0.14, f + 0.01);
    p.box(C.timber, 1.0, 0.08, 0.06, x, 0.14, f + 0.03);
    p.box(C.timber, 1.0, 0.08, 0.06, x, 1.96, f + 0.03);
    for (const e of [-0.48, 0.48]) p.box(C.timber, 0.06, 1.9, 0.06, x + e, 0.14, f + 0.03);
    for (let k = 1; k < 6; k++) p.box(C.timber, 0.025, 1.8, 0.04, x - 0.48 + k * 0.16, 0.18, f + 0.05);
  }
  p.box(C.dark, 2.2, 0.12, 0.08, GX, 2.06, f + 0.03); // the head over the doors
  p.box(STEEL.dark, 0.04, 0.18, 0.03, GX, 0.95, f + 0.07); // the pulls, meeting in the middle
  signs.card('準備中', 'CLOSED', 0.46, 0.3, [GX + 0.5, 1.2, f + 0.08], 0, { when: 'prep' });
  // day 2 after work: a notice in its place, shut for the boiler (story/day2/east_coast.js)
  signs.card('本日休業', 'CLOSED TODAY · BOILER REPAIR', 0.6, 0.42, [GX + 0.5, 1.2, f + 0.08], 0, {
    when: 'evening2',
    sub: 'ボイラー修理のため',
  });
}

// the bath courtyards: bamboo fences, stone flags, a pool edged with rocks in each, a low fence on the sea side
function yards(p) {
  const [a, b] = P.YARDS;
  fence(p, [a[0], a[2]], [a[1], a[2]]);
  fence(p, [b[0], b[2]], [b[1], b[2]]);
  fence(p, [b[0], b[3]], [b[1], b[3]]);
  fence(p, [a[1], a[2]], [a[1], b[3]], 1.0);
  fence(p, [a[0], a[2]], [a[0], HZ0], 2.0);
  for (const [i, [x0, x1, z0, z1]] of [a, b].entries()) {
    p.box(GRANITE.mid[i], x1 - x0, 0.03, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { cast: false });
    const px = (x0 + x1) / 2 + 1.2,
      pz = (z0 + z1) / 2,
      rx = (x1 - x0) / 2 - 2.2,
      rz = (z1 - z0) / 2 - 1.6;
    p.geo(
      C.water,
      new THREE.CircleGeometry(1, 20)
        .scale(rx, rz, 1)
        .rotateX(-Math.PI / 2)
        .translate(px, 0.06, pz),
      {
        cast: false,
      },
    );
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      rock(p, px + Math.cos(t) * (rx + 0.15), pz + Math.sin(t) * (rz + 0.15), 0.32 + (k % 3) * 0.08, k);
    }
  }
}

// builds it all: p (Parts, casts), pv (a paver), signs (a shop-signs.js signSet), lights (a lightSet), root (the
// group the paper screens go in); returns the evening switch
export function* onsenSteps(root, p, pv, signs, lights) {
  const [x0, x1, z0, z1] = P.PRECINCT;
  wall(p, [x0, z1], [P.COURT[1], z1], [[GX - P.GATE.w / 2 - 0.13, GX + P.GATE.w / 2 + 0.13]]);
  wall(p, [x0, z0], [x0, z1]);
  wall(p, [x0, z0], [x1, z0]);
  yield;
  gate(p, signs);
  court(p, pv, lights);
  yield;
  const shoji = [];
  hall(p, shoji, signs, lights);
  yards(p);
  const glow = new THREE.MeshStandardMaterial({
    color: '#ece6d6',
    emissive: new THREE.Color('#ffd9a6'),
    emissiveIntensity: 0.05,
    roughness: 0.9,
  });
  const screens = new THREE.Mesh(mergeGeometries(shoji), glow);
  shoji.forEach((g) => g.dispose());
  screens.name = 'onsen:screens';
  root.add(screens);
  yield;
  return {
    evening() {
      glow.emissiveIntensity = 0.75;
    },
  };
}
