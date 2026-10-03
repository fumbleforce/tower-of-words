// Eric's floor, 2F of his dorm block, and his room: the worst one, its window facing the next block's bare end wall a
// couple of metres out (docs/game/places.md). The camera looks north, down onto the floor with its ceiling cut away:
// the open corridor from the stairs at its east end (dorms/stairs.js) past the neighbours' doors to his, and behind
// it the flats cut open, his in the middle: the tatami room at the back (the desk with the company PC, bed, closet, a table with
// his dinner, his boxes from home), the entry strip in front (kitchenette, unit bath, genkan). Over the corridor's
// parapet, the roofs on the court below (dorms/below.js). The plan is in scenes/dorms/layout.js; the parts in
// scenes/dorms/. Evening only: dim cool dusk, the room's own warm lights, the cool corridor and stair lights.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { lightPool } from '../places/life.js';
import { Kit } from './dorms/kit.js';
import {
  X0,
  X1,
  BACK,
  PART,
  NEAR,
  H,
  OUT,
  T,
  CORRIDOR,
  WIN,
  DOOR,
  COUNTER_X,
  BATH_X,
  GENKAN_Z,
  CORR,
  RETURN,
  STAIR,
  LANDING,
} from './dorms/layout.js';
import { floors, walls, building, window_, outside } from './dorms/building.js';
import { tallFront } from './dorms/doors.js';
import { stairs } from './dorms/stairs.js';
import { below } from './dorms/below.js';
import * as F from './dorms/furniture.js';
import { desk } from './dorms/desk.js';
import { kitchenette, bath, genkan, slidingDoor } from './dorms/entry.js';

const BG = '#1b1f26';

function lights(scene, root, { lamp, desk, screen, seat, kitchen }) {
  // dusk: a dim cool sky, a low cool key for the shadows
  scene.add(new THREE.HemisphereLight('#8e9cb6', '#3a3f4b', 1.05));
  const sun = new THREE.DirectionalLight('#b8c6e0', 0.55);
  sun.position.copy(new THREE.Vector3(-0.3, 1, 0.55).normalize().multiplyScalar(20));
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -4,
    right: 4,
    top: 4,
    bottom: -4,
    near: 5,
    far: 40,
  });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  // the ceiling light (on the ceiling the camera looks through): an even warm light that reaches the walls
  const ceiling = new THREE.PointLight('#ffdcb0', 2.1, 4.2, 1.1);
  ceiling.position.set(0, H + 0.1, (BACK + PART) / 2);
  root.add(ceiling);
  // the desk lamp: the warm pool on the desk and the floor by the chair
  const desklamp = new THREE.PointLight('#ffc98a', 1.6, 1.5, 1.6);
  desklamp.position.copy(lamp);
  root.add(desklamp);
  root.add(lightPool(desk.x, desk.z, 0.19, { y: desk.top + 0.003, k: 0.4 }));
  root.add(lightPool(seat.x + 0.1, seat.z, 0.45, { k: 0.1 }));
  // the screen's cool glow on the desk in front of it (no light of its own)
  root.add(lightPool(screen.x, screen.z, 0.2, { color: '#bcd8f0', y: desk.top + 0.002, k: 0.28, sx: 1.2 }));
  // the strip light under the kitchen hood
  const hood = new THREE.PointLight('#ffecd0', 0.7, 1.2, 1.6);
  hood.position.copy(kitchen).add(new THREE.Vector3(0.05, -0.1, 0));
  root.add(hood);
  // the genkan's own small ceiling light, left on: a soft pool on the tiles and the shoes
  root.add(
    lightPool((COUNTER_X + BATH_X) / 2 - 0.02, (GENKAN_Z + NEAR) / 2, 0.5, { color: '#fff0dc', k: 0.4, y: -0.04 }),
  );
  // the corridor lights, cool white, on the doorstep
  const corridor = new THREE.PointLight('#dfe7f5', 1.2, 2.6, 1.4);
  corridor.position.set((DOOR[0] + DOOR[1]) / 2, 1.3, NEAR + T + CORRIDOR / 2);
  root.add(corridor);
  root.add(
    lightPool((DOOR[0] + DOOR[1]) / 2, NEAR + T + CORRIDOR / 2, 0.8, {
      color: '#dfe7f5',
      k: 0.14,
      y: -0.015,
    }),
  );
  // the lamp on the wall outside, which is what the window mostly shows
  const out = new THREE.PointLight('#ffd7a0', 1.4, 2.4, 1.4);
  out.position.set((WIN[0] + WIN[1]) / 2 - 0.45, -0.1, OUT + 0.35);
  root.add(out);
  return sun;
}

