// The lift: a small lit room behind the lift doors, built the same in the lobby (floor 1) and on B2, so the
// ride is watched from inside the car the whole way (Jørgen: "You should always be seeing your character. Ideally
// you'd have the elevator as a room in the lobby you go into.").
//
// How a ride goes: Eric walks up, the landing doors and the car doors open, the camera eases in on the car and he
// walks inside. As he crosses the threshold, the wall in front of the car drops to a low cut (the cutaway the
// office's near walls use) and the lights outside go down, so the car reads as a lit room with everyone in it.
// The car comes up from B1 to meet him (display over the doors, a ding) with the Sales pair aboard. Once it leaves
// the floor, the place outside goes dark and away (lift-light.js; Jørgen: "The elevator has visibly not moved
// anywhere before it opens"). The floor counts on the car's displays; at 5 the Sales pair walk out onto a landing. At B2 the game changes place: both places show this same car in the dark
// from the same camera, so the crossfade between them is invisible. On B2 the lights come up, the doors open, he
// walks out, the wall rises again behind him and the camera eases back to the floor.
//
// Wiring (the builder): attachLift(game, place) once per place, after the place is built (prepare() in main.js).
// It adds the car to the lobby and to the office, and takes over the lobby's tripOut and the office's tripIn.
import * as THREE from 'three';
import { idle } from '../cast.js';
import { addOfficeWorker, prepareOfficeWorkers } from '../crowd/office-workers.js';
import { walkPerson } from '../story.js';
import { ui, sfx } from '../ui.js';
import { glide, withList } from './lobby.js';
import { K } from '../scenes/office.js';
import { OFFICE_LIFT_SITE } from '../scenes/office-enclosure.js';
import { CUT, wallTop, cutaway, setCut, setCap } from './lift-cut.js';
import { setDark, setAway, forgetLight } from './lift-light.js';
import { PLAYER_ID } from '../mc.js';
import { buildCar, W, H, T, DW, LEAF_X, LEAF_RUN, ZF, ZB, SILL_Z } from './lift-car.js';
import { turnInLift, waitFacingLift } from './lift-turn.js';
import { stopGait } from '../movement/gait.js';

// ---------- where the lift is in each place ----------
// x: the door's centre; zBack: the back face of the wall the doors are in (the car starts here); zFront: just in
// front of the landing's frame and indicator; hole: the doorway in that wall; wallH: that wall's height;
// floor: the floor the place is on; out: where he stands outside the doors.
const SITES = {
  office: OFFICE_LIFT_SITE,
};
const FLOORS = ['B2', 'B1', '1', '2', '3', '4', '5'];

const RIDE_ELEV = 50; // camera elevation for the ride, the same in both places
// where people stand in the car (x, z in car space), all facing the doors
const SLOTS = {
  eric: [0, -0.42],
  sales1: [-0.4, -1.3],
  sales2: [0.4, -1.33],
  with0: [0.4, -0.84],
  with1: [-0.4, -0.84],
  aside: [-0.42, -0.5],
};
// the way out at another floor (car space): both along the right, well clear of him in the front left corner
// the second one sets off only once the first is out on the landing and turning away (not on a timer: at test
// speed a timer let them bunch up)
const EXITS = {
  sales2: {
    pts: [
      [0.3, -0.95],
      [0.28, -0.1],
      [0.28, 0.5],
      [2.3, 0.6],
    ],
  },
  sales1: {
    after: 'sales2',
    pts: [
      [-0.1, -1.1],
      [0.22, -0.95],
      [0.3, -0.1],
      [0.28, 0.5],
      [-2.3, 0.6],
    ],
  },
};
// the two from Sales who ride up to 5 (they're in the car when it arrives at 1)
const RIDERS = [
  { id: 'sales1', worker: 9, off: '5' },
  { id: 'sales2', worker: 1, off: '5' },
]; // grey-haired man in a light jacket; woman with long brown hair

// the ride's state, shared by both places (the lobby starts it, the office finishes it)
const ride = { on: false, aboard: new Set(), lit: new Set(), dir: 'up', floor: '1', pendingOpen: false };

