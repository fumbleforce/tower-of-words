import * as THREE from 'three';
import { sportsSteps } from '../scenes/sports.js';
import * as D from '../scenes/sports/deck-plan.js';
import { pt } from '../scenes/sports/plan.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { PLACE_DETAILS } from './catalog.js';
import { poolSave } from './day3/pool-save.js';
import { walkOut, walkIn } from './edge-walk.js';
import { followFit } from './turning-cam.js';
import { MC } from '../mc.js';
import { sim } from '../sim.js';
import { day3Place } from './day3/place.js';
import { poolClub } from './day3/swim.js';
import { poolOutfits } from './day3/pool-outfits.js';
import { changingPlan, CHANGING_ENTRY } from '../scenes/sports/changing-room.js';

// Shared sports world with a cutaway pavilion, own changing-room route and deck navigation.
// Day 3's swimming choreography owns water movement; normal walking stays on dry floor.
const deg = THREE.MathUtils.degToRad;
const LOOK = { yaw: D.LOOK.yaw, elev: deg(D.LOOK.elev) };
const seat = ({ at, top, ry }) => {
  const [x, z] = pt(at);
  return { x, z, top, ry, out: [x + Math.sin(ry) * 0.6, z + Math.cos(ry) * 0.6] };
};
export async function poolPlace(game) {
  const closed = sim.day === 4;
  const changing = changingPlan(MC.gender);
  const w = await sliced(
    sportsSteps(
      closed
        ? {}
        : {
            walks: [...D.WALKS, ...changing.walks],
            blocks: [...D.BLOCKS, ...changing.blocks],
            start: CHANGING_ENTRY.inside,
            poolInterior: true,
          },
    ),
  );
  const cam = new RoomCam({ ...w.camera, yaw: D.LOOK.yaw, elev: D.LOOK.elev }); // elev in degrees here
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const door = w.doors.find((d) => d.id === 'pool');
  const out = closed ? { edge: door.local, lane: door.step, in: door.step } : MC.gender === 'woman' ? D.EXIT_W : D.EXIT; // the protagonist's own changing room
  const d3 = day3Place(game, 'pool', { root: w.root, K, ids: ['emi', 'kuro', 'attendant', 'member'] });
  const outfits = closed ? null : await poolOutfits(game, d3.cast);
  const club = poolClub(game, { root: w.root, cast: d3.cast, outfits });
  d3.also(() => club.arrange());
  const things = {
    // The real pavilion exit; the changing rooms are walkable rooms inside this place.
    changing_room: {
      ...PLACE_DETAILS.pool.things.changing_room,
      anchor: (v) => {
        const q = closed ? out.edge : CHANGING_ENTRY.edge;
        return v.set(q[0], 1.5, q[1]);
      },
      spot: () => (closed ? out.lane : CHANGING_ENTRY.inside),
      face: () => (closed ? out.edge : CHANGING_ENTRY.edge),
    },
    emi: { ...PLACE_DETAILS.pool.things.emi, ...d3.thing('emi') },
    kuro: { ...PLACE_DETAILS.pool.things.kuro, ...d3.thing('kuro') },
    attendant: { ...PLACE_DETAILS.pool.things.attendant, ...d3.thing('attendant') },
    member: { ...PLACE_DETAILS.pool.things.member, ...d3.thing('member') },
    pool_goggles: {
      ...PLACE_DETAILS.pool.things.pool_goggles,
      ...club.goggles(),
      anchor: (v) => club.goggles().anchor(v),
    },
    pool_notice: {
      ...PLACE_DETAILS.pool.things.pool_notice,
      anchor: (v) => P.sunday.things.pool_notice.anchor(v),
      spot: () => P.sunday.things.pool_notice.spot(),
      face: () => P.sunday.things.pool_notice.face(),
      enabled: () => P.sunday.things.pool_notice.enabled(),
    },
  };
  let shownPeriod;
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: closed ? out.in : CHANGING_ENTRY.inside,
    changing: closed ? null : changing,
    creatureExclusions: closed ? [] : [changing.bounds],
    startFacing: 0,
    music: 'calm',
    grade: MORNING_GRADE,
    things,
    spots: {
      deck_in: out.in,
      pool_steps: D.SPOTS.pool_steps,
      pool_blocks: D.SPOTS.pool_blocks,
      lifeguard_chair: D.SPOTS.lifeguard_chair,
      deck_benches: D.SPOTS.deck_benches,
      float_rack: D.SPOTS.float_rack,
      pool_fence_corner: D.NOOK_SPOTS.pool_fence_corner,
      pool_lost_property: D.NOOK_SPOTS.pool_lost_property,
    },
    seats: { deck_bench_n: seat(D.SEATS.deck_bench_n), deck_bench_s: seat(D.SEATS.deck_bench_s) },
    people: { emi: d3.people.emi, kuro: d3.people.kuro, attendant: d3.people.attendant, member: d3.people.member },
    zones: {},
    hooks: { poolSession: club.hooks.poolSession },
    day3: (a) => d3.setup(P, a),
    fit(aspect) {
      followFit(cam, w.nav, aspect, LOOK);
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      if (shownPeriod !== sim.period) P.onPeriod(sim.period);
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      w.update();
      d3.update(dt);
      club.update();
    },
    leave() {
      club.leave();
    },
    onPeriod(period) {
      shownPeriod = period;
      w.pool.onPeriod(period);
      if (period !== 'evening') {
        if (P.grade !== MORNING_GRADE) w.morning();
        P.grade = MORNING_GRADE;
        return;
      }
      if (P.grade === EVENING_GRADE) return;
      eveningLight(w.scene);
      w.evening();
      w.follow(game.player.root.position.x, game.player.root.position.z);
      P.grade = EVENING_GRADE;
    },
    // out of the changing room onto the deck, walking south; back in at its door
    tripIn: (g) =>
      walkIn(
        g,
        cam,
        closed ? out.edge : CHANGING_ENTRY.edge,
        closed ? out.in : CHANGING_ENTRY.inside,
        closed ? 0 : Math.PI / 2,
      ),
    tripOutTo: {
      sports: (g) =>
        walkOut(g, cam, closed ? out.lane : CHANGING_ENTRY.inside, closed ? out.edge : CHANGING_ENTRY.edge),
    },
  };
  const saved = poolSave(game, P, club);
  P.snapshotState = saved.snapshot;
  P.restoreState = saved.restore;
  return P;
}
