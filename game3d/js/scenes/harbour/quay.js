// The harbour's water, quays and piers (harbour/plan.js), in the island frame:
//   the water: the harbour's own sea, lower than the island's (the quays stand a storey's half over it)
//   the quays: a concrete wall down to the water along the layout's quay line (island-harbour.js QUAY_LINE), a pale
//   coping along its top, black rubber fenders on its face, mooring bitts a step in from the edge, a steel ladder
//   down to the water now and then, and a yellow safety line painted along it
//   the piers: a concrete deck on rows of round piles with beams across them, fenders and bitts along both sides,
//   bitts across the head and a beacon on its corner
//   the ground: the yard in big concrete slabs with a green footway painted across it from the street to the
//   landing, the landing in pale granite, the piers' decks in concrete
import * as THREE from 'three';
import { along as box } from '../outdoor/coast.js';
import { STEEL } from '../outdoor/furniture.js';
import { GRANITE } from '../outdoor/paving.js';
import { kerb } from '../outdoor/edges.js';
import { SEA } from '../skyline.js';
import { QUAY_LINE } from '../island-harbour.js';
import * as P from './plan.js';

const C = {
  wall: '#7b7f84',
  coping: '#a7a8a5',
  fender: '#2b2e33',
  bitt: '#3a3e45',
  line: '#c6b252',
  pile: '#6f7377',
  foot: '#5f7f6c',
  footEdge: '#d9dbd6',
  foam: '#61788b',
};
export const CONCRETE = ['#8f8e8a', '#8a8985', '#94938e', '#878682'];
const NO_CAST = { cast: false };
const { SEA_Y } = P;

// a run of quay edge from a to b, the water on its right (as the coast kit's lines): the wall, the coping, the
// yellow line, the fenders, the bitts and a ladder; skip: [from, to] along it left open (a pier's root); foot: how
// far down the wall goes (a pier's edge is only a beam, its piles under it)
function edge(p, a, b, { skip = [], ladders = true, line = true, foot = SEA_Y - 0.6 } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
    n = [-d[1], d[0]],
    at = (u, o) => [a[0] + d[0] * u + n[0] * o, a[1] + d[1] * u + n[1] * o];
  const runs = [];
  let u = 0;
  for (const [s0, s1] of [...skip, [L, L]]) {
    if (s0 - u > 0.2) runs.push([u, s0]);
    u = s1;
  }
  for (const [u0, u1] of runs) {
    const m = (u0 + u1) / 2,
      len = u1 - u0;
    box(p, C.wall, at(m, -0.25), d, len + 0.5, 0.5, foot, -0.12, NO_CAST);
    // (its top 5 mm over the 0.04 of what meets it along the edge, so the two never lie level)
    box(p, C.coping, at(m, -0.38), d, len + 0.04, 0.84, -0.12, 0.045, NO_CAST);
    box(p, C.foam, at(m, 0.3), d, len, 0.36, SEA_Y + 0.002, SEA_Y + 0.008, NO_CAST);
    if (line) box(p, C.line, at(m, -1.05), d, Math.max(0.2, len - 0.8), 0.12, 0.004, 0.012, NO_CAST);
    for (let f = u0 + 1.2; f < u1 - 0.6; f += 4.4)
      box(p, C.fender, at(f, 0.1), d, 0.55, 0.2, SEA_Y + 0.05, -0.14, NO_CAST);
    for (
      let f = u0 + 0.8;
      f < u1 - 0.4;
      f += Math.max(4, (u1 - u0 - 1.6) / Math.max(1, Math.round((u1 - u0 - 1.6) / 6)))
    )
      bitt(p, ...at(f, -0.45));
    if (u1 - u0 > 0.8) bitt(p, ...at(u1 - 0.8, -0.45));
    if (ladders) for (let f = u0 + 3.1; f < u1 - 2; f += 19) ladder(p, at(f, 0.02), d);
  }
}
// a mooring bitt: a short dark post with a wider cap
function bitt(p, x, z) {
  p.geo(C.bitt, new THREE.CylinderGeometry(0.15, 0.18, 0.32, 8).translate(x, 0.2, z), NO_CAST);
  p.geo(C.bitt, new THREE.CylinderGeometry(0.22, 0.2, 0.07, 8).translate(x, 0.39, z), NO_CAST);
}
// a ladder down the quay's face to the water: two rails and rungs, its rails bent over the coping
function ladder(p, [x, z], d) {
  for (const s of [-0.22, 0.22]) {
    const [rx, rz] = [x + d[0] * s, z + d[1] * s];
    p.box(STEEL.mid, 0.05, -SEA_Y + 0.55, 0.05, rx, SEA_Y - 0.1, rz, NO_CAST);
  }
  for (let y = SEA_Y + 0.05; y < 0; y += 0.28) box(p, STEEL.mid, [x, z], d, 0.44, 0.04, y, y + 0.035, NO_CAST);
}

