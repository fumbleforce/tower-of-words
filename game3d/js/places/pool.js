import * as THREE from 'three';
import { sportsSteps } from '../scenes/sports.js';
import * as D from '../scenes/sports/deck-plan.js';
import { pt } from '../scenes/sports/plan.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';
import { followFit } from './turning-cam.js';

// The pool deck (scenes/sports/deck-plan.js): the same world as the sports ground (scenes/sports.js), walked on the
// deck inside the pool's fence, round the 25 m pool. Eric comes in through the shower pavilion: in at its door on the
// pool walk, out of the men's changing room onto the deck (the trip from the sports ground); back the same way. It
// also loads with ?place=pool, outside the changing room. The camera looks a little east of north up the pool from
// the south-west, the pavilion behind it, following him.
const deg = THREE.MathUtils.degToRad;
const LOOK = { yaw: D.LOOK.yaw, elev: deg(D.LOOK.elev) };
const seat = ({ at, top, ry }) => {
  const [x, z] = pt(at);
  return { x, z, top, ry };
};
export async function poolPlace(game) {
  const w = await sliced(sportsSteps({ walks: D.WALKS, blocks: D.BLOCKS, start: D.EXIT.in }));
  const cam = new RoomCam({ ...w.camera, yaw: D.LOOK.yaw, elev: D.LOOK.elev }); // elev in degrees here
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const out = D.EXIT;
  const things = {
    // back through the men's changing room to the pavilion's door on the pool walk
    changing_room: {
      ...PLACE_DETAILS.pool.things.changing_room,
      anchor: (v) => v.set(out.edge[0], 1.95, out.edge[1]),
      spot: () => out.lane,
      face: () => out.edge,
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
    start: out.in,
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
    people: {},
    zones: {},
    hooks: {},
    fit(aspect) {
      followFit(cam, w.nav, aspect, LOOK);
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update() {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      w.update();
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
      if (!w.nav.free(p.x, p.z)) p.set(out.in[0], p.y, out.in[1]);
      game.walker.sync();
      cam.snap(game.player.root.position);
    },
    // out of the men's changing room onto the deck, walking south; back in at its door
    tripIn: (g) => walkIn(g, cam, out.edge, out.in, 0),
    tripOutTo: { sports: (g) => walkOut(g, cam, out.lane, out.edge) },
  };
  return P;
}
