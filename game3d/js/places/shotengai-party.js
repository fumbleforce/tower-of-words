// Day 2's gathering after work on the shop street's promenade (story/day2/shotengai.js; docs/game/places.md, the
// day-2 party plan). One pair of back-to-back benches by the foot of the east walk: Eric and Mori sit on the
// sea-facing one, Mio and Kenji stand at its two ends, all in one frame on a phone. Kenji waits by the izakaya's
// blue curtain until Eric meets him (or reaches the bench first). The food is the canteen's takeaway on a tray on
// the bench between the two seats, and Mio's pickles; after the goodbye Mio and Kenji go home and Mori rests in the
// back alley with what's left. Everything is set from the story's flags, so a trip away and back, or a Continue,
// puts it all where the story has got to. shotengai.js spreads thing(id), people, seats, spots and hooks into its own
// registries and calls install(P) once its place is made.
import * as THREE from 'three';
import { PEOPLE, idle } from '../cast.js';
import { blob } from '../engine.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { walkRig } from '../move.js';
import { benchSit } from '../crowd/motion.js';
import { flags } from '../narrative/state.js';
import { rbox, mat, sh } from '../props.js';
import { sim } from '../sim.js';
import { sfx } from '../ui.js';
import { route } from './route.js';

const TOP = 0.34; // the bench's slats (scenes/outdoor/furniture.js; crowd/still.js)

// the bench pair at the foot of the east walk, in the chunk's frame: island (66, FURNITURE_Z - 0.1) turned by the
// chunk (local x = -(island z - 20.15), local z = island x - 64.5); the sea is toward -x
const BENCH = [-11.3, 1.5],
  SEA_X = BENCH[0] - 0.3, // the sea-facing bench's seat line
  FACE = -Math.PI / 2; // looking out to sea

