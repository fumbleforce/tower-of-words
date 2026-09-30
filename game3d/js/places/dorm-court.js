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
import { dormBath } from './dorm-bath.js';

// The dorm courtyard, on the walk home after work; it also loads with ?place=dorm_court.
// The trip out is the watched walk through the hall doors and the passage into Eric's room (dorms).
export async function dormCourtPlace(game) {
  const w = await sliced(dormCourtSteps()); // in slices between frames: it's built while the plaza is played
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const bath = dormBath(game); // the sento's humming after work, and the `bath` discovery
  const spots = { plaza_entry: w.plazaEntry, dorm_entry: w.dormEntry, bath: bath.spot };
  const things = {
    dorm_entry: {
      ...PLACE_DETAILS.dorm_court.things.dorm_entry,
      anchor: (v) => v.set(w.door[0], 1.3, w.door[1]),
      spot: () => w.dormEntry,
      keep: 1.4, // the hall doors stay clear of the goal's edge arrow (ui/goal-arrow.js)
      face: () => w.door,
    },
    bath: {
      ...PLACE_DETAILS.dorm_court.things.bath,
      anchor: (v) => bath.anchor(v),
      spot: () => bath.spot,
      face: bath.face,
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
    startFacing: Math.PI, // north, up the door axis from the gate
    defaultPeriod: 'evening',
    music: 'night',
    grade: EVENING_GRADE,
    things,
    spots,
    seats: {},
    people: {},
    zones: { dorm_entry: (x, z) => Math.abs(x - w.door[0]) < 0.8 && z < w.door[1] + 0.25 },
    hooks: { bathSong: bath.bathSong },
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
    },
    leave() {
      bath.leave();
    },
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