// ---------- small timing helpers (game time: they follow the time scale, hurry and pause) ----------
function anim(game, secs, fn) {
  return new Promise((res) => {
    let t = 0,
      last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (!game.paused) t += Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1);
      last = now;
      const k = Math.min(1, t / secs);
      fn(k * k * (3 - 2 * k));
      if (k >= 1) res();
      else requestAnimationFrame(tick);
    };
    tick();
  });
}
const lerp = (a, b, k) => a + (b - a) * k;
// wait until the car doors (and this landing's doors, when the car is at this place's floor) are open, so nobody
// walks through a leaf; capped, so a stalled frame loop can't hold the story up
async function doorsOpen(game, L, at = 0.96) {
  const land = L.place.liftLanding,
    here = () => (game.liftFloor || L.site.floor) === L.site.floor;
  for (let i = 0; i < 60; i++) {
    if (L.car.k >= at && (!land || !here() || land.k() >= at)) return;
    await game.wait(50);
  }
}

// ---------- one place's lift ----------
const cars = new Map(); // place -> lift
let looping = false;

export async function attachLift(game, place) {
  const site = place.liftSite || SITES[place.name];
  if (!site || cars.has(place)) return;
  await prepareOfficeWorkers();
  game.renderer.localClippingEnabled = true;
  hookDoors(game);
  const car = buildCar(site);
  place.space.add(car.g);
  // everything in front of the car that the cut takes down: the wall above the doors, the landing doors and frame
  const dims = { half: W / 2 + T, back: ZF - T };
  const { hide, cutCap } = cutaway(place, car.g, site, dims, DW);

  // The Sales pair stays hidden until the ride.
  const riders = RIDERS.map((d) => {
    const r = addOfficeWorker(place.space, d.worker, K);
    r.root.visible = false;
    // At the forecourt the car stands under the head office's upper floors, where the sun never reaches: their sun
    // shadow can't show (0 pixels changed with it off, notes/PERF.md), and drawing it was about 44 draws a frame of
    // the ride's first seconds, the forecourt's busiest. Their blob shadows stay.
    if (place.name === 'forecourt')
      r.root.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
    const b = r.blob;
    b.visible = false;
    place.people[d.id] = r;
    return { ...d, r };
  });
  const L = {
    place,
    site,
    car,
    riders,
    hide,
    cutCap,
    dims,
    cam: place.cam,
    elev0: place.cam ? place.cam.elev : 0,
    dark: 0,
    away: 0,
    // the car and its shaft in car space (x from the door's centre, z from the landing wall's back), for setAway
    box: { half: W / 2 + T + 0.08, back: ZB - T - 0.05, front: SILL_Z + 0.05, top: H, landing: 1.2 },
    cut: 999,
    cap: 1,
    base: null,
  };
  cars.set(place, L);
  setCap(L, 1);
  // the car is in the place from the start; its lid hides it in the lobby
  if (place.name === 'forecourt') {
    place.tripOut = (g, slot) => rideOut(g, L, slot);
    place.tripInFrom = { ...place.tripInFrom, office: (g) => rideHome(g, L) };
  }
  if (place.name === 'office') {
    place.tripIn = (g, slot) => rideIn(g, L, slot);
    place.tripOutTo = { ...place.tripOutTo, forecourt: (g) => rideUp(g, L) };
  }
  if (!looping) {
    looping = true;
    loop(game);
  }
  window.__lift = { cars, ride, state: (name) => capState(game, name) };
  return L;
}

