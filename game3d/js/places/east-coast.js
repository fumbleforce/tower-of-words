import { conversationCamera } from './conversation-camera.js';
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
import { walkOut, walkIn, walkOutNearest } from './edge-walk.js';
import { turningCam, followFit } from './turning-cam.js';
import { roadClosure } from './closure.js';
import { coastVisit } from './coast-visit.js';
import { day3Place } from './day3/place.js';

// The east coast (scenes/east-coast.js): the dorm quarter (Review dorm-quarter-5) walked from the east lane's dorm
// street along the row and the promenade, through the park, along the beach promenade and the north path, on to the
// onsen's front; it also loads with ?place=east_coast. The onsen is shut for now (its door says so). West along the row
// or the promenade goes back to the east lane; west along the courts walk from the onsen path's foot goes on to the
// sports ground (the gym, the pool and the courts walk, scenes/sports.js); the common room's door opens on the
// promenade.
//
// The camera turns by where he is (plan.js TURNS): east down the row; north over the park from the promenade and in
// the park, so the blocks behind it face it; north-east along the beach promenade, the sea on the right; north in the
// north, to the gardens and up the onsen path; south over the coastal garden to the sea. It eases between them as he
// walks, and snaps on a jump (a trip, a restored save).
const deg = THREE.MathUtils.degToRad;
const POSE = {
  row: { yaw: -Math.PI / 2 - 0.25, elev: deg(58) }, // a little from the north, steep: the row's trees are on its south side
  park: { yaw: 0.25, elev: deg(56) }, // from the south over the promenade, a little from the east
  beach: { yaw: -0.55, elev: deg(56) }, // from the south-west, along the sea
  north: { yaw: 0.1, elev: deg(54) },
  south: { yaw: Math.PI - 0.18, elev: deg(56) }, // the villas' gardens and the sea beyond
};
export async function eastCoastPlace(game) {
  const w = await sliced(eastCoastSteps()); // in slices between frames: it's built while the east lane is played
  const cam = new RoomCam({ ...w.camera, yaw: POSE.row.yaw });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const T = w.turns;
  const turn = turningCam(cam, (x, z) => {
    if (inRect(x, z, T.row)) return POSE.row;
    if (inRect(x, z, T.beach)) return POSE.beach;
    if (inRect(x, z, T.south)) return POSE.south;
    if (inRect(x, z, T.park)) return POSE.park;
    return POSE.north;
  });
  const door = w.doors[0],
    commons = w.doors[1],
    out = w.exits.east_lane,
    west = w.exits.sports;
  const pool = roadClosure({ nav: w.nav, space: w.root }, west, (x, z) => inRect(x, z, west.zone));
  const visit = coastVisit(game, { w, K }); // day 2's lookout: Mr. Hamada and the view (coast-visit.js)
  const d3 = day3Place(game, 'east_coast', { root: w.root, K, ids: ['emi', 'aoi', 'kuro', 'tama', 'rei'] }); // day 3: the sea terrace
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
    emi: { ...PLACE_DETAILS.east_coast.things.emi, ...d3.thing('emi') },
    aoi: { ...PLACE_DETAILS.east_coast.things.aoi, ...d3.thing('aoi') },
    onsen: {
      ...PLACE_DETAILS.east_coast.things.onsen,
      anchor: (v) => v.set(door.local[0], 1.95, door.local[1]),
      spot: () => door.step,
      face: () => door.local,
    },
    // the common room's glazed door on the inner court (places/commons.js)
    commons: {
      ...PLACE_DETAILS.east_coast.things.commons,
      anchor: (v) => v.set(commons.local[0], 1.95, commons.local[1]),
      spot: () => commons.step,
      face: () => commons.local,
    },
    kuro: { ...PLACE_DETAILS.east_coast.things.kuro, ...d3.thing('kuro') },
    tama: { ...PLACE_DETAILS.east_coast.things.tama, ...d3.thing('tama') },
    rei: { ...PLACE_DETAILS.east_coast.things.rei, ...d3.thing('rei') },
  };
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    followCameraLift: 2.0, // keep the actor visible when the terrace pine compresses the follow camera
    start: w.in,
    outingExit: { lane: w.in, edge: w.arriveEdge },
    startFacing: Math.PI / 2,
    music: 'day',
    grade: MORNING_GRADE,
    things,
    spots: {
      row_entry: w.in,
      east_coast_lookout: w.nooks.east_coast_lookout,
      east_coast_shrine: w.nooks.east_coast_shrine,
      lookout_view: visit.spots.lookout_view,
      inner_court: w.inner.square,
      inner_court_bench: w.inner.bench,
      terrace_bench: w.terraceBench,
      coast_garden_pergola: [-37.05, 7.5],
      coast_garden_lawn: [-26.1, 14.7],
      coast_garden_rest: [-19, 16.5],
    },
    seats: {},
    people: {
      kuroda: visit.people.kuroda,
      emi: d3.people.emi,
      aoi: d3.people.aoi,
      kuro: d3.people.kuro,
      tama: d3.people.tama,
      rei: d3.people.rei,
    },
    zones: {
      // west along the row or along the promenade, both to the east lane (EXITS.east_lane.ways)
      row_exit: (x, z) => Object.values(out.ways).some((way) => inRect(x, z, way.zone)),
      courts_exit: (x, z) => inRect(x, z, west.zone),
    },
    hooks: { coastVisit: visit.hooks.coastVisit },
    day3: (a) => d3.setup(P, a),
    onDay: (day) => pool.sync(day),
    fit(aspect) {
      followFit(cam, w.nav, aspect, POSE.park); // fitted at the park's look, kept through the turns
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt, t) {
      d3.update(dt);
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      w.update(t); // sea motion and the bands' laid shadows on the sun's side (scenes/bands.js)
      turn.steer(p, dt);
      // heading for a way out: build the next place now, so the walk there needs no loading pause
      const near = ([x0, x1, z0, z1], d = 6) => p.x > x0 - d && p.x < x1 + d && p.z > z0 - d && p.z < z1 + d;
      if (Object.values(out.ways).some((way) => near(way.zone)) && !game.prepared.east_lane)
        game.prepare?.('east_lane');
      if (near(west.zone) && !game.prepared.sports && !pool.closed()) game.prepare?.('sports');
      const [cx, cz] = commons.step;
      if (Math.hypot(p.x - cx, p.z - cz) < 7 && !game.prepared.dorm_commons) game.prepare?.('dorm_commons');
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
    // in off the dorm street onto the row, walking east; out the same way or west along the promenade; from the
    // sports ground in along the courts walk to the onsen path's foot, walking east, and out the same way
    tripIn: (g) => walkIn(g, cam, w.arriveEdge, w.in, Math.PI / 2),
    tripInFrom: {
      sports: (g) => walkIn(g, cam, west.edge, west.in, Math.PI / 2),
      // out of the common room's glazed door onto its apron on the promenade, walking south
      dorm_commons: (g) => walkIn(g, cam, commons.local, commons.step, 0),
    },
    tripOutTo: {
      ...Object.fromEntries(Object.entries(w.exits).map(([to, e]) => [to, (g) => walkOut(g, cam, e.lane, e.edge)])),
      // the row or the promenade, whichever he is on; the east lane brings him in at its end of it
      east_lane: (g) => walkOutNearest(g, cam, out.ways),
      dorm_commons: (g) => walkOut(g, cam, commons.step, commons.local),
    },
  };
  visit.install(P);
  conversationCamera(game, P, {
    kenji: { seated: true, yaw: 0.6, elev: 30, fov: 45, minDistance: 4, halfWidth: 1.15, height: 0.15 },
  });
  return P;
}
