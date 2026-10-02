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
import { turningCam, followFit } from './turning-cam.js';

// The east lane (scenes/east-lane.js): the plaza's lane walked on east, in the morning (after work the lane takes
// Eric straight on to the dorm courtyard); it also loads with ?place=east_lane. The named shops are shut for now
// (their doors say so). Out west along the lane goes back to the plaza, south down the dorm street to the shop
// street, east along the dorm row to the sea terrace and the east coast, north up the north street to the sports
// ground, and after work in at the dorm courtyard's gate.
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
  const turn = turningCam(cam, (x, z) => {
    const t = southness(x, z);
    return { yaw: THREE.MathUtils.lerp(YAW.ne, YAW.se, t), elev: THREE.MathUtils.lerp(flat, SE_ELEV, t) };
  });
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
    dorm_row: {
      ...PLACE_DETAILS.east_lane.things.dorm_row,
      anchor: (v) => v.set(w.exits.east_coast.lane[0], 1.1, w.exits.east_coast.lane[1]),
      spot: () => w.exits.east_coast.lane,
      face: () => w.exits.east_coast.edge,
    },
    north_street: {
      ...PLACE_DETAILS.east_lane.things.north_street,
      anchor: (v) => v.set(w.exits.sports.lane[0], 1.1, w.exits.sports.lane[1]),
      spot: () => w.exits.sports.lane,
      face: () => w.exits.sports.edge,
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
      row_exit: (x, z) => inRect(x, z, w.exits.east_coast.zone),
      north_exit: (x, z) => inRect(x, z, w.exits.sports.zone),
    },
    hooks: {},
    fit(aspect) {
      followFit(cam, w.nav, aspect, { yaw: YAW.ne, elev: flat }); // fitted at the north-east look
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      w.update();
      turn.steer(p, dt);
      // heading for a way out: build the next place now, so the walk there needs no loading pause
      const near = (key, d) => {
        const [x0, x1, z0, z1] = w.exits[key].zone;
        return p.x > x0 - d && p.x < x1 + d && p.z > z0 - d && p.z < z1 + d;
      };
      if (near('shotengai', 6) && !game.prepared.shotengai) game.prepare?.('shotengai');
      if (near('plaza', 6) && !game.prepared.plaza) game.prepare?.('plaza');
      if (near('east_coast', 6) && !game.prepared.east_coast) game.prepare?.('east_coast');
      if (near('sports', 6) && !game.prepared.sports) game.prepare?.('sports');
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
      turn.reset();
      cam.snap(game.player.root.position);
    },
    // in from the plaza along the lane, the jog ahead; out the ways plan.js EXITS gives
    tripIn: (g) => walkIn(g, cam, w.arriveEdge, w.in, Math.PI / 2),
    // back from the east coast: in off the dorm row onto the dorm street, walking west; back from the sports
    // ground: in down the north street, walking south
    tripInFrom: {
      east_coast: (g) => walkIn(g, cam, w.exits.east_coast.edge, w.exits.east_coast.in, -Math.PI / 2),
      sports: (g) => walkIn(g, cam, w.exits.sports.edge, w.exits.sports.in, 0),
    },
    tripOutTo: Object.fromEntries(
      Object.entries(w.exits).map(([to, e]) => [to, (g) => walkOut(g, cam, e.lane, e.edge)]),
    ),
  };
  return P;
}
