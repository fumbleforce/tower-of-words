import { conversationCamera } from './conversation-camera.js';
import * as THREE from 'three';
import { local as shopLocal } from '../scenes/shotengai/plan.js';
import { southLinkFrame } from '../scenes/forecourt/south-link.js';
import { shotengaiSteps } from '../scenes/shotengai.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { lightPlace } from '../kit/light/rig.js';
import { sim } from '../sim.js';
import { addOccluder, updateOccluders, footprint } from '../scenes/occluders.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { walkOut, walkIn } from './edge-walk.js';
import { shotengaiParty } from './shotengai-party.js';
import { stationGarden } from './station-garden/index.js';
import { day3Place } from './day3/place.js';

// The shop street and the seafront (scenes/shotengai.js): reached from the plaza down the cross walk and along the
// south walk, it comes in at the arcade's east mouth off the dorm street; it also loads with ?place=shotengai. The
// shops are shut for now (their doors say so), but the karaoke box's door opens onto its front desk
// (places/karaoke.js). Out the east end goes back to the plaza, or after work up the dorm
// street to the dorm courtyard.
const STEEP = (84 * Math.PI) / 180; // the camera's elevation in the alleys and down the rows' west end
export async function shotengaiPlace(game) {
  const w = await sliced(shotengaiSteps()); // in slices between frames: it's built while the plaza is played
  const cam = new RoomCam(w.camera);
  const flat = cam.elev;
  const southLink = southLinkFrame('shotengai');
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const [, , az0, az1] = w.arcade;
  // the named shops' doors: shut (story/shotengai.js says so); a pin over each, Eric steps up to it
  const dk = (id) => w.doors.find((k) => k.id === id);
  const pin = (v, id) => v.set(dk(id).local[0], 1.95, dk(id).local[1]);
  // the way a door faces: from it out to the step in front of it
  const outOf = (id) => Math.atan2(dk(id).step[0] - dk(id).local[0], dk(id).step[1] - dk(id).local[1]);
  const garden = stationGarden(game, { w, K });
  const party = shotengaiParty(game, { w, K }); // Kenji waits at the izakaya door.
  const d3 = day3Place(game, 'shotengai', { root: w.root, K, ids: ['kuroda', 'aoi', 'kuro', 'rei'] }); // day 3's shoppers
  const things = {
    station_worker: { ...PLACE_DETAILS.shotengai.things.station_worker, ...garden.thing('station_worker') },
    garden_bench_1: {
      ...PLACE_DETAILS.shotengai.things.garden_bench_1,
      ...garden.thing('garden_bench_1'),
      anchor: (v) => garden.thing('garden_bench_1').anchor(v),
    },
    garden_bench_2: {
      ...PLACE_DETAILS.shotengai.things.garden_bench_2,
      ...garden.thing('garden_bench_2'),
      anchor: (v) => garden.thing('garden_bench_2').anchor(v),
    },
    plaza_lane: {
      ...PLACE_DETAILS.shotengai.things.plaza_lane,
      anchor: (v) => v.set(w.edge[0], 1.1, w.edge[1] - 1.2),
      spot: () => [w.edge[0], w.edge[1] - 1.6],
      face: () => w.edge,
    },
    office_lane: {
      ...PLACE_DETAILS.shotengai.things.office_lane,
      anchor: (v) => v.set(southLink.edge[0], 1.1, southLink.edge[1]),
      spot: () => southLink.lane,
      face: () => southLink.edge,
    },
    bike_shop: {
      ...PLACE_DETAILS.shotengai.things.bike_shop,
      anchor: (v) => pin(v, 'bike_shop'),
      spot: () => dk('bike_shop').step,
      face: () => dk('bike_shop').local,
    },
    store: {
      ...PLACE_DETAILS.shotengai.things.store,
      anchor: (v) => pin(v, 'store'),
      spot: () => dk('store').step,
      face: () => dk('store').local,
    },
    bakery: {
      ...PLACE_DETAILS.shotengai.things.bakery,
      anchor: (v) => {
        const [x, z] = shopLocal([45.35, 18.65]);
        return v.set(x, 0.75, z);
      },
      spot: () => shopLocal([45.35, 19.25]),
      face: () => shopLocal([45.35, 18.65]),
      enabled: () => sim.day >= 2,
    },
    store_door: {
      ...PLACE_DETAILS.shotengai.things.store_door,
      anchor: (v) => pin(v, 'store'),
      spot: () => dk('store').step,
      face: () => dk('store').local,
      enabled: () => sim.day >= 3,
    },
    bakery_door: {
      ...PLACE_DETAILS.shotengai.things.bakery_door,
      anchor: (v) => pin(v, 'bakery'),
      spot: () => dk('bakery').step,
      face: () => dk('bakery').local,
    },
    game_centre: {
      ...PLACE_DETAILS.shotengai.things.game_centre,
      anchor: (v) => pin(v, 'game_centre'),
      spot: () => dk('game_centre').step,
      face: () => dk('game_centre').local,
    },
    karaoke: {
      ...PLACE_DETAILS.shotengai.things.karaoke,
      anchor: (v) => pin(v, 'karaoke'),
      spot: () => dk('karaoke').step,
      face: () => dk('karaoke').local,
    },
    izakaya: {
      ...PLACE_DETAILS.shotengai.things.izakaya,
      anchor: (v) => pin(v, 'izakaya'),
      spot: () => dk('izakaya').step,
      face: () => dk('izakaya').local,
    },
    mori: { ...PLACE_DETAILS.shotengai.things.mori, ...party.thing('mori') },
    kenji: { ...PLACE_DETAILS.shotengai.things.kenji, ...party.thing('kenji') },
    party_seat: {
      ...PLACE_DETAILS.shotengai.things.party_seat,
      anchor: (v) => party.anchor(v),
      ...party.thing('party_seat'),
    },
    kuroda: { ...PLACE_DETAILS.shotengai.things.kuroda, ...d3.thing('kuroda') },
    aoi: { ...PLACE_DETAILS.shotengai.things.aoi, ...d3.thing('aoi') },
    kuro: { ...PLACE_DETAILS.shotengai.things.kuro, ...d3.thing('kuro') },
    rei: { ...PLACE_DETAILS.shotengai.things.rei, ...d3.thing('rei') },
  };
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    light: w.light, // the light for every period (scenes/shotengai.js, kit/light/)
    charScale: K,
    start: w.in,
    startFacing: w.face,
    music: 'calm',
    things,
    spots: {
      station_garden: garden.spots.station_garden,
      station_garden_approach: garden.spots.station_garden_approach,
      garden_free_bench: garden.spots.garden_free_bench,
      garden_next_patch: garden.spots.garden_next_patch,
      plaza_entry: w.in,
      office_lane: southLink.lane,
      shotengai_shrine: w.nooks.shotengai_shrine,
      shotengai_back_alley: w.nooks.shotengai_back_alley,
      shotengai_pine_bench: w.nooks.shotengai_pine_bench,
      party_group: party.spots.party_group,
      party_kenji: party.spots.party_kenji,
      party_mio: party.spots.party_mio,
    },
    seats: {
      garden_bench_1: garden.seats.garden_bench_1,
      garden_bench_2: garden.seats.garden_bench_2,
      party_seat: party.seats.party_seat,
      party_mori: party.seats.party_mori,
    },
    people: {
      station_worker: garden.people.station_worker,
      mori: party.people.mori,
      kenji: party.people.kenji,
      kuroda: d3.people.kuroda,
      aoi: d3.people.aoi,
      kuro: d3.people.kuro,
      rei: d3.people.rei,
    },
    zones: { office_exit: southLink.exit, plaza_exit: (x, z) => z > w.exitZ },
    hooks: {
      gardenWorker: garden.hooks.gardenWorker,
      partySetup: party.hooks.partySetup,
      partyFood: party.hooks.partyFood,
    },
    day3: (a) => d3.setup(P, a),
    fit(aspect) {
      // as the plaza: the phone's camera distance on both, following him, a little ahead (west, down the street)
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
          { follow: true, clamp: [-6.5, 8.4, az0 - 8, az1 + 6], lead: -1.4, limY: 0.96 },
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
          { follow: true, clamp: [-10, 8.4, az0 - 9, az1 + 7.5], lead: -3.4 },
        );
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      d3.update(dt);
      const p = game.player.root.position;
      w.follow(p.x, p.z);
      updateOccluders(P, p, dt);
      const [kx, kz] = dk('karaoke').step;
      if (Math.hypot(p.x - kx, p.z - kz) < 7 && !game.prepared.karaoke) game.prepare?.('karaoke');
      // steeper over the alleys and the rows' west end, where the rows would hide him
      const want = w.steep(p.x, p.z) ? STEEP : flat;
      cam.elev += (want - cam.elev) * Math.min(1, dt * 3);
    },
    // what a period changes here besides the light (the rig's)
    onPeriod(period) {
      w.cards(sim.day, period); // the shops' door cards for the day and the time (scenes/shop-signs.js WHEN)
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }) };
    },
    restoreState(saved) {
      if (!saved.world?.player) return;
      restorePeople({ eric: game.player }, saved.world.player);
      const p = game.player.root.position;
      if (!w.nav.free(p.x, p.z)) p.set(w.in[0], p.y, w.in[1]);
      game.walker.sync();
      cam.snap(game.player.root.position);
    },
    // in off the dorm street onto the shop walk, the arcade ahead; out the same way
    tripIn: (g) => walkIn(g, cam, w.edge, w.in, w.face),
    tripOut: (g) => walkOut(g, cam, [w.edge[0], w.edge[1] - 1.6], w.edge),
    // the karaoke box: in at its door off the arcade, and back out of it onto the arcade
    tripInFrom: {
      konbini: (g) => walkIn(g, cam, dk('store').local, dk('store').step, outOf('store')),
      bakery: (g) => walkIn(g, cam, dk('bakery').local, dk('bakery').step, outOf('bakery')),
      forecourt: (g) => walkIn(g, cam, southLink.edge, southLink.inside, -Math.PI / 2),
      izakaya: (g) => walkIn(g, cam, dk('izakaya').local, dk('izakaya').step, outOf('izakaya')),
      karaoke: (g) => walkIn(g, cam, dk('karaoke').local, dk('karaoke').step, outOf('karaoke')),
    },
    tripOutTo: {
      konbini: (g) => walkOut(g, cam, dk('store').step, dk('store').local),
      bakery: (g) => walkOut(g, cam, dk('bakery').step, dk('bakery').local),
      forecourt: (g) => walkOut(g, cam, southLink.lane, southLink.edge),
      izakaya: (g) => walkOut(g, cam, dk('izakaya').step, dk('izakaya').local),
      karaoke: (g) => walkOut(g, cam, dk('karaoke').step, dk('karaoke').local),
    },
  };
  party.install(P);
  garden.install(P);
  conversationCamera(game, P, {
    station_worker: { yaw: -0.7, elev: 40, fov: 45, minDistance: 8, halfWidth: 2.3, height: 0.4 },
    aoi: { yaw: -0.85, elev: 35, fov: 45, minDistance: 4.5, halfWidth: 1.0, height: 0.4 },
    rei: { yaw: -2.15, elev: 35, fov: 45, minDistance: 4.5, halfWidth: 1.0, height: 0.4 },
    kuro: { yaw: -1.5, elev: 35, fov: 45, minDistance: 4.5, halfWidth: 1.0, height: 0.4 },
  });
  // the arcade's glass roof fades while he is under it
  addOccluder(P, w.arcadeRoof, footprint(w.arcade[0] - 0.2, w.arcade[1] + 0.2, az0 - 0.5, az1 + 0.5), {
    name: 'arcade',
  });
  lightPlace(P, sim.period, sim.day);
  return P;
}
