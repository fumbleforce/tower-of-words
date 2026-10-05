// The east coast (east_coast), the third district of the island's south half built to walk (docs/game/island.md,
// "Dorms" and "Sports and baths"; Jørgen's pick on Review island-half-1): the dorm row east from the dorm street to
// the sea terrace, the east coast walk north along the rocks, and the onsen path to the onsen's red gate and its
// shut front. What is where: east-coast/plan.js. The dorm row, the terrace and the blocks round the inner court are
// the dorm cluster's own builder (dorm-court/cluster.js), as the east lane and the plaza show it; the walk and its
// planting, lamps and the tennis courts are east-coast/walk.js; the onsen east-coast/onsen.js; the coast's wall,
// rocks, surf and the walks' kerbs the coast kit (outdoor/coast.js); the town round it the layout (skyline.js).
// The camera turns: east along the row, north up the coast and to the onsen (places/east-coast.js eases it).
// Evening: the lamps, the lanterns, the onsen's paper screens and the town's windows light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { outdoorLight, sunFollow, TOWN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { paver } from './outdoor/paving.js';
import { coastSteps } from './outdoor/coast.js';
import { signSet } from './shop-signs.js';
import { clusterSteps, placeIn, CLUSTER_IDS } from './dorm-court/cluster.js';
import { cells } from './dorm-court/cells.js';
import { coastLand } from './island-west.js';
import { walkSteps, kerbWalks, Z_CUTS } from './east-coast/walk.js';
import { onsenSteps } from './east-coast/onsen.js';
import * as P from './east-coast/plan.js';
import * as C from './dorm-court/cluster-plan.js';
import { buildNooks } from './outdoor/nooks.js';

const { CHUNK, inRect } = P;
// the coast from south of the dorms round past the onsen (the layout's line, its east side)
const EAST_COAST = LAYOUT.COAST.line.filter(([x, z]) => x > 100 && z < 40);

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
  const [bx0, bx1, bz0, bz1] = P.BOUNDS;
  const nav = new Nav(bx0 - 0.2, bx1 + 0.2, bz0 - 0.2, bz1 + 0.2, 0.12);
  nav.extra = (x, z) => P.WALKS.some((r) => inRect(x, z, r, -0.02));
  for (const r of P.FURNITURE) nav.block(...r);

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
    data: { coast: [{ line: EAST_COAST, plant: true }], walks: kerbWalks() },
  });
  yield;
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: [...CLUSTER_IDS, 'dorm_1', 'onsen_main'],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  const nooks = buildNooks(P.NOOKS, root); // outdoor/nooks.js: props round each nook, its spot named
  for (const r of nooks.blocks) nav.block(...r);
  yield* mergeStaticSteps(root);
  root.add(wg);
  // the dorm cluster round the inner court, with the courtyard and Eric's block as the plaza shows them, in its own
  // group so the merge leaves it out
  const cluster = placeIn(new THREE.Group(), CHUNK);
  root.add(cluster);
  const dorms = yield* clusterSteps(cluster, { plaza: true });
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
    // the inner court's named spots: the square by the maple's bed, the bench facing the common room
    inner: {
      square: P.pt([C.AXIS_X + 1.2, C.AXIS_Z + 1.4]),
      bench: P.pt([C.SQUARE_BENCHES[0][0], C.SQUARE_BENCHES[0][1] + 0.7]),
    },
    // the sea terrace's east bench, which looks south over the wall to the sea: the spot is just behind it
    terraceBench: P.pt([C.TERRACE[1] - 1.1, C.TERRACE[3] - 1.35]),
    camera: { elev: 46, fov: 24 },
    evening() {
      nooks.evening();
      shadows.evening();
      lit.evening();
      sg.evening();
      onsen.evening();
      dorms.evening();
      sky.onPeriod('evening');
    },
    cards: (day, period) => sg.show(day, period), // the onsen's door card (shop-signs.js WHEN)
    skyline: sky.stats,
  };
}
