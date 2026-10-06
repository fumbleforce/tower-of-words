import * as THREE from 'three';
import { dormCourtSteps } from '../scenes/dorm-court.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningGrade, MORNING_GRADE } from '../scenes/town.js';
import { sim } from '../sim.js';
import { walkIn, walkOut } from './edge-walk.js';
import { dormBath } from './dorm-bath.js';
import { glide } from '../move.js';
import { PLACE_DETAILS } from './catalog.js';
import { found } from '../finds/index.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { day3Place } from './day3/place.js';
import { HALL, BACK_Z, MANAGER } from '../scenes/dorm-court/plan.js';
import { DORM_LOOKS } from '../../story/dorm-building.js';

// The dorm courtyard, on the walk home after work; it also loads with ?place=dorm_court.
// Eric walks in through the hall doors himself; the trip out starts at the passage at the back of the hall and
// goes up the stairs to his floor (dorms).
const BOARD = [HALL[1] - 0.1, BACK_Z], // the hall's notice board, and the manager's window
  DESK = [(MANAGER[0] + MANAGER[1]) / 2, BACK_Z];
const FLAP_OPEN = -1.9, // mailbox 203's flap swung open
  MAIL_ZOOM = 6; // the camera close on it, the number, the tape and the flyer readable on a phone
