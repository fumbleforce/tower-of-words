import * as THREE from 'three';
import { day3Place } from './day3/place.js';
import { BIKES } from '../scenes/forecourt/plan.js';
import { forecourtSteps } from '../scenes/forecourt.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { walkOut, walkIn } from './edge-walk.js';
import { glide } from '../move.js';
import { eveningLight, eveningGrade } from '../scenes/town.js';
import { sim } from '../sim.js';
import { relightLift } from './lift.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { idle } from '../cast.js';
import { gardenCat } from './garden-cat.js';
import { fallenBikes } from './fallen-bikes.js';

// the phone's view out of the station: looking east, lower, a little further out, Eric low in the frame
const EAST = { elev: 33, zoom: 1.36, lead: -6.3 };

export async function forecourtPlace(game) {
  const w = await sliced(forecourtSteps()); // in slices between frames: it's built while the gate room is played
  const cam = new RoomCam(w.camera); // the security room's camera, so the crossfade out of it keeps its angle
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  // after work: Tama on the garden bench, and the fallen bicycle in the bike court
  const garden = gardenCat(game, w.root),
    bikes = fallenBikes(game, w.root, w.nav);
  const spots = {
    station_exit: w.start,
    office_entrance: w.officeEntrance,
    lift_front: w.liftOut,
    plaza_lane: w.plazaLane,
    forecourt_staff_gate: w.nooks.forecourt_staff_gate,
    // in the head office lobby: its nooks, the receptionist's office door and the office behind it
    lobby_model: w.headOffice.nooks.lobby_model,
    lobby_island_w: w.headOffice.nooks.lobby_island_w,
    lobby_island_e: w.headOffice.nooks.lobby_island_e,
    lobby_lift_bench: w.headOffice.nooks.lobby_lift_bench,
    lobby_umbrella: w.headOffice.nooks.lobby_umbrella,
    reception_office_door: w.headOffice.officeDoor,
    reception_office: w.headOffice.office,
  };
  const d4 = day3Place(game, 'forecourt', { root: w.root, K, ids: ['kuroda'] });
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
      // the head office marker takes him in through the doors and on to the lift, where the ride starts
      // (Jørgen: "clicking the head office marker just takes me in front of it"); the lobby has nothing else he needs
      spot: () => w.liftOut,
      keep: 1.6, // the doors and canopy stay clear of the goal's edge arrow (ui/goal-arrow.js)
      face: () => [w.liftSite.x, w.liftSite.zBack],
    },
    lift: {
      ...PLACE_DETAILS.forecourt.things.lift,
      anchor: (v) => v.set(w.liftSite.x, 1.6, w.liftSite.zFront),
      spot: () => w.liftOut,
      keep: 1,
      face: () => [w.liftSite.x, w.liftSite.zBack],
    },
    kuro: {
      ...PLACE_DETAILS.forecourt.things.kuro,
      anchor: (v) => {
        w.kuro.root.getWorldPosition(v);
        v.y += 1.25;
        return v;
      },
      spot: () => w.headOffice.receptionFront,
      fixedSpot: true,
      face: () => w.headOffice.kuroAt,
    },
    // Kuro's label printer on the reception counter, named for the ticket that uses it (no pin until a story does)
    label_printer: {
      ...PLACE_DETAILS.forecourt.things.label_printer,
      anchor: (v) => {
        w.headOffice.labelPrinter.getWorldPosition(v);
        v.y += 0.25;
        return v;
      },
      spot: () => w.headOffice.receptionFront,
      face: () => w.headOffice.kuroAt,
    },
    plaza_lane: {
      ...PLACE_DETAILS.forecourt.things.plaza_lane,
      anchor: (v) => v.set((w.plazaLane[0] + w.plazaEdge[0]) / 2, 1.1, (w.plazaLane[1] + w.plazaEdge[1]) / 2),
      spot: () => w.plazaLane,
      face: () => w.plazaEdge,
    },
    garden_bench: {
      ...PLACE_DETAILS.forecourt.things.garden_bench,
      anchor: (v) => garden.anchor(v),
      spot: garden.spot,
      face: garden.face,
    },
    fallen_bicycle: {
      ...PLACE_DETAILS.forecourt.things.fallen_bicycle,
      anchor: (v) => bikes.anchor(v), // on whichever bike is down
      spot: bikes.spot,
      face: bikes.face,
      obj: bikes.obj,
      outline: bikes.outline,
      enabled: bikes.enabled,
    },
    kuroda: { ...PLACE_DETAILS.forecourt.things.kuroda, ...d4.thing('kuroda') },
  };
  // an old save can hold a spot that is now a wall, a bike rack or the station (the court was rebuilt 2026-09-30):
  // move him to the nearest free ground, or to the station door when there is none nearby
  const snapToWalk = (p) => {
    const nav = w.nav,
      s = w.liftSite;
    if (nav.free(p.x, p.z)) return;
    if (Math.abs(p.x - s.x) < 0.8 && p.z < s.zFront + 0.2 && p.z > s.zBack - 2.4) return; // in the lift car
    if (!nav.grid) nav.build();
    const [i, k] = nav.cellOf(p.x, p.z);
    const c = nav.nearestFree(i, k);
    const [x, z] = c ? [nav.x0 + (c[0] + 0.5) * nav.cell, nav.z0 + (c[1] + 0.5) * nav.cell] : w.start;
    p.set(x, p.y, z);
  };
  // The phone's turn: 1 looks east from the station door up the court at head office, 0 looks north as everywhere
  // else. It eases between the two over the bike court (TURN, in x), so the view at the head office door, in the
  // lobby and in the lift is the usual one; a jump (a trip, a restored save) snaps it.
  const TURN = [8.2, 12.6],
    north = { yaw: 0, elev: cam.elev, dist: 0, lead: -1.6 },
    east = {
      yaw: -1.2, // up the court toward the head office door, east-north-east
      elev: THREE.MathUtils.degToRad(EAST.elev),
      zoom: EAST.zoom,
      lead: EAST.lead,
    };
  let phone = false,
    turn = 0,
    turnAt = null;
  const setTurn = (k) => {
    turn = k;
    if (!phone || !north.dist) {
      if (cam.yaw) [cam.yaw, cam.elev] = [north.yaw, north.elev]; // back from a phone turn (the window was resized)
      return;
    }
    const s = k * k * (3 - 2 * k),
      L = THREE.MathUtils.lerp;
    cam.yaw = L(north.yaw, east.yaw, s);
    cam.elev = L(north.elev, east.elev, s);
    cam.fitDist = north.dist * L(1, east.zoom, s);
    cam.lead = L(north.lead, east.lead, s);
  };
  const steer = (p, dt) => {
    const jump = !turnAt || Math.hypot(p.x - turnAt[0], p.z - turnAt[1]) > 0.8;
    turnAt = [p.x, p.z];
    if (!phone) return;
    // Look north in the bicycle court and lobby, keeping their side walls out of the phone's foreground.
    const want =
      (1 - THREE.MathUtils.smoothstep(p.x, TURN[0], TURN[1])) *
      (1 - THREE.MathUtils.smoothstep(p.z, BIKES[2], BIKES[2] + 0.8)) *
      THREE.MathUtils.smoothstep(p.z, w.hoDoor[1], w.hoDoor[1] + 0.8);
    if (Math.abs(want - turn) < 1e-4) return; // settled: leave the camera alone (the lift ride sets its elevation)
    setTurn(jump ? want : turn + (want - turn) * (1 - Math.exp(-dt / 0.45)));
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
    seats: { garden_bench: garden.seat },
    people: { kuro: w.kuro, tama: garden.person, kuroda: d4.people.kuroda },
    zones: {
      lift_front: (x, z) => Math.hypot(x - w.liftOut[0], z - w.liftOut[1]) < 0.42,
      // day 2: back in at the station's door (the walk to the platform)
      station_exit: (x, z) => Math.hypot(x - w.stationExit[0], z - w.stationExit[1]) < 0.45,
      plaza_lane: (x, z) => {
        const l = w.laneAt(x, z),
          l0 = w.laneAt(...w.plazaLane);
        return l.u > l0.u - 0.1 && Math.abs(l.off) < 1.2;
      },
      // inside the receptionist's office behind the feature wall
      reception_office: (x, z) => w.headOffice.inOffice(x, z),
    },
    day3: (a) => d4.setup(P, a),
    hooks: {
      labelRepair: (a) => P.monday.hooks.labelRepair(a),
      liftOpen: () => w.setLiftOpen(1),
      liftClose: () => w.setLiftOpen(0),
      gardenCat: garden.hooks.gardenCat,
      bicycle: bikes.hooks.bicycle,
    },
    liftSite: w.liftSite,
    liftLanding: w.liftLanding,
    update: (dt) => d4.update(dt),
    fit(aspect) {
      // desktop: the station door and the head office door in one frame, then north into the lobby or east up the lane
      const k = turn;
      phone = false;
      setTurn(0);
      if (aspect >= 1) {
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-5.9, 0, 0.6),
            new THREE.Vector3(4.4, 0, 0.6),
            new THREE.Vector3(-0.75, 3.2, -6.8),
            new THREE.Vector3(w.doorX, 0, w.stationExit[1] - 0.2),
          ],
          new THREE.Vector3(5.2, 0, -1.2),
          { follow: true, clamp: [5.2, 26, -11.4, 3.5], limY: 0.96 }, // north as far as the lifts and the office
        );
        return;
      }
      // phone: follow him, looking north near head office and in the lobby; out of the station the camera looks
      // east up the court instead (setTurn), since a tall screen can't hold both doors looking north
      cam.fit(
        aspect,
        [
          new THREE.Vector3(-2.9, 0, 0),
          new THREE.Vector3(2.9, 0, 0),
          new THREE.Vector3(0, 0, -2.6),
          new THREE.Vector3(0, 1.2, 2.4),
        ],
        new THREE.Vector3(0, 0, 0),
        { follow: true, clamp: [-1.0, 30, -12.4, 8.0], lead: -1.6 },
      );
      phone = true;
      north.dist = cam.fitDist;
      setTurn(k);
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt, t) {
      w.update(t, dt);
      w.headOffice.update(game.player.root.position, dt);
      steer(game.player.root.position, dt);
      w.station.update(game.player.root.position, dt, cam.dir);
      idle(w.kuro, t);
      garden.update(t);
      // heading for the lane (not for head office): build the plaza now, so the walk there needs no loading pause
      const e = game.player.root.position;
      if (e.x > 20 && e.z > w.hoDoor[1] && !game.prepared.plaza) game.prepare?.('plaza');
    },
    onPeriod(period) {
      garden.sync(); // on every entry: who is out after work, and what the story left moved
      bikes.sync();
      if (period !== 'evening' || P.grade === eveningGrade(sim.day)) return;
      relightLift(P);
      eveningLight(w.scene, sim.day);
      w.headOffice.onPeriod(period);
      w.station.onPeriod(period);
      w.sky?.onPeriod(period);
      w.lightsOn();
      P.grade = eveningGrade(sim.day);
    },
    leave() {
      w.nav.shut('station_door');
    },
    snapshotState() {
      return {
        player: snapshotPeople({ eric: game.player }),
        landing: w.liftLanding.k(),
        tama: garden.snapshot(),
        bikes: bikes.snapshot(),
      };
    },
    restoreState(saved) {
      if (saved.world?.player) {
        restorePeople({ eric: game.player }, saved.world.player);
        // on the garden bench (the only seat here): the next walk steps him off it, as the story's sit would
        if (game.player.seated) game.player.seatOut = garden.seatOut();
        else snapToWalk(game.player.root.position);
        game.walker.sync();
        cam.snap(game.player.root.position);
      }
      w.setLiftOpen(saved.world?.landing > 0.5 ? 1 : 0);
      garden.restore(saved.world?.tama);
      bikes.restore(saved.world?.bikes);
    },
    // the walks to and from the fountain plaza (trips.js picks these by the other place's name)
    tripOutTo: {
      plaza: (g) => walkOut(g, cam, w.plazaLane, w.plazaEdge),
      // day 2: back in at the station's door, the way he came out of it (tripIn backwards)
      async gate(g) {
        await g.walkTo(w.start[0], w.start[1]);
        const eric = g.player,
          [sx, sz] = w.stationExit,
          dx = sx - w.start[0],
          dz = sz - w.start[1],
          L = Math.hypot(dx, dz) || 1;
        eric.scripted = true;
        g.walker.locked = true;
        w.nav.open('station_door'); // shut again when the place is left (leave)
        cam.closeOn(w.stationExit, 1.7);
        await glide(g, eric.root, w.stationExit, 1.1);
        await glide(g, eric.root, [sx + (dx / L) * 0.7, sz + (dz / L) * 0.7], 1.1);
        eric.setState('idle');
      },
    },
    tripInFrom: {
      plaza: (g) => walkIn(g, cam, w.plazaEdge, w.plazaIn, w.laneFacing),
    },
    async tripIn(g) {
      const eric = g.player;
      eric.scripted = true;
      eric.root.position.set(w.stationExit[0], 0, w.stationExit[1]);
      eric.root.rotation.y = Math.PI; // north, as he left the security room
      // on a phone the camera starts looking north like the security room's, and turns east as he steps out
      turnAt = [eric.root.position.x, eric.root.position.z];
      setTurn(0);
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
