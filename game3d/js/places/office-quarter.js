import * as THREE from 'three';
import { officeQuarterSteps } from '../scenes/office-quarter.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { inRect, POSES, TURN_X, TURN_Z, TURN_S } from '../scenes/office-quarter/plan.js';
import * as LAYOUT from '../scenes/island-layout.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';
import { turningCam, followFit } from './turning-cam.js';

// The office quarter (scenes/office-quarter.js): the sports lane walked on west from the sports ground, round the
// gym's corner and west along the office street past the offices and the bank; it also loads with
// ?place=office_quarter. Every door is shut for now (each says so). East past the gym's corner goes back to the
// sports ground; west past the harbour walk goes on to the harbour.
//
// The camera looks north-north-west along the street from a little east of south, so the offices' fronts on its
// north side face it and the bank, south of the street, stays east of the line to Eric; up the walks north between
// the blocks it looks north; in the quarter street's mouth from the south-east, so the bank's door faces it; by the
// gym it turns to the sports lane's look, as the sports ground has it there
// (plan.js POSES). It eases between them as he walks, and snaps on a jump (a trip, a restored save).
const smooth = THREE.MathUtils.smoothstep,
  lerp = THREE.MathUtils.lerp;
const [AX, AZ] = LAYOUT.CHUNKS.office_quarter.at;
export async function officeQuarterPlace(game) {
  const w = await sliced(officeQuarterSteps()); // in slices between frames: it's built while the sports ground is played
  const { street, walks, mouth, lane } = POSES;
  const cam = new RoomCam({ elev: 55, fov: 24, yaw: street.yaw });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const turn = turningCam(cam, (x, z) => {
    const l = smooth(x + AX, TURN_X[0], TURN_X[1]),
      v = 1 - smooth(z + AZ, TURN_Z[1], TURN_Z[0]),
      m = smooth(z + AZ, TURN_S[0], TURN_S[1]);
    const blend = (k) => lerp(lerp(lerp(street[k], walks[k], v), mouth[k], m), lane[k], l);
    return { yaw: blend('yaw'), elev: blend('elev') };
  });
  const back = w.exits.sports,
    west = w.exits.harbour;
  // the shut doors (plan.js DOORS): where each is, and where Eric stands to try it
  const dk = (id) => w.doors.find((d) => d.id === id);
  const pin = (v, id) => v.set(dk(id).local[0], 1.95, dk(id).local[1]);
  const things = {
    // the way out (plan.js EXITS)
    sports_lane: {
      ...PLACE_DETAILS.office_quarter.things.sports_lane,
      anchor: (v) => v.set(back.lane[0], 1.1, back.lane[1]),
      spot: () => back.lane,
      face: () => back.edge,
    },
    harbour: {
      ...PLACE_DETAILS.office_quarter.things.harbour,
      anchor: (v) => v.set(west.lane[0], 1.1, west.lane[1]),
      spot: () => west.lane,
      face: () => west.edge,
    },
    // the shut doors, west to east and the bank
    trading_office: {
      ...PLACE_DETAILS.office_quarter.things.trading_office,
      anchor: (v) => pin(v, 'trading_office'),
      spot: () => dk('trading_office').step,
      face: () => dk('trading_office').local,
    },
    foods_office: {
      ...PLACE_DETAILS.office_quarter.things.foods_office,
      anchor: (v) => pin(v, 'foods_office'),
      spot: () => dk('foods_office').step,
      face: () => dk('foods_office').local,
    },
    electric_office: {
      ...PLACE_DETAILS.office_quarter.things.electric_office,
      anchor: (v) => pin(v, 'electric_office'),
      spot: () => dk('electric_office').step,
      face: () => dk('electric_office').local,
    },
    logistics_office: {
      ...PLACE_DETAILS.office_quarter.things.logistics_office,
      anchor: (v) => pin(v, 'logistics_office'),
      spot: () => dk('logistics_office').step,
      face: () => dk('logistics_office').local,
    },
    construction_office: {
      ...PLACE_DETAILS.office_quarter.things.construction_office,
      anchor: (v) => pin(v, 'construction_office'),
      spot: () => dk('construction_office').step,
      face: () => dk('construction_office').local,
    },
    insurance_office: {
      ...PLACE_DETAILS.office_quarter.things.insurance_office,
      anchor: (v) => pin(v, 'insurance_office'),
      spot: () => dk('insurance_office').step,
      face: () => dk('insurance_office').local,
    },
    bank: {
      ...PLACE_DETAILS.office_quarter.things.bank,
      anchor: (v) => pin(v, 'bank'),
      spot: () => dk('bank').step,
      face: () => dk('bank').local,
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
    startFacing: -Math.PI / 2,
    music: 'calm',
    grade: MORNING_GRADE,
    things,
    spots: { street_entry: w.in, office_smokers: w.nooks.office_smokers, office_vending: w.nooks.office_vending },
    seats: {},
    people: {},
    zones: {
      east_exit: (x, z) => inRect(x, z, back.zone),
      west_exit: (x, z) => inRect(x, z, west.zone),
    },
    hooks: {},
    fit(aspect) {
      followFit(cam, w.nav, aspect, street); // fitted at the street's look, kept through the turns
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      turn.steer(p, dt);
      // heading for a way out: build the place there now, so the walk there needs no loading pause
      const near = ([x0, x1, z0, z1], d = 6) => p.x > x0 - d && p.x < x1 + d && p.z > z0 - d && p.z < z1 + d;
      if (near(back.zone) && !game.prepared.sports) game.prepare?.('sports');
      if (near(west.zone) && !game.prepared.harbour) game.prepare?.('harbour');
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
    // in from the sports ground round the gym's corner onto the street, walking west; from the harbour east along
    // the street; out the ways plan.js EXITS gives
    tripIn: (g) => walkIn(g, cam, w.arriveEdge, w.in, -Math.PI / 2),
    tripInFrom: { harbour: (g) => walkIn(g, cam, west.arrive, west.in, Math.PI / 2) },
    tripOutTo: Object.fromEntries(
      Object.entries(w.exits).map(([to, e]) => [to, (g) => walkOut(g, cam, e.lane, e.edge)]),
    ),
  };
  return P;
}