export function buildDorms() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.add(root);
  const kit = new Kit();
  // the walk: the flat, the corridor in front of it from a little past his door to the landing, and the landing
  const WX0 = X0 - 0.5,
    nav = new Nav(WX0, STAIR.east - 0.12, BACK + 0.1, STAIR.top - 0.08, 0.05);
  nav.block(WX0, X0 + 0.08, BACK, CORR[0] + 0.1); // left of the flat
  nav.block(X1 - 0.08, RETURN + 0.08, BACK, CORR[0] + 0.1); // right of it, to the return
  nav.block(RETURN, STAIR.east, BACK, STAIR.back + 0.12); // behind the landing
  nav.block(X0 - 0.2, X1 + 0.2, NEAR - 0.1, CORR[0] + 0.12); // his front wall and door: in only on the way in
  nav.block(WX0, RETURN + 0.06, CORR[1] - 0.12, STAIR.top); // the parapet
  nav.block(STAIR.east - 0.3, STAIR.east, 1.3, 1.7); // the fire hose cabinet

  floors(kit, root);
  walls(root);
  const door = building(kit, root);
  root.add(door);
  const front = tallFront();
  // its own materials: going in fades it out (places/dorms.js), and the cache's are every wall's
  front.traverse((o) => o.isMesh && (o.material = o.material.clone()));
  root.add(front);
  stairs(kit, root);
  below(root);
  // the four things Eric looks at get their own groups, for their outlines
  const obj = {
    window: new THREE.Group(),
    bed: new THREE.Group(),
    boxes: new THREE.Group(),
    computer: new THREE.Group(),
  };
  const own = { window: new Kit(), bed: new Kit(), boxes: new Kit(), computer: new Kit() };
  window_(kit, own.window, obj.window);
  outside(root, kit);
  const d = desk(kit, own.computer, obj.computer, nav);
  const bedAt = F.bed(own.bed, nav);
  F.closet(kit, nav);
  F.dinner(kit, nav);
  const boxAt = F.boxes(own.boxes, nav);
  for (const k of Object.keys(obj)) root.add(own[k].flush(obj[k]));
  F.walls(kit);
  const kitchen = kitchenette(kit, nav);
  bath(kit, root, nav);
  genkan(kit, nav);
  slidingDoor(kit);
  // the partition, either side of the doorway
  nav.block(X0, -0.4, PART - 0.06, PART + 0.06);
  nav.block(0.34, X1, PART - 0.06, PART + 0.06);
  kit.flush(root);
  const sun = lights(scene, root, { ...d, kitchen });

  const win = [(WIN[0] + WIN[1]) / 2, BACK];
  const entry = [-0.1, -0.2]; // just through the doorway, clear of the things' spots
  return {
    root,
    scene,
    sun,
    nav,
    start: entry,
    roomEntry: entry,
    // the trip in: up the last flight from the half landing onto the landing, then left into the corridor
    stairFoot: [LANDING[0], STAIR.half[0] + 0.3],
    stairTop: [LANDING[0], STAIR.top - 0.35],
    landing: LANDING,
    corridorIn: [RETURN - 0.4, (CORR[0] + CORR[1]) / 2 - 0.05],
    // his door from the corridor, the doorstep, then in
    atDoor: [(DOOR[0] + DOOR[1]) / 2 + 0.2, NEAR + T + 0.36],
    doorstep: [(DOOR[0] + DOOR[1]) / 2, NEAR + T + 0.3],
    front, // his front wall and door full height, as the corridor sees them; faded out as he goes in
    frontLeaf: front.userData.leaf, // its door's leaf: rotation.y below 0 swings it out onto the corridor
    beside: [(DOOR[0] + DOOR[1]) / 2 + 0.44, NEAR + T + 0.3], // clear of the leaf as it swings out
    windowFront: [win[0], BACK + 0.45],
    window: win,
    windowY: WIN[3], // the look marker over the frame's head, clear of the view out
    bed: { ...bedAt, spot: [-0.2, bedAt.z - 0.12] },
    boxes: { ...boxAt, spot: [0.3, -1.12] },
    computer: { ...d.monitor, spot: d.seat.out }, // the desk's computer, looked at from beside the chair
    deskChair: d.seat, // the desk chair: a seat facing the screen, got onto from the floor beside it (seat.out)
    arrive: { at: [(DOOR[0] + DOOR[1]) / 2, 0.2], zoom: 1.2 },
    obj,
    door, // the front door's leaf: rotation.y below 0 swings it out onto the corridor
    bounds: { x0: X0, x1: X1, back: BACK, near: NEAR, out: OUT, h: H, corr: CORR, east: STAIR.east, stairs: STAIR },
    camera: { elev: 50, fov: 24 },
    update() {},
  };
}
