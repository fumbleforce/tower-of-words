import * as THREE from 'three';
import { eastLaneChunkSteps } from '../scenes/east-lane.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { inRect } from '../scenes/east-lane/plan.js';
import { sim } from '../sim.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';

// The east lane (scenes/east-lane.js): the plaza's lane walked on east, in the morning (after work the lane takes
// Eric straight on to the dorm courtyard); it also loads with ?place=east_lane. The named shops are shut for now
// (their doors say so). Out west along the lane goes back to the plaza, south down the dorm street to the shop
// street, and after work in at the dorm courtyard's gate.
//
// The camera looks north-east over most of it, so the north street's fronts, the park and Amakawa Travel face it, and
// south-east over the south walk, where the café, the liquor shop and the barber face north. It eases between the two
// as Eric comes onto the south walk (plan.js SOUTH_TURN), and snaps on a jump (a trip, a restored save).
const YAW = { ne: -0.72, se: -2.6 },
  SE_ELEV = (58 * Math.PI) / 180; // steeper over the south walk, to see over the lane's trees north of it
const smooth = THREE.MathUtils.smoothstep;
export async function eastLanePlace(game) {
  const w = await sliced(eastLaneChunkSteps()); // in slices between frames: it's built while the plaza is played
  const cam = new RoomCam({ ...w.camera, yaw: YAW.ne });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const T = w.southTurn;
  const southness = (x, z) => smooth(z, T.z[0], T.z[1]) * (1 - smooth(x, T.x[0], T.x[1]));
  const flat = cam.elev;
  let turn = 0,
    turnAt = null;
  const steer = (p, dt) => {
    const jump = !turnAt || Math.hypot(p.x - turnAt[0], p.z - turnAt[1]) > 0.8;
    turnAt = [p.x, p.z];
    const want = southness(p.x, p.z);
    turn = jump ? want : turn + (want - turn) * (1 - Math.exp(-dt / 0.45));
    cam.yaw = THREE.MathUtils.lerp(YAW.ne, YAW.se, turn);
    cam.elev = THREE.MathUtils.lerp(flat, SE_ELEV, turn);
  };
  // the named shops' doors: shut (story/east_lane.js says so); a pin over each, Eric steps up to it
  const dk = (id) => w.doors.find((k) => k.id === id);
  const pin = (v, id) => v.set(dk(id).local[0], 1.95, dk(id).local[1]);
  const things = {
    // the ways out (plan.js EXITS)
    plaza_lane: {
      ...PLACE_DETAILS.east_lane.things.plaza_lane,
      anchor: (v) => v.set(w.exits.plaza.lane[0], 1.1, w.exits.plaza.lane[1]),
      spot: () => w.exits.plaza.lane,
      face: () => w.exits.plaza.edge,
    },
    shop_street: {
      ...PLACE_DETAILS.east_lane.things.shop_street,
      anchor: (v) => v.set(w.exits.shotengai.lane[0], 1.1, w.exits.shotengai.lane[1]),
      spot: () => w.exits.shotengai.lane,
      face: () => w.exits.shotengai.edge,
    },
    dorm_gate: {
      ...PLACE_DETAILS.east_lane.things.dorm_gate,
      anchor: (v) => v.set(w.exits.dorm_court.lane[0], 1.1, w.exits.dorm_court.lane[1]),
      spot: () => w.exits.dorm_court.lane,
      face: () => w.exits.dorm_court.edge,
    },
    // the named shops' doors
    cafe: {
      ...PLACE_DETAILS.east_lane.things.cafe,
      anchor: (v) => pin(v, 'cafe'),
      spot: () => dk('cafe').step,
      face: () => dk('cafe').local,
    },
    liquor_shop: {
      ...PLACE_DETAILS.east_lane.things.liquor_shop,
      anchor: (v) => pin(v, 'liquor_shop'),
      spot: () => dk('liquor_shop').step,
      face: () => dk('liquor_shop').local,
    },
    barber: {
      ...PLACE_DETAILS.east_lane.things.barber,
      anchor: (v) => pin(v, 'barber'),
      spot: () => dk('barber').step,
      face: () => dk('barber').local,
    },
    travel_office: {
      ...PLACE_DETAILS.east_lane.things.travel_office,
      anchor: (v) => pin(v, 'travel_office'),
      spot: () => dk('travel_office').step,
      face: () => dk('travel_office').local,
    },
  };
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: w.in,
    startFacing: Math.PI / 2,
    music: 'calm',
    grade: MORNING_GRADE,
    things,
    spots: { plaza_entry: w.in },
    seats: {},
    people: {},
    zones: {
      plaza_exit: (x, z) => inRect(x, z, w.exits.plaza.zone),
      shop_exit: (x, z) => inRect(x, z, w.exits.shotengai.zone),
      dorm_exit: (x, z) => inRect(x, z, w.exits.dorm_court.zone),
    },
    hooks: {},
    fit(aspect) {
      // as the plaza: the phone's camera distance on both, following him, a little ahead; fitted at the north-east
      // look and kept through the turn
      const [yaw, elev] = [cam.yaw, cam.elev];
      [cam.yaw, cam.elev] = [YAW.ne, flat];
      const c = Math.cos(YAW.ne),
        s = Math.sin(YAW.ne);
      const turned = (pts) => pts.map(([x, y, z]) => new THREE.Vector3(x * c + z * s, y, -x * s + z * c));
      const { x0, x1, z0, z1 } = w.nav,
        clamp = [x0 - 1, x1 + 1, z0 - 1, z1 + 1];
      if (aspect >= 1)
        cam.fit(
          aspect,
          turned([
            [-9.6, 0, 0],
            [9.6, 0, 0],
            [0, 0, -4],
            [0, 0, 4],
          ]),
          new THREE.Vector3(0, 0, 0),
          { follow: true, clamp, lead: -1.4, limY: 0.96 },
        );
      else
        cam.fit(
          aspect,
          turned([
            [-2.9, 0, 0],
            [2.9, 0, 0],
            [0, 0, -2.6],
            [0, 1.2, 2.4],
          ]),
          new THREE.Vector3(0, 0, 0),
          { follow: true, clamp, lead: -3.4 },
        );
      [cam.yaw, cam.elev] = [yaw, elev];
      cam.place();
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      w.update();
      steer(p, dt);
      // heading for a way out: build the next place now, so the walk there needs no loading pause
      const near = (key, d) => {
        const [x0, x1, z0, z1] = w.exits[key].zone;
        return p.x > x0 - d && p.x < x1 + d && p.z > z0 - d && p.z < z1 + d;
      };
      if (near('shotengai', 6) && !game.prepared.shotengai) game.prepare?.('shotengai');
      if (near('plaza', 6) && !game.prepared.plaza) game.prepare?.('plaza');
      if (sim.period === 'evening' && near('dorm_court', 6) && !game.prepared.dorm_court) game.prepare?.('dorm_court');
    },
    onPeriod(period) {
      if (period !== 'evening' || P.grade === EVENING_GRADE) return;
      eveningLight(w.scene);
      w.evening();
      w.follow(game.player.root.position.x, game.player.root.position.z);
      P.grade = EVENING_GRADE;
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }) };
    },
    restoreState(saved) {
      if (!saved.world?.player) return;
      restorePeople({ eric: game.player }, saved.world.player);
      const p = game.player.root.position;
      if (!w.nav.free(p.x, p.z)) p.set(w.in[0], p.y, w.in[1]);
      game.walker.sync();
      turnAt = null;
      cam.snap(game.player.root.position);
    },
    // in from the plaza along the lane, the jog ahead; out the ways plan.js EXITS gives
    tripIn: (g) => walkIn(g, cam, w.arriveEdge, w.in, Math.PI / 2),
    tripOutTo: Object.fromEntries(
      Object.entries(w.exits).map(([to, e]) => [to, (g) => walkOut(g, cam, e.lane, e.edge)]),
    ),
  };
  return P;
}
