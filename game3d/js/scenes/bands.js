// The ground past each outdoor place's exits (#260; outdoor/band.js): which neighbour builds what, kept to which
// rectangles, in the island frame ([x0, x1, z0, z1]); the table is bands-plan.js. A place builds its bands into its
// root before the static merge and leaves the blocks they build out of its skyline:
//   const bands = yield* bandSteps(root, CHUNK);
//   skyline skip: [...bands.ids]; evening(): bands.evening(); update(): bands.update(sun); cards: bands.cards(day, period)
// Each band is { by, rects, ... }; by names the builder:
//   eastLane      plaza/east-lane.js: the lane's streets, walks, park, planting, lamps and small blocks' fronts
//                 (skip: the blocks the place builds itself)
//   sportsGrounds sports/grounds.js: the sports lane and its corner, the pool and courts walks, planting and lamps
//   coastWalk     east-coast/walk.js and the coast kit's kerbs: the east coast walk, the onsen path, their woods
//   westCoast     outdoor/coast.js with the west coast's data (the forecourt draws it on the map only): kerbs,
//                 beds, drifts, pines and benches, and the walks in `pave` laid in the walks' pale slabs
//   lawn          ground nobody builds, planted with the kit in the same style: belts [rect, kinds, pitch] of
//                 trees over layered planting (dorm-court/cluster-yards.js belt), and walks [rect, kerb sides]
//                 in the walks' pale slabs
//   fronts        skyline boxes given a ground floor and a door (plaza/east-fronts.js): blocks [{ id, face, ground }]
// Nothing in a band casts a shadow (the laid shadows of outdoor/shade.js stand in). The island-frame bands share one
// set of collectors (one mesh per kind for all of them), and their static meshes merge with the place's.
import * as THREE from 'three';
import * as LAYOUT from './island-layout.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { paver } from './outdoor/paving.js';
import { kerbRect } from './outdoor/edges.js';
import { TREES } from './outdoor/planting.js';
import { coastSteps, WEST } from './outdoor/coast.js';
import { band } from './outdoor/band.js';
import { signSet } from './shop-signs.js';
import { placeIn } from './dorm-court/cluster.js';
import { belt } from './dorm-court/cluster-yards.js';
import { eastLaneSteps, walk } from './plaza/east-lane.js';
import { frontsSteps } from './plaza/east-fronts.js';
import { BLOCKS as EAST_BLOCKS } from './plaza/east-plan.js';
import { groundsSteps } from './sports/grounds.js';
import { walkSteps, kerbWalks } from './east-coast/walk.js';
import { BANDS } from './bands-plan.js';

export { BANDS };
const PLAZA = LAYOUT.CHUNKS.plaza.at;
const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);
const box = ([x0, z0, x1, z1]) => [x0, x1, z0, z1];
const toIsland = ([x0, x1, z0, z1]) => [x0 + PLAZA[0], x1 + PLAZA[0], z0 + PLAZA[1], z1 + PLAZA[1]];
const at = (x, z) => [x, z];

// a light set built, if it has any lamps (an empty one has nothing to merge)
const lightsOf = (set, root) =>
  set.lit.length || set.glowParts.length ? set.build(root, { poolY: 0.03 }) : { evening() {} };

// the blocks a place's bands build, for its skyline's skip list
export function bandIds(chunk) {
  const ids = [];
  for (const b of BANDS[chunk] || []) {
    if (b.by === 'eastLane') {
      const clip = band(b.rects);
      for (const k of EAST_BLOCKS) if (clip.hits(toIsland(k.rect)) && !(b.skip || []).includes(k.id)) ids.push(k.id);
    }
    if (b.by === 'fronts') ids.push(...b.blocks.map((k) => k.id));
  }
  return ids;
}

