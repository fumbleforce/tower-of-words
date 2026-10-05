import * as THREE from 'three';
import { buildKaraokeDesk } from '../scenes/rooms/karaoke.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkOut, walkIn } from './edge-walk.js';
import { roomView, roomSave } from './room-view.js';

// The karaoke box's front desk downstairs (scenes/rooms/karaoke.js), in from the shop street through its glass door;
// up the stairs at the back is the booth (places/karaoke-booth.js). It loads with ?place=karaoke, inside the door. The camera looks in from the south over the cut-down front wall: the whole room on a desktop, following
// Eric on a phone.

export function karaokePlace(game) {
  const w = buildKaraokeDesk();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const d = w.door,
    s = w.stairs,
    save = roomSave(game, w.nav, d.in, cam);
  const things = {
    karaoke_door: {
      ...PLACE_DETAILS.karaoke.things.karaoke_door,
      anchor: (v) => v.set(d.edge[0], 1.0, d.edge[1] - 0.2),
      spot: () => d.out,
      face: () => d.edge,
    },
    karaoke_stairs: {
      ...PLACE_DETAILS.karaoke.things.karaoke_stairs,
      anchor: (v) => v.set(s.at[0], s.at[1], s.at[2]),
      spot: () => s.foot,
      face: () => s.edge,
    },
    // the desk's terminal, named for the bookings and tickets that use it (no pin until one does)
    karaoke_desk: {
      ...PLACE_DETAILS.karaoke.things.karaoke_desk,
      anchor: (v) => v.set(...w.terminal),
      face: () => [w.terminal[0], w.terminal[2]],
      spot: () => w.desk,
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
    start: d.in,
    startFacing: Math.PI,
    music: 'calm',
    things,
    spots: {
      karaoke_in: d.in,
      karaoke_desk: w.spots.karaoke_desk,
      karaoke_drinks: w.spots.karaoke_drinks,
      karaoke_bench: w.spots.karaoke_bench,
      karaoke_stairs: s.foot,
    },
    seats: { karaoke_bench: w.seats[0] },
    people: {},
    zones: {},
    hooks: {},
    fit(aspect) {
      roomView(cam, w.bounds, aspect);
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update() {},
    snapshotState: save.snapshot,
    restoreState: save.restore,
    // in through the glass door from the arcade, walking north; down the stairs from the booth, stepping off the
    // bottom tread; out the door, or up the stairs
    tripIn: (g) => walkIn(g, cam, d.edge, d.in, Math.PI),
    tripInFrom: { karaoke_booth: (g) => walkIn(g, cam, s.edge, s.foot, 0) },
    tripOutTo: {
      shotengai: (g) => walkOut(g, cam, d.out, d.edge),
      karaoke_booth: (g) => walkOut(g, cam, s.foot, s.edge),
    },
  };
  return P;
}
