import * as THREE from 'three';
import { buildCanteen } from '../scenes/canteen/room.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkOut, walkIn } from './edge-walk.js';
import { roomView } from './room-view.js';
import { canteenSave } from './canteen-state.js';
import { generic } from '../chibi-crowd.js';
import { PEOPLE, idle } from '../cast.js';
import { signBoard } from '../scenes/plaza-buildings.js';
import { plant, clock, rbox } from '../props.js';
import { sim } from '../sim.js';
import { blob } from '../engine.js';
import { counterActivity } from './room-activity.js';
import { AWNING } from '../scenes/plaza-buildings.js';

export function canteenPlace(game) {
  const w = buildCanteen(),
    cam = new RoomCam({ elev: 54, fov: 30 });
  for (const [text, en, x, y, z, width] of [
    ['配膳', 'MEALS', 4.9, 1.55, -8.04, 1.4],
    ['お水', 'WATER', 9.5, 1.1, -6.25, 0.9],
    ['返却', 'TRAY RETURN', -10.3, 1.08, -0.52, 0.9],
  ]) {
    const sign = signBoard(text, en, width, 0.35, '#3f6f77');
    sign.position.set(x, y, z);
    w.root.add(sign);
  }
  const wallClock = clock();
  wallClock.position.set(4.9, 1.94, -8.0);
  w.root.add(wallClock);
  for (const x of [-10.65, 10.65]) {
    const pot = plant({ size: 0.65, seed: 8, pot: '#a87a55' });
    pot.position.set(x, 0, -4.3);
    w.root.add(pot);
    w.nav.block(x - 0.27, x + 0.27, -4.57, -4.03);
  }
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const save = canteenSave(game, w.nav, w.door.in, cam, w.seats);
  const things = {
    canteen_worker: {
      ...PLACE_DETAILS.canteen.things.canteen_worker,
      fixedSpot: true,
      anchor: (v) => {
        residents[0].root.getWorldPosition(v);
        v.y += 1.2;
        return v;
      },
      spot: () => [1.8, -5.85],
      face: () => [1.8, -7.7],
      enabled: () => residents[0].root.visible,
    },
    canteen_exit: {
      ...PLACE_DETAILS.canteen.things.canteen_exit,
      anchor: (v) => v.set(w.door.x, 0.9, 0),
      spot: () => w.door.out,
      face: () => w.door.edge,
    },
    canteen_seat_w: {
      ...PLACE_DETAILS.canteen.things.canteen_seat_w,
      anchor: (v) => v.set(w.seats.canteen_seat_w.x, 0.85, w.seats.canteen_seat_w.z),
      spot: () => w.seats.canteen_seat_w.out,
      face: () => [w.seats.canteen_seat_w.x, w.seats.canteen_seat_w.z],
    },
    canteen_seat_e: {
      ...PLACE_DETAILS.canteen.things.canteen_seat_e,
      anchor: (v) => v.set(w.seats.canteen_seat_e.x, 0.85, w.seats.canteen_seat_e.z),
      spot: () => w.seats.canteen_seat_e.out,
      face: () => [w.seats.canteen_seat_e.x, w.seats.canteen_seat_e.z],
    },
  };
  // Existing generic bodies, with no story roles or dialogue. A few diners remain in the open dining room after service closes.
  const residents = [
    ['apron', 1.8, -7.7, 0, null],
    ['shirt', -9.35, -4.98, 0, 0.34],
    ['cardigan', -4.6, -0.92, Math.PI, 0.34],
    ['polo', 8.05, -4.98, 0, 0.34],
  ].map(([kind, x, z, ry, seat], i) => {
    const r =
      generic(kind, i ? 63 + i : 25, i ? {} : { proxy: true, tint: { top: AWNING.canvas } }) ||
      PEOPLE.worker(i ? 63 + i : 25);
    if (!i && !r.chibi) r.torso.add(rbox(0.25, 0.3, 0.02, AWNING.canvas, { y: -0.15, z: 0.105, r: 0.008, seg: 1 }));
    r.root.scale.multiplyScalar(K);
    r.root.position.set(x, 0, z);
    r.root.rotation.y = ry;
    r.root.add(blob(0.35, 0.25));
    w.root.add(r.root);
    if (seat !== null && r.sitAt) {
      r.sitAt(x, seat, z, ry);
      r.seated = true;
    }
    return r;
  });
  let shownPeriod;
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
    things,
    spots: {
      canteen_in: w.door.in,
      meal_counter: w.spots.meal_counter,
      water: w.spots.water,
      tray_return: w.spots.tray_return,
    },
    seats: { canteen_seat_w: w.seats.canteen_seat_w, canteen_seat_e: w.seats.canteen_seat_e },
    people: { canteen_worker: residents[0] },
    zones: {},
    hooks: { roomWorker: (a) => activity.act(a) },
    fit(aspect) {
      roomView(cam, w.bounds, aspect);
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    onPeriod(period) {
      shownPeriod = period;
      w.period(period);
      residents[0].root.visible = period !== 'evening';
    },
    update(dt, t) {
      if (shownPeriod !== sim.period) P.onPeriod(sim.period);
      activity.update(dt);
      residents.forEach((r) => {
        if (!r.meshy && r.root.visible) idle(r, t);
      });
    },
    snapshotState: () => ({ ...save.snapshot(), roomActivity: activity.snapshot() }),
    restoreState(saved) {
      save.restore(saved);
      activity.restore(saved.world?.roomActivity);
    },
    tripIn: (g) => walkIn(g, cam, w.door.edge, w.door.in, Math.PI),
    tripOutTo: { plaza: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };

  const activity = counterActivity(game, P, residents[0]);
  P.leave = () => activity.leave();
  return P;
}
