// Nooks for the outdoor kit (scenes/outdoor/): small places off the main walks worth walking to, where later story
// can put a secret, an encounter or a collectible (GUIDE, Visual design: every area gets nooks; their ids and what
// each could hold: docs/game/places.md, "Nooks" under each place). A nook is a named spot with a few props round
// it, built by one of the kits below into the place's own collectors, so a nook costs no draw calls of its own.
//
// A place's plan lists its nooks in its own frame, each
//   { id, kit, at: [x, z], face, walks: [[x0, x1, z0, z1], ...], ...options }
// at: where Eric stands in it (the named spot); face: the way he looks into it, radians as the kit's benches have it
// (0 = +z, south; Math.PI / 2 = +x, east), a quarter turn only; walks: the ground it adds to the place's walkable
// rects (none when it sits on ground already walked); pads: the paving laid for it, where it leaves the place's own
// ([x0, x1, z0, z1] each, kept off the place's paving, which it would fight); gravel: the same in raked gravel;
// bollards: [u, v] each, stone bollards (across a way that isn't walked on); lamp: [u, v], a post lamp; keep: rects
// ([x0, x1, z0, z1], the place's frame) Eric keeps off, for what stands there already (a bay's own bench). The kits
// lay their props in the nook's frame: u across (to Eric's right as he looks in), v ahead of him, from `at`.
//
//   nookWalks(list)                       every nook's walks, for the plan's WALKS (outdoor/nook-walks.js)
//   buildNooks(list, root, { p, lights, signs })   the props into Parts p, lantern glow into the lightSet, faces
//                                          and cards into the signSet, each the place's own when given (in the
//                                          place's frame) or the nooks' own, built into root; returns { blocks: rects
//                                          to keep Eric off, spots: { id: [x, z] }, evening() }
// Kits (outdoor/nook-kits.js, outdoor/nook-yards.js):
//   vending   drinks machines side by side against the back, the sorted bins beside them
//   shrine    a roadside hokora on a stone plinth behind a small red torii, two stone lanterns, an offering box,
//             on raked gravel
//   bench     a bench behind a clipped hedge on three sides, a tree over it, a stone lantern
//   lookout   a low rail at the edge, a coin telescope, a bench beside it
//   yard      a building's back: beer crates, the air-conditioner units, buckets, pots, a hose reel, a bike
//   alley     a back alley's clutter in a line along one wall (v = back): an air conditioner, crates of empties,
//             buckets, a pot, a bike parked along the wall, leaving the rest of the alley clear
//   gate      by a staff gate: a bike against one side, pots and an umbrella stand on the other
//   bins      the sorted bins (bins: false for none) and a potted plant, for a bench bay that has its bench
//   smokers   a smoking corner: frosted screens, a standing ashtray, a bench, its sign
//   pier      a jetty's end: mooring bollards, a life ring on its post, a coil of rope, a bucket, a stool, a crate
import * as THREE from 'three';
import { bollard, stoneLantern, lamps, lightSet } from './furniture.js';
import { TREES, hedge, gravel } from './planting.js';
import { Parts } from './parts.js';
import { signSet } from '../shop-signs.js';
import { vending, shrine, bench, lookout } from './nook-kits.js';
import { yard, alley, gate, binsKit, smokers, pier } from './nook-yards.js';

const KITS = { vending, shrine, bench, lookout, yard, alley, gate, bins: binsKit, smokers, pier };

// the nook's frame: (u, v) to the place's (x, z)
function frame(at, a) {
  const c = Math.cos(a),
    s = Math.sin(a);
  const P = (u, v) => [at[0] + u * c + v * s, at[1] - u * s + v * c];
  // a rect [u0, u1, v0, v1] as the place's [x0, x1, z0, z1]
  const R = ([u0, u1, v0, v1]) => {
    const q = [P(u0, v0), P(u1, v0), P(u0, v1), P(u1, v1)];
    const xs = q.map((t) => t[0]),
      zs = q.map((t) => t[1]);
    return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  };
  return { P, R, a };
}

