import { day3Place } from './day3/place.js';
import * as THREE from 'three';
import { buildKaraokeBooth } from '../scenes/rooms/karaoke.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { PLACE_DETAILS } from './catalog.js';
import { walkOut, walkIn } from './edge-walk.js';
import { roomView, roomSave } from './room-view.js';
import { createKaraokeStage } from './ongoing/karaoke-stage.js';

// The karaoke box's booth upstairs (scenes/rooms/karaoke.js), up the stairs from the front desk (places/karaoke.js):
// the screen, the benches round the low table, the song selector and the microphones. It loads with
// ?place=karaoke_booth, inside its door. The camera looks in from the south over the cut-down front wall.
export function karaokeBoothPlace(game) {
  const w = buildKaraokeBooth();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const d = w.door,
    save = roomSave(game, w.nav, d.in, cam);
  const d3 = day3Place(game, 'karaoke_booth', { root: w.root, K, ids: ['kenji', 'kuroda'] });
  const things = {
    booth_door: {
      ...PLACE_DETAILS.karaoke_booth.things.booth_door,
      anchor: (v) => v.set(d.edge[0] - 0.2, 1.0, d.edge[1]),
      spot: () => d.out,
      face: () => d.edge,
    },
    // named for the club evenings and the ticket that use them (no pin until one does)
    song_terminal: {
      ...PLACE_DETAILS.karaoke_booth.things.song_terminal,
      anchor: (v) => v.set(...w.selector),
      face: () => [w.selector[0], w.selector[2]],
      spot: () => w.spots.booth_table,
    },
    booth_screen: {
      ...PLACE_DETAILS.karaoke_booth.things.booth_screen,
      anchor: (v) => v.set(...w.screen),
      face: () => [w.screen[0], w.screen[2]],
      spot: () => w.spots.booth_screen,
    },
    kuroda: { ...PLACE_DETAILS.karaoke_booth.things.kuroda, ...d3.thing('kuroda') },
    kenji: { ...PLACE_DETAILS.karaoke_booth.things.kenji, ...d3.thing('kenji') },
  };
  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: d.in,
    startFacing: -Math.PI / 2,
    music: 'calm',
    things,
    spots: {
      booth_in: w.spots.booth_in,
      booth_table: w.spots.booth_table,
      booth_screen: w.spots.booth_screen,
    },
    seats: { booth_seat_w: w.seats[0], booth_seat_e: w.seats[1], booth_seat_s: w.seats[2] },
    people: { kuroda: d3.people.kuroda, kenji: d3.people.kenji },
    zones: {},
    hooks: { selectorRepair: (a) => P.monday.hooks.selectorRepair(a), karaokeClub: (a) => P.karaokeClub.act(a) },
    fit(aspect) {
      roomView(cam, w.bounds, aspect);
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      d3.update(dt);
      P.karaokeClub.update();
    },
    snapshotState: () => ({ ...save.snapshot(), karaokeClub: P.karaokeClub.snapshot() }),
    restoreState(saved) {
      save.restore(saved);
      const old = saved.world?.player?.eric;
      const seat =
        old?.seated &&
        Object.values(P.seats).find((s) => Math.hypot(s.x - old.position[0], s.z - old.position[2]) < 0.12);
      if (seat) {
        game.player.sitAt(seat.x, seat.top, seat.z, seat.ry);
        game.player.seated = true;
        game.player.seatOut = [...seat.out];
        game.walker.sync();
      } else if (old?.seated) {
        game.player.seated = false;
        game.player.setState?.('idle');
        game.player.seatOut = null;
      }
      P.karaokeClub.restore(saved.world?.karaokeClub);
    },
    leave: () => P.karaokeClub.leave(),
    // in from the corridor at the top of the stairs through the booth's door, walking west; back out the same way
    tripIn: (g) => walkIn(g, cam, d.edge, d.in, -Math.PI / 2),
    tripOutTo: { karaoke: (g) => walkOut(g, cam, d.out, d.edge) },
  };
  P.karaokeClub = createKaraokeStage(game, P, w);
  return P;
}
