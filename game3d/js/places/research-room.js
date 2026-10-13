import * as THREE from 'three';
import { buildResearchRoom } from '../scenes/research-room/room.js';
import { READER } from '../scenes/research-room/plan.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { roomView } from './room-view.js';
import { canteenSave } from './canteen-state.js';
import { walkIn, walkOut } from './edge-walk.js';
import { PLACE_DETAILS } from './catalog.js';
import { researchReader } from './research-room/residents.js';
import { researchActivity } from './research-room/activity.js';
export function researchRoomPlace(game) {
  const w = buildResearchRoom(),
    cam = new RoomCam({ elev: 50, yaw: -0.25, fov: 32 }),
    reader = researchReader(w.root);
  const saved = canteenSave(game, w.nav, w.door.in, cam, w.seats),
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let activity;
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: w.door.in,
    startFacing: Math.PI / 2,
    music: 'calm',
    preserveGoal: true,
    things: {
      research_exit: {
        ...PLACE_DETAILS.research_lab.things.research_exit,
        anchor: (v) => v.set(-4.17, 1, 0),
        spot: () => w.door.out,
        face: () => w.door.edge,
      },
      research_reader: {
        ...PLACE_DETAILS.research_lab.things.research_reader,
        fixedSpot: true,
        anchor: (v) => {
          reader.root.getWorldPosition(v);
          v.y += 0.95;
          return v;
        },
        spot: () => w.spots.research_reader,
        face: () => [READER.x, READER.z],
      },
      research_side_seat: {
        ...PLACE_DETAILS.research_lab.things.research_side_seat,
        anchor: (v) => v.set(w.seats.research_side_seat.x, 0.8, w.seats.research_side_seat.z),
        spot: () => w.seats.research_side_seat.out,
        face: () => [w.seats.research_side_seat.x, w.seats.research_side_seat.z],
      },
      research_end_seat: {
        ...PLACE_DETAILS.research_lab.things.research_end_seat,
        anchor: (v) => v.set(w.seats.research_end_seat.x, 0.8, w.seats.research_end_seat.z),
        spot: () => w.seats.research_end_seat.out,
        face: () => [w.seats.research_end_seat.x, w.seats.research_end_seat.z],
      },
      research_archive: {
        ...PLACE_DETAILS.research_lab.things.research_archive,
        anchor: (v) => v.set(w.index.x, w.index.top, w.index.z),
        spot: () => w.index.out,
        face: () => [w.index.x, w.index.z],
      },
      research_books: {
        ...PLACE_DETAILS.research_lab.things.research_books,
        anchor: (v) => v.set(3.12, 0.85, -0.57),
        spot: () => w.spots.research_shelf,
        face: () => [3.12, -0.57],
      },
      research_table_seat: {
        ...PLACE_DETAILS.research_lab.things.research_table_seat,
        anchor: (v) => v.set(w.seats.research_table_seat.x, 0.8, w.seats.research_table_seat.z),
        spot: () => w.seats.research_table_seat.out,
        face: () => [w.seats.research_table_seat.x, w.seats.research_table_seat.z],
      },
      research_window_seat: {
        ...PLACE_DETAILS.research_lab.things.research_window_seat,
        anchor: (v) => v.set(w.seats.research_window_seat.x, 0.8, w.seats.research_window_seat.z),
        spot: () => w.seats.research_window_seat.out,
        face: () => [w.seats.research_window_seat.x, w.seats.research_window_seat.z],
      },
    },
    spots: {
      research_in: w.spots.research_in,
      research_reader: w.spots.research_reader,
      research_shelf: w.spots.research_shelf,
      research_archive: w.index.out,
    },
    seats: {
      research_table_seat: w.seats.research_table_seat,
      research_window_seat: w.seats.research_window_seat,
      research_side_seat: w.seats.research_side_seat,
      research_end_seat: w.seats.research_end_seat,
    },
    people: { research_reader: reader },
    zones: {},
    hooks: {},
    fit: (aspect) => {
      cam.camera.fov = aspect < 1 ? 50 : 32;
      roomView(cam, w.bounds, aspect);
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    onPeriod(period) {
      activity.activate();
      w.period(period);
    },
    update(dt, t) {
      activity.update(t);
    },
    snapshotState: () => ({ ...saved.snapshot(), reference: activity.snapshot() }),
    restoreState(data) {
      saved.restore(data);
      activity.restore(data.world?.reference);
    },
    leave: () => activity.leave(),
    tripIn: (g) => walkIn(g, cam, w.door.edge, w.door.in, Math.PI / 2),
    tripOutTo: { works: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };
  activity = researchActivity(game, P, w);
  P.research = activity;
  return P;
}
