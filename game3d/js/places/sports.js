import * as THREE from 'three';
import { sportsSteps } from '../scenes/sports.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { inRect } from '../scenes/sports/plan.js';
import { POSES } from '../scenes/office-quarter/plan.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';
import { turningCam, followFit } from './turning-cam.js';

// The sports ground (scenes/sports.js): the north street walked on north from the east lane, past the back lane, to
// the sports lane, the gym's front, the pool walk to the shower pavilion and the courts walk to the onsen path; it
// also loads with ?place=sports. The gym and the pool are shut for now (their doors say so). South down the north
// street goes back to the east lane; east along the courts walk goes on to the onsen path, in the east coast; west
// along the lane round the gym's corner goes on to the office street, in the office quarter.
//
// The camera looks a little east of north over the lane, the north street and the pool walk, so the gym's front faces
// it and its east wall stays west of the line to Eric; at the pool walk's north end, past the gym, it turns to
// look east-north-east so the pavilion's door (on its west face) faces it; along the courts walk it looks east from a little
// north of the walk and steeply, so the north residence, south of the walk, doesn't hide Eric; round the gym's corner
// on the office street it turns to the office street's look, as the office quarter has it there (plan.js TURNS). It
// eases between them as he walks, and snaps on a jump (a trip, a restored save).
const deg = THREE.MathUtils.degToRad;
const POSE = {
  lane: { yaw: -0.2, elev: deg(50) },
  pavilion: { yaw: -1.05, elev: deg(52) },
  courts: { yaw: -Math.PI / 2 - 0.25, elev: deg(58) },
  street: POSES.street,
};
const smooth = THREE.MathUtils.smoothstep,
  lerp = THREE.MathUtils.lerp;
export async function sportsPlace(game) {
  const w = await sliced(sportsSteps()); // in slices between frames: it's built while the east lane is played
  const lane = POSE.lane;
  const cam = new RoomCam({ ...w.camera, yaw: lane.yaw, elev: lane.elev });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const T = w.turns;
  const turn = turningCam(cam, (x, z) => {
    const v = 1 - smooth(z, T.pavilion.z[1], T.pavilion.z[0]),
      c = smooth(x, T.courts.x[0], T.courts.x[1]) * (1 - smooth(z, T.courts.z[1], T.courts.z[0]));
    const s = 1 - smooth(x, T.street.x[0], T.street.x[1]);
    const blend = (k) => lerp(lerp(lerp(lane[k], POSE.street[k], s), POSE.pavilion[k], v), POSE.courts[k], c);
    return { yaw: blend('yaw'), elev: blend('elev') };
  });
  const dk = (id) => w.doors.find((d) => d.id === id);
  const back = w.exits.east_lane,
    on = w.exits.east_coast,
    west = w.exits.office_quarter;
  const pin = (v, id) => v.set(dk(id).local[0], 1.95, dk(id).local[1]);
  const things = {
    // the ways out (plan.js EXITS)
    north_street: {
      ...PLACE_DETAILS.sports.things.north_street,
      anchor: (v) => v.set(back.lane[0], 1.1, back.lane[1]),
      spot: () => back.lane,
      face: () => back.edge,
    },
    onsen_path: {
      ...PLACE_DETAILS.sports.things.onsen_path,
      anchor: (v) => v.set(on.lane[0], 1.1, on.lane[1]),
      spot: () => on.lane,
      face: () => on.edge,
    },
    office_street: {
      ...PLACE_DETAILS.sports.things.office_street,
      anchor: (v) => v.set(west.lane[0], 1.1, west.lane[1]),
      spot: () => west.lane,
      face: () => west.edge,
    },
    // the shut doors
    gym: {
      ...PLACE_DETAILS.sports.things.gym,
      anchor: (v) => pin(v, 'gym'),
      spot: () => dk('gym').step,
      face: () => dk('gym').local,
    },
    pool: {
      ...PLACE_DETAILS.sports.things.pool,
      anchor: (v) => pin(v, 'pool'),
      spot: () => dk('pool').step,
      face: () => dk('pool').local,
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
    startFacing: Math.PI,
    music: 'calm',
    grade: MORNING_GRADE,
    things,
    spots: { north_entry: w.in },
    seats: {},
    people: {},
    zones: {
      north_exit: (x, z) => inRect(x, z, back.zone),
      east_exit: (x, z) => inRect(x, z, on.zone),
      west_exit: (x, z) => inRect(x, z, west.zone),
    },
    hooks: {},
    fit(aspect) {
      followFit(cam, w.nav, aspect, lane); // fitted at the lane's look, kept through the turns
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
      const near = ([x0, x1, z0, z1], d = 6) => p.x > x0 - d && p.x < x1 + d && p.z > z0 - d && p.z < z1 + d;
      if (near(back.zone) && !game.prepared.east_lane) game.prepare?.('east_lane');
      if (near(on.zone) && !game.prepared.east_coast) game.prepare?.('east_coast');
      if (near(west.zone) && !game.prepared.office_quarter) game.prepare?.('office_quarter');
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
    // in up the north street from the east lane, walking north; from the east coast in along the courts walk,
    // walking west; from the office quarter in east along the lane past the gym's corner; out the ways plan.js EXITS
    // gives
    tripIn: (g) => walkIn(g, cam, w.arriveEdge, w.in, Math.PI),
    tripInFrom: {
      east_coast: (g) => walkIn(g, cam, on.edge, on.in, -Math.PI / 2),
      office_quarter: (g) => walkIn(g, cam, west.arrive, west.in, Math.PI / 2),
    },
    tripOutTo: Object.fromEntries(
      Object.entries(w.exits).map(([to, e]) => [to, (g) => walkOut(g, cam, e.lane, e.edge)]),
    ),
  };
  return P;
}
