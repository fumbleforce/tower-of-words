import * as THREE from 'three';
import { buildDorms } from '../scenes/dorms.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { glide } from '../move.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';

// Eric's dorm room. The trip in from the dorm courtyard (dorm-court.js) ends with him stepping in through his
// front door; the room also loads directly with ?place=dorms.
export function dormsPlace(game) {
  const w = buildDorms();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const spots = {
    room_entry: w.roomEntry,
    window_front: w.windowFront,
  };
  const things = {
    window: {
      ...PLACE_DETAILS.dorms.things.window,
      anchor: (v) => v.set(w.window[0], w.windowY, w.window[1]),
      spot: () => w.windowFront,
      face: () => w.window,
    },
    boxes: {
      ...PLACE_DETAILS.dorms.things.boxes,
      anchor: (v) => v.set(w.boxes.x, 0.5, w.boxes.z),
      spot: () => [0.3, w.boxes.z],
      face: () => [w.boxes.x, w.boxes.z],
    },
    bed: {
      ...PLACE_DETAILS.dorms.things.bed,
      anchor: (v) => v.set(w.bed.x, 0.5, w.bed.z),
      spot: () => [-0.2, w.bed.z],
      face: () => [w.bed.x, w.bed.z],
    },
  };
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
    startFacing: Math.PI,
    defaultPeriod: 'evening',
    music: 'night',
    grade: {
      exposure: 1.0,
      temp: -0.02,
      sat: 0.74,
      contrast: 1.05,
      lift: [0.01, 0.012, 0.022],
      shadowTint: [-0.01, 0, 0.025],
      highTint: [0.02, 0.008, -0.012],
      vignette: 0.26,
      bloom: 0.32,
      bloomThreshold: 0.8,
      focusBand: 0.3,
    },
    things,
    spots,
    seats: {},
    people: {},
    zones: {},
    hooks: {},
    fit(aspect) {
      // the whole flat in one still frame, window wall to front door
      cam.fit(
        aspect,
        [
          new THREE.Vector3(b.x0, 0, b.near),
          new THREE.Vector3(b.x1, 0, b.near),
          new THREE.Vector3(b.x0, b.h, b.back),
          new THREE.Vector3(b.x1, b.h, b.back),
        ],
        new THREE.Vector3(0, 0.3, (b.back + b.near) / 2 - 0.25), // a little room above for the wall outside
        { limX: aspect >= 1 ? 0.9 : 0.96, limY: 0.9 },
      );
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update() {},
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }) };
    },
    restoreState(saved) {
      if (saved.world?.player) {
        restorePeople({ eric: game.player }, saved.world.player);
        game.walker.sync();
        cam.snap(game.player.root.position);
      }
    },
    async tripIn(g) {
      // in from the passage: through the front door, over the genkan, to the doorway of the room
      const eric = g.player;
      eric.scripted = true;
      eric.root.position.set(w.frontDoor[0], 0, w.frontDoor[1] + 0.5);
      eric.root.rotation.y = Math.PI;
      cam.closeOn(w.frontDoor, 1.5);
      cam.snap(eric.root.position);
      await glide(g, eric.root, w.roomEntry, 1.0);
      eric.setState('idle');
      eric.scripted = false;
      g.walker.sync();
      cam.release();
    },
  };
  return P;
}
