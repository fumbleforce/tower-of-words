// The dorm courtyard, an outdoor chunk of island-map-4: the open entrance court on the west side of the dorm cluster.
// The camera looks at Eric's block (island east; the chunk is turned 90° in scenes/island-layout.js). Eric comes in
// from the plaza lane on the west edge of the frame. At the back, Eric's five-storey block (dorm-court/block.js)
// runs past both edges of the frame, balconies all along it, and returns forward on the east side. In front of it,
// its glass-fronted entrance hall is a one-storey front, cut low like every near wall, with the mailboxes on its
// back wall and the passage to the rooms beside them. West of it the coin laundry's lit front with two drinks
// machines, east of it the sento's with its chimney; both are frontages (dorm-court/frontages.js). Where every zone
// is: dorm-court/plan.js. The paving, the walk in, the beds, the bench and the lamps are dorm-court/court.js, the
// bike shelter, the machines and the doorsteps dorm-court/fittings.js, all on the shared outdoor kit
// (scenes/outdoor/). The rest of the cluster and the town come from the island layout (scenes/skyline.js).
// Evening: dusk after the sun has gone behind the blocks, lit windows, lamps, the hall, the laundry and the machines.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { PAL, rbox, wall, tileFloor } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, openDoor } from './forecourt/details.js';
import { laundry, sento } from './dorm-court/frontages.js';
import { ericBlock } from './dorm-court/block.js';
import { buildCourt } from './dorm-court/court.js';
import { shelter, vending, doorstep, garbage } from './dorm-court/fittings.js';
import { Parts } from './outdoor/parts.js';
import { flatRoof } from './dorm-court/roofs.js';
import { lightSet } from './outdoor/furniture.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import * as layout from './island-layout.js';
import { groundPatches, TOWN } from './town.js';
import { mergeStaticSteps } from './merge-static.js';
import * as PL from './dorm-court/plan.js';

const { HALL, FRONT_Z, BACK_Z, DOOR_X, PASS_X, BLOCK_Z, NEAR, WEST, EAST } = PL;
const SKY = '#2b3342';
const STREET_Z = (PL.STREET[2] + PL.STREET[3]) / 2; // the lane's middle
const IN = [DOOR_X, NEAR - 0.45]; // just inside the gate, on the door axis
const POOL_Y = 0.02; // light pools on the paving sit above its stones (0.006-0.008), or the two fight for depth

