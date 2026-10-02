import * as THREE from 'three';
import { shotengaiSteps } from '../scenes/shotengai.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE, MORNING_GRADE } from '../scenes/town.js';
import { addOccluder, updateOccluders, footprint } from '../scenes/occluders.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';

// The shop street and the seafront (scenes/shotengai.js): reached from the plaza down the cross walk and along the
// south walk, it comes in at the arcade's east mouth off the dorm street; it also loads with ?place=shotengai. The
// shops are shut for now (their doors say so). Out the east end goes back to the plaza, or after work up the dorm
// street to the dorm courtyard.
const STEEP = (84 * Math.PI) / 180; // the camera's elevation in the alleys and down the rows' west end
export async function shotengaiPlace(game) {
  const w = await sliced(shotengaiSteps()); // in slices between frames: it's built while the plaza is played
  const cam = new RoomCam(w.camera);
  const flat = cam.elev;
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const [, , az0, az1] = w.arcade;
  // the named shops' doors: shut (story/shotengai.js says so); a pin over each, Eric steps up to it
  const dk = (id) => w.doors.find((k) => k.id === id);
  const pin = (v, id) => v.set(dk(id).local[0], 1.95, dk(id).local[1]);
  const things = {
    plaza_lane: {
      ...PLACE_DETAILS.shotengai.things.plaza_lane,
      anchor: (v) => v.set(w.edge[0], 1.1, w.edge[1] - 1.2),
      spot: () => [w.edge[0], w.edge[1] - 1.6],
      face: () => w.edge,
    },
    bike_shop: {
      ...PLACE_DETAILS.shotengai.things.bike_shop,
      anchor: (v) => pin(v, 'bike_shop'),
      spot: () => dk('bike_shop').step,
      face: () => dk('bike_shop').local,
    },
    store: {
      ...PLACE_DETAILS.shotengai.things.store,
      anchor: (v) => pin(v, 'store'),
      spot: () => dk('store').step,
      face: () => dk('store').local,
    },
    bakery: {
      ...PLACE_DETAILS.shotengai.things.bakery,
      anchor: (v) => pin(v, 'bakery'),
      spot: () => dk('bakery').step,
      face: () => dk('bakery').local,
    },
    game_centre: {
      ...PLACE_DETAILS.shotengai.things.game_centre,
      anchor: (v) => pin(v, 'game_centre'),
      spot: () => dk('game_centre').step,
      face: () => dk('game_centre').local,
    },
    karaoke: {
      ...PLACE_DETAILS.shotengai.things.karaoke,
      anchor: (v) => pin(v, 'karaoke'),
      spot: () => dk('karaoke').step,
      face: () => dk('karaoke').local,
    },
    izakaya: {
      ...PLACE_DETAILS.shotengai.things.izakaya,
      anchor: (v) => pin(v, 'izakaya'),
      spot: () => dk('izakaya').step,
      face: () => dk('izakaya').local,
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
    start: w.in,
    startFacing: w.face,
    music: 'calm',
    grade: MORNING_GRADE,
    things,
    spots: {
      plaza_entry: w.in,
      shotengai_shrine: w.nooks.shotengai_shrine,
      shotengai_back_alley: w.nooks.shotengai_back_alley,
      shotengai_pine_bench: w.nooks.shotengai_pine_bench,
    },
    seats: {},
    people: {},
    zones: { plaza_exit: (x, z) => z > w.exitZ },
    hooks: {},
    fit(aspect) {
      // as the plaza: the phone's camera distance on both, following him, a little ahead (west, down the street)
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-9.6, 0, 0),
            new THREE.Vector3(9.6, 0, 0),
            new THREE.Vector3(0, 0, -4),
            new THREE.Vector3(0, 0, 4),
          ],
          new THREE.Vector3(0, 0, 0),
          { follow: true, clamp: [-6.5, 0, az0 - 8, az1 + 6], lead: -1.4, limY: 0.96 },
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
          { follow: true, clamp: [-10, 1.2, az0 - 9, az1 + 7.5], lead: -3.4 },
        );
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      updateOccluders(P, p, dt);
      // steeper over the alleys and the rows' west end, where the rows would hide him
      const want = w.steep(p.x, p.z) ? STEEP : flat;
      cam.elev += (want - cam.elev) * Math.min(1, dt * 3);
    },
    onPeriod(period) {
      if (period !== 'evening' || P.grade === EVENING_GRADE) return;
      eveningLight(w.scene);
      w.evening();
      w.follow(game.player.root.position.x, game.player.root.position.z);
      P.grade = EVENING_GRADE;
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }) };
    },
    restoreState(saved) {
      if (!saved.world?.player) return;
      restorePeople({ eric: game.player }, saved.world.player);
      const p = game.player.root.position;
      if (!w.nav.free(p.x, p.z)) p.set(w.in[0], p.y, w.in[1]);
      game.walker.sync();
      cam.snap(game.player.root.position);
    },
    // in off the dorm street onto the shop walk, the arcade ahead; out the same way
    tripIn: (g) => walkIn(g, cam, w.edge, w.in, w.face),
    tripOut: (g) => walkOut(g, cam, [w.edge[0], w.edge[1] - 1.6], w.edge),
  };
  // the arcade's glass roof fades while he is under it
  addOccluder(P, w.arcadeRoof, footprint(w.arcade[0] - 0.2, w.arcade[1] + 0.2, az0 - 0.5, az1 + 0.5), {
    name: 'arcade',
  });
  return P;
}
