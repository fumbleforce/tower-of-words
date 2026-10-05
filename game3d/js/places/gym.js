import * as THREE from 'three';
import { buildGym } from '../scenes/rooms/gym.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkOut, walkIn } from './edge-walk.js';
import { roomView, roomSave } from './room-view.js';
import { day3Place } from './day3/place.js';
import { gymDesk } from './day3/booking.js';

// The gym's corner inside its main door (scenes/rooms/gym.js): the entrance with its shoe lockers, the attendant's
// desk with the booking terminal, the printer and the fan, the benches, the equipment store and the winter meeting
// corner, as far as the divider net. In from the sports lane through the main doors, out the same way. It also loads
// with ?place=gym, inside the doors. The camera looks in from the south over the cut-down front wall: the whole
// corner on a desktop, following Eric on a phone.
export function gymPlace(game) {
  const w = buildGym();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const d = w.door,
    save = roomSave(game, w.nav, d.in, cam);
  // day 3: the attendant, Mori and Emi; the booking repair at the desk (places/day3/booking.js)
  const d3 = day3Place(game, 'gym', { root: w.root, K, ids: ['attendant', 'mori', 'emi', 'kuro'] });
  const desk = gymDesk(game, { w, cast: d3.cast });
  d3.also(({ state } = {}) => {
    desk.restore();
    if (state === 'winterClub') desk.winterClub();
  });
  const things = {
    gym_door: {
      ...PLACE_DETAILS.gym.things.gym_door,
      anchor: (v) => v.set(d.edge[0], 1.2, d.edge[1] - 0.2),
      spot: () => d.out,
      face: () => d.edge,
    },
    // the desk's machines and the club board: named for the tickets and scenes that use them (no pin until one does)
    booking_terminal: {
      ...PLACE_DETAILS.gym.things.booking_terminal,
      anchor: (v) => v.set(...w.terminal),
      face: () => [w.terminal[0], w.terminal[2]],
      spot: () => w.spots.gym_desk,
    },
    gym_printer: {
      ...PLACE_DETAILS.gym.things.gym_printer,
      anchor: (v) => v.set(...w.printer),
      face: () => [w.printer[0], w.printer[2]],
      spot: () => [w.printer[0], w.spots.gym_desk[1]],
    },
    desk_fan: {
      ...PLACE_DETAILS.gym.things.desk_fan,
      anchor: (v) => v.set(...w.fan),
      face: () => [w.fan[0], w.fan[2]],
      spot: () => [w.fan[0], w.spots.gym_desk[1]],
    },
    gym_board: {
      ...PLACE_DETAILS.gym.things.gym_board,
      anchor: (v) => v.set(...w.board),
      face: () => [w.board[0], w.board[2]],
      spot: () => [w.board[0] - 0.8, w.board[2]],
    },
    attendant: { ...PLACE_DETAILS.gym.things.attendant, ...d3.thing('attendant') },
    mori: { ...PLACE_DETAILS.gym.things.mori, ...d3.thing('mori') },
    emi: { ...PLACE_DETAILS.gym.things.emi, ...d3.thing('emi') },
    kuro: { ...PLACE_DETAILS.gym.things.kuro, ...d3.thing('kuro') },
  };
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: d.in,
    startFacing: Math.PI,
    music: 'calm',
    things,
    spots: {
      gym_in: d.in,
      gym_desk: w.spots.gym_desk,
      gym_benches: w.spots.gym_benches,
      gym_meeting: w.spots.gym_meeting,
      gym_court: w.spots.gym_court,
      gym_store: w.spots.gym_store,
      gym_lockers: w.spots.gym_lockers,
    },
    seats: { gym_bench_n: w.seats[1], gym_bench_s: w.seats[0] },
    people: { attendant: d3.people.attendant, mori: d3.people.mori, emi: d3.people.emi, kuro: d3.people.kuro },
    zones: {},
    hooks: { bookingRepair: desk.hooks.bookingRepair },
    day3: (a) => d3.setup(P, a),
    kotodamaTargets: desk.kotodamaTargets,
    fit(aspect) {
      roomView(cam, w.bounds, aspect);
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      d3.update(dt);
    },
    snapshotState: save.snapshot,
    restoreState: save.restore,
    // in through the main doors, walking north onto the tiles; out the same way
    tripIn: (g) => walkIn(g, cam, d.edge, d.in, Math.PI),
    tripOutTo: { sports: (g) => walkOut(g, cam, d.out, d.edge) },
  };
  return P;
}
