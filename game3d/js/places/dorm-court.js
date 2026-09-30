import * as THREE from 'three';
import { dormCourtSteps } from '../scenes/dorm-court.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { EVENING_GRADE } from '../scenes/town.js';
import { walkIn } from './edge-walk.js';
import { glide } from '../move.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';

// The dorm courtyard, on the walk home after work; it also loads with ?place=dorm_court.
// The trip out is the watched walk through the hall doors and the passage into Eric's room (dorms).
export async function dormCourtPlace(game) {
  const w = await sliced(dormCourtSteps()); // in slices between frames: it's built while the plaza is played
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const spots = { plaza_entry: w.plazaEntry, dorm_entry: w.dormEntry };
  const things = {
    dorm_entry: {
      ...PLACE_DETAILS.dorm_court.things.dorm_entry,
      anchor: (v) => v.set(w.door[0], 1.3, w.door[1]),
      spot: () => w.dormEntry,
      face: () => w.door,
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
    startFacing: Math.PI / 2, // east, into the court from the plaza lane
    defaultPeriod: 'evening',
    music: 'night',
    grade: EVENING_GRADE,
    things,
    spots,
    seats: {},
    people: {},
    zones: { dorm_entry: (x, z) => Math.abs(x - w.door[0]) < 0.8 && z < w.door[1] + 0.25 },
    hooks: {},
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
          { follow: true, clamp: [-2.6, 2.6, -2.6, -1.3], lead: -1.6 },
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
    // in along the lane from the plaza, on the same close framing the plaza let go of (places/edge-walk.js)
    tripIn: (g) => walkIn(g, cam, w.westEdge, w.start, Math.PI / 2),
    async tripOut(g) {
      // in through the hall doors, past the mailboxes and into the passage to the rooms, the camera coming in close
      await g.walkTo(w.dormEntry[0], w.dormEntry[1]);
      const eric = g.player;
      eric.scripted = true;
      g.walker.locked = true;
      cam.closeOn(w.door, 1.4);
      await glide(g, eric.root, [w.door[0], w.door[1] - 0.45], 1.1);
      await glide(g, eric.root, w.hallMid, 1.1);
      cam.closeOn(w.passage, 1.7);
      await glide(g, eric.root, w.passageIn, 1.1);
      eric.setState('idle');
    },
  };
  return P;
}
