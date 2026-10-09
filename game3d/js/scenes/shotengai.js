// The shop street and the seafront (shotengai), the first district of the island's south half built to walk
// (docs/game/island.md, "Shop street and seafront"; Jørgen's pick on Review island-half-1). The chunk is turned so
// its camera looks west down the arcade from its east mouth, where Eric comes in from the plaza along the dorm
// street. What is where: shotengai/plan.js. Built on the shared kit, the same builders the plaza and the forecourt
// use for this street as backdrop: the two shop rows and the arcade (plaza-buildings.js shopStreet, its named
// shops' signs from island-south.js SHOPS), the promenade, the sea wall and the beach (outdoor/seafront.js), the
// izakaya and the ramen shop (plaza/east-fronts.js), the town around from the layout (skyline.js). Its own ground
// and fittings (the arcade's floor, the shut doors, lanterns, the shops' wares, the chained beach stairs) are
// shotengai/street.js. The arcade's glass roof fades while Eric walks under it (scenes/occluders.js, through the
// place). Evening: the shops' glass and signs, the lanterns and the promenade's lamps light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { TOWN, groundPatches } from './town.js';
import { lightRig } from '../kit/light/rig.js';
import { SHOTENGAI } from '../kit/light/looks.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { shopStreetSteps } from './plaza-buildings.js';
import { frontsSteps } from './plaza/east-fronts.js';
import { BLOCKS as EAST_BLOCKS } from './plaza/east-plan.js';
import { seafrontSteps } from './outdoor/seafront.js';
import { placeIn } from './dorm-court/cluster.js';
import { coastLand } from './island-west.js';
import { signSet } from './shop-signs.js';
import { BAYS, SHOPS, WALL_Z } from './island-south.js';
import { streetSteps } from './shotengai/street.js';
import * as P from './shotengai/plan.js';
import { buildNooks } from './outdoor/nooks.js';
import { shopDoor } from './plaza/east-shops.js';
import { faceAt } from './outdoor/block.js';
import { bandSteps } from './bands.js';
import { bikeCourtBackdrop } from './forecourt/court.js';
import { gardenSteps } from './station-garden/build.js';
import { BOUNDS as GARDEN_BOUNDS } from './station-garden/plan.js';
import { buildSouthLink } from './forecourt/south-link.js';

const { CHUNK, local, rect, inRect } = P;

