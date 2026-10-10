import * as THREE from 'three';
import { buildBakery } from '../scenes/bakery/room.js';
import { CLERK } from '../scenes/bakery/plan.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { roomView } from './room-view.js';
import { canteenSave } from './canteen-state.js';
import { walkIn, walkOut } from './edge-walk.js';
import { generic } from '../chibi-crowd.js';
import { PEOPLE, idle } from '../cast.js';
import { blob } from '../engine.js';
import { rbox } from '../props.js';
import { bakeryStage } from './bakery/stage.js';
import { bakeryAction } from './bakery/action.js';
export function bakeryPlace(game) {
  const w = buildBakery(),
    cam = new RoomCam({ elev: 48, yaw: 0.18, fov: 32 });
  const clerk = generic('apron', 25, { proxy: true, tint: { top: '#668578' } }) || PEOPLE.worker(25);
  if (!clerk.chibi && clerk.torso)
    clerk.torso.add(rbox(0.25, 0.3, 0.02, '#668578', { y: -0.15, z: 0.105, r: 0.008, seg: 1 }));
  clerk.root.scale.multiplyScalar(K);
  clerk.root.position.set(CLERK[0], 0, CLERK[1]);
  clerk.root.add(blob(0.35, 0.25));
  w.root.add(clerk.root);
  const save = canteenSave(game, w.nav, w.door.in, cam, w.seats),
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let stage, perform;
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: w.door.in,
    startFacing: Math.PI,
    music: 'calm',
    things: {
      bakery_exit: {
        ...PLACE_DETAILS.bakery.things.bakery_exit,
        anchor: (v) => v.set(0, 0.9, 0),
        spot: () => w.door.out,
        face: () => w.door.edge,
      },
      bread_rack: {
        ...PLACE_DETAILS.bakery.things.bread_rack,
        anchor: (v) => v.set(-1.4, 1.1, -1.68),
        spot: () => w.spots.bread_rack,
        face: () => [-1.6, -1.68],
      },
      bakery_clerk: {
        ...PLACE_DETAILS.bakery.things.bakery_clerk,
        fixedSpot: true,
        anchor: (v) => {
          clerk.root.getWorldPosition(v);
          v.y += 1.2;
          return v;
        },
        spot: () => w.spots.checkout,
        face: () => CLERK,
      },
      bakery_seat: {
        ...PLACE_DETAILS.bakery.things.bakery_seat,
        anchor: (v) => v.set(w.seats.bakery_seat.x, 0.8, w.seats.bakery_seat.z),
        spot: () => w.seats.bakery_seat.out,
        face: () => [w.seats.bakery_seat.x, w.seats.bakery_seat.z],
      },
    },
    spots: {
      bakery_in: w.spots.bakery_in,
      bread_rack: w.spots.bread_rack,
      checkout: w.spots.checkout,
      window: w.spots.window,
    },
    seats: { bakery_seat: w.seats.bakery_seat },
    people: { bakery_clerk: clerk },
    zones: {},
    hooks: { bakeryShop: (a) => perform(a) },
    fit: (aspect) => roomView(cam, w.bounds, aspect),
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    update(dt, t) {
      if (!clerk.meshy) idle(clerk, t);
      stage.update(dt);
    },
    snapshotState: () => ({ ...save.snapshot(), bakery: stage.snapshot() }),
    restoreState(data) {
      save.restore(data);
      stage.restore(data.world?.bakery);
    },
    leave: () => stage.leave(),
    tripIn: (g) => walkIn(g, cam, w.door.edge, w.door.in, Math.PI),
    tripOutTo: { shotengai: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };
  stage = bakeryStage(game, P);
  perform = bakeryAction(game, P, (a) => stage.act(a));
  P.bakery = stage;
  return P;
}