// the per-frame part: doors easing, people walking, displays, the dim, the cut
function loop(game) {
  let last = performance.now(),
    t = 0,
    shown = '';
  const tick = () => {
    const now = performance.now(),
      dt = game.paused ? 0 : Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1);
    last = now;
    t += dt;
    const L = cars.get(game.place);
    // the car's own displays show the floor; the HUD floor chip would sit on the riders' heads on a phone
    if (ride.on) {
      const hud = document.getElementById('liftInd');
      if (hud && !hud.hidden) hud.hidden = true;
    }
    if (L) {
      const c = L.car;
      c.k += (c.want - c.k) * Math.min(1, dt * 4.5);
      for (const l of c.leaves) {
        const { s, i } = l.userData.door;
        l.position.x = s * (LEAF_X[i] + c.k * LEAF_RUN[i]);
      }
      c.land += (c.landWant - c.land) * Math.min(1, dt * 5);
      c.landing.visible = c.land > 0.01;
      c.landLamp.intensity = 2.2 * c.land;
      c.spill.material.opacity = c.land;
      for (const rd of L.riders) {
        const r = rd.r;
        if (!r._walk && r.root.visible && rd.turn != null)
          r.root.rotation.y += (rd.turn - r.root.rotation.y) * Math.min(1, dt * 5);
        if (r._walk) {
          r._walk(dt);
          r.blob.position.set(r.root.position.x, 0.004, r.root.position.z);
        } else if (r.root.visible) idle(r, t + (rd.worker % 5));
      }
      // the displays follow the engine's floor count (hooks.floor in main.js)
      const f = game.liftFloor || L.site.floor;
      // away once the car leaves this floor, also while it passes back through; a ride stopping here brings it back
      const up = ride.on && !ride.calling && f !== L.site.floor;
      if (up || L.away) setAway(L, up ? Math.min(1, L.away + dt / 0.6) : L.away);
      if (f !== ride.floor) {
        if (!ride.moving) ride.dir = FLOORS.indexOf(f) < FLOORS.indexOf(ride.floor) ? 'down' : 'up';
        ride.floor = f;
        ride.movedAt = now;
      }
      const moving = ride.on && (ride.moving || now - (ride.movedAt || 0) < 900);
      const key = f + ride.dir + moving + [...ride.lit].join();
      if (key !== shown) {
        shown = key;
        c.backInd.userData.draw(f, ride.dir, moving);
        c.hallInd?.userData.draw(f, ride.dir, moving);
        c.cop.userData.draw(f, ride.dir, moving, ride.lit);
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
}

// camera: the same shot of the car in both places (same elevation, target and distance)
function rideShot(L) {
  const cam = L.cam,
    asp = cam.camera.aspect,
    phone = asp < 0.9;
  const dist = phone ? 11.0 : 9.0;
  const lead = phone ? 1.25 : 0.5;
  return { at: [L.site.x, L.site.zBack + (ZF + ZB) / 2 + lead], zoom: cam.fitDist / dist, y: 0.55 };
}
function shootRide(L, { snap = false } = {}) {
  const s = rideShot(L),
    cam = L.cam;
  cam.closeOn(s.at, s.zoom, s.y);
  if (snap) {
    cam.elev = THREE.MathUtils.degToRad(RIDE_ELEV);
    cam.snap();
  }
}
function elevTo(game, L, deg, secs) {
  const cam = L.cam,
    a = cam.elev,
    b = THREE.MathUtils.degToRad(deg);
  return anim(game, secs, (k) => {
    cam.elev = lerp(a, b, k);
  });
}

const slotW = (L, key) => [L.site.x + SLOTS[key][0], L.site.zBack + SLOTS[key][1]];
function turnTo(game, root, ry, secs = 0.35) {
  return turnInLift(game, root, ry, anim, secs);
}
function placeRider(L, rd, key) {
  const r = rd.r,
    [x, z] = slotW(L, key || rd.id);
  rd.turn = null;
  r.root.position.set(x, 0, z);
  r.root.rotation.y = 0;
  r.root.visible = true;
  r.blob.visible = true;
  r.blob.position.set(x, 0.004, z);
}

// doors: the engine's liftDoors hook comes here while a ride is on (the car doors, the landing at other floors,
// riders getting off). Everything else keeps the engine's sound.
function hookDoors(game) {
  if (game.hooks.__liftDoors) return;
  const orig = game.hooks.liftDoors;
  game.hooks.__liftDoors = true;
  game.hooks.liftDoors = async (a) => {
    const L = cars.get(game.place);
    if (!L || !ride.on) return orig && orig(a);
    return doors(game, L, a.state);
  };
  // the floor count: the arrow follows where the car is heading (▼ on the way down to B2), set before the first step
  const origFloor = game.hooks.floor;
  game.hooks.floor = async (a) => {
    if (ride.on && a && a.to != null) {
      const i = FLOORS.indexOf(game.liftFloor || '1'),
        j = FLOORS.indexOf(String(a.to));
      if (j >= 0 && j !== i) {
        ride.dir = j < i ? 'down' : 'up';
        ride.moving = true;
      }
    }
    try {
      return await origFloor(a);
    } finally {
      ride.moving = false;
    }
  };
  // who's talking: the other rider turns to the speaker, and the speaker half turns to the listener
  const say = game.ui.say.bind(game.ui);
  game.ui.say = (speaker, text, o = {}) => {
    const L = cars.get(game.place);
    if (L && ride.on) {
      const me = L.riders.find((rd) => rd.id === o.whoId && ride.aboard.has(rd.id));
      for (const rd of L.riders) {
        if (!ride.aboard.has(rd.id) || rd.r._walk) continue;
        const other = L.riders.find((q) => q !== rd && ride.aboard.has(q.id));
        if (me && rd === me && other) {
          rd.r.lookTarget = [other.r.root.position.x, other.r.root.position.z];
          rd.turn = rd.id === 'sales1' ? 0.45 : -0.45;
        } else if (me) {
          rd.r.lookTarget = [me.r.root.position.x, me.r.root.position.z];
          rd.turn = rd.id === 'sales1' ? 0.3 : -0.3;
        }
      }
    }
    return say(speaker, text, o);
  };
}
async function doors(game, L, state) {
  const c = L.car,
    f = game.liftFloor || L.site.floor;
  if (state === 'open') {
    // the destination: its doors open in the next place, after the change of place
    if (f !== L.site.floor && f === 'B2') {
      ride.pendingOpen = true;
      return;
    }
    if (c.want === 1) return;
    ride.lit.delete(f);
    sfx('lift');
    sfx('liftdoor', { at: 0.3 });
    c.want = 1;
    if (f !== L.site.floor) c.landWant = 1;
    await game.wait(650);
    await doorsOpen(game, L);
    // anyone getting off here walks out onto the landing
    const off = L.riders.filter((rd) => rd.off === f && ride.aboard.has(rd.id));
    // he steps aside to the front left corner so they can get by
    const eric = game.player;
    if (off.length) {
      eric.scripted = true;
      eric.setState('walk');
      await glide(game, eric.root, slotW(L, 'aside'), 0.9);
      eric.setState('idle');
      turnTo(game, eric.root, 0.5);
    }
    const out = {}; // id -> resolves when that one is out past the doors
    const walks = [];
    for (const rd of [...off].sort((a, b) => (EXITS[a.id]?.after ? 1 : 0) - (EXITS[b.id]?.after ? 1 : 0))) {
      const r = rd.r,
        e = EXITS[rd.id] || EXITS.sales2;
      r.lookTarget = null;
      rd.turn = null;
      const pts = e.pts.map(([x, z]) => [L.site.x + x, L.site.zBack + z]);
      const go = (e.after && out[e.after]) || Promise.resolve();
      const w = go.then(() => walkPerson(r, pts.slice(0, 3), { speed: 1.1 }));
      out[rd.id] = w;
      walks.push(w.then(() => walkPerson(r, pts.slice(3), { speed: 1.1 })));
    }
    L.leaving = Promise.all(walks).then(() => {
      for (const rd of off) ride.aboard.delete(rd.id);
    });
    await game.wait(900);
    return;
  }
  if (state === 'closed') {
    if (c.want === 0) return;
    if (L.leaving) {
      await L.leaving;
      L.leaving = null;
    }
    sfx('liftdoor');
    c.want = 0;
    await game.wait(500);
    c.landWant = 0;
    await game.wait(450);
    for (const rd of L.riders)
      if (!ride.aboard.has(rd.id)) {
        rd.r.root.visible = false;
        rd.r.blob.visible = false;
        rd.r._walk = null;
      }
    // and back to the middle once they're gone
    const eric = game.player,
      [ex, ez] = slotW(L, PLAYER_ID);
    if (Math.hypot(eric.root.position.x - ex, eric.root.position.z - ez) > 0.05) {
      eric.setState('walk');
      await glide(game, eric.root, [ex, ez], 0.9);
      eric.setState('idle');
      await turnTo(game, eric.root, 0);
    }
  }
}

// ---------- the lobby side: walk in, the cut and the dim, the ride's lines ----------
async function rideOut(g, L, slot) {
  const eric = g.player,
    P = L.place,
    cam = L.cam;
  g.busyTrip = true;
  // the lobby's commuters use this lift too: anyone already on the way stops coming (they'd walk into the car)
  for (const c of P._commuters || []) {
    c.r.root.visible = false;
    c.b.visible = false;
    c.stage = 'wait';
    c.t = -1e9;
  }
  await g.walkTo(L.site.out[0], L.site.out[1]);
  g.walker.locked = true;
  eric.scripted = true;
  stopGait(eric);
  setAway(L, 0);
  ride.on = true;
  ride.calling = true; // the car is on its way to him: the lobby stays
  ride.lit = new Set(['5']);
  ride.floor = g.liftFloor = 'B1';
  ride.dir = 'up';
  ride.moving = true;
  ride.pendingOpen = false;
  ride.aboard = new Set(RIDERS.map((d) => d.id));
  for (const rd of L.riders) placeRider(L, rd);
  L.riders[0].r.lookTarget = slotW(L, 'sales2');
  L.riders[1].r.lookTarget = slotW(L, 'sales1');
  shootRide(L);
  elevTo(g, L, RIDE_ELEV, 1.4);
  await waitFacingLift(g, L.site, anim, 1100);
  g.liftFloor = L.site.floor;
  ride.moving = false;
  ride.calling = false;
  sfx('lift');
  await g.wait(300);
  sfx('liftdoor');
  P.hooks.liftOpen && P.hooks.liftOpen();
  L.car.want = 1;
  await g.wait(400);
  await doorsOpen(g, L);
  await glide(g, eric.root, [L.site.x, L.site.zFront + 0.05], 1.05);
  // across the threshold: the wall in front comes down and the lights outside go down
  const settle = Promise.all([
    anim(g, 0.7, (k) => {
      setCut(L, lerp(wallTop(L.site) + 0.25, CUT, k));
      setCap(L, 1 - k);
    }),
    anim(g, 1.1, (k) => setDark(L, k)),
  ]);
  const [ex, ez] = slotW(L, PLAYER_ID);
  await glide(g, eric.root, [ex, ez], 1.0);
  eric.setState('idle');
  // anyone coming along walks in after him
  const wl = withList(slot);
  await Promise.all(wl.slice(0, 2).map((id, i) => walkIn(g, L, id, 'with' + i)));
  await turnTo(g, eric.root, 0);
  // he presses B2 (5 is already lit)
  await g.wait(250);
  sfx('tap');
  ride.lit.add('B2');
  await settle;
  await g.wait(350);
  P.hooks.liftClose && P.hooks.liftClose();
  sfx('liftdoor');
  L.car.want = 0;
  await g.wait(900);
  await g.wait(400);
  const steps = slot.ride || [];
  if (steps.length) {
    await g.runner.steps(steps);
    ui.closeTalk();
  }
  if (g.liftFloor !== 'B2') await g.hooks.floor({ to: 'B2' });
  await g.wait(450);
  // the hand-over: the next place picks up with the same car, the same people aboard, the same shot
  ride.with = wl.slice(0, 2);
}
async function walkIn(g, L, id, key) {
  const r = L.place.people[id];
  if (!r) return;
  const [x, z] = slotW(L, key);
  r.root.visible = true;
  if (r.blob) r.blob.visible = true;
  if (r.meshy) {
    r.setState('walk');
    await glide(g, r.root, [L.site.x, L.site.zFront + 0.1], 1.1);
    await glide(g, r.root, [x, z], 1.0);
    r.setState('idle');
  } else if (r.hips)
    await walkPerson(
      r,
      [
        [L.site.x, L.site.zFront + 0.1],
        [x, z],
      ],
      { speed: 1.1 },
    );
  r.root.rotation.y = 0;
}

// ---------- the office side: same frame, the lights come up, the doors open, out he goes ----------
async function rideIn(g, L, slot) {
  const eric = g.player,
    P = L.place,
    cam = L.cam;
  eric.scripted = true;
  g.busyTrip = true;
  const fresh = !ride.on; // Continue from a save: no ride before this; start in the car at B2
  setAway(L, 0);
  ride.on = true;
  ride.floor = g.liftFloor = 'B2';
  ride.lit.delete('B2');
  // the frame the lobby ended on: the car in the dark, the front cut, everyone in their place
  setDark(L, 1);
  setCut(L, CUT);
  L.car.want = 0;
  L.car.k = 0;
  const [ex, ez] = slotW(L, PLAYER_ID);
  eric.root.position.set(ex, 0, ez);
  eric.root.rotation.y = 0;
  eric.setState('idle');
  g.walker.facing = 0;
  for (const rd of L.riders) if (ride.aboard.has(rd.id)) placeRider(L, rd);
  const wl = (ride.with || []).filter((id) => P.people[id]);
  wl.forEach((id, i) => {
    const r = P.people[id],
      [x, z] = slotW(L, 'with' + i);
    r.root.visible = true;
    if (r.blob) r.blob.visible = true;
    r.root.position.set(x, 0, z);
    r.root.rotation.y = 0;
  });
  shootRide(L, { snap: true });
  await g.wait(fresh ? 300 : 1400); // the crossfade from the lobby's last frame
  // B2: the ding, the lights up, the doors
  sfx('lift');
  await anim(g, 0.9, (k) => setDark(L, 1 - k));
  P.hooks.liftOpen && P.hooks.liftOpen();
  L.car.want = 1;
  ride.pendingOpen = false;
  await g.wait(650);
  await doorsOpen(g, L);
  // out, while the camera eases back to the floor's own view
  cam.release();
  elevTo(g, L, THREE.MathUtils.radToDeg(L.elev0), 1.4);
  eric.setState('walk');
  await glide(g, eric.root, [L.site.x, L.site.zFront + 0.15], 1.1);
  const rise = anim(g, 0.6, (k) => setCut(L, lerp(CUT, wallTop(L.site) + 0.25, k)));
  const outs = wl.map((id, i) => walkOut(g, L, id, i));
  await glide(g, eric.root, L.site.out, 1.1);
  eric.setState('idle');
  g.walker.facing = 0;
  await turnTo(g, eric.root, 0, 0.2);
  eric.scripted = false;
  await rise;
  setCut(L, 999);
  await Promise.all(outs);
  await g.wait(300);
  P.hooks.liftClose && P.hooks.liftClose();
  L.car.want = 0;
  ride.on = false;
  g.busyTrip = false;
  ride.with = [];
  for (const rd of L.riders) {
    rd.r.root.visible = false;
    rd.r.blob.visible = false;
  }
}
async function walkOut(g, L, id, i) {
  const r = L.place.people[id];
  if (!r) return;
  await g.wait(350 + i * 300);
  const to = [L.site.out[0] + (i ? -0.7 : 0.7), L.site.out[1] + 0.2];
  if (r.meshy) {
    r.setState('walk');
    await glide(g, r.root, [L.site.x, L.site.zFront + 0.15], 1.1);
    await glide(g, r.root, to, 1.1);
    r.setState('idle');
  } else if (r.hips) await walkPerson(r, [[L.site.x, L.site.zFront + 0.15], to], { speed: 1.1 });
}

// ---------- after work, the other way: B2 up to 1, and out into the forecourt ----------
// the same car and the same shot as the morning ride, with nobody else aboard; the floors count up B1, 1
async function rideUp(g, L) {
  const eric = g.player,
    P = L.place;
  g.busyTrip = true;
  await g.walkTo(L.site.out[0], L.site.out[1]);
  g.walker.locked = true;
  eric.scripted = true;
  stopGait(eric);
  setAway(L, 0);
  Object.assign(ride, { on: true, lit: new Set(), dir: 'up', pendingOpen: false, aboard: new Set(), with: [] });
  ride.floor = g.liftFloor = L.site.floor;
  for (const rd of L.riders) {
    rd.r.root.visible = false;
    rd.r.blob.visible = false;
  }
  P.hooks.liftOpen && P.hooks.liftOpen();
  L.car.want = 1;
  shootRide(L);
  elevTo(g, L, RIDE_ELEV, 1.4);
  await waitFacingLift(g, L.site, anim, 700);
  await doorsOpen(g, L);
  await glide(g, eric.root, [L.site.x, L.site.zFront + 0.05], 1.05);
  const settle = Promise.all([
    anim(g, 0.7, (k) => setCut(L, lerp(wallTop(L.site) + 0.25, CUT, k))),
    anim(g, 1.1, (k) => setDark(L, k)),
  ]);
  await glide(g, eric.root, slotW(L, PLAYER_ID), 1.0);
  eric.setState('idle');
  await turnTo(g, eric.root, 0);
  await g.wait(250);
  sfx('tap');
  ride.lit.add('1');
  await settle;
  await g.wait(350);
  P.hooks.liftClose && P.hooks.liftClose();
  sfx('liftdoor');
  L.car.want = 0;
  await g.wait(1300);
  await g.hooks.floor({ to: '1' });
  await g.wait(450);
}
// floor 1: the car in the dark as the office left it, then the lights, the doors, and out onto the court
async function rideHome(g, L) {
  const eric = g.player,
    P = L.place,
    cam = L.cam;
  eric.scripted = true;
  g.busyTrip = true;
  const fresh = !ride.on; // Continue from a save made during the ride
  ride.on = true;
  ride.floor = g.liftFloor = L.site.floor;
  setAway(L, 0); // the morning's ride left this place dark and away
  ride.lit.delete(L.site.floor);
  for (const rd of L.riders) {
    rd.r.root.visible = false;
    rd.r.blob.visible = false;
  }
  setDark(L, 1);
  setCut(L, CUT);
  setCap(L, 0);
  L.car.want = L.car.k = 0;
  L.car.landWant = L.car.land = 0;
  const [ex, ez] = slotW(L, PLAYER_ID);
  eric.root.position.set(ex, 0, ez);
  eric.root.rotation.y = 0;
  eric.setState('idle');
  g.walker.facing = 0;
  shootRide(L, { snap: true });
  await g.wait(fresh ? 300 : 1400);
  sfx('lift');
  await anim(g, 0.9, (k) => setDark(L, 1 - k));
  P.hooks.liftOpen && P.hooks.liftOpen();
  L.car.want = 1;
  await g.wait(650);
  await doorsOpen(g, L);
  cam.release();
  elevTo(g, L, THREE.MathUtils.radToDeg(L.elev0), 1.4);
  eric.setState('walk');
  await glide(g, eric.root, [L.site.x, L.site.zFront + 0.15], 1.1);
  const rise = anim(g, 0.6, (k) => {
    setCut(L, lerp(CUT, wallTop(L.site) + 0.25, k));
    setCap(L, k);
  });
  await glide(g, eric.root, L.site.out, 1.1);
  eric.setState('idle');
  eric.scripted = false;
  await rise;
  setCut(L, 999);
  await g.wait(300);
  P.hooks.liftClose && P.hooks.liftClose();
  L.car.want = 0;
  ride.on = false;
  g.busyTrip = false;
}
// a place built in daylight and lit for the evening later: forget the lights the ride dimmed from, so the next
// ride dims (and restores) the evening ones
export function relightLift(place) {
  const L = cars.get(place);
  if (L) forgetLight(L);
}

// ---------- stills for checking (?cap&place=gate&st=...) through window.__lift.state ----------
async function capState(game, name) {
  const L = cars.get(game.place);
  if (!L) return;
  const eric = game.player;
  ride.on = true;
  ride.aboard = new Set(RIDERS.map((d) => d.id));
  ride.lit = new Set(['5', 'B2']);
  if (name === 'open' || name === 'inside' || name === 'ride' || name === 'stop5') {
    for (const rd of L.riders) if (!(name === 'ride' && L.site.floor === 'B2')) placeRider(L, rd);
    L.car.want = L.car.k = name === 'open' || name === 'stop5' ? 1 : 0;
    const [ex, ez] = name === 'open' ? L.site.out : slotW(L, PLAYER_ID);
    eric.root.position.set(ex, 0, ez + (name === 'open' ? 0 : 0.05));
    eric.root.rotation.y = name === 'open' ? Math.PI : 0;
    if (name !== 'open') {
      setCut(L, CUT);
      setDark(L, 1);
      setCap(L, 0);
    }
    if (name === 'stop5') {
      game.liftFloor = '5';
      L.car.landWant = L.car.land = 1;
    }
    shootRide(L, { snap: true });
  }
}