export const buildShotengai = () => drain(shotengaiSteps());
export function* shotengaiSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  // the light for every period from the period table, its sun turned with the chunk (kit/light/looks.js SHOTENGAI);
  // the street is long: the sun's shadow box, a square round Eric, follows him (light.follow)
  const light = lightRig(scene, { looks: SHOTENGAI, shadow: { box: 16, far: 80 }, sunDist: 40 }),
    sun = light.sun,
    follow = light.follow;
  follow(...local(P.IN));

  // walkable: the streets (plan.js WALKS) and the step out onto the dorm street; never a post, the promenade's
  // furniture or what stands in front of the shops
  const [wx0, wx1, wz0, wz1] = LAYOUT.CHUNKS[CHUNK].walk;
  const nav = new Nav(
    Math.min(wx0, GARDEN_BOUNDS[0]),
    Math.max(wx1, GARDEN_BOUNDS[1]),
    Math.min(wz0, GARDEN_BOUNDS[2]),
    wz1 + 2.1,
    0.1,
  );
  nav.extra = (x, z) => P.WALKS.some((r) => inRect(x, z, r, -0.02)) || inRect(x, z, P.STREET_END);
  for (const r of P.FURNITURE) nav.block(...r);

  // the island frame for the builders that work in it; the plaza's, for the east lane's blocks
  const isl = placeIn(new THREE.Group(), CHUNK);
  root.add(isl);
  const officeContext = new THREE.Group();
  officeContext.position.set(LAYOUT.CHUNKS.forecourt.at[0], 0, LAYOUT.CHUNKS.forecourt.at[1]);
  isl.add(officeContext);
  bikeCourtBackdrop(officeContext);
  buildSouthLink(officeContext);
  yield;
  const pf = new THREE.Group();
  pf.position.set(LAYOUT.CHUNKS.plaza.at[0], 0, LAYOUT.CHUNKS.plaza.at[1]);
  isl.add(pf);
  // lawn under the district, down to the sea wall; the skyline's ground lies under it
  groundPatches(isl, [[-24, 84, 6, WALL_Z, TOWN.grass]]);
  yield;

  const p = new Parts(),
    lights = lightSet(),
    cards = signSet();
  const st = yield* streetSteps(isl, p, lights, cards);
  for (const r of st.keep) nav.block(...rect(r));
  yield;
  const rows = P.building('shops_north');
  const street = yield* shopStreetSteps(isl, {
    a: [rows.rect[0], rows.rect[1]],
    dir: [1, 0],
    depth: rows.rect[3] - rows.rect[1],
    storeyH: rows.floorH,
    bays: { ...BAYS, u0: BAYS.x0 - rows.rect[0] },
    shops: SHOPS,
  });
  yield;
  // the izakaya at the shop walk and the ramen shop across the street, as the plaza builds them
  const q = new Parts(),
    eastLights = lightSet(); // in the plaza's frame, as the blocks are
  const fronts = yield* frontsSteps(
    q,
    eastLights,
    EAST_BLOCKS.filter((k) => k.id === 'izakaya' || k.id === 'ramen'),
  );
  fronts.meshes(pf);
  q.build(pf);
  // after work on day 2 a card tucked into the izakaya's noren: 本日貸切, reserved (its door's 準備中 card is down)
  const izakaya = EAST_BLOCKS.find((k) => k.id === 'izakaya'),
    { F: iF, u: iu } = shopDoor(izakaya),
    [ix, iz] = faceAt(iF, iu, 0.145),
    iry = Math.atan2(iF.n[0], iF.n[1]),
    curtain = signSet();
  curtain.card('本日貸切', 'RESERVED THIS EVENING', 0.32, 0.21, [ix, 1.66, iz], iry, {
    when: 'evening2',
    door: 'izakaya',
  });
  const curtainCard = curtain.build(pf);
  const eastLit = eastLights.build(pf, { poolY: 0.03 });
  yield;
  const front = yield* seafrontSteps(isl, { at: (x, z) => [x, z] });
  p.build(isl);
  const lit = lights.build(isl, { poolY: 0.03 });
  const doorCards = cards.build(isl);
  yield;
  const garden = yield* gardenSteps(isl, root);
  const bands = yield* bandSteps(root, CHUNK); // the ground past the exits, as the neighbours build it (bands.js)
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: ['shops_north', 'arcade', 'shops_south', 'izakaya', 'ramen', 'station', 'platform_shed', ...bands.ids],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
  });
  const nooks = buildNooks(P.NOOKS, root); // outdoor/nooks.js: props round each nook, its spot named
  for (const r of nooks.blocks) nav.block(...r);
  yield* mergeStaticSteps(root);
  yield* nav.buildSteps();
  // what lights up after dark
  light.glow.add(
    bands.glows,
    nooks.glows,
    lit.glows,
    eastLit.glows,
    front.glows,
    fronts.glows,
    street.glows,
    doorCards.glows,
    curtainCard.glows,
    sky.glows,
  );
  const edgeZ = local(P.EDGE)[1];
  const alleys = P.ALLEYS.map(rect);
  return {
    garden,
    nooks: nooks.spots,
    root,
    scene,
    sun,
    light,
    nav,
    follow,
    arcadeRoof: street.arcade, // the glass, ribs and ridge: the place fades them while he walks under them
    arcade: rect(P.ARCADE),
    // where the camera steepens to see into the alleys and down the rows' west end
    steep: (x, z) =>
      alleys.some((r) => inRect(x, z, r)) ||
      inRect(x, z, rect(P.WEST_WALK)) ||
      P.NOOKS.find((n) => n.id === 'shotengai_shrine').walks.some((r) => inRect(x, z, r)), // and past the west end
    edge: local(P.EDGE), // on the dorm street, where he comes in and goes out
    in: local(P.IN), // on the shop walk, the arcade ahead
    exitZ: local([P.EXIT_X, 0])[1],
    edgeZ,
    face: Math.PI, // walking in: west, local north
    doors: P.DOORS.map((d) => ({ ...d, local: local(d.at), step: local([d.at[0], d.at[1] + d.out * 0.85]) })),
    camera: { elev: 40, fov: 24 }, // a little lower than the plaza's, to see the shopfronts under the awnings
    // the door cards for the day and the time (shop-signs.js WHEN)
    cards(day, period) {
      doorCards.show(day, period);
      curtainCard.show(day, period);
      bands.cards(day, period);
    },
    skyline: sky.stats,
  };
}
