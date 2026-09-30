import * as THREE from 'three';
import { buildPlaza } from '../scenes/plaza.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { eveningLight, EVENING_GRADE } from '../scenes/town.js';
import { sim } from '../sim.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';

// The fountain plaza: a side trip east of the forecourt in the morning, and on the walk home after work, with the
// lane on east to the dorm courtyard.
export function plazaPlace(game) {
  const w = buildPlaza();
  const cam = new RoomCam(w.camera); // the forecourt's camera, so the walk between them keeps its angle
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const spots = {
    office_entry: w.arriveIn,
    fountain_edge: w.fountainEdge,
    dorm_exit: w.dormExit,
  };
  const things = {
    office_lane: {
      ...PLACE_DETAILS.plaza.things.office_lane,
      anchor: (v) => v.set(w.westLane[0], 1.1, w.westLane[1]),
      spot: () => w.westLane,
      face: () => w.westEdge,
    },
    fountain: {
      ...PLACE_DETAILS.plaza.things.fountain,
      anchor: (v) => v.set(w.fountain[0], 3.1, w.fountain[1]),
      spot: () => w.fountainEdge,
      face: () => w.fountain,
    },
    dorm_lane: {
      ...PLACE_DETAILS.plaza.things.dorm_lane,
      anchor: (v) => v.set(w.dormExit[0], 1.1, w.dormExit[1]),
      spot: () => w.dormExit,
      face: () => w.dormEdge,
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
    start: w.arriveIn,
    startFacing: w.arriveFace,
    music: 'calm',
    grade: {
      exposure: 1.04,
      temp: 0.025,
      sat: 0.78,
      contrast: 1.04,
      lift: [0.012, 0.012, 0.018],
      shadowTint: [-0.008, -0.002, 0.02],
      highTint: [0.022, 0.01, -0.014],
      vignette: 0.2,
      bloom: 0.3,
      bloomThreshold: 0.82,
      focusBand: 0.3,
    },
    things,
    spots,
    seats: {},
    people: {},
    zones: {
      office_lane: (x, z) => x < w.westX && z > w.laneZ(x) - 2.4,
      dorm_exit: (x, z) => x > w.eastX && z > w.laneZ(x) - 2.4,
    },
    hooks: {},
    fit(aspect) {
      // both: the phone's camera distance (as in the forecourt and the dorm courtyard, so the walks between them
      // crossfade on the same close framing), following him over the plaza, a little ahead to the north
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
          {
            follow: true,
            clamp: [-5.5, 6.5, -11.5, 4.4],
            lead: -1.4,
            limY: 0.96,
          },
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
          { follow: true, clamp: [-9.2, 10.8, -13.5, 6.4], lead: -3.4 },
        );
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt, t) {
      w.update(dt, t);
      // heading east after work: build the dorm courtyard now, so the walk there needs no loading pause
      if (sim.period === 'evening' && game.player.root.position.x > 2.5 && !game.prepared.dorm_court)
        game.prepare?.('dorm_court');
    },
    onPeriod(period) {
      if (period !== 'evening' || P.grade === EVENING_GRADE) return;
      eveningLight(w.scene);
      w.evening();
      P.grade = EVENING_GRADE;
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }) };
    },
    restoreState(saved) {
      if (!saved.world?.player) return;
      restorePeople({ eric: game.player }, saved.world.player);
      // a save from before the plaza was rebuilt at the map's scale can stand in the basin or a bed
      const p = game.player.root.position;
      if (!w.nav.free(p.x, p.z)) p.set(w.arriveIn[0], p.y, w.arriveIn[1]);
      game.walker.sync();
      cam.snap(game.player.root.position);
    },
    tripOutTo: {
      forecourt: (g) => walkOut(g, cam, w.westLane, w.westEdge),
      dorm_court: (g) => walkOut(g, cam, w.dormExit, w.dormEdge),
    },
    tripInFrom: {
      forecourt: (g) => walkIn(g, cam, w.arriveEdge, w.arriveIn, w.arriveFace),
    },
  };
  return P;
}