// the entrance hall: cut-low glass front with open doors, side and back walls full height, mailboxes, the passage
function hall(root, nav) {
  const [x0, x1] = HALL;
  root.add(tileFloor(x0, x1, BACK_Z, FRONT_Z, 0.6, { color: '#9c9aa0', seam: '#8d8b91', seamW: 0.015 }));
  const opts = { color: '#7f848c', top: '#a6abb2' };
  root.add(
    wall('x', x0 - 0.09, x1 + 0.09, FRONT_Z, 0.5, 0.18, { ...opts, holes: [[DOOR_X - 0.85, DOOR_X + 0.85, 0, 1]] }),
  );
  const door = openDoor();
  door.position.set(DOOR_X, 0, FRONT_Z);
  door.scale.y = 0.29;
  root.add(door);
  for (const x of [x0, x1]) root.add(wall('z', BACK_Z - 0.09, FRONT_Z, x, 2.2, 0.18, opts));
  root.add(
    wall('x', x0 - 0.09, x1 + 0.09, BACK_Z, 2.2, 0.18, { ...opts, holes: [[PASS_X - 0.45, PASS_X + 0.45, 0, 1.5]] }),
  );
  // the passage beyond: a short corridor floor lit at its far end, where the block's ground floor begins
  root.add(
    tileFloor(PASS_X - 0.5, PASS_X + 0.5, BLOCK_Z, BACK_Z, 0.5, { color: '#7d8089', seam: '#71747c', seamW: 0.012 }),
  );
  root.add(
    boxes(
      [
        [0.1, 2.2, BACK_Z - BLOCK_Z, PASS_X - 0.55, 0, (BACK_Z + BLOCK_Z) / 2],
        [0.1, 2.2, BACK_Z - BLOCK_Z, PASS_X + 0.55, 0, (BACK_Z + BLOCK_Z) / 2],
        [1.2, 2.2, 0.1, PASS_X, 0, BLOCK_Z],
      ],
      '#5d626c',
    ),
  );
  root.add(lightPool(PASS_X, BACK_Z - 0.7, 0.55, { k: 0.3 }));
  // the roof over the passage and beside it: flat, its parapet along the front, a unit and a vent on it
  const roof = new Parts();
  flatRoof(roof, [x0 - 0.1, x1 + 0.1, BLOCK_Z, BACK_Z + 0.09], 2.34, {
    edges: 's',
    units: [[x1 - 0.55, BACK_Z - 0.75]],
    vents: [[x0 + 0.5, BACK_Z - 0.6]],
  });
  roof.build(root);
  // mailboxes: a grey steel bank of small doors on the back wall, west of the passage
  const mx = -0.05,
    parts = [];
  root.add(rbox(1.5, 0.9, 0.22, '#9a9fa6', { x: mx, y: 0.3, z: BACK_Z + 0.2, r: 0.015 }));
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) parts.push([0.2, 0.17, 0.02, mx - 0.62 + c * 0.245, 0.37 + r * 0.205, BACK_Z + 0.315]);
  root.add(boxes(parts, '#b4b9bf'));
  root.add(
    boxes(
      parts.map(([, , , x, y, z]) => [0.07, 0.015, 0.025, x, y + 0.13, z + 0.005]),
      PAL.charcoal,
    ),
  );
  nav.block(mx - 0.85, mx + 0.85, BACK_Z, BACK_Z + 0.45);
  // a notice board and a wall lamp either side of the passage
  root.add(rbox(0.7, 0.5, 0.04, '#c9c6bd', { x: x1 - 0.1, y: 0.7, z: BACK_Z + 0.12, r: 0.01, cast: false }));
  root.add(
    boxes(
      [
        [0.18, 0.24, 0.01, x1 - 0.3, 0.8, BACK_Z + 0.145],
        [0.2, 0.14, 0.01, x1 - 0.02, 0.9, BACK_Z + 0.145],
        [0.16, 0.2, 0.01, x1 + 0.1, 0.74, BACK_Z + 0.145],
      ],
      PAL.paper,
    ),
  );
  const light = new THREE.PointLight('#ffd8a8', 2.2, 3.8, 1.8);
  light.position.set((x0 + x1) / 2, 1.6, (FRONT_Z + BACK_Z) / 2);
  root.add(light);
  root.add(lightPool((x0 + x1) / 2, (FRONT_Z + BACK_Z) / 2, 1.2, { k: 0.26, sx: 1.4 }));
  root.add(lightPool(DOOR_X, FRONT_Z + 0.6, 0.8, { k: 0.2, y: POOL_Y }));
  // the hall and everything north of the court's back line, except the hall itself and its passage
  nav.block(WEST, x0 + 0.1, BACK_Z, FRONT_Z - 0.55);
  nav.block(x1 - 0.1, EAST, BACK_Z, FRONT_Z + 0.1);
  nav.block(x0, DOOR_X - 0.8, FRONT_Z - 0.1, FRONT_Z + 0.1);
  nav.block(DOOR_X + 0.8, x1, FRONT_Z - 0.1, FRONT_Z + 0.1);
  // the back wall and the passage: Eric only goes through it on the watched trip in (places/dorm-court.js)
  nav.block(WEST, EAST, BACK_Z - 1.3, BACK_Z + 0.1);
}

// buildDormCourt() builds it all at once; dormCourtSteps() is the same as a generator that yields between parts, so
// the game can build it in slices while the plaza is played (js/perf/slice.js)
export const buildDormCourt = () => drain(dormCourtSteps());
export function* dormCourtSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.add(root);
  // dusk after work: a cool sky over everything, the last warm light from the west high enough that the blocks'
  // shadows stay short, a soft fill from the camera side. The lamps, windows and machines do the rest.
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

  const nav = new Nav(WEST + 0.1, EAST - 0.2, BACK_Z - 1.2, NEAR - 0.05, 0.1);
  const block = (x0, x1, z0, z1) => nav.block(x0, x1, z0, z1);
  // under everything, out to the frame's edges and past them: the town's paving, the road past the street
  groundPatches(root, [
    [-40, 40, -40, PL.STREET[3], TOWN.paving],
    [-40, 40, PL.STREET[3], 40, TOWN.grass],
  ]);
  hall(root, nav);
  yield;
  ericBlock(root, { hall: HALL });
  yield;
  laundry(root, nav, { ...PL.LAUNDRY, west: WEST, back: BLOCK_Z });
  yield;
  sento(root, nav, { east: EAST, back: BLOCK_Z });
  yield;
  const lamps = lightSet(); // every lamp's lantern and pool, one mesh each
  buildCourt(root, nav, lamps);
  yield;
  const p = new Parts();
  shelter(root, p, lamps, block);
  doorstep(p, block);
  garbage(root, p, block);
  vending(root, p, block);
  p.build(root);
  lamps.build(root, { poolY: POOL_Y }).evening();
  yield;
  yield* mergeStaticSteps(root);
  // the rest of the dorm cluster and the town around, from the island layout; Eric's block is built above
  const sky = yield* skylineSteps(root, 'dorm_court', { layout, evening: true, skip: ['dorm_1'] });
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
    hallMid: [PASS_X - 0.2, BACK_Z + 0.55],
    passage: [PASS_X, BACK_Z],
    passageIn: [PASS_X, BACK_Z - 0.75],
    bounds: { west: WEST, east: EAST, front: FRONT_Z, back: BACK_Z, near: NEAR },
    camera: { elev: 46, fov: 24 },
    update() {},
  };
}
