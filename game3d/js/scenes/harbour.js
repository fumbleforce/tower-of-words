// The harbour (harbour), the sixth district of the island's south half built to walk (docs/game/island.md,
// "Harbour"; Jørgen's pick on Review island-half-1): the office street walked on west past the harbour walk into the
// supply yard, the yard with its warehouse, containers, crane and foreman's hut, the supply pier with the freighter
// alongside, the ferry landing with the terminal's front, the ferry pier with the ferry alongside, the harbour
// office's door, and the harbour walk south along the rocks. What is where: harbour/plan.js. The water, the quays and
// the piers are harbour/quay.js; the yard's buildings and gear harbour/yard.js; the ships harbour/ships.js; the street,
// the walk, the landing's furniture, the planting and the rocks harbour/grounds.js; the terminal's and the office's
// fronts and Amakawa Trading's are the office row's (office-quarter/row.js); the town round it the layout (skyline.js).
// Past the ways out, not walked here, the bands the neighbours' builders lay (plan.js EAST_BAND and on): the office
// street on east with Amakawa Foods' and Electric's fronts, the works lane with the works' buildings it looks at, the
// coast walk on south past the bollards.
// The camera turns: the office street's look on the street and the walk, a little west of north over the yard, the
// landing and the piers (places/harbour.js eases it).
// Evening: the lamps, the floodlights, the beacons, the fronts' ground floors and canopies, the ships' windows and
// the town's windows light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { outdoorLight, sunFollow, TOWN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { blockSets, buildBlockSets } from './outdoor/block.js';
import { signSet } from './shop-signs.js';
import { placeIn } from './dorm-court/cluster.js';
import { cells } from './dorm-court/cells.js';
import { coastLand } from './island-west.js';
import { rowSteps, frontSteps } from './office-quarter/row.js';
import { quaySteps } from './harbour/quay.js';
import { yardSteps } from './harbour/yard.js';
import { shipsSteps } from './harbour/ships.js';
import { groundsSteps } from './harbour/grounds.js';
import { buildingsSteps } from './works/buildings.js';
import { pipeBridge, corner } from './works/props.js';
import { laneViewSteps } from './works/grounds.js';
import * as P from './harbour/plan.js';
import { buildNooks } from './outdoor/nooks.js';

const { CHUNK, inRect } = P;

export const buildHarbour = () => drain(harbourSteps());
export function* harbourSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  const shadows = sunFollow(sun); // the harbour is wide: the sun's shadow box follows Eric
  shadows.follow(...P.IN);

  // walkable: the street, the walk, the yard, the landing, the piers (plan.js WALKS), never what stands on them
  const [bx0, bx1, bz0, bz1] = P.BOUNDS;
  const nav = new Nav(bx0 - 0.2, bx1 + 0.2, bz0 - 0.2, bz1 + 0.2, 0.14);
  nav.extra = (x, z) => P.WALKS.some((r) => inRect(x, z, r, -0.02));
  for (const r of P.FURNITURE) nav.block(...r);

  // everything of its own is laid in the island frame, in a group moved into the chunk's
  const isl = placeIn(new THREE.Group(), CHUNK);
  root.add(isl);
  yield;
  const lights = lightSet(),
    signs = signSet(),
    plain = signSet(); // the works' faded plates, unlit
  // the buildings, the ships and the crane: near and tall, they cast
  const p = new Parts(),
    sets = blockSets();
  for (const k of P.FRONTS) yield* frontSteps(sets, signs, lights, k, { gf: k.row.storeys === 1 ? 3.2 : undefined });
  yield* shipsSteps(sets, signs);
  yield* buildingsSteps(p, sets, signs, plain, lights, P.WORKS_SEEN); // up the works lane (the band)
  pipeBridge(p);
  // the ground, the quays and the small things, in cells so what the camera can't see is culled (a group of its own,
  // added after the merge below, so the merge leaves the cells apart)
  const c = cells([-110, -90, -70, -50, -30], [-100, -80, -60, -40]),
    wg = placeIn(new THREE.Group(), CHUNK),
    water = new Parts(),
    mesh = new Parts(); // the works' chain-link, its own see-through set
  yield* rowSteps(sets, c.paver, c.parts, signs, lights, P.BAND_BLOCKS);
  yield* quaySteps(c.paver, c.parts, water);
  yield* yardSteps(p, c.parts, lights, signs);
  const coast = placeIn(new THREE.Group(), CHUNK);
  yield* groundsSteps(c, lights, isl, coast);
  yield* laneViewSteps(c, lights);
  corner(c.parts, mesh, plain);
  yield* c.paver.build(wg);
  for (const m of yield* c.parts.build(wg)) m.castShadow = false;
  for (const m of mesh.build(wg)) m.castShadow = false;
  p.build(isl);
  water.build(isl);
  const blocks = buildBlockSets(sets, isl);
  const lit = lights.build(isl, { poolY: 0.03 });
  const sg = signs.build(isl);
  plain.build(isl);
  yield;
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: [...P.BAND_BLOCKS, 'ferry_terminal', 'works_orange', 'dock_shed', 'dock_hut', ...P.WORKS_SEEN_IDS],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    sea: false, // the harbour's own water, lower (quay.js)
    near: 40,
    far: 80,
  });
  const nooks = buildNooks(P.NOOKS, root); // outdoor/nooks.js: props round each nook, its spot named
  for (const r of nooks.blocks) nav.block(...r);
  yield* mergeStaticSteps(root);
  root.add(wg, coast);
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
    evening() {
      nooks.evening();
      shadows.evening();
      lit.evening();
      sg.evening();
      if (blocks.lit) blocks.lit.visible = true;
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
