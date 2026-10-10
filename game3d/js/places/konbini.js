import * as THREE from 'three';
import { buildKonbini } from '../scenes/konbini/room.js';
import { CLERK } from '../scenes/konbini/plan.js';
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
import { konbiniStage } from './konbini/stage.js';
import { konbiniAction } from './konbini/action.js';
export function konbiniPlace(game) {
  const w = buildKonbini(),
    cam = new RoomCam({ elev: 48, yaw: -0.18, fov: 32 });
  const clerk = generic('apron', 25, { proxy: true, tint: { top: '#6486a1' } }) || PEOPLE.worker(25);
  if (!clerk.chibi && clerk.torso)
    clerk.torso.add(rbox(0.25, 0.3, 0.02, '#6486a1', { y: -0.15, z: 0.105, r: 0.008, seg: 1 }));
  clerk.root.scale.multiplyScalar(K);
  clerk.root.position.set(CLERK[0], 0, CLERK[1]);
  clerk.root.rotation.y = Math.PI / 2;
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
      konbini_exit: {
        ...PLACE_DETAILS.konbini.things.konbini_exit,
        anchor: (v) => v.set(0, 0.9, 0),
        spot: () => w.door.out,
        face: () => w.door.edge,
      },
      fridge: {
        ...PLACE_DETAILS.konbini.things.fridge,
        anchor: (v) => v.set(-0.54, 1.3, -3.33),
        spot: () => w.spots.fridge,
        face: () => [-0.54, -3.64],
      },
      konbini_clerk: {
        ...PLACE_DETAILS.konbini.things.konbini_clerk,
        fixedSpot: true,
        anchor: (v) => {
          clerk.root.getWorldPosition(v);
          v.y += 1.2;
          return v;
        },
        spot: () => w.spots.checkout,
        face: () => CLERK,
      },
      konbini_seat: {
        ...PLACE_DETAILS.konbini.things.konbini_seat,
        anchor: (v) => v.set(w.seats.konbini_seat.x, 0.8, w.seats.konbini_seat.z),
        spot: () => w.seats.konbini_seat.out,
        face: () => [w.seats.konbini_seat.x, w.seats.konbini_seat.z],
      },
    },
    spots: {
      konbini_in: w.spots.konbini_in,
      fridge: w.spots.fridge,
      checkout: w.spots.checkout,
      window: w.spots.window,
    },
    seats: { konbini_seat: w.seats.konbini_seat },
    people: { konbini_clerk: clerk },
    zones: {},
    hooks: { konbiniShop: (a) => perform(a) },
    fit: (aspect) => roomView(cam, w.bounds, aspect),
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    update(dt, t) {
      if (!clerk.meshy) idle(clerk, t);
      stage.update(dt);
    },
    snapshotState: () => ({ ...save.snapshot(), konbini: stage.snapshot() }),
    restoreState(data) {
      save.restore(data);
      stage.restore(data.world?.konbini);
    },
    leave: () => stage.leave(),
    tripIn: (g) => walkIn(g, cam, w.door.edge, w.door.in, Math.PI),
    tripOutTo: { shotengai: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };
  stage = konbiniStage(game, P, w);
  perform = konbiniAction(game, P, (a) => stage.act(a));
  P.konbini = stage;
  return P;
}
