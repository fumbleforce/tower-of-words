// The island's clinic, the ground floor of block_e1 on the east lane (scenes/clinic/), entered from the plaza by its
// glass door at the head of the cross walk. A nurse at the reception counter; an examination bed Eric can sit on.
// After a fall (the story flag `fell_from`, set by whoever staged the fall, then game.travel('clinic', { fast: true,
// via: 'plaza' }) under ui.fade()), he doesn't walk in: he comes to sitting on the examination bed with the nurse
// beside it, the screen comes up from black, and the story's start plays the wake-up (story/clinic.js).
import * as THREE from 'three';
import { buildClinic } from '../scenes/clinic/room.js';
import { NURSE, NURSE_BED, SEAT, SPOTS } from '../scenes/clinic/plan.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { roomView } from './room-view.js';
import { canteenSave } from './canteen-state.js';
import { walkIn, walkOut } from './edge-walk.js';
import { route } from './route.js';
import { generic } from '../crowd/bodies.js';
import { PEOPLE, idle } from '../cast.js';
import { walkPerson, stepPeople } from '../story.js';
import { blob } from '../engine.js';
import { rbox } from '../props.js';
import { flags } from '../narrative/state.js';

const TOP = '#d6e6ea'; // the nurse's pale blue tunic

export function clinicPlace(game) {
  const w = buildClinic(),
    cam = new RoomCam({ elev: 50, yaw: 0.15, fov: 32 }),
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const nurse = generic('apron', 31, { proxy: true, tint: { top: TOP } }) || PEOPLE.worker(31);
  if (!nurse.crowdRole && nurse.torso)
    nurse.torso.add(rbox(0.25, 0.3, 0.02, TOP, { y: -0.15, z: 0.105, r: 0.008, seg: 1 }));
  nurse.root.scale.multiplyScalar(K);
  const shadow = blob(0.35, 0.25);
  nurse.root.add(shadow);
  w.root.add(nurse.root);
  const save = canteenSave(game, w.nav, w.door.in, cam, w.seats);
  const at = () => [nurse.root.position.x, nurse.root.position.z];
  const atDesk = () => Math.hypot(nurse.root.position.x - NURSE[0], nurse.root.position.z - NURSE[1]) < 0.3;
  // she stands at her place behind the counter facing the room, or beside the examination bed facing Eric
  function stand(where) {
    const [x, z] = where === 'bed' ? NURSE_BED : NURSE;
    nurse.root.position.set(x, 0, z);
    nurse.root.rotation.y = where === 'bed' ? Math.atan2(SEAT.x - x, SEAT.z - z) : 0;
  }
  stand('desk');
  // after a fall: Eric sitting on the examination bed, the nurse beside it, the camera close on him
  function wake(g) {
    const eric = g.player;
    g.walker.stop?.();
    eric.root.position.set(SEAT.out[0], 0, SEAT.out[1]);
    eric.sitAt(SEAT.x, SEAT.top, SEAT.z, SEAT.ry);
    eric.seated = true;
    eric.seatOut = [...SEAT.out];
    g.walker.facing = SEAT.ry;
    stand('bed');
    cam.closeOn([SEAT.x, SEAT.z + 0.4], 1.5, 0.5, { onEric: true });
    cam.snap(eric.root.position);
  }
  const things = {
    clinic_exit: {
      ...PLACE_DETAILS.clinic.things.clinic_exit,
      anchor: (v) => v.set(0, 0.9, 0),
      spot: () => w.door.out,
      face: () => w.door.edge,
    },
    clinic_nurse: {
      ...PLACE_DETAILS.clinic.things.clinic_nurse,
      fixedSpot: true,
      anchor: (v) => {
        nurse.root.getWorldPosition(v);
        v.y += 1.2;
        return v;
      },
      // across the counter while she is at it; otherwise in front of her
      spot: () => {
        if (atDesk()) return SPOTS.reception;
        const r = nurse.root;
        return [r.position.x + Math.sin(r.rotation.y) * 0.6, r.position.z + Math.cos(r.rotation.y) * 0.6];
      },
      face: at,
    },
    exam_bed: {
      ...PLACE_DETAILS.clinic.things.exam_bed,
      anchor: (v) => v.set(SEAT.x, 0.8, SEAT.z),
      spot: () => SEAT.out,
      face: () => [SEAT.x, SEAT.z],
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
    start: w.door.in,
    startFacing: Math.PI,
    music: 'calm',
    things,
    spots: {
      clinic_in: w.spots.clinic_in,
      reception: w.spots.reception,
      pharmacy: w.spots.pharmacy,
      exam_bed: w.spots.exam_bed,
      waiting: w.spots.waiting,
      nurse_desk: NURSE,
      bedside: NURSE_BED,
    },
    seats: { exam_bed: w.seats.exam_bed },
    people: { clinic_nurse: nurse },
    zones: {},
    hooks: {},
    fit: (aspect) => {
      cam.camera.fov = aspect < 1 ? 50 : 32;
      roomView(cam, w.bounds, aspect);
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    // the nurse walking (back to her counter after a wake-up): a native body walks itself (hooks/movement.js), the
    // fallback body is stepped here
    walkPerson(id, [x, z], { speed } = {}) {
      if (id !== 'clinic_nurse') return Promise.resolve();
      return walkPerson(nurse, route(w.nav, nurse.root.position, [x, z]), { speed: speed || 1.0, blobM: null }).then(
        () => P.personArrived(id, [x, z]),
      );
    },
    personArrived(id) {
      if (id === 'clinic_nurse' && atDesk()) stand('desk');
    },
    update(dt, t) {
      stepPeople([nurse], dt);
      if (!nurse.meshy && !nurse._walk) idle(nurse, t);
    },
    snapshotState: () => ({ ...save.snapshot(), nurse: atDesk() ? 'desk' : 'bed' }),
    restoreState(data) {
      save.restore(data);
      // a save made during the wake-up comes back to it; otherwise she is at her counter
      if (flags.fell_from) wake(game);
      else stand('desk');
    },
    leave: () => stand('desk'),
    tripIn: async (g) => {
      if (!flags.fell_from) return walkIn(g, cam, w.door.edge, w.door.in, Math.PI);
      wake(g);
      // the frame of the place he fell in is still fading out under the black: gone now, so it never shows
      const fade = document.getElementById('xfade');
      if (fade) fade.hidden = true;
      await g.ui.unfade();
    },
    tripOutTo: { plaza: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };
  return P;
}
