// The east coast (east_coast), the third district of the island's south half built to walk (docs/game/island.md,
// "Dorms" and "Sports and baths"; Jørgen's pick on Review island-half-1): the dorm quarter (Review dorm-quarter-5),
// walked from the dorm street along the row and the promenade, through the park, along the beach promenade and up
// past the gardens, and the onsen path to the onsen's red gate and its shut front. What is where: east-coast/plan.js.
// The quarter is its own builder (dorm-quarter/), as the dorm courtyard, the east lane and the plaza show it; the
// onsen path and the courts walk's ends, their lamps and woods and the tennis courts are east-coast/walk.js; the
// onsen east-coast/onsen.js; the coast's wall, rocks, surf and the walks' kerbs the coast kit (outdoor/coast.js); the
// town round it the layout (skyline.js).
// The camera turns: east along the row, north over the park, north-east along the beach, south over the coastal
// garden (places/east-coast.js eases it).
// Evening: the lamps, the lanterns, the onsen's paper screens and the town's windows light up.
import * as THREE from 'three';
import { outdoorLight, sunFollow, TOWN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { paver } from './outdoor/paving.js';
import { coastSteps } from './outdoor/coast.js';
import { coastalSea } from './outdoor/sea.js';
import { signSet } from './shop-signs.js';
import { quarterSteps, placeIn, QUARTER_IDS } from './dorm-quarter/index.js';
import { WALL_GAPS } from './dorm-quarter/fittings.js';
import * as Q from './dorm-quarter/plan.js';
import { cells } from './dorm-court/cells.js';
import { coastLand } from './island-west.js';
import { walkSteps, kerbWalks, Z_CUTS } from './east-coast/walk.js';
import { onsenSteps } from './east-coast/onsen.js';
import * as P from './east-coast/plan.js';
import { coastNavigation } from './east-coast/navigation.js';
import { buildNooks } from './outdoor/nooks.js';
import { bandSteps } from './bands.js';

const { CHUNK } = P;
// the coast from south of the dorms round past the onsen (the layout's line, its east side), cut into runs: open at
// the lookout deck and each flight of steps, on the sand along the beach (the wall stands on it, no rocks or surf)
const EAST_COAST = LAYOUT.COAST.line.filter(([x, z]) => x >= 86 && z < 40);
function coastRuns() {
  const sea = Q.SEA_X,
    i0 = EAST_COAST.findIndex(([x, z]) => x === sea && z === Q.COAST_LINE[2][1]),
    i1 = EAST_COAST.findIndex(([x, z]) => x === sea && z === Q.COAST_LINE[3][1]);
  const south = EAST_COAST.slice(0, i0 + 1),
    north = EAST_COAST.slice(i1);
  // the straight run along the promenade, north to south as the line runs it (sea on its right), cut at the gaps
  const cuts = [...WALL_GAPS].sort((a, b) => b[0] - a[0]);
  const [, , B0, B1] = Q.BEACH;
  const runs = [{ line: south, plant: true }];
  let z = EAST_COAST[i0][1];
  const piece = (a, b) => {
    // split a stretch [a > b] at the beach's ends: on the sand, or on rocks
    const edges = [a, ...[B1, B0].filter((e) => e < a && e > b), b];
    for (let i = 0; i + 1 < edges.length; i++) {
      const [z0, z1] = [edges[i], edges[i + 1]];
      if (z0 - z1 < 0.3) continue;
      const beach = (z0 + z1) / 2 > B0 && (z0 + z1) / 2 < B1;
      runs.push({
        line: [
          [sea, z0],
          [sea, z1],
        ],
        beach,
        plant: false,
      });
    }
  };
  for (const [g0, g1] of cuts) {
    if (g1 < z) piece(z, g1);
    z = Math.min(z, g0);
  }
  piece(z, EAST_COAST[i1][1]);
  runs.push({ line: north, plant: true });
  return runs;
}

export const buildEastCoast = () => drain(eastCoastSteps());
export function* eastCoastSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  const shadows = sunFollow(sun); // the district is long: the sun's shadow box follows Eric
  shadows.follow(...P.IN);

  // walkable: the row, the terrace, the walks and the onsen's stone walk (plan.js WALKS), never what stands on them
  const nav = coastNavigation();

  // everything of its own is laid in the island frame, in a group moved into the chunk's
  const isl = placeIn(new THREE.Group(), CHUNK);
  root.add(isl);
  yield;
  const lights = lightSet(),
    signs = signSet();
  // the walk, its planting and the courts, in cells along it so what the camera can't see is culled
  // (a group of its own, added after the merge below, so the merge leaves the cells apart)
  const c = cells([], Z_CUTS),
    wg = placeIn(new THREE.Group(), CHUNK);
  yield* walkSteps(c, lights, isl, signs);
  yield* c.paver.build(wg);
  for (const m of yield* c.parts.build(wg)) m.castShadow = false;
  yield;
  // the onsen: the wall, the gate, the court, the hall's front, the bath courtyards
  const p = new Parts(),
    pv = paver();
  const onsen = yield* onsenSteps(isl, p, pv, signs, lights);
  pv.build(isl);
  p.build(isl);
  const lit = lights.build(isl, { poolY: 0.03 });
  const sg = signs.build(isl);
  yield;
  // the coast's wall, rocks and surf, and the walks' kerbs
  yield* coastSteps(isl, {
    at: (x, z) => [x, z],
    data: { coast: coastRuns(), walks: kerbWalks(), paved: [Q.BEACH_PROM, Q.TERRACE] },
  });
  const sea = coastalSea(root, sun.position.clone().normalize());
  yield;
  const bands = yield* bandSteps(root, CHUNK); // the ground past the exits, as the neighbours build it (bands.js)
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: [...QUARTER_IDS, 'dorm_1', 'onsen_main', ...bands.ids],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  const nooks = buildNooks(P.NOOKS, root); // outdoor/nooks.js: props round each nook, its spot named
  for (const r of nooks.blocks) nav.block(...r);
  yield* mergeStaticSteps(root);
  root.add(wg);
  // the dorm quarter, with the courtyard and Eric's block as the plaza shows them, in its own group so the merge
  // leaves it out (its cells are culled on their own)
  const cluster = placeIn(new THREE.Group(), CHUNK);
  root.add(cluster);
  const dorms = yield* quarterSteps(cluster, { host: 'east_coast' });
  yield* nav.buildSteps();

  return {
    nooks: nooks.spots,
    root,
    scene,
    sun,
    nav,
    follow: shadows.follow,
    in: P.IN,
    arriveEdge: P.ARRIVE_EDGE,
    exits: P.EXITS,
    doors: P.DOORS,
    turns: P.TURNS,
    // the park's named spots: the cherry's round by its ring seat, the bench on the loop looking over the big lawn
    inner: {
      square: P.pt([Q.RING.x - Q.RING.pad + 0.2, Q.RING.z + Q.RING.pad - 0.2]),
      bench: P.pt([Q.LOOP[0] - 0.45 - 0.7, -18.2]),
    },
    // the sea terrace's east bench, which looks south over the wall to the sea: the spot is just behind it
    terraceBench: P.pt([Q.TERRACE[1] - 1.3, Q.TERRACE[3] - 1.35]),
    camera: { elev: 46, fov: 24 },
    update(t) {
      sea.update(t);
      bands.update(sun);
    },
    evening() {
      bands.evening();
      nooks.evening();
      shadows.evening();
      lit.evening();
      sg.evening();
      onsen.evening();
      dorms.evening();
      sky.onPeriod('evening');
    },
    cards: (day, period) => (sg.show(day, period), bands.cards(day, period)), // the door cards (shop-signs.js WHEN)
    skyline: sky.stats,
  };
}
