// The dorm courtyard, an outdoor chunk of island-map-4: the open entrance court on the west side of the dorm cluster.
// The camera looks at Eric's block (island east; the chunk is turned 90° in scenes/island-layout.js). Eric comes in
// from the plaza lane on the west edge of the frame. At the back, Eric's five-storey block (dorm-court/block.js)
// runs past both edges of the frame, an open corridor along it on every floor, and returns forward on the east
// side, where the stairs are. In front of it, its glass-fronted entrance hall is a one-storey front, cut low like
// every near wall; Eric walks in, past the mailboxes and the manager's window, to the passage to the stairs
// (dorm-court/hall.js). West of it the coin laundry's lit front with two drinks machines, east of it the sento's with its chimney; both are frontages (dorm-court/frontages.js). Where every zone
// is: dorm-court/plan.js. The paving, the walk in, the beds, the bench and the lamps are dorm-court/court.js, the
// bike shelter, the machines and the doorsteps dorm-court/fittings.js, all on the shared outdoor kit
// (scenes/outdoor/). East of the block, the rest of the dorm cluster round its inner court is backdrop
// (dorm-court/cluster.js); the town beyond comes from the island layout (scenes/skyline.js).
// The light for every period is the period table's (kit/light/looks.js DORM_COURT) through the court's light rig:
// by day the other outdoor chunks' morning light, more of it from the sky in the blocks' shade; after work dusk after
// the sun has gone behind the blocks, lit windows and lamps (the hall, the laundry and the machines are lit in both).
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { laundry, sento } from './dorm-court/frontages.js';
import { hall } from './dorm-court/hall.js';
import { ericBlock } from './dorm-court/block.js';
import { courtSteps } from './dorm-court/court.js';
import { shelter, vending, doorstep, garbage } from './dorm-court/fittings.js';
import { clusterSteps, placeIn, CLUSTER_IDS } from './dorm-court/cluster.js';
import { Parts } from './outdoor/parts.js';
import { lightSet } from './outdoor/furniture.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import * as layout from './island-layout.js';
import { coastLand } from './island-west.js';
import { groundPatches, TOWN } from './town.js';
import { lightRig } from '../kit/light/rig.js';
import { DORM_COURT } from '../kit/light/looks.js';
import { mergeStaticSteps } from './merge-static.js';
import * as PL from './dorm-court/plan.js';

const { HALL, FRONT_Z, BACK_Z, DOOR_X, PASS_X, BLOCK_Z, NEAR, WEST, EAST } = PL;
const STREET_Z = (PL.STREET[2] + PL.STREET[3]) / 2; // the lane's middle
const IN = [DOOR_X, NEAR - 0.45]; // just inside the gate, on the door axis

// buildDormCourt() builds it all at once, at dusk; dormCourtSteps() is the same as a generator that yields between
// parts, so the game can build it in slices while the plaza is played (js/perf/slice.js)
export const buildDormCourt = () => {
  const w = drain(dormCourtSteps());
  w.light.apply('evening'); // as the walk home sees it (the asset viewer's)
  return w;
};
// phaseOf: the place's rule for which look a period has (places/dorm-court.js: on day 1 Eric is only here after work)
export function* dormCourtSteps({ phaseOf } = {}) {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(DORM_COURT.day.bg); // the rig sets it per period
  scene.add(root);
  const light = lightRig(scene, { looks: DORM_COURT, phaseOf, shadow: { box: 13, normalBias: 0.06 } }),
    sun = light.sun;

  const nav = new Nav(WEST + 0.1, EAST - 0.2, BACK_Z - 1.2, PL.OUT_Z, 0.1); // the court, and the way out through the gate (dorm-court/court.js)
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  // under everything: the town's paving under the court and its street, and grass under the dorm cluster east of
  // the block and south of the row (dorm-court/cluster.js). Past the street's far side and its ends the skyline's
  // ground shows the island plan (the east lane's walks, the pocket park, the north street), so the buildings over
  // there stand by their own streets and not on an open lawn (#365, Jørgen 2026-10-09).
  const BACK = -8.45; // dorm_1's east face, the cluster's side
  groundPatches(root, [
    [PL.STREET[0], PL.ROW_X, BACK, PL.STREET[3], TOWN.paving],
    [-40, 40, -60, BACK, TOWN.grass],
    [PL.ROW_X, 40, BACK, PL.STREET[3], TOWN.grass],
  ]);
  const mailbox = hall(root, nav);
  yield;
  ericBlock(root);
  yield;
  laundry(root, nav, { ...PL.LAUNDRY, west: WEST, back: BLOCK_Z });
  yield;
  sento(root, nav, { east: EAST, back: BLOCK_Z });
  yield;
  const lamps = lightSet(); // every lamp's lantern and pool, one mesh each
  yield* courtSteps(root, nav, lamps);
  yield;
  const p = new Parts();
  shelter(root, p, lamps, block);
  doorstep(p, block);
  garbage(root, p, block);
  vending(root, p, block);
  p.build(root);
  const lit = lamps.build(root, { poolY: PL.POOL_Y });
  yield;
  yield* mergeStaticSteps(root);
  // the rest of the dorm cluster, in its own group so the court's merge leaves it out
  const cluster = placeIn(new THREE.Group(), 'dorm_court');
  root.add(cluster);
  const dorms = yield* clusterSteps(cluster);
  yield;
  // the town around, from the island layout; Eric's block and the cluster are built above
  // r9 (the director's house) stands where the court's street runs on past the dorm street's end: left out here
  const sky = yield* skylineSteps(root, 'dorm_court', {
    layout,
    skip: ['dorm_1', 'r9', ...CLUSTER_IDS],
    land: coastLand(layout.COAST.line),
    landColor: TOWN.grass,
  });
  light.glow.add(lit.glows, dorms.glows, sky.glows); // what lights up after dark
  return {
    root,
    scene,
    sun,
    light,
    nav,
    sky,
    start: IN,
    plazaEntry: IN,
    streetEdge: [DOOR_X - 1.4, STREET_Z], // where the walk from the plaza hands over, on the lane
    streetGate: [DOOR_X, STREET_Z], // on the lane, in front of the gate
    dormEntry: [DOOR_X, FRONT_Z + 0.5],
    door: [DOOR_X, FRONT_Z],
    hall: [DOOR_X, FRONT_Z - 0.55], // just inside the doors
    passage: [PASS_X, BACK_Z + 0.3], // at the passage's mouth
    passageMouth: [PASS_X, BACK_Z],
    passageIn: [PASS_X, BACK_Z - 0.75],
    mailbox, // 203's: its flap, the flyer inside, where it is (dorm-court/hall.js)
    bounds: { west: WEST, east: EAST, front: FRONT_Z, back: BACK_Z, near: NEAR, hall: HALL },
    camera: { elev: 46, fov: 24 },
    update() {},
  };
}
