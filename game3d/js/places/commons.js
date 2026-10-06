import * as THREE from 'three';
import { buildCommons } from '../scenes/rooms/commons.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkOut, walkIn } from './edge-walk.js';
import { roomView, roomSave } from './room-view.js';
import { day3Place } from './day3/place.js';

// The dorm common room (scenes/rooms/commons.js): the ground floor of dorm_gallery on the inner court, the art
// club's room. In through the glazed door off the inner court's north-south walk, out the same way (the east coast,
// which walks the dorm row and the court). It also loads with ?place=dorm_commons, inside the door. The camera looks
// in from the south over the cut-down front wall: the whole room on a desktop, following Eric on a phone.
export function commonsPlace(game) {
  const w = buildCommons();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const d = w.door,
    save = roomSave(game, w.nav, d.in, cam);
  const d3 = day3Place(game, 'dorm_commons', { root: w.root, K, ids: ['kenji', 'mori'] }); // day 3's evening: the TV
  const things = {
    commons_door: {
      ...PLACE_DETAILS.dorm_commons.things.commons_door,
      anchor: (v) => v.set(d.edge[0], 1.0, d.edge[1] - 0.2),
      spot: () => d.out,
      face: () => d.edge,
    },
    // named for the tickets, scenes and finds that use them (no pin until one does)
    commons_printer: {
      ...PLACE_DETAILS.dorm_commons.things.commons_printer,
      anchor: (v) => v.set(...w.printer),
      face: () => [w.printer[0], w.printer[2]],
      spot: () => [w.printer[0] - 0.75, w.printer[2]],
    },
    art_table: {
      ...PLACE_DETAILS.dorm_commons.things.art_table,
      anchor: (v) => v.set(...w.table),
      face: () => [w.table[0], w.table[2]],
      spot: () => w.spots.commons_table,
    },
    drying_rack: {
      ...PLACE_DETAILS.dorm_commons.things.drying_rack,
      anchor: (v) => v.set(...w.rack),
      face: () => [w.rack[0], w.rack[2]],
      spot: () => w.spots.commons_rack,
    },
    commons_board: {
      ...PLACE_DETAILS.dorm_commons.things.commons_board,
      anchor: (v) => v.set(...w.board),
      face: () => [w.board[0], w.board[2]],
      spot: () => [w.board[0] - 0.75, w.board[2]],
    },
    kenji: { ...PLACE_DETAILS.dorm_commons.things.kenji, ...d3.thing('kenji') },
    mori: { ...PLACE_DETAILS.dorm_commons.things.mori, ...d3.thing('mori') },
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
      commons_in: d.in,
      commons_table: w.spots.commons_table,
      commons_sofa: w.spots.commons_sofa,
      commons_kitchen: w.spots.commons_kitchen,
      commons_rack: w.spots.commons_rack,
      commons_books: w.spots.commons_books,
      commons_fridge: w.spots.commons_fridge,
    },
    seats: { commons_sofa: w.seats[0] },
    people: { kenji: d3.people.kenji, mori: d3.people.mori },
    zones: {},
    hooks: {},
    day3: (a) => d3.setup(P, a),
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
    // in through the glazed door, walking north; out the same way
    tripIn: (g) => walkIn(g, cam, d.edge, d.in, Math.PI),
    tripOutTo: { east_coast: (g) => walkOut(g, cam, d.out, d.edge) },
  };
  return P;
}
