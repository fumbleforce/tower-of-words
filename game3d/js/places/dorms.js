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
      outline: () => w.obj.window,
    },
    boxes: {
      ...PLACE_DETAILS.dorms.things.boxes,
      anchor: (v) => v.set(w.boxes.x, 0.5, w.boxes.z),
      spot: () => w.boxes.spot,
      face: () => [w.boxes.x, w.boxes.z],
      outline: () => w.obj.boxes,
    },
    bed: {
      ...PLACE_DETAILS.dorms.things.bed,
      anchor: (v) => v.set(w.bed.x, 0.5, w.bed.z),
      spot: () => w.bed.spot,
      face: () => [w.bed.x, w.bed.z],
      outline: () => w.obj.bed,
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
      // in along the corridor from the stairs, to his door, then through it, over the genkan, to the doorway of the
      // room. He comes from the side, so the first frame shows the open door, the genkan and his shoes clear of him
      const eric = g.player;
      eric.scripted = true;
      eric.root.position.set(...w.corridor);
      eric.root.rotation.y = -Math.PI / 2;
      // framed on the doorstep, a little closer than the still frame, then out to the whole flat as he walks in
      cam.closeOn(w.arrive.at, w.arrive.zoom);
      cam.snap(eric.root.position);
      w.door.rotation.y = -1.5; // the front door open onto the corridor
      await glide(g, eric.root, w.doorstep, 1.2);
      await glide(g, eric.root, w.roomEntry, 1.2);
      g.tween(0.45, (k) => (w.door.rotation.y = -1.5 * (1 - k * k)));
      eric.setState('idle');
      eric.scripted = false;
      g.walker.sync();
      cam.release();
    },
  };
  return P;
}
