import * as THREE from 'three';
import { eastCoastSteps } from '../scenes/east-coast.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, eveningGrade, MORNING_GRADE } from '../scenes/town.js';
import { sim } from '../sim.js';
import { inRect } from '../scenes/east-coast/plan.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';
import { turningCam, followFit } from './turning-cam.js';
import { roadClosure } from './closure.js';
import { coastVisit } from './coast-visit.js';

// The east coast (scenes/east-coast.js): the dorm row walked east from the east lane's dorm street, to the sea
// terrace, the coast walk and the onsen's front; it also loads with ?place=east_coast. The onsen is shut for now
// (its door says so). West along the row goes back to the dorm street; west along the courts walk from the onsen
// path's foot goes on to the sports ground (the gym, the pool and the courts walk, scenes/sports.js).
//
// The camera looks east down the row, toward the terrace and the sea, from a little north of it and steeply, so the
// row's trees (on its south side) don't hide Eric; over the terrace it turns to look north-east up the coast, the
// sea on the right;
// off the coast walk onto the onsen path it turns to look due north, so the gate and the hall's front face it
// (plan.js TURNS). It eases between them as he walks, and snaps on a jump (a trip, a restored save).
const deg = THREE.MathUtils.degToRad;
const POSE = {
  row: { yaw: -Math.PI / 2 - 0.25, elev: deg(58) }, // a little from the north, steep: the row's trees are on its south side
  coast: { yaw: -0.6, elev: deg(56) },
  onsen: { yaw: 0, elev: deg(52) },
};
const smooth = THREE.MathUtils.smoothstep,
  lerp = THREE.MathUtils.lerp;
export async function eastCoastPlace(game) {
  const w = await sliced(eastCoastSteps()); // in slices between frames: it's built while the east lane is played
  const row = POSE.row;
  const cam = new RoomCam({ ...w.camera, yaw: row.yaw });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const T = w.turns;
  const turn = turningCam(cam, (x, z) => {
    const r = (1 - smooth(x, T.row.x[0], T.row.x[1])) * smooth(z, T.row.z[0], T.row.z[1]),
      o = 1 - smooth(z, T.onsen.z[0], T.onsen.z[1]);
    return {
      yaw: lerp(lerp(POSE.coast.yaw, POSE.onsen.yaw, o), row.yaw, r),
      elev: lerp(lerp(POSE.coast.elev, POSE.onsen.elev, o), row.elev, r),
    };
  });
  const door = w.doors[0],
    out = w.exits.east_lane,
    west = w.exits.sports;
  const pool = roadClosure({ nav: w.nav, space: w.root }, west, (x, z) => inRect(x, z, west.zone));
  const visit = coastVisit(game, { w, K }); // day 2's lookout: Mr. Hamada and the view (coast-visit.js)
  const things = {
    dorm_street: {
      ...PLACE_DETAILS.east_coast.things.dorm_street,
      anchor: (v) => v.set(out.lane[0], 1.1, out.lane[1]),
      spot: () => out.lane,
      face: () => out.edge,
    },
    // closed for resurfacing on day 2 (places/closure.js): the pin on the barrier, the spot in front of it
    courts_walk: {
      ...PLACE_DETAILS.east_coast.things.courts_walk,
      anchor: (v) => {
        const p = pool.closed() ? pool.at() : west.lane;
        return v.set(p[0], 1.1, p[1]);
      },
      spot: () => (pool.closed() ? pool.spot() : west.lane),
      face: () => west.edge,
    },
    // the lookout nook (day 2's quiet view out to sea)
    lookout: {
      ...PLACE_DETAILS.east_coast.things.lookout,
      anchor: (v) => v.set(w.nooks.east_coast_lookout[0], 1.1, w.nooks.east_coast_lookout[1]),
      spot: () => w.nooks.east_coast_lookout,
      face: () => w.nooks.east_coast_lookout,
      enabled: () => game.runner.has('talk:lookout'),
    },
    kuroda: { ...PLACE_DETAILS.east_coast.things.kuroda, ...visit.thing('kuroda') },
    onsen: {
      ...PLACE_DETAILS.east_coast.things.onsen,
      anchor: (v) => v.set(door.local[0], 1.95, door.local[1]),
      spot: () => door.step,
      face: () => door.local,
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
    spots: {
      row_entry: w.in,
      east_coast_lookout: w.nooks.east_coast_lookout,
      east_coast_shrine: w.nooks.east_coast_shrine,
      lookout_view: visit.spots.lookout_view,
    },
    seats: {},
    people: { kuroda: visit.people.kuroda },
    zones: {
      row_exit: (x, z) => inRect(x, z, out.zone),
      courts_exit: (x, z) => inRect(x, z, west.zone),
    },
    hooks: { coastVisit: visit.hooks.coastVisit },
    onDay: (day) => pool.sync(day),
    fit(aspect) {
      followFit(cam, w.nav, aspect, POSE.coast); // fitted at the coast's look, kept through the turns
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      turn.steer(p, dt);
      // heading for a way out: build the next place now, so the walk there needs no loading pause
      const near = ([x0, x1, z0, z1], d = 6) => p.x > x0 - d && p.x < x1 + d && p.z > z0 - d && p.z < z1 + d;
      if (near(out.zone) && !game.prepared.east_lane) game.prepare?.('east_lane');
      if (near(west.zone) && !game.prepared.sports && !pool.closed()) game.prepare?.('sports');
    },
    onPeriod(period) {
      w.cards(sim.day, period); // the shops' door cards for the day and the time (scenes/shop-signs.js WHEN)
      if (period !== 'evening' || P.grade === eveningGrade(sim.day)) return;
      eveningLight(w.scene, sim.day);
      w.evening();
      w.follow(game.player.root.position.x, game.player.root.position.z);
      P.grade = eveningGrade(sim.day);
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
    // in off the dorm street onto the row, walking east; out the same way; from the sports ground in along the
    // courts walk to the onsen path's foot, walking east, and out the same way
    tripIn: (g) => walkIn(g, cam, w.arriveEdge, w.in, Math.PI / 2),
    tripInFrom: { sports: (g) => walkIn(g, cam, west.edge, west.in, Math.PI / 2) },
    tripOutTo: Object.fromEntries(
      Object.entries(w.exits).map(([to, e]) => [to, (g) => walkOut(g, cam, e.lane, e.edge)]),
    ),
  };
  visit.install(P);
  return P;
}
