import * as THREE from 'three';
import { buildDormCourt } from '../scenes/dorm-court.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { glide } from '../move.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';

// The dorm courtyard. The trip in from the plaza is planned (places.md); until then it loads with ?place=dorm_court.
// The trip out is the watched walk through the hall doors and the passage into Eric's room (dorms).
export function dormCourtPlace(game) {
  const w = buildDormCourt();
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
    grade: {
      exposure: 1.0,
      temp: 0.0,
      sat: 0.76,
      contrast: 1.04,
      lift: [0.012, 0.012, 0.02],
      shadowTint: [-0.01, 0, 0.024],
      highTint: [0.022, 0.01, -0.014],
      vignette: 0.22,
      bloom: 0.3,
      bloomThreshold: 0.8,
      focusBand: 0.3,
    },
    things,
    spots,
    seats: {},
    people: {},
    zones: { dorm_entry: (x, z) => Math.abs(x - w.door[0]) < 0.8 && z < w.door[1] + 0.25 },
    hooks: {},
    fit(aspect) {
      // desktop: the whole court, lane to sento, with the hall and the block's lower floors; phone: follow him
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(b.west, 0, 0.5),
            new THREE.Vector3(b.east, 0, 0.5),
            new THREE.Vector3(0.5, 2.4, b.back - 1.4),
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
    async tripIn(g) {
      // planned: arriving along the lane from the plaza
      const eric = g.player;
      eric.scripted = true;
      eric.root.position.set(w.westEdge[0], 0, w.westEdge[1]);
      eric.root.rotation.y = Math.PI / 2;
      cam.snap(eric.root.position);
      await glide(g, eric.root, w.start, 1.1);
      eric.setState('idle');
      eric.scripted = false;
      g.walker.sync();
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
