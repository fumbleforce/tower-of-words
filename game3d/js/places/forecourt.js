import * as THREE from 'three';
import { buildForecourt } from '../scenes/forecourt.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { walkOut, walkIn } from './edge-walk.js';
import { glide } from '../move.js';
import { eveningLight, EVENING_GRADE } from '../scenes/town.js';
import { relightLift } from './lift.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';

export function forecourtPlace(game) {
  const w = buildForecourt();
  const cam = new RoomCam(w.camera); // the security room's camera, so the crossfade out of it keeps its angle
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const spots = {
    station_exit: w.start,
    office_entrance: w.officeEntrance,
    lift_front: w.liftOut,
    plaza_lane: w.plazaLane,
  };
  const things = {
    station_exit: {
      ...PLACE_DETAILS.forecourt.things.station_exit,
      anchor: (v) => v.set(w.stationExit[0], 1.3, w.stationExit[1]),
      spot: () => w.start,
      face: () => w.stationExit,
      noMarker: true,
    },
    office_entrance: {
      ...PLACE_DETAILS.forecourt.things.office_entrance,
      anchor: (v) => v.set(w.officeEntrance[0], 1.3, w.officeEntrance[1]),
      spot: () => w.officeEntrance,
      face: () => w.liftOut,
    },
    lift: {
      ...PLACE_DETAILS.forecourt.things.lift,
      anchor: (v) => v.set(w.liftSite.x, 1.6, w.liftSite.zFront),
      spot: () => w.liftOut,
      face: () => [w.liftSite.x, w.liftSite.zBack],
    },
    plaza_lane: {
      ...PLACE_DETAILS.forecourt.things.plaza_lane,
      anchor: (v) => v.set(w.plazaLane[0] + 0.5, 1.1, w.plazaLane[1]),
      spot: () => w.plazaLane,
      face: () => w.plazaEdge,
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
    start: w.start,
    startFacing: Math.PI,
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
      lift_front: (x, z) => Math.hypot(x - w.liftOut[0], z - w.liftOut[1]) < 0.42,
      plaza_lane: (x, z) => x > w.plazaLane[0] - 0.1 && Math.abs(z - w.plazaLane[1]) < 0.9,
    },
    hooks: {
      liftOpen: () => w.setLiftOpen(1),
      liftClose: () => w.setLiftOpen(0),
    },
    liftSite: w.liftSite,
    liftLanding: w.liftLanding,
    fit(aspect) {
      // desktop: the whole short crossing, station door to lift, in one still frame; phone: follow him
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-4.7, 0, 0),
            new THREE.Vector3(5.6, 0, 0),
            new THREE.Vector3(w.liftSite.x, 3.2, w.towerZ),
            new THREE.Vector3(w.doorX, 0, w.stationExit[1] - 0.2),
          ],
          new THREE.Vector3(0.45, 0, -0.6),
          { follow: true, clamp: [0.2, 1.8, -0.6, 0.0], limY: 0.96 },
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
          { follow: true, clamp: [-1.0, 4.4, -1.9, 0.6], lead: -1.6 },
        );
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt, t) {
      w.update(t, dt);
      // heading east toward the lane: build the plaza now, so the walk there needs no loading pause
      if (game.player.root.position.x > 2.5 && !game.prepared.plaza) game.prepare?.('plaza');
    },
    onPeriod(period) {
      if (period !== 'evening' || P.grade === EVENING_GRADE) return;
      relightLift(P);
      eveningLight(w.scene);
      P.grade = EVENING_GRADE;
    },
    snapshotState() {
      return {
        player: snapshotPeople({ eric: game.player }),
        landing: w.liftLanding.k(),
      };
    },
    restoreState(saved) {
      if (saved.world?.player) {
        restorePeople({ eric: game.player }, saved.world.player);
        game.walker.sync();
        cam.snap(game.player.root.position);
      }
      w.setLiftOpen(saved.world?.landing > 0.5 ? 1 : 0);
    },
    // the walks to and from the fountain plaza (trips.js picks these by the other place's name)
    tripOutTo: {
      plaza: (g) => walkOut(g, cam, w.plazaLane, w.plazaEdge),
    },
    tripInFrom: {
      plaza: (g) => walkIn(g, cam, w.plazaEdge, w.plazaIn, -Math.PI / 2),
    },
    async tripIn(g) {
      const eric = g.player;
      eric.scripted = true;
      eric.root.position.set(w.stationExit[0], 0, w.stationExit[1]);
      eric.root.rotation.y = Math.PI; // north, as he left the security room
      cam.closeOn(w.stationExit, 1.7);
      cam.snap(eric.root.position);
      await glide(g, eric.root, w.start, 1.1);
      eric.setState('idle');
      eric.scripted = false;
      g.walker.sync();
      cam.release();
    },
  };
  return P;
}
