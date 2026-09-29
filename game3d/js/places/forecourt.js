import * as THREE from 'three';
import { buildForecourt } from '../scenes/forecourt.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { glide } from '../move.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';

export function forecourtPlace(game) {
  const w = buildForecourt();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const spots = {
    station_exit: w.start,
    office_entrance: w.officeEntrance,
    lift_front: w.liftOut,
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
      lift_front: (x, z) => Math.hypot(x - w.liftOut[0], z - w.liftOut[1]) < 0.42,
    },
    hooks: {
      liftOpen: () => w.setLiftOpen(1),
      liftClose: () => w.setLiftOpen(0),
    },
    liftSite: w.liftSite,
    liftLanding: w.liftLanding,
    fit(aspect) {
      const wide = aspect >= 1;
      const bounds = wide ? [-4.3, 6.8, -3.1, 3.0] : [-2.6, 2.6, -2.2, 2.2];
      const points = [];
      for (const x of bounds.slice(0, 2))
        for (const z of bounds.slice(2)) points.push(new THREE.Vector3(x, 1.7, z), new THREE.Vector3(x, 0, z));
      cam.fit(aspect, points, new THREE.Vector3(wide ? 1 : 0, 0, 0), {
        follow: true,
        clamp: wide ? [1, 1, 0, 0] : [-2.6, 5.2, -0.9, 1.2],
        limY: 0.94,
      });
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt, t) {
      w.update(t, dt);
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
    async tripIn(g) {
      const eric = g.player;
      eric.scripted = true;
      eric.root.position.set(w.stationExit[0], 0, w.stationExit[1]);
      eric.root.rotation.y = Math.PI / 2;
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
