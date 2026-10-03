// The old works (works), the seventh district of the island's south half built to walk (docs/game/island.md, "Old
// works"; Jørgen's pick on Review island-half-1): the works lane north from the supply yard past the power plant's
// door to the chimney's foot, the works yard past the works shed, the factory's chained gates, the gatehouse and the
// server hall, the works street down to the office street past the recycling centre, and the research walk to
// Amakawa Research. What is where: works/plan.js. The factory, the plant, the chimney, the shed, the gatehouse and the
// server hall are works/buildings.js; the pipe bridge, the siding and the nooks' props works/props.js; the ground,
// the lamps, the poles, the fences and the planting works/grounds.js; the recycling centre's and Amakawa Research's
// fronts, and the harbour office's, are the office row's (office-quarter/row.js), the warehouse the harbour's
// (harbour/yard.js); the town round it the layout (skyline.js).
// The camera turns: from the south-east up the lane, from a little east of south over the yard, from the south-east
// on the hall apron, from the south-west up the street and the research walk (places/works.js eases it).
// Evening: the lamps, the server hall's door and two of its windows, the two fronts' ground floors and canopies and
// the town's windows light up; the factory, the plant and the gatehouse stay dark.
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
import { frontSteps } from './office-quarter/row.js';
import { shed as warehouse } from './harbour/yard.js';
import { front as harbourFront } from './harbour/plan.js';
import { buildingsSteps } from './works/buildings.js';
import { propsSteps } from './works/props.js';
import { groundsSteps } from './works/grounds.js';
import * as P from './works/plan.js';

const { CHUNK, inRect } = P;

export const buildWorks = () => drain(worksSteps());
export function* worksSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  const shadows = sunFollow(sun); // the works are wide: the sun's shadow box follows Eric
  shadows.follow(...P.IN);

  // walkable: the lane, the yard, the aprons, the street, the walk and the nooks (plan.js WALKS)
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
  // the buildings and the tall gear: near and tall, they cast
  const p = new Parts(),
    sets = blockSets();
  yield* buildingsSteps(p, sets, signs, plain, lights);
  for (const k of P.FRONTS) yield* frontSteps(sets, signs, lights, k);
  yield* frontSteps(sets, signs, lights, harbourFront('works_orange'));
  warehouse(p, lights.glowParts, lights, signs);
  // the ground and the small things, in cells so what the camera can't see is culled (a group of its own, added
  // after the merge below, so the merge leaves the cells apart); the chain-link in a see-through set of its own
  const c = cells([-78, -64, -50], [-110, -100, -80]),
    wg = placeIn(new THREE.Group(), CHUNK),
    mesh = new Parts();
  yield* propsSteps(p, c.parts, mesh, plain);
  yield* groundsSteps(c, lights, isl, mesh);
  yield* c.paver.build(wg);
  for (const m of yield* c.parts.build(wg)) m.castShadow = false;
  p.build(isl);
  for (const m of mesh.build(wg)) m.castShadow = false;
  const blocks = buildBlockSets(sets, isl);
  const lit = lights.build(isl, { poolY: 0.03 });
  const sg = signs.build(isl);
  plain.build(isl);
  yield;
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: [
      'nw_old',
      'chimney',
      'factory',
      'works_shed',
      'works_kiosk',
      'works_blue',
      'w2',
      'n4',
      'works_orange',
      'dock_shed',
    ],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  yield* mergeStaticSteps(root);
  root.add(wg);
  yield* nav.buildSteps();

  return {
    root,
    scene,
    sun,
    nav,
    follow: shadows.follow,
    in: P.IN,
    arriveEdge: P.ARRIVE_EDGE,
    exits: P.EXITS,
    doors: P.DOORS,
    nooks: Object.fromEntries(Object.entries(P.NOOKS).map(([k, v]) => [k, P.pt(v)])),
    evening() {
      shadows.evening();
      lit.evening();
      sg.evening();
      if (blocks.lit) blocks.lit.visible = true;
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