export async function dormCourtPlace(game) {
  // in slices between frames: it's built while the plaza is played; in the morning light when entered before work (day 2)
  const morning = sim.day > 1 && sim.period !== 'evening';
  const w = await sliced(dormCourtSteps({ morning }));
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const bath = dormBath(game);
  const spots = {
    plaza_entry: w.plazaEntry,
    dorm_entry: w.dormEntry,
    hall: w.hall,
    passage: w.passage,
    bath: bath.spot,
  };
  const mb = w.mailbox,
    mbState = { seen: false, open: false }; // the flyer found; the flap open (an inspection on screen)
  const inHall = (x, z) => x > w.bounds.hall[0] && x < w.bounds.hall[1] && z < w.door[1] - 0.2;
  const d3 = day3Place(game, 'dorm_court', { root: w.root, K, ids: ['tama'] }); // day 3's afternoon: Tama asleep
  const things = {
    bath: {
      ...PLACE_DETAILS.dorm_court.things.bath,
      anchor: (v) => bath.anchor(v),
      spot: () => bath.spot,
      face: bath.face,
    },
    // using the doors walks him in through them
    dorm_entry: {
      ...PLACE_DETAILS.dorm_court.things.dorm_entry,
      anchor: (v) => v.set(w.door[0], 1.3, w.door[1]),
      spot: () => w.hall,
      keep: 1.4, // the hall doors stay clear of the goal's edge arrow (ui/goal-arrow.js)
      face: () => w.passageMouth,
      enabled: () => !inHall(game.player.root.position.x, game.player.root.position.z),
    },
    stairs: {
      ...PLACE_DETAILS.dorm_court.things.stairs,
      anchor: (v) => v.set(w.passageMouth[0], 1.2, w.passageMouth[1]),
      spot: () => w.passage,
      keep: 0.8,
      face: () => w.passageIn,
    },
    // Eric's mailbox; its pin shows once the story gives it something to do (talk:mailboxes)
    mailboxes: {
      ...PLACE_DETAILS.dorm_court.things.mailboxes,
      anchor: (v) => v.set(mb.at[0], mb.y + 0.28, mb.at[1]),
      spot: () => [mb.at[0] + 0.5, mb.at[1] + 0.34], // beside it, so he doesn't stand between the camera and the box
      face: () => mb.at,
      enabled: () => game.runner.has('talk:mailboxes'),
    },
    // day 2: out through the gate onto the lane, east to the east lane (its story's talk:street_gate)
    street_gate: {
      ...PLACE_DETAILS.dorm_court.things.street_gate,
      anchor: (v) => v.set(w.streetGate[0], 1.2, w.streetGate[1] - 1.3),
      spot: () => [w.streetGate[0], w.streetGate[1] - 1.6],
      face: () => w.streetGate,
      enabled: () => game.runner.has('talk:street_gate'),
    },
    tama: { ...PLACE_DETAILS.dorm_court.things.tama, ...d3.thing('tama') },
    // the hall's notice board right of the passage, and the manager's window left of it: a look line each
    hall_board: {
      ...PLACE_DETAILS.dorm_court.things.hall_board,
      anchor: (v) => v.set(BOARD[0], 1.35, BOARD[1]),
      ...hallLook('hall_board', BOARD, [HALL[1] - 0.35, BACK_Z + 0.55]),
    },
    manager_window: {
      ...PLACE_DETAILS.dorm_court.things.manager_window,
      anchor: (v) => v.set(DESK[0], 1.5, DESK[1]),
      ...hallLook('manager_window', DESK, [DESK[0], BACK_Z + 0.6]),
    },
  };
  function hallLook(id, at, spot) {
    return { spot: () => spot, face: () => at, look: DORM_LOOKS[id] };
  }
  const b = w.bounds;
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: w.start,
    startFacing: Math.PI, // north, up the door axis from the gate
    defaultPeriod: 'evening',
    music: 'night',
    grade: morning ? MORNING_GRADE : eveningGrade(sim.day),
    onPeriod(period) {
      if (period !== 'evening' || P.grade === eveningGrade(sim.day)) return;
      w.evening(sim.day);
      P.grade = eveningGrade(sim.day);
    },
    things,
    findProps: { bakery_flyer: mb.flyer }, // what taking the flyer hides (finds/index.js)
    spots,
    seats: {},
    people: { tama: d3.people.tama },
    day3: (a) => d3.setup(P, a),
    zones: {
      hall: inHall,
      passage: (x, z) => Math.abs(x - w.passage[0]) < 0.5 && z < w.passage[1] + 0.1,
      // out on the lane past the gate (day 2's way to the east lane)
      street_exit: (x, z) => z > w.streetGate[1] - 0.9,
    },
    hooks: {
      // mailbox 203 open (the camera close on it, the flap swung open on the flyer inside) or closed again
      async mailbox203({ state }) {
        const open = state === 'open';
        mbState.open = open;
        if (open) {
          mbState.seen = true;
          mb.flyer.visible = !found('bakery_flyer'); // once taken (the `find` hook) the box is empty
          cam.closeOn(mb.at, MAIL_ZOOM, mb.y - 0.03);
        }
        const from = mb.flap.rotation.y,
          to = open ? FLAP_OPEN : 0;
        await game.tween(0.45, (k) => (mb.flap.rotation.y = from + (to - from) * (1 - (1 - k) * (1 - k))));
        if (!open) cam.release();
      },
    },
    fit(aspect) {
      // desktop: the whole court, lane to sento, with the hall and the block's first floors; phone: follow him
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(b.west, 0, 0.5),
            new THREE.Vector3(b.east, 0, 0.5),
            new THREE.Vector3(0.5, 4.4, b.back - 1.4),
            new THREE.Vector3(0.5, 0, b.near),
          ],
          new THREE.Vector3(0.1, 0, -1.7),
          { follow: true, clamp: [-0.3, 0.5, -1.9, -1.5], limY: 0.96 },
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
          { follow: true, clamp: [-2.6, 2.6, -2.6, -1.75], lead: -1.6 },
        );
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      bath.update(dt);
      d3.update(dt);
    },
    leave() {
      bath.leave();
      w.nav.shut('passage');
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }), mailbox: { ...mbState } };
    },
    restoreState(saved) {
      const m = saved.world?.mailbox;
      if (m) {
        Object.assign(mbState, m);
        mb.flyer.visible = !!m.seen && !found('bakery_flyer');
        mb.flap.rotation.y = m.open ? FLAP_OPEN : 0;
        if (m.open) cam.closeOn(mb.at, MAIL_ZOOM, mb.y - 0.03);
      }
      if (saved.world?.player) {
        restorePeople({ eric: game.player }, saved.world.player);
        game.walker.sync();
        cam.snap(game.player.root.position);
      }
    },
    // in along the lane from the plaza, on the same close framing the plaza let go of (places/edge-walk.js), then
    // left through the gate and up the door axis into the court
    async tripIn(g) {
      await walkIn(g, cam, w.streetEdge, w.streetGate, Math.PI / 2, { release: false });
      const eric = g.player;
      eric.scripted = true;
      cam.closeOn(w.start, 1.3);
      await glide(g, eric.root, w.start, 1.4);
      eric.setState('idle');
      eric.scripted = false;
      g.walker.sync();
      cam.release();
    },
    // day 2: down the stairs from his floor, out of the passage into the hall (clear of the passage's zone)
    tripInFrom: {
      async dorms(g) {
        const eric = g.player;
        eric.scripted = true;
        eric.root.position.set(w.passageIn[0], 0, w.passageIn[1]);
        eric.root.rotation.y = 0;
        cam.closeOn(w.passageMouth, 1.7);
        cam.snap(eric.root.position);
        eric.setState('walk');
        await glide(g, eric.root, w.passage, 1.1);
        await glide(g, eric.root, w.hall, 1.2);
        eric.setState('idle');
        eric.scripted = false;
        g.walker.sync();
        cam.release();
      },
    },
    tripOutTo: {
      east_lane: (g) => walkOut(g, cam, w.streetGate, w.streetEdge),
    },
    async tripOut(g) {
      // from the passage's mouth into the passage, the camera coming in close; the stairs are the crossfade
      const eric = g.player;
      eric.scripted = true;
      g.walker.locked = true;
      w.nav.open('passage'); // shut again when the place is left (leave)
      cam.closeOn(w.passageMouth, 1.7);
      await glide(g, eric.root, w.passage, 1.1);
      await glide(g, eric.root, w.passageIn, 1.1);
      eric.setState('idle');
    },
  };
  return P;
}
