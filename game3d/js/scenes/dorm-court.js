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
// Evening: dusk after the sun has gone behind the blocks, lit windows, lamps, the hall, the laundry and the machines.
// Built for the morning ({ morning: true }, day 2) it has the other outdoor chunks' morning light and its lamps off,
// and evening() turns it to dusk when the clock reaches after work.
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
import { groundPatches, TOWN, outdoorLight, eveningLight } from './town.js';
import { mergeStaticSteps } from './merge-static.js';
import * as PL from './dorm-court/plan.js';

const { HALL, FRONT_Z, BACK_Z, DOOR_X, PASS_X, BLOCK_Z, NEAR, WEST, EAST } = PL;
const SKY = '#2b3342';
const STREET_Z = (PL.STREET[2] + PL.STREET[3]) / 2; // the lane's middle
const IN = [DOOR_X, NEAR - 0.45]; // just inside the gate, on the door axis

// buildDormCourt() builds it all at once; dormCourtSteps() is the same as a generator that yields between parts, so
// the game can build it in slices while the plaza is played (js/perf/slice.js)
export const buildDormCourt = (o) => drain(dormCourtSteps(o));
export function* dormCourtSteps({ morning = false } = {}) {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(morning ? TOWN.roof : SKY);
  scene.add(root);
  const sun = morning ? outdoorLight(scene) : duskLight(scene);
  // the court lies in the blocks' morning shade: more of the sky's light, so it reads as day
  if (morning) scene.traverse((o) => o.isHemisphereLight && (o.intensity = 2.3));

  const nav = new Nav(WEST + 0.1, EAST - 0.2, BACK_Z - 1.2, NEAR - 0.05, 0.1);
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  // under everything: the town's paving under the court and its street, out past the frame's edges; grass past the
  // street, and under the dorm cluster east of the block and south of the row (dorm-court/cluster.js)
  const BACK = -8.45; // dorm_1's east face, the cluster's side
  groundPatches(root, [
    [-40, PL.ROW_X, BACK, PL.STREET[3], TOWN.paving],
    [-40, 40, -60, BACK, TOWN.grass],
    [PL.ROW_X, 40, BACK, PL.STREET[3], TOWN.grass],
    [-40, 40, PL.STREET[3], 40, TOWN.grass],
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
  if (!morning) lit.evening();
  yield;
  yield* mergeStaticSteps(root);
  // the rest of the dorm cluster, in its own group so the court's merge leaves it out
  const cluster = placeIn(new THREE.Group(), 'dorm_court');
  root.add(cluster);
  const dorms = yield* clusterSteps(cluster);
  if (!morning) dorms.evening();
  yield;
  // the town around, from the island layout; Eric's block and the cluster are built above
  const sky = yield* skylineSteps(root, 'dorm_court', { layout, evening: !morning, skip: ['dorm_1', ...CLUSTER_IDS] });
  // after work on a court built in the morning: the dusk sky and light, the lamps and windows lit
  let dusk = !morning;
  const evening = (day = 1) => {
    if (dusk) return;
    dusk = true;
    if (scene.background?.isColor) scene.background.set(SKY); // a sky picture follows the period itself
    eveningLight(scene, day); // the town's dusk, as on the other chunks built in the morning
    lit.evening();
    dorms.evening();
    sky.onPeriod?.('evening');
  };
  return {
    root,
    scene,
    sun,
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
    evening,
    update() {},
  };
}

// dusk after work: a cool sky over everything, the last warm light from the west high enough that the blocks'
// shadows stay short, a soft fill from the camera side. The lamps, windows and machines do the rest.
function duskLight(scene) {
  scene.add(new THREE.HemisphereLight('#a4b0cf', '#565862', 1.4));
  const sun = new THREE.DirectionalLight('#ffbf94', 1.05);
  sun.position.copy(new THREE.Vector3(-0.62, 0.68, 0.39).normalize().multiplyScalar(30));
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 5, far: 70 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.06;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#bcc8f0', 0.5);
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);
  return sun;
}
