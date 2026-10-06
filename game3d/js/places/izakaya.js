import * as THREE from 'three';
import { buildIzakaya } from '../scenes/izakaya/room.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkIn, walkOut } from './edge-walk.js';
import { roomView } from './room-view.js';
import { canteenSave } from './canteen-state.js';
import { izakayaParty } from './izakaya/party.js';
export function izakayaPlace(game) {
  const w = buildIzakaya(),
    cam = new RoomCam({ elev: 48, yaw: 0.22, fov: 32 }),
    party = izakayaParty(game, w, K);
  const save = canteenSave(game, w.nav, w.door.in, cam, w.seats),
    floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
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
      izakaya_exit: {
        ...PLACE_DETAILS.izakaya.things.izakaya_exit,
        anchor: (v) => v.set(0, 0.9, 0),
        spot: () => w.door.out,
        face: () => w.door.edge,
      },
      party_seat: {
        ...PLACE_DETAILS.izakaya.things.party_seat,
        anchor: (v) => v.set(w.seats.party_seat.x, 0.8, w.seats.party_seat.z),
        spot: () => w.seats.party_seat.out,
        face: () => [w.seats.party_seat.x, w.seats.party_seat.z],
      },
      mori: { ...PLACE_DETAILS.izakaya.things.mori, ...party.thing('mori') },
      mio: { ...PLACE_DETAILS.izakaya.things.mio, ...party.thing('mio') },
      kenji: { ...PLACE_DETAILS.izakaya.things.kenji, ...party.thing('kenji') },
      emi: { ...PLACE_DETAILS.izakaya.things.emi, ...party.thing('emi') },
    },
    spots: {
      izakaya_in: w.spots.izakaya_in,
      party_group: w.spots.party_group,
      party_food: w.spots.party_food,
      party_mori: w.spots.party_mori,
      party_mio: w.spots.party_mio,
      party_kenji: w.spots.party_kenji,
      party_emi: w.spots.party_emi,
      service_counter: w.spots.service_counter,
    },
    seats: {
      party_seat: w.seats.party_seat,
      party_mori: w.seats.party_mori,
      party_mio: w.seats.party_mio,
      party_kenji: w.seats.party_kenji,
      party_emi: w.seats.party_emi,
    },
    people: { mori: party.people.mori, mio: party.people.mio, kenji: party.people.kenji, emi: party.people.emi },
    zones: { izakaya_exit: (x, z) => Math.abs(x) < 0.6 && z > -0.22 },
    hooks: { partySetup: party.setup, partyFood: party.food.hook },
    fit(aspect) {
      if (aspect >= 1) roomView(cam, w.bounds, aspect);
      else
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-1.65, 0, -0.7),
            new THREE.Vector3(1.65, 0, -0.7),
            new THREE.Vector3(-1.65, 1.45, -3.05),
            new THREE.Vector3(1.65, 1.45, -3.05),
          ],
          new THREE.Vector3(0, 0.65, -2.02),
          { limX: 0.9, limY: 0.76 },
        );
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    onDay() {
      return party.setup();
    },
    update(dt, t) {
      party.update(dt, t);
      const elevation = cam.close?.target.z < -1 ? 34 : 48;
      cam.elev += (THREE.MathUtils.degToRad(elevation) - cam.elev) * Math.min(1, dt * 4);
    },
    leave() {
      party.clear();
    },
    snapshotState() {
      return { ...save.snapshot(), dinner: party.snapshot() };
    },
    restoreState(saved) {
      save.restore(saved);
      party.restore(saved.world?.dinner);
    },
    tripIn: (g) => walkIn(g, cam, w.door.edge, w.door.in, Math.PI),
    tripOutTo: { shotengai: (g) => walkOut(g, cam, w.door.out, w.door.edge) },
  };
  const closeOn = cam.closeOn.bind(cam);
  cam.closeOn = (point, zoom, ...args) => {
    if (point[1] >= -1) return closeOn(point, zoom, ...args);
    const packed = party.snapshot().packed,
      phone = cam.camera.aspect < 1;
    return closeOn(packed ? [-0.15, -2.6] : [0, -2.05], packed ? (phone ? 1.35 : 1.75) : phone ? 1.05 : 1.45, 0.82);
  };
  party.install(P);
  P.dinner = party;
  return P;
}
