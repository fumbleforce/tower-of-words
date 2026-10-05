// Day 2's gathering after work on the shop street's promenade (story/day2/shotengai.js; docs/game/places.md, the
// day-2 party plan). One pair of back-to-back benches by the foot of the east walk: Eric and Mori sit on the
// sea-facing one, Mio and Kenji stand at its two ends, all in one frame on a phone. Kenji waits by the izakaya's
// blue curtain until Eric meets him (or reaches the bench first). The food is the canteen's takeaway on a tray on
// the bench between the two seats, and Mio's pickles; after the goodbye Mio and Kenji go home and Mori rests in the
// back alley with what's left. Everything is set from the story's flags, so a trip away and back, or a Continue,
// puts it all where the story has got to. shotengai.js spreads thing(id), people, seats, spots and hooks into its own
// registries and calls install(P) once its place is made.
import { PEOPLE, idle } from '../cast.js';
import { blob } from '../engine.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { walkRig } from '../move.js';
import { benchSit } from '../crowd/motion.js';
import { flags } from '../narrative/state.js';
import { sim } from '../sim.js';
import { sfx } from '../ui.js';
import { route } from './route.js';
import { partyFoodSet, TOP, BENCH, SEA_X, FACE } from './shotengai-food.js';

export function shotengaiParty(game, { w, K }) {
  let P = null;
  const later = () => sim.day === 2; // (day 3's shoppers: places/day3/plan.js)
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
    if (!r.meshy || r.chibi) r.root.scale.multiplyScalar(K); // chibis stand at the body they replace
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

  const food = partyFoodSet(game, { w, seats, spots, ALLEY, getP: () => P });

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
      food.place('none');
      return;
    }
    if (flags.d2_party_done) {
      hide(kenji);
      mio.root.visible = false;
      const [ax, az] = ALLEY;
      if (!mori._walk) stand(mori, [ax, az], [ax + 1, az]);
      food.place('alley');
      return;
    }
    if (!mori._walk) seatMori(seats.party_mori);
    if (!kenji._walk) {
      if (flags.d2_met_kenji) stand(kenji, spots.party_kenji, spots.party_group);
      else stand(kenji, KENJI_WAIT, [izakaya.step[0], izakaya.step[1] + 3]);
    }
    if (!mio._walk) stand(mio, spots.party_mio, spots.party_group);
    food.fromFlags();
    food.place('bench');
    food.sync();
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
        food.state.opened = true;
        const [ax, az] = ALLEY;
        // Kenji gathers the boxes and the bag first, then he and Mio walk off
        await P.walkPerson('kenji', [SEA_X + 0.7, seats.party_mori.z - 0.6], { speed: 1.3 });
        food.gather();
        sfx('tap');
        await game.wait(400);
        void leave(game.mioNpc);
        void leave(kenji);
        await game.wait(600);
        await P.walkPerson('mori', [ax, az], { speed: 1.0 });
        stand(mori, [ax, az], [ax + 1, az]);
        food.place('alley');
        return;
      }
      arrange();
    },
    // the food follows what Eric does: open, take (food: riceball | sandwich), sharePickles, drink, offerMore
    partyFood: (a) => food.hook(a),
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
      if (food.looking()) cam.elev = elev + ((66 * Math.PI) / 180 - elev) * Math.min(1, dt * 3);
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
    P.snapshotState = () => ({ ...snap(), party: { ...food.state } });
    P.restoreState = (saved) => {
      restore(saved);
      if (saved.world?.party) Object.assign(food.state, saved.world.party);
      arrange();
    };
  }
  const anchor = (v) => v.set(seats.party_seat.x, 0.8, seats.party_seat.z); // over Eric's place on the bench
  return { thing: (id) => things[id], anchor, people, seats, spots, hooks, install };
}