// a pier running south from its root on the quay (z0) to its head (z1): the deck on its piles and the beams across
// them, its edges (the water on both sides and round the head)
function pier(p, [x0, x1, z0, z1]) {
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    w = x1 - x0,
    len = z1 - z0;
  p.box(C.coping, w, 0.3, len, cx, -0.3, cz, NO_CAST);
  for (let z = z0 + 1.5; z < z1 - 0.5; z += 3) {
    p.box(C.pile, w - 0.3, 0.32, 0.5, cx, -0.62, z, NO_CAST);
    for (const x of [x0 + 0.5, cx, x1 - 0.5])
      p.geo(C.pile, new THREE.CylinderGeometry(0.2, 0.2, -SEA_Y, 8).translate(x, SEA_Y / 2 - 0.5, z), NO_CAST);
  }
  const o = { ladders: false, foot: -0.55 };
  edge(p, [x0, z0], [x0, z1], o);
  edge(p, [x1, z1], [x1, z0], o);
  edge(p, [x0, z1], [x1, z1], { ...o, line: false });
}

// the quay line, run by run, less the piers' roots; then the two piers
function* quays(p) {
  const F = P.FERRY_PIER,
    S = P.SUPPLY_PIER;
  for (let i = 0; i + 1 < QUAY_LINE.length; i++) {
    const [a, b] = [QUAY_LINE[i], QUAY_LINE[i + 1]];
    const skip = [];
    for (const r of [F, S]) {
      // a pier whose root lies on this run: it runs along x at z = its root
      if (a[1] === b[1] && (a[1] === r[2] || a[1] === r[3])) {
        const [u0, u1] = [Math.abs(r[0] - a[0]), Math.abs(r[1] - a[0])].sort((m, n) => m - n);
        if (u1 > 0 && u0 < Math.abs(b[0] - a[0])) skip.push([u0, u1]);
      }
    }
    edge(p, a, b, { skip });
    yield;
  }
  pier(p, F);
  pier(p, S);
  yield;
}

// the yard: its slabs, the painted footway across it, the kerbs along its north edge (less the office's face and the
// works lane) and its east edge north of the street (the works lay it too, seen from the works street's mouth,
// harbour/grounds.js worksViewSteps)
export function yardGround(pv, p) {
  const Y = P.YARD,
    O = P.OFFICE,
    W = P.WORKS_LANE;
  pv.field(Y, { pattern: 'grid', module: [2.4, 2.4], tones: CONCRETE, vary: 0.04, gap: 0.03, origin: [Y[0], Y[2]] });
  for (const [x0, x1, z0, z1] of P.FOOTWAY) {
    pv.field([x0, x1, z0, z1], {
      pattern: 'grid',
      module: [1.2, 1.2],
      tones: [C.foot],
      vary: 0.02,
      gap: 0.0,
      h: 0.011,
    });
    const alongX = x1 - x0 > z1 - z0;
    for (const o of [0.06, -0.06]) {
      const r = alongX
        ? [x0, x1, o > 0 ? z0 : z1 - 0.12, o > 0 ? z0 + 0.12 : z1]
        : [o > 0 ? x0 : x1 - 0.12, o > 0 ? x0 + 0.12 : x1, z0, z1];
      pv.field(r, { pattern: 'grid', module: [1.2, 1.2], tones: [C.footEdge], vary: 0, gap: 0, h: 0.013 });
    }
  }
  kerb(p, [Y[0], Y[2]], [Y[1], Y[2]], {
    off: 0.08,
    gaps: [
      [O[0], O[1]],
      [W[0], W[1]],
    ],
  });
  kerb(p, [Y[1], Y[2]], [Y[1], P.STREET[2]], { off: -0.08 });
}

// the ground: the yard, the landing, the piers' decks; kerbs where the landing meets the land. The works lane, its
// mouth and on north, is the works' own paving (works/grounds.js laneViewSteps, scenes/harbour.js)
function* ground(pv, p) {
  const Y = P.YARD,
    Ld = P.LANDING,
    T = P.TERMINAL;
  yardGround(pv, p);
  yield;
  pv.field(Ld, { pattern: 'grid', module: [0.9, 0.9], tones: GRANITE.pale, origin: [Ld[0], Ld[2]] });
  for (const r of [P.FERRY_PIER, P.SUPPLY_PIER])
    pv.field(r, { pattern: 'grid', module: [1.5, 2.0], tones: CONCRETE, vary: 0.04, gap: 0.03, origin: [r[0], r[2]] });
  yield;
  // the landing's north edge either side of the terminal and its east end north of the yard
  kerb(p, [Ld[0], Ld[2]], [Ld[1], Ld[2]], { off: 0.08, gaps: [[T[0], T[1]]] });
  kerb(p, [Ld[1], Ld[2]], [Ld[1], Y[2]], { off: -0.08 });
}

// pv: a paver; p: a Parts collector (or cells'); the water goes in `water`, a Parts of its own
export function* quaySteps(pv, p, water) {
  // the harbour's water, round the chunk
  const [cx, cz] = [-80, -60],
    R = 150;
  water.geo(SEA, new THREE.PlaneGeometry(2 * R, 2 * R).rotateX(-Math.PI / 2).translate(cx, SEA_Y, cz), NO_CAST);
  yield* quays(p);
  yield* ground(pv, p);
}
