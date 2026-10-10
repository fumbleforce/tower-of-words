import { terminalAction } from './ferry-terminal/action.js';
import { terminalActivity } from './ferry-terminal/activity.js';
import * as THREE from 'three';
import { buildFerryTerminal } from '../scenes/ferry-terminal/room.js';
import { STAFF, READER, TRAVELLER } from '../scenes/ferry-terminal/plan.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { roomView } from './room-view.js';
import { canteenSave } from './canteen-state.js';
import { walkIn, walkOut } from './edge-walk.js';
import { PLACE_DETAILS } from './catalog.js';
import { terminalResidents } from './ferry-terminal/residents.js';
import { sim } from '../sim.js';
import { flags } from '../narrative/state.js';
export function ferryTerminalPlace(game) {
  const w = buildFerryTerminal(),
    cam = new RoomCam({ elev: 50, yaw: 0.15, fov: 32 }),
    residents = terminalResidents(w.root);
  const save = canteenSave(game, w.nav, w.door.in, cam, w.seats),
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const things = {
    ferry_exit: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_exit,
      anchor: (v) => v.set(0, 0.9, 0),
      spot: () => w.door.out,
      face: () => w.door.edge,
    },
    ferry_staff: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_staff,
      fixedSpot: true,
      anchor: (v) => {
        residents.people.ferry_staff.root.getWorldPosition(v);
        v.y += 1.2;
        return v;
      },
      spot: () => w.spots.ferry_counter,
      face: () => STAFF,
      enabled: () => residents.people.ferry_staff.root.visible,
    },
    ferry_reader: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_reader,
      fixedSpot: true,
      anchor: (v) => {
        residents.people.ferry_reader.root.getWorldPosition(v);
        v.y += 1.2;
        return v;
      },
      spot: () => w.spots.ferry_reader,
      face: () => [READER.x, READER.z],
      enabled: () => residents.people.ferry_reader.root.visible,
    },
    ferry_traveller: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_traveller,
      fixedSpot: true,
      anchor: (v) => {
        residents.people.ferry_traveller.root.getWorldPosition(v);
        v.y += 1.2;
        return v;
      },
      spot: () => w.spots.ferry_traveller,
      face: () => [TRAVELLER.x, TRAVELLER.z],
      enabled: () => residents.people.ferry_traveller.root.visible,
    },
    ferry_window_seat: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_window_seat,
      anchor: (v) => v.set(w.seats.ferry_window_seat.x, 0.8, w.seats.ferry_window_seat.z),
      spot: () => w.seats.ferry_window_seat.out,
      face: () => [w.seats.ferry_window_seat.x, w.seats.ferry_window_seat.z],
      enabled: () => !!flags.ferry_bag_moved,
    },
    ferry_quiet_seat: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_quiet_seat,
      anchor: (v) => v.set(w.seats.ferry_quiet_seat.x, 0.8, w.seats.ferry_quiet_seat.z),
      spot: () => w.seats.ferry_quiet_seat.out,
      face: () => [w.seats.ferry_quiet_seat.x, w.seats.ferry_quiet_seat.z],
    },
    ferry_landing_seat: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_landing_seat,
      anchor: (v) => v.set(w.seats.ferry_landing_seat.x, 0.8, w.seats.ferry_landing_seat.z),
      spot: () => w.seats.ferry_landing_seat.out,
      face: () => [w.seats.ferry_landing_seat.x, w.seats.ferry_landing_seat.z],
    },
    ferry_notice_seat: {
      ...PLACE_DETAILS.ferry_terminal.things.ferry_notice_seat,
      anchor: (v) => v.set(w.seats.ferry_notice_seat.x, 0.8, w.seats.ferry_notice_seat.z),
      spot: () => w.seats.ferry_notice_seat.out,
      face: () => [w.seats.ferry_notice_seat.x, w.seats.ferry_notice_seat.z],
    },
  };
  let period, activity, perform;
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
    spots: {
      ferry_in: w.spots.ferry_in,
      ferry_counter: w.spots.ferry_counter,
      ferry_reader: w.spots.ferry_reader,
      ferry_traveller: w.spots.ferry_traveller,
      ferry_luggage_corner: w.spots.ferry_luggage_corner,
      ferry_notice_recess: w.spots.ferry_notice_recess,
    },
    seats: {
      ferry_window_seat: w.seats.ferry_window_seat,
      ferry_quiet_seat: w.seats.ferry_quiet_seat,
      ferry_landing_seat: w.seats.ferry_landing_seat,
      ferry_notice_seat: w.seats.ferry_notice_seat,
    },
    people: {
      ferry_staff: residents.people.ferry_staff,
      ferry_reader: residents.people.ferry_reader,
      ferry_traveller: residents.people.ferry_traveller,
    },
    zones: {},
    hooks: { ferryActivity: (a) => perform(a) },
    fit: (aspect) => {
      cam.camera.fov = aspect < 1 ? 50 : 32;
      roomView(cam, w.bounds, aspect);
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    onPeriod(value) {
      period = value;
      activity.activate();
      residents.period(sim.day, value);
      w.period(value);
      w.shutter.visible = !residents.people.ferry_staff.root.visible;
    },
    update(dt, t) {
      if (period !== sim.period) P.onPeriod(sim.period);
      residents.update(t);
      activity.update();
    },
    snapshotState: () => ({ ...save.snapshot(), terminal: activity.snapshot() }),
    restoreState(data) {
      save.restore(data);
      activity.restore(data.world?.terminal);
    },
    leave: () => activity.leave(),
    tripIn: (g) => walkIn(g, cam, w.door.edge, w.door.in, Math.PI),
    tripOutTo: { harbour: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };
  activity = terminalActivity(game, P);
  perform = terminalAction(game, P, (a) => activity.act(a));
  P.terminal = activity;
  P.onPeriod(sim.period);
  return P;
}