// a kit's tools in one nook's frame
function tools(n, { p, lights, signs }) {
  const F = frame(n.at, n.face),
    blocks = [];
  const T = {
    ...F,
    p,
    // a box w (across) x h x d (ahead), its foot at (u, y, v)
    box: (color, w, h, d, u, y, v, o = {}) => {
      const [x, z] = F.P(u, v);
      p.box(color, w, h, d, x, y, z, { ...o, ry: F.a + (o.turn || 0) });
    },
    // any geometry made in the nook's frame (x = u, z = v)
    geo: (color, g, o) => p.geo(color, g.rotateY(F.a).translate(n.at[0], 0, n.at[1]), o),
    cyl: (color, r0, r1, h, u, y, v, seg = 8, o) =>
      T.geo(color, new THREE.CylinderGeometry(r0, r1, h, seg).translate(u, y + h / 2, v), o),
    block: (r) => blocks.push(F.R(r)),
    hedge: (u0, v0, u1, v1, o) => hedge(p, F.P(u0, v0), F.P(u1, v1), o),
    tree: (kind, u, v, s, seed) => TREES[kind](p, ...F.P(u, v), s, seed),
    lantern: (u, v) => {
      stoneLantern(p, lights, ...F.P(u, v));
      lights.lit.push([...F.P(u, v), 0.55]); // its small pool after dark
    },
    face: (draw, w, h, u, y, v, back = 0.006) => signs.drawn(draw, w, h, [...xyz(F.P(u, v - back), y)], F.a + Math.PI),
    card: (kana, en, w, h, u, y, v, back = 0.006) =>
      signs.card(kana, en, w, h, [...xyz(F.P(u, v - back), y)], F.a + Math.PI),
    blocks,
  };
  return T;
}
const xyz = ([x, z], y) => [x, y, z];

export function buildNooks(list, root, sets = {}) {
  const own = {
    p: sets.p ? null : new Parts(),
    lights: sets.lights ? null : lightSet(),
    signs: sets.signs ? null : signSet(),
  };
  const S = { p: sets.p || own.p, lights: sets.lights || own.lights, signs: sets.signs || own.signs };
  const blocks = [],
    spots = {};
  for (const n of list) {
    const T = tools(n, S);
    for (const r of n.pads || []) pad(S.p, r);
    for (const r of n.gravel || []) gravel(S.p, r, { y: 0.02 });
    KITS[n.kit](T, n);
    T.blocks.push(...(n.keep || []));
    for (const [u, v] of n.bollards || []) {
      bollard(S.p, ...T.P(u, v));
      T.block([u - 0.12, u + 0.12, v - 0.12, v + 0.12]);
    }
    if (n.lamp) {
      const [u, v] = n.lamp;
      lamps(S.lights, S.p, [T.P(u, v)], { pool: 1.1 });
      T.block([u - 0.16, u + 0.16, v - 0.16, v + 0.16]);
    }
    blocks.push(...T.blocks);
    spots[n.id] = n.at;
  }
  if (own.p) own.p.build(root);
  const lit = own.lights && own.lights.glowParts.length ? own.lights.build(root, { poolY: sets.poolY ?? 0.03 }) : null;
  const sg = own.signs ? own.signs.build(root) : null;
  return {
    blocks,
    spots,
    evening() {
      lit?.evening();
      sg?.evening();
    },
  };
}

// stone flags in a grid on a grout bed, a hair over the ground, a few tones so they read as laid
const FLAGS = ['#a3a09b', '#9d9a95', '#a8a6a1', '#98958f'];
function pad(p, [x0, x1, z0, z1]) {
  p.box('#77777a', x1 - x0, 0.03, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { cast: false });
  const nx = Math.max(1, Math.round((x1 - x0) / 0.6)),
    nz = Math.max(1, Math.round((z1 - z0) / 0.6)),
    sx = (x1 - x0) / nx,
    sz = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++)
      p.box(
        FLAGS[(i * 3 + k * 5 + Math.round(x0 * 7)) & 3],
        sx - 0.04,
        0.05,
        sz - 0.04,
        x0 + sx * (i + 0.5),
        0,
        z0 + sz * (k + 0.5),
        {
          cast: false,
          surf: 'concrete',
        },
      );
}
