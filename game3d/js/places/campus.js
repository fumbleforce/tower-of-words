import * as THREE from 'three';
import { campusSteps } from '../scenes/campus.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PRINT_DOOR, PRINT_STEP, inRect } from '../scenes/campus/plan.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkIn, walkOut, walkOutNearest, viaOf } from './edge-walk.js';
import { followFit } from './turning-cam.js';
import { canteenSave } from './canteen-state.js';
import { campusCamera } from './campus-camera.js';

export async function campusPlace(game) {
  const w = await sliced(campusSteps()),
    cam = new RoomCam({ elev: 55, fov: 28, yaw: 0.22 });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    e = w.exits;
  const quarter = { shed: e.office_shed, quarter: e.office_quarter };
  const turn = campusCamera(cam);
  const save = canteenSave(game, w.nav, w.start, cam, w.seats);
  const seat = w.seats.campus_bench;
  const things = {
    forecourt: {
      ...PLACE_DETAILS.campus.things.forecourt,
      anchor: (v) => v.set(e.forecourt.lane[0], 1.1, e.forecourt.lane[1]),
      spot: () => e.forecourt.lane,
      face: () => e.forecourt.edge,
    },
    office_quarter: {
      ...PLACE_DETAILS.campus.things.office_quarter,
      anchor: (v) => v.set(e.office_quarter.lane[0], 1.1, e.office_quarter.lane[1]),
      spot: () => e.office_quarter.lane,
      face: () => e.office_quarter.edge,
    },
    office_shed: {
      ...PLACE_DETAILS.campus.things.office_shed,
      anchor: (v) => v.set(e.office_shed.lane[0], 1.1, e.office_shed.lane[1]),
      spot: () => e.office_shed.lane,
      face: () => e.office_shed.edge,
    },
    harbour: {
      ...PLACE_DETAILS.campus.things.harbour,
      anchor: (v) => v.set(e.harbour.lane[0], 1.1, e.harbour.lane[1]),
      spot: () => e.harbour.lane,
      face: () => e.harbour.edge,
    },
    print_shop: {
      ...PLACE_DETAILS.campus.things.print_shop,
      anchor: (v) => v.set(PRINT_DOOR[0], 1.2, PRINT_DOOR[1]),
      spot: () => PRINT_STEP,
      face: () => PRINT_DOOR,
    },
    campus_bench: {
      ...PLACE_DETAILS.campus.things.campus_bench,
      anchor: (v) => v.set(seat.x, 0.9, seat.z),
      spot: () => seat.out,
      face: () => [seat.x, seat.z],
    },
  };
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    light: w.light, // the light for every period (scenes/campus.js, kit/light/)
    charScale: K,
    start: w.start,
    startFacing: Math.PI,
    music: 'calm',
    things,
    spots: { campus_in: w.start, print_door: PRINT_STEP },
    seats: { campus_bench: w.seats.campus_bench },
    people: {},
    hooks: {},
    zones: {
      forecourt_exit: (x, z) => inRect(x, z, e.forecourt.zone),
      office_quarter_exit: (x, z) => inRect(x, z, e.office_quarter.zone),
      office_shed_exit: (x, z) => inRect(x, z, e.office_shed.zone),
      harbour_exit: (x, z) => inRect(x, z, e.harbour.zone),
    },
    fit(aspect) {
      followFit(cam, w.nav, aspect, { yaw: 0.22, elev: (55 * Math.PI) / 180 });
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    update(dt) {
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      turn.steer(p, dt);
      for (const [id, x] of Object.entries(e)) {
        const to = id === 'office_shed' ? 'office_quarter' : id;
        if (Math.hypot(p.x - x.lane[0], p.z - x.lane[1]) < 6 && !game.prepared[to]) game.prepare?.(to);
      }
    },
    snapshotState: save.snapshot,
    restoreState: save.restore,
    tripIn: (g) => walkIn(g, cam, e.forecourt.arrive, e.forecourt.in, Math.PI),
    tripInFrom: {
      office_quarter: (g) => {
        const x = quarter[viaOf(g, 'quarter')] || quarter.quarter;
        return walkIn(g, cam, x.arrive, x.in, 0);
      },
      harbour: (g) => walkIn(g, cam, e.harbour.arrive, e.harbour.in, 0),
      print_shop: (g) => walkIn(g, cam, PRINT_DOOR, PRINT_STEP, Math.PI / 2),
    },
    tripOutTo: {
      forecourt: (g) => walkOut(g, cam, e.forecourt.lane, e.forecourt.edge),
      office_quarter: (g) => walkOutNearest(g, cam, quarter),
      harbour: (g) => walkOut(g, cam, e.harbour.lane, e.harbour.edge),
      print_shop: (g) => walkOut(g, cam, PRINT_STEP, PRINT_DOOR),
    },
  };
  return P;
}
