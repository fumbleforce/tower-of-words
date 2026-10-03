import * as THREE from 'three';
import { worksSteps } from '../scenes/works.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { inRect, POSES, TURN_LANE, TURN_STREET, TURN_APRON } from '../scenes/works/plan.js';
import * as LAYOUT from '../scenes/island-layout.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkIn, walkOutNearest, viaOf } from './edge-walk.js';
import { turningCam, followFit } from './turning-cam.js';

// The old works (scenes/works.js): up the works lane from the supply yard to the power plant's door and the
// chimney's foot, along the works yard past the factory's gates and the server hall, down the works street to the
// office street past the recycling centre, and along the research walk to Amakawa Research; it also loads with
// ?place=works. The factory's gates and the plant's door are chained; the server hall, the recycling centre and
// Amakawa Research are shut for now (their doors say so). Both ways out lead to the harbour chunk: down the lane
// into the supply yard, down the street onto the office street.
//
// The camera looks up the lane from the south-east, so the plant's door faces it; over the yard from a little east
// of south, so the shed, the factory's gates and the gatehouse face it; on the hall apron from the south-east, so
// the server hall's door faces it; up the street and the research walk from the south-west, so the recycling
// centre's and Amakawa Research's doors face it (plan.js POSES). It eases between them as he walks, and snaps on a
// jump (a trip, a restored save).
const smooth = THREE.MathUtils.smoothstep,
  lerp = THREE.MathUtils.lerp;
const [AX, AZ] = LAYOUT.CHUNKS.works.at;
const NORTH = Math.PI;
export async function worksPlace(game) {
  const w = await sliced(worksSteps()); // in slices between frames: it's built while the harbour is played
  const { lane, yard, apron, street } = POSES;
  const cam = new RoomCam({ elev: 55, fov: 24, yaw: lane.yaw });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const turn = turningCam(cam, (x, z) => {
    const l = 1 - smooth(x + AX, TURN_LANE[0], TURN_LANE[1]),
      s = smooth(x + AX, TURN_STREET[0], TURN_STREET[1]),
      a = smooth(z + AZ, TURN_APRON[0], TURN_APRON[1]);
    const blend = (k) => lerp(lerp(lerp(yard[k], apron[k], a), lane[k], l), street[k], s);
    return { yaw: blend('yaw'), elev: blend('elev') };
  });
  const { lane: down, street: south } = w.exits;
  // the shut doors (plan.js DOORS): where each is, and where Eric stands to try it
  const dk = (id) => w.doors.find((d) => d.id === id);
  const pin = (v, id) => v.set(dk(id).local[0], 1.95, dk(id).local[1]);
  const things = {
    // the ways out (plan.js EXITS)
    harbour_lane: {
      ...PLACE_DETAILS.works.things.harbour_lane,
      anchor: (v) => v.set(down.lane[0], 1.1, down.lane[1]),
      spot: () => down.lane,
      face: () => down.edge,
    },
    office_street: {
      ...PLACE_DETAILS.works.things.office_street,
      anchor: (v) => v.set(south.lane[0], 1.1, south.lane[1]),
      spot: () => south.lane,
      face: () => south.edge,
    },
    // the chained and the shut doors
    old_power_plant: {
      ...PLACE_DETAILS.works.things.old_power_plant,
      anchor: (v) => pin(v, 'old_power_plant'),
      spot: () => dk('old_power_plant').step,
      face: () => dk('old_power_plant').local,
    },
    old_factory: {
      ...PLACE_DETAILS.works.things.old_factory,
      anchor: (v) => pin(v, 'old_factory'),
      spot: () => dk('old_factory').step,
      face: () => dk('old_factory').local,
    },
    server_hall: {
      ...PLACE_DETAILS.works.things.server_hall,
      anchor: (v) => pin(v, 'server_hall'),
      spot: () => dk('server_hall').step,
      face: () => dk('server_hall').local,
    },
    recycling_centre: {
      ...PLACE_DETAILS.works.things.recycling_centre,
      anchor: (v) => pin(v, 'recycling_centre'),
      spot: () => dk('recycling_centre').step,
      face: () => dk('recycling_centre').local,
    },
    research_lab: {
      ...PLACE_DETAILS.works.things.research_lab,
      anchor: (v) => pin(v, 'research_lab'),
      spot: () => dk('research_lab').step,
      face: () => dk('research_lab').local,
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
    startFacing: NORTH,
    music: 'calm',
    grade: MORNING_GRADE,
    things,
    // where he comes in, and the nooks (plan.js NOOKS)
    spots: {
      lane_entry: w.in,
      chimney_foot: w.nooks.chimney_foot,
      smoking_corner: w.nooks.smoking_corner,
      gatehouse_window: w.nooks.gatehouse_window,
      transformer_lot: w.nooks.transformer_lot,
      weather_station: w.nooks.weather_station,
    },
    seats: {},
    people: {},
    zones: {
      lane_exit: (x, z) => inRect(x, z, down.zone),
      street_exit: (x, z) => inRect(x, z, south.zone),
    },
    hooks: {},
    fit(aspect) {
      followFit(cam, w.nav, aspect, yard); // fitted at the yard's look, kept through the turns
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      turn.steer(p, dt);
      // heading for a way out: build the harbour now, so the walk there needs no loading pause
      const near = ([x0, x1, z0, z1], d = 6) => p.x > x0 - d && p.x < x1 + d && p.z > z0 - d && p.z < z1 + d;
      if ((near(down.zone) || near(south.zone)) && !game.prepared.harbour) game.prepare?.('harbour');
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
    // in from the harbour up the lane or up the street, the way he left it, walking north; out by the way nearest
    tripIn: (g) => {
      const e = viaOf(g, 'lane') === 'street' ? south : down;
      return walkIn(g, cam, e.arrive, e.in, NORTH);
    },
    tripOutTo: { harbour: (g) => walkOutNearest(g, cam, { lane: down, street: south }) },
  };
  return P;
}
