import * as THREE from 'three';
import { buildPlaza } from '../scenes/plaza.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';

// The fountain plaza: a side trip east of the forecourt on day 1, with the lane on toward the dorms (planned).
export function plazaPlace(game) {
  const w = buildPlaza();
  const cam = new RoomCam(w.camera); // the forecourt's camera, so the walk between them keeps its angle
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const spots = {
    office_entry: w.officeIn,
    fountain_edge: w.fountainEdge,
    dorm_exit: w.dormExit,
  };
  const west = [-w.edgeX + 0.45, w.officeIn[1]],
    east = [w.edgeX - 0.45, w.dormExit[1]];
  const things = {
    office_lane: {
      ...PLACE_DETAILS.plaza.things.office_lane,
      anchor: (v) => v.set(west[0], 1.1, west[1]),
      spot: () => west,
      face: () => w.officeEdge,
    },
    fountain: {
      ...PLACE_DETAILS.plaza.things.fountain,
      anchor: (v) => v.set(w.fountain[0], 1.35, w.fountain[1]),
      spot: () => w.fountainEdge,
      face: () => w.fountain,
    },
    dorm_lane: {
      ...PLACE_DETAILS.plaza.things.dorm_lane,
      anchor: (v) => v.set(east[0], 1.1, east[1]),
      spot: () => east,
      face: () => [east[0] + 1, east[1]],
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
    start: w.officeIn,
    startFacing: Math.PI / 2,
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
      office_lane: (x, z) => x < -w.edgeX + 0.6 && z > -0.4,
      dorm_exit: (x, z) => x > w.edgeX - 0.6 && z > -0.4,
    },
    hooks: {},
    fit(aspect) {
      // desktop: lane end to lane end with the fountain and the shop roofs in one frame, panning a little with
      // him; phone: follow him along the lane
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-5.4, 0, 0.4),
            new THREE.Vector3(5.4, 0, 0.4),
            new THREE.Vector3(0, 1, -6.4),
            new THREE.Vector3(0, 0, 1.6),
          ],
          new THREE.Vector3(0, 0, -2.5),
          { follow: true, clamp: [-1.4, 1.4, -2.6, -2.4], limY: 0.96 },
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
          { follow: true, clamp: [-4.4, 4.4, -2.2, 0.2], lead: -1.2 },
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
      if (!saved.world?.player) return;
      restorePeople({ eric: game.player }, saved.world.player);
      game.walker.sync();
      cam.snap(game.player.root.position);
    },
    tripOutTo: {
      forecourt: (g) => walkOut(g, cam, [-w.edgeX + 0.3, w.officeIn[1]], w.officeEdge),
    },
    tripInFrom: {
      forecourt: (g) => walkIn(g, cam, w.officeEdge, w.officeIn, Math.PI / 2),
    },
  };
  return P;
}
