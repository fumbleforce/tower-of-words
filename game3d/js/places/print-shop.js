import * as THREE from 'three';
import { buildPrintShop } from '../scenes/print-shop/room.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkIn, walkOut } from './edge-walk.js';
import { roomView } from './room-view.js';
import { canteenSave } from './canteen-state.js';
import { printService } from './print-service.js';
export function printShopPlace(game) {
  const w = buildPrintShop(),
    cam = new RoomCam({ elev: 53, fov: 30 }),
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const save = canteenSave(game, w.nav, w.door.in, cam, w.seats),
    seat = w.seats.print_seat;
  const things = {
    print_exit: {
      ...PLACE_DETAILS.print_shop.things.print_exit,
      anchor: (v) => v.set(0, 1, 0),
      spot: () => w.door.out,
      face: () => w.door.edge,
    },
    directory_printer: {
      ...PLACE_DETAILS.print_shop.things.directory_printer,
      anchor: (v) => v.set(-0.9, 1, -3.2),
      spot: () => w.spots.directory,
      face: () => [-1.1, -3.2],
    },
    print_seat: {
      ...PLACE_DETAILS.print_shop.things.print_seat,
      anchor: (v) => v.set(seat.x, 0.8, seat.z),
      spot: () => seat.out,
      face: () => [seat.x, seat.z],
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
    start: w.door.in,
    startFacing: Math.PI,
    music: 'calm',
    things,
    spots: { directory: w.spots.directory, proof: w.spots.proof, press: w.spots.press },
    seats: { print_seat: w.seats.print_seat },
    people: {},
    zones: {},
    hooks: { printDirectory: () => service.run() },
    fit: (a) => roomView(cam, w.bounds, a),
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    onPeriod: w.period,
    update: () => service.update(),
    leave: () => service.leave(),
    snapshotState: save.snapshot,
    restoreState(s) {
      save.restore(s);
      service.leave();
    },
    tripIn: (g) => walkIn(g, cam, w.door.edge, w.door.in, Math.PI),
    tripOutTo: { campus: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };
  const service = printService(game, P, w);
  P.printService = service;
  return P;
}
