import * as THREE from 'three';
import { harbourSteps } from '../scenes/harbour.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { inRect, POSES, TURN_X, CAMPUS_EXIT } from '../scenes/harbour/plan.js';
import * as LAYOUT from '../scenes/island-layout.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn, walkOutNearest, viaOf } from './edge-walk.js';
import { turningCam, followFit } from './turning-cam.js';

// The harbour (scenes/harbour.js): the office street walked on west from the office quarter into the supply yard,
// out on the supply pier and the ferry pier, across the ferry landing to the terminal's door and the harbour office's,
// and south down the harbour walk; it also loads with ?place=harbour. The terminal opens as a local waiting room; the harbour office remains shut. East along the street goes back to the office quarter; north up the works lane out
// of the yard, or up the works street off the office street, goes on to the old works.
//
// The camera keeps the office street's look on the street and down the harbour walk; as Eric comes off the street
// into the yard it turns to look a little west of north and a little steeper over the yard, the landing and the
// piers, so the warehouse's, the office's and the terminal's fronts face it and the ships lie beside the piers
// (plan.js POSES). It eases between them as he walks, and snaps on a jump (a trip, a restored save).
const smooth = THREE.MathUtils.smoothstep,
  lerp = THREE.MathUtils.lerp;
const [AX] = LAYOUT.CHUNKS.harbour.at;
export async function harbourPlace(game) {
  const w = await sliced(harbourSteps()); // in slices between frames: it's built while the office street is played
  const { street, quay } = POSES;
  const cam = new RoomCam({ elev: 55, fov: 24, yaw: street.yaw });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const turn = turningCam(cam, (x) => {
    const q = 1 - smooth(x + AX, TURN_X[0], TURN_X[1]);
    return { yaw: lerp(street.yaw, quay.yaw, q), elev: lerp(street.elev, quay.elev, q) };
  });
  const back = w.exits.office_quarter,
    works = { lane: w.exits.works_lane, street: w.exits.works_street };
  // the shut doors (plan.js DOORS): where each is, and where Eric stands to try it
  const dk = (id) => w.doors.find((d) => d.id === id);
  const pin = (v, id) => v.set(dk(id).local[0], 1.95, dk(id).local[1]);
  const things = {
    campus: {
      ...PLACE_DETAILS.harbour.things.campus,
      anchor: (v) => v.set(CAMPUS_EXIT.lane[0], 1.1, CAMPUS_EXIT.lane[1]),
      spot: () => CAMPUS_EXIT.lane,
      face: () => CAMPUS_EXIT.edge,
    },
    // the way out (plan.js EXITS)
    office_street: {
      ...PLACE_DETAILS.harbour.things.office_street,
      anchor: (v) => v.set(back.lane[0], 1.1, back.lane[1]),
      spot: () => back.lane,
      face: () => back.edge,
    },
    works_lane: {
      ...PLACE_DETAILS.harbour.things.works_lane,
      anchor: (v) => v.set(works.lane.lane[0], 1.1, works.lane.lane[1]),
      spot: () => works.lane.lane,
      face: () => works.lane.edge,
    },
    works_street: {
      ...PLACE_DETAILS.harbour.things.works_street,
      anchor: (v) => v.set(works.street.lane[0], 1.1, works.street.lane[1]),
      spot: () => works.street.lane,
      face: () => works.street.edge,
    },
    // the shut doors
    ferry_terminal: {
      ...PLACE_DETAILS.harbour.things.ferry_terminal,
      anchor: (v) => pin(v, 'ferry_terminal'),
      spot: () => dk('ferry_terminal').step,
      face: () => dk('ferry_terminal').local,
    },
    harbour_office: {
      ...PLACE_DETAILS.harbour.things.harbour_office,
      anchor: (v) => pin(v, 'harbour_office'),
      spot: () => dk('harbour_office').step,
      face: () => dk('harbour_office').local,
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
    spots: {
      street_entry: w.in,
      harbour_pier_end: w.nooks.harbour_pier_end,
      harbour_shed_back: w.nooks.harbour_shed_back,
      harbour_ferry_lookout: w.nooks.harbour_ferry_lookout,
    },
    seats: {},
    people: {},
    zones: {
      campus_exit: (x, z) => inRect(x, z, CAMPUS_EXIT.zone),
      east_exit: (x, z) => inRect(x, z, back.zone),
      lane_exit: (x, z) => inRect(x, z, works.lane.zone),
      street_exit: (x, z) => inRect(x, z, works.street.zone),
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
      if (near(back.zone) && !game.prepared.office_quarter) game.prepare?.('office_quarter');
      if ((near(works.lane.zone) || near(works.street.zone)) && !game.prepared.works) game.prepare?.('works');
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
    // in from the office quarter west along the street past the harbour walk's mouth; out east along it. In from the
    // works down the lane or the street, the way he left them, walking south; out up the one nearest
    tripIn: (g) => walkIn(g, cam, w.arriveEdge, w.in, -Math.PI / 2),
    tripInFrom: {
      ferry_terminal: (g) => walkIn(g, cam, dk('ferry_terminal').local, dk('ferry_terminal').step, 0),
      campus: (g) => walkIn(g, cam, CAMPUS_EXIT.arrive, CAMPUS_EXIT.in, Math.PI),
      works: (g) => {
        const e = works[viaOf(g, 'lane')] || works.lane;
        return walkIn(g, cam, e.arrive, e.in, 0);
      },
    },
    tripOutTo: {
      ferry_terminal: (g) => walkOut(g, cam, dk('ferry_terminal').step, dk('ferry_terminal').local),
      campus: (g) => walkOut(g, cam, CAMPUS_EXIT.lane, CAMPUS_EXIT.edge),
      office_quarter: (g) => walkOut(g, cam, back.lane, back.edge),
      works: (g) => walkOutNearest(g, cam, works),
    },
  };
  return P;
}