export function shotengaiParty(game, { w, K }) {
  let P = null;
  const later = () => sim.day > 1;
  const seats = {
    // Eric nearer the camera, Mori further along; each gets on from the floor beside its end of the bench
    party_seat: { x: SEA_X, z: BENCH[1] + 0.4, top: TOP, ry: FACE, out: [SEA_X + 0.1, BENCH[1] + 1.3] },
    party_mori: { x: SEA_X, z: BENCH[1] - 0.4, top: TOP, ry: FACE, out: [SEA_X + 0.1, BENCH[1] - 1.3] },
  };
  const spots = {
    party_group: [BENCH[0] - 0.1, BENCH[1]],
    party_mio: [SEA_X + 0.55, BENCH[1] + 1.95],
    party_kenji: [SEA_X + 0.55, BENCH[1] - 1.95],
  };
  const izakaya = w.doors.find((d) => d.id === 'izakaya');
  const KENJI_WAIT = [izakaya.step[0] - 0.15, izakaya.step[1] - 0.9]; // beside the blue curtain, off its step

  // the two from B2 with bodies here (Mio is the shared one)
  const mk = (r) => {
    if (!r.meshy) r.root.scale.multiplyScalar(K);
    r.root.visible = false;
    w.root.add(r.root);
    r.blob = blob(0.55, 0.38);
    r.blob.visible = false;
    w.root.add(r.blob);
    return r;
  };
  const mori = mk(PEOPLE.mori()),
    kenji = mk(PEOPLE.kenji());
  const people = { mori, kenji };
  const rigAnchor = (r) => (v) => {
    r.root.getWorldPosition(v);
    v.y += 1.25 * K;
    return v;
  };
  const before = (r) => () => {
    const p = r.root.position,
      a = r.root.rotation.y;
    return r.seated ? [p.x + 0.75, p.z] : [p.x + Math.sin(a) * 0.65, p.z + Math.cos(a) * 0.65];
  };
  const things = {
    mori: {
      anchor: rigAnchor(mori),
      spot: before(mori),
      face: () => [mori.root.position.x, mori.root.position.z],
      enabled: () => mori.root.visible && !mori._walk,
    },
    kenji: {
      anchor: rigAnchor(kenji),
      spot: before(kenji),
      face: () => [kenji.root.position.x, kenji.root.position.z],
      enabled: () => kenji.root.visible && !kenji._walk,
    },
    party_seat: {
      spot: () => seats.party_seat.out,
      face: () => [seats.party_seat.x, seats.party_seat.z],
      enabled: later,
    },
  };
  const ALLEY = w.nooks.shotengai_back_alley;

  // ---- the food: a tray on the bench between them, Mio's jar, a bag of drinks at Mori's feet ----
  const food = new THREE.Group();
  w.root.add(food);
  const onigiri = () => {
    const g = new THREE.Group();
    const rice = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 3), mat('#f3f1ea')));
    rice.rotation.x = Math.PI / 2;
    rice.position.y = 0.05;
    const nori = sh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), mat('#1f2a24')));
    nori.position.y = 0.03;
    g.add(rice, nori);
    return g;
  };
  const sandwich = () => {
    const g = new THREE.Group();
    const bread = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 3), mat('#efe3c4')));
    bread.rotation.x = Math.PI / 2;
    bread.position.y = 0.05;
    const egg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.044, 3), mat('#f2d264')));
    egg.rotation.x = Math.PI / 2;
    egg.position.y = 0.05;
    g.add(bread, egg);
    return g;
  };
  const tray = new THREE.Group();
  tray.add(rbox(0.36, 0.025, 0.24, '#2f3a55', { r: 0.008 }));
  const cloth = rbox(0.3, 0.05, 0.2, '#b8573f', { r: 0.03 }); // the wrapped bundle, before it's opened
  const items = { riceball: [], sandwich: [] };
  for (let i = 0; i < 3; i++) {
    const a = onigiri(),
      b = sandwich();
    a.position.set(-0.11 + i * 0.11, 0.025, -0.05);
    b.position.set(-0.11 + i * 0.11, 0.025, 0.06);
    a.rotation.y = b.rotation.y = 0.3 * i;
    tray.add(a, b);
    items.riceball.push(a);
    items.sandwich.push(b);
  }
  tray.add(cloth);
  tray.position.set(SEA_X, TOP, BENCH[1]);
  tray.rotation.y = FACE;
  const jar = new THREE.Group();
  jar.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 14), mat('#a7c38a', { roughness: 0.3 }))));
  jar.children[0].position.y = 0.06;
  const lid = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.025, 14), mat('#c9473f')));
  lid.position.y = 0.13;
  jar.add(lid);
  const bag = rbox(0.22, 0.24, 0.12, '#e6e2d6', { r: 0.02 }); // the convenience bag of drinks
  const can = () => sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.11, 12), mat('#3a8f8a')));
  food.add(tray, jar, bag);
  const LAP = [SEA_X - 0.2, seats.party_seat.z]; // in front of Eric, at his knees
  const held = new THREE.Group(); // what Eric has been given, by his seat
  food.add(held);
  let looking = false; // the food's close look: the camera steeper (install's update)
  const state = { opened: false, took: null, drinks: 0, more: 0, pickles: false };

  function placeFood(where) {
    food.visible = where !== 'none';
    if (where === 'alley') {
      const [ax, az] = ALLEY;
      tray.position.set(ax + 0.35, 0.02, az);
      jar.visible = false;
      bag.visible = false;
      held.visible = false;
      return;
    }
    tray.position.set(SEA_X, TOP, BENCH[1]);
    jar.visible = bag.visible = held.visible = true;
    jar.position.set(SEA_X + 0.55, 0, spots.party_mio[1] - 0.25); // at Mio's feet
    bag.position.set(SEA_X + 0.45, 0, seats.party_mori.z - 0.25);
  }
  function syncFood() {
    cloth.visible = !state.opened;
    for (const k of Object.keys(items)) for (const it of items[k]) it.visible = state.opened;
    held.clear();
    let n = 0;
    const lay = (o) => {
      o.position.set(LAP[0], TOP + 0.005, LAP[1] + 0.22 - n * 0.12);
      n++;
      held.add(o);
    };
    if (state.took) {
      items[state.took][0].visible = false;
      lay(state.took === 'riceball' ? onigiri() : sandwich());
    }
    for (let i = 1; i <= state.more && i < 3; i++) {
      const kind = state.took === 'sandwich' ? 'riceball' : 'sandwich';
      items[kind][i - 1].visible = false;
      lay(kind === 'riceball' ? onigiri() : sandwich());
    }
    for (let i = 0; i < Math.min(2, state.drinks); i++) {
      const c = can();
      c.position.y = 0.055;
      const g = new THREE.Group();
      g.add(c);
      lay(g);
    }
    lid.position.y = state.pickles ? 0.02 : 0.13;
    lid.position.x = state.pickles ? 0.09 : 0;
  }

  // ---- placement from the story's flags (partySetup's default) ----
  const hide = (r) => {
    r.root.visible = false;
    if (r.blob && r.blob.parent !== r.root) r.blob.visible = false;
  };
  const stand = (r, [x, z], face) => {
    r._walk = null;
    if (r.seated && !r.meshy) {
      r.seated = false;
      r.root.position.y = 0;
      for (const l of r.legs) l.rotation.set(0, 0, 0);
      for (const k of r.knees) k.rotation.set(0, 0, 0);
      for (const a of r.arms) a.rotation.set(0, 0, 0);
    }
    if (r.meshy) {
      r.seated = false;
      r.setState('idle');
    }
    r.root.visible = true;
    r.root.position.set(x, 0, z);
    r.root.rotation.y = Math.atan2(face[0] - x, face[1] - z);
    if (r.blob && r.blob.parent !== r.root) {
      r.blob.visible = true;
      r.blob.position.set(x, 0.004, z);
    }
  };
  const seatMori = (s) => {
    mori._walk = null;
    mori.root.visible = true;
    benchSit(mori, s.x, s.z, s.ry, s.top);
    mori.blob.visible = true;
    mori.blob.position.set(s.x + 0.15, 0.004, s.z);
  };
  function arrange() {
    const mio = game.mioNpc;
    if (!later() || !flags.d2_shift_done) {
      hide(mori);
      hide(kenji);
      mio.root.visible = false;
      placeFood('none');
      return;
    }
    if (flags.d2_party_done) {
      hide(kenji);
      mio.root.visible = false;
      const [ax, az] = ALLEY;
      if (!mori._walk) stand(mori, [ax, az], [ax + 1, az]);
      placeFood('alley');
      return;
    }
    if (!mori._walk) seatMori(seats.party_mori);
    if (!kenji._walk) {
      if (flags.d2_met_kenji) stand(kenji, spots.party_kenji, spots.party_group);
      else stand(kenji, KENJI_WAIT, [izakaya.step[0], izakaya.step[1] + 3]);
    }
    if (!mio._walk) stand(mio, spots.party_mio, spots.party_group);
    state.opened = !!flags.d2_ate || state.opened;
    if (flags.d2_ate && !state.took) state.took = flags.d2_food === 'sandwich' ? 'sandwich' : 'riceball';
    placeFood('bench');
    syncFood();
  }

  const leave = async (r) => {
    const out = [w.edge[0], w.edge[1] - 1.6]; // up the east walk toward the dorm street
    if (r.meshy) await walkRig(game, r, out, { speed: 1.2 });
    else await P.walkPerson(r === kenji ? 'kenji' : 'mori', out, { speed: 1.2 });
    hide(r);
  };
  const hooks = {
    // default: where the story has got to; gather: Kenji to the bench now; pack: the goodbye
    async partySetup({ state: s } = {}) {
      if (s === 'gather') {
        if (
          Math.hypot(kenji.root.position.x - spots.party_kenji[0], kenji.root.position.z - spots.party_kenji[1]) > 0.3
        )
          await P.walkPerson('kenji', spots.party_kenji, { speed: 1.7 });
        stand(kenji, spots.party_kenji, spots.party_group);
        return;
      }
      if (s === 'pack') {
        state.opened = true;
        const [ax, az] = ALLEY;
        void leave(game.mioNpc);
        void leave(kenji);
        await game.wait(600);
        await P.walkPerson('mori', [ax, az], { speed: 1.0 });
        stand(mori, [ax, az], [ax + 1, az]);
        placeFood('alley');
        return;
      }
      arrange();
    },
    // the food follows what Eric does: open, take (food: riceball | sandwich), sharePickles, drink, offerMore
    async partyFood({ state: s, food: f } = {}) {
      if (s === 'open') state.opened = true;
      if (s === 'take') state.took = f === 'sandwich' ? 'sandwich' : 'riceball';
      if (s === 'sharePickles') state.pickles = true;
      if (s === 'drink') state.drinks++;
      if (s === 'offerMore' && state.more < 2) state.more++;
      sfx('tap');
      syncFood();
      // a close look at the food on the bench, from higher up over the sea rail, then back to the shot it was in
      const cam = P.cam,
        before = cam.close;
      const at = s === 'sharePickles' ? [jar.position.x, jar.position.z] : [SEA_X, BENCH[1] + 0.25];
      cam.closeOn([at[0] + 0.25, at[1]], 3.6, TOP);
      looking = true;
      await game.wait(1400);
      looking = false;
      if (before) cam.close = before;
      else cam.release();
      await game.wait(800); // back in the group's shot before the next line
    },
  };

  // once the place is made: walking and seating the two chibis, each frame their walks, breathing and looking at
  // Eric when he's near, the placement on every entry, and the food in the save
  function install(place) {
    P = place;
    P.walkPerson = (id, [x, z], { speed } = {}) => {
      const r = people[id];
      if (!r) return Promise.resolve();
      if (r.meshy) return walkRig(game, r, [x, z], { speed: speed || 1.2 });
      if (r.seated) stand(r, [r.root.position.x + 0.6, r.root.position.z], [x, z]);
      r.root.visible = true;
      r.blob.visible = true;
      return walkPerson(r, route(w.nav, r.root.position, [x, z]), { speed: speed || 1.3, blobM: r.blob });
    };
    P.sitPerson = async (id, at) => {
      const s = seats[at];
      if (id !== 'mori' || !s) return;
      await P.walkPerson(id, s.out);
      seatMori(s);
    };
    P.standPerson = async (id) => {
      const r = people[id];
      if (r?.seated) stand(r, [r.root.position.x + 0.7, r.root.position.z], spots.party_group);
    };
    // a shot on the group turns the camera to look in from over the sea wall, so the four are side by side across
    // the screen (the street's own view looks along the bench), the group a little up, clear of the line
    const cam = P.cam,
      closeOn = cam.closeOn.bind(cam),
      release = cam.release.bind(cam);
    let yaw = cam.yaw;
    const street = cam.yaw;
    cam.closeOn = ([x, z], zoom, ...rest) => {
      const group = Math.hypot(x - spots.party_group[0], z - spots.party_group[1]) < 0.5;
      if (group) yaw = -Math.PI / 2; // (a closer look during it keeps the angle; release turns back)
      // (a wide screen fits the four with room to spare: closer there)
      return closeOn(group ? [x - 0.9, z] : [x, z], group && cam.camera.aspect >= 1 ? zoom * 1.7 : zoom, ...rest);
    };
    cam.release = () => {
      yaw = street;
      return release();
    };
    const update = P.update;
    P.update = (dt, t) => {
      const elev = cam.elev; // (the street's own update eases it too; the food's close look overrides that)
      update(dt, t);
      cam.yaw += (yaw - cam.yaw) * Math.min(1, dt * 2.5);
      if (looking) cam.elev = elev + ((66 * Math.PI) / 180 - elev) * Math.min(1, dt * 3);
      if (!later()) return;
      stepPeople([mori, kenji], dt);
      const p = game.player.root.position;
      for (const r of [mori, kenji]) {
        if (!r.root.visible || r._walk) continue;
        if (!r.meshy) idle(r, t);
        if (r.lookTarget) lookAt(r, r.lookTarget[0], r.lookTarget[1], 1);
        else if (Math.hypot(p.x - r.root.position.x, p.z - r.root.position.z) < 3) lookAt(r, p.x, p.z, 0.8);
      }
    };
    const onDay = P.onDay;
    P.onDay = (d) => {
      onDay?.(d);
      arrange();
    };
    const snap = P.snapshotState,
      restore = P.restoreState;
    P.snapshotState = () => ({ ...snap(), party: { ...state } });
    P.restoreState = (saved) => {
      restore(saved);
      if (saved.world?.party) Object.assign(state, saved.world.party);
      arrange();
    };
  }
  const anchor = (v) => v.set(seats.party_seat.x, 0.8, seats.party_seat.z); // over Eric's place on the bench
  return { thing: (id) => things[id], anchor, people, seats, spots, hooks, install };
}