// each builder: (band, island-frame group, out: { evening, update, cards } lists, the shared collectors)
const BUILD = {
  *eastLane(b, isl, out, s) {
    // the east lane's builders work in the plaza's frame; its lamps join the shared set, moved into the island's
    const pf = new THREE.Group();
    pf.position.set(PLAZA[0], 0, PLAZA[1]);
    isl.add(pf);
    const [dx, dz] = PLAZA,
      lights = {
        glowParts: { push: (...gs) => s.lights.glowParts.push(...gs.map((g) => g.translate(dx, 0, dz))) },
        lit: { push: (...ls) => s.lights.lit.push(...ls.map(([x, z, r]) => [x + dx, z + dz, r])) },
      };
    const clip = band(b.rects).shift(-dx, -dz);
    const east = yield* eastLaneSteps(pf, null, lights, { clip, skip: b.skip || [] });
    out.evening.push(east.evening);
    out.update.push(east.update);
    out.cards.push(east.cards);
  },
  *sportsGrounds(b, isl, out, s) {
    const clip = band(b.rects),
      posts = new THREE.Group(); // the finger signs, kept if they stand in the band
    yield* groundsSteps(s.clipped(clip), clip.lights(s.lights), s.signs, posts);
    isl.add(clip.prune(posts));
  },
  *coastWalk(b, isl, out, s) {
    const clip = band(b.rects),
      posts = new THREE.Group();
    yield* walkSteps(s.clipped(clip), clip.lights(s.lights), posts, signSet()); // its courts are the place's own
    isl.add(clip.prune(posts));
    yield* coastSteps(isl, { at, clip: clip.has, data: { coast: [], walks: kerbWalks() }, into: s.p });
  },
  *westCoast(b, isl, out, s) {
    const clip = band(b.rects);
    for (const id of b.pave || []) walk(clip.paver(s.pv), box(WEST.walks[id].rect));
    yield* coastSteps(isl, { at, clip: clip.has, data: WEST, into: s.p });
  },
  *lawn(b, isl, out, { p, pv }) {
    for (const [r, sides] of b.walks || []) {
      walk(pv, r);
      kerbRect(p, r, { sides });
    }
    for (const [i, [r, kinds, pitch = 3.2]] of (b.belts || []).entries())
      yield* belt(
        p,
        r,
        kinds.split(',').map((k) => TREES[k]),
        { seed: (b.seed || 300) + i * 7, pitch },
      );
  },
  *fronts(b, isl, out, s) {
    const blocks = b.blocks.map((k) => {
      const row = building(k.id),
        rect = box(row.rect);
      const a = k.at ?? (k.face === 'w' || k.face === 'e' ? (rect[2] + rect[3]) / 2 : (rect[0] + rect[1]) / 2);
      return { wall: row.wall, ...k, at: a, rect, row };
    });
    const fronts = yield* frontsSteps(s.p, s.lights, blocks);
    fronts.meshes(isl);
    out.evening.push(fronts.evening);
  },
};

// the collectors the island-frame bands share
function shared() {
  const p = new Parts(),
    pv = paver(),
    lights = lightSet(),
    signs = signSet();
  return {
    p,
    pv,
    lights,
    signs,
    clipped: (clip) => ({ paver: clip.paver(pv), parts: clip.parts(p) }),
    build(root, out) {
      pv.build(root);
      for (const m of p.build(root)) m.castShadow = false;
      out.evening.push(lightsOf(lights, root).evening);
      const sg = signs.build(root);
      out.evening.push(sg.evening);
      out.cards.push(sg.show);
    },
  };
}

export function* bandSteps(root, chunk) {
  const isl = placeIn(new THREE.Group(), chunk);
  isl.name = 'bands';
  root.add(isl);
  const out = { evening: [], update: [], cards: [] },
    stats = [];
  // triangles in the bands' group (before the place's merge), for the stats
  const tris = () => {
    let n = 0;
    isl.traverse((o) => o.isMesh && (n += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3));
    return Math.round(n);
  };
  const s = shared();
  for (const b of BANDS[chunk] || []) {
    const t0 = tris();
    yield* BUILD[b.by](b, isl, out, s);
    stats.push({ by: b.by, tris: tris() - t0 }); // what it built into meshes of its own
    yield;
  }
  const t0 = tris();
  s.build(isl, out);
  stats.push({ by: 'shared', tris: tris() - t0 });
  root.userData.bandStats = stats;
  return {
    stats,
    ids: bandIds(chunk),
    evening: () => out.evening.forEach((f) => f()),
    update: (sun) => out.update.forEach((f) => f(sun)),
    cards: (day, period) => out.cards.forEach((f) => f(day, period)),
  };
}
