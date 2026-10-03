import * as THREE from 'three';
import { plazaSteps } from '../scenes/plaza.js';
import { BASIN } from '../scenes/plaza/plan.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, eveningGrade, MORNING_GRADE } from '../scenes/town.js';
import { sim } from '../sim.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';
import { canteenClosing } from './canteen-closing.js';
import { hasBoard, readBoard } from '../finds/index.js';

// The fountain plaza: a side trip east of the forecourt in the morning, and on the walk home after work, with the
// lane on east into the east lane in the morning and to the dorm courtyard after work. Down the cross walk, the south
// walk leads on to the shop street.
export async function plazaPlace(game) {
  const w = await sliced(plazaSteps()); // in slices between frames: it's built while the forecourt is played
  const cam = new RoomCam(w.camera); // the forecourt's camera, so the walk between them keeps its angle
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const canteen = canteenClosing(game, w.root, w.nav, w.chairs); // after work: the terrace closing
  const spots = {
    office_entry: w.arriveIn,
    fountain_edge: w.fountainEdge,
    dorm_exit: w.dormExit,
    shop_walk: w.shopWalk,
    plaza_seat_bay: w.nooks.plaza_seat_bay,
    plaza_shrine: w.nooks.plaza_shrine,
  };
  const things = {
    office_lane: {
      ...PLACE_DETAILS.plaza.things.office_lane,
      anchor: (v) => v.set(w.westLane[0], 1.1, w.westLane[1]),
      spot: () => w.westLane,
      face: () => w.westEdge,
    },
    fountain: {
      ...PLACE_DETAILS.plaza.things.fountain,
      anchor: (v) => v.set(w.fountain[0], 3.1, w.fountain[1]),
      spot: () => w.fountainEdge,
      keep: BASIN + 0.3, // the whole basin stays clear of the goal's edge arrow (ui/goal-arrow.js)
      face: () => w.fountain,
    },
    dorm_lane: {
      ...PLACE_DETAILS.plaza.things.dorm_lane,
      anchor: (v) => v.set(w.dormExit[0], 1.1, w.dormExit[1]),
      spot: () => w.dormExit,
      face: () => w.dormEdge,
    },
    // the training centre's door up the cross walk (block_e1): locked, it says why (story/plaza.js)
    training_door: {
      ...PLACE_DETAILS.plaza.things.training_door,
      anchor: (v) => v.set(w.trainingDoor[0], 2.0, w.trainingDoor[1]),
      spot: () => w.trainingStep,
      face: () => w.trainingDoor,
    },
    canteen_table: {
      ...PLACE_DETAILS.plaza.things.canteen_table,
      anchor: (v) => canteen.anchor(v),
      spot: canteen.spot,
      face: canteen.face,
      obj: canteen.obj,
    },
    // the worker closing the terrace after work, a person to talk to like anyone (#106); the chair is the table's
    canteen_worker: {
      ...PLACE_DETAILS.plaza.things.canteen_worker,
      anchor: (v) => {
        canteen.person.root.getWorldPosition(v);
        v.y += 1.25;
        return v;
      },
      spot: () => {
        const r = canteen.person.root;
        return [r.position.x + Math.sin(r.rotation.y) * 0.6, r.position.z + Math.cos(r.rotation.y) * 0.6];
      },
      face: () => [canteen.person.root.position.x, canteen.person.root.position.z],
      enabled: () => canteen.person.root.visible && !canteen.person._walk,
    },
    // the notice board: reading it holds its posts up close (ui/finds-view.js), posts from story/finds.js
    noticeboard: {
      ...PLACE_DETAILS.plaza.things.noticeboard,
      anchor: (v) => v.set(w.board.at[0], w.board.top + 0.35, w.board.at[1]),
      spot: () => [w.board.at[0], w.board.at[1] - 0.85],
      face: () => w.board.at,
      enabled: () => hasBoard('plaza_board'),
      act: () => readBoard('plaza_board'),
    },
    // the south walk off the cross walk's foot, on to the shop street (places/shotengai.js)
    shop_walk: {
      ...PLACE_DETAILS.plaza.things.shop_walk,
      anchor: (v) => v.set(w.shopWalk[0], 1.1, w.shopWalk[1]),
      spot: () => w.shopWalk,
      face: () => w.shopEdge,
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
    start: w.arriveIn,
    startFacing: w.arriveFace,
    music: 'calm',
    grade: MORNING_GRADE,
    things,
    spots,
    seats: {},
    people: { canteen_worker: canteen.person },
    zones: {
      office_lane: (x, z) => x < w.westX && z > w.laneZ(x) - 2.4,
      dorm_exit: (x, z) => x > w.eastX && Math.abs(z - w.laneZ(x)) < 2.4,
      shop_walk: (x, z) => x > w.shopX && z > w.swZ,
    },
    hooks: { canteenChair: canteen.hooks.canteenChair },
    pigeons: w.pigeons, // the flock by the fountain (scenes/outdoor/pigeons.js), for checks
    fit(aspect) {
      // both: the phone's camera distance (as in the forecourt and the dorm courtyard, so the walks between them
      // crossfade on the same close framing), following him over the plaza, a little ahead to the north
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-9.6, 0, 0),
            new THREE.Vector3(9.6, 0, 0),
            new THREE.Vector3(0, 0, -4),
            new THREE.Vector3(0, 0, 4),
          ],
          new THREE.Vector3(0, 0, 0),
          {
            follow: true,
            clamp: [-8, 12.5, -11.5, 6.8], // east as far as the training centre's door
            lead: -1.4,
            limY: 0.96,
          },
        );
      else
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-2.9, 0, 0),
            new THREE.Vector3(2.9, 0, 0),
            new THREE.Vector3(0, 0, -2.6),
            new THREE.Vector3(0, 1.2, 2.4),
          ],
          new THREE.Vector3(0, 0, 0),
          { follow: true, clamp: [-12.5, 18, -14.5, 8.8], lead: -3.4 },
        );
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt, t) {
      w.update(dt, t);
      w.pigeons.update(dt, t, game.player.root.position);
      canteen.update(dt, t);
      // heading east after work: build the dorm courtyard now, so the walk there needs no loading pause
      if (sim.period === 'evening' && game.player.root.position.x > 2.5 && !game.prepared.dorm_court)
        game.prepare?.('dorm_court');
      // down the cross walk toward the south walk: build the shop street now, for the same reason
      const p = game.player.root.position;
      if (p.x > w.shopX - 4 && p.z > w.laneZ() + 2.4 && !game.prepared.shotengai) game.prepare?.('shotengai');
      // heading east before work is over: the lane goes on into the east lane
      if (sim.period !== 'evening' && p.x > w.eastX - 6 && !game.prepared.east_lane) game.prepare?.('east_lane');
    },
    onPeriod(period) {
      w.cards(sim.day, period); // the shops' door cards for the day and the time (scenes/shop-signs.js WHEN)
      canteen.sync(); // on every entry: the terrace open, or closing after work
      if (period !== 'evening' || P.grade === eveningGrade(sim.day, 'plaza')) return;
      eveningLight(w.scene, sim.day, { pool: 1.5 });
      w.evening();
      P.grade = eveningGrade(sim.day, 'plaza');
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }), canteen: canteen.snapshot() };
    },
    restoreState(saved) {
      canteen.restore(saved.world?.canteen);
      if (!saved.world?.player) return;
      restorePeople({ eric: game.player }, saved.world.player);
      // a save from before the plaza was rebuilt at the map's scale can stand in the basin or a bed
      const p = game.player.root.position;
      if (!w.nav.free(p.x, p.z)) p.set(w.arriveIn[0], p.y, w.arriveIn[1]);
      game.walker.sync();
      cam.snap(game.player.root.position);
    },
    tripOutTo: {
      forecourt: (g) => walkOut(g, cam, w.westLane, w.westEdge),
      dorm_court: (g) => walkOut(g, cam, w.dormExit, w.dormEdge),
      shotengai: (g) => walkOut(g, cam, w.shopWalk, w.shopEdge),
      east_lane: (g) => walkOut(g, cam, w.dormExit, w.dormEdge),
    },
    tripInFrom: {
      forecourt: (g) => walkIn(g, cam, w.arriveEdge, w.arriveIn, w.arriveFace),
      shotengai: (g) => walkIn(g, cam, w.shopEdge, w.shopWalk, -Math.PI / 2),
      east_lane: (g) => walkIn(g, cam, w.dormEdge, w.dormExit, -Math.PI / 2),
    },
  };
  return P;
}
