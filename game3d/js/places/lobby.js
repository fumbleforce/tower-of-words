import { eventTrigger } from '../narrative/events.js';
import { flagKeys } from '../narrative/engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/places/lobby.js');
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople, snapshotObject, restoreObject } from './saved-people.js';
// Place 2, the lobby and security gate, as the engine side: things, spots, zones, hooks, commuters and trips.
// Every word said here comes from game3d/story/gate.js (placeholder: story/placeholder/gate.js).
import * as THREE from 'three';
import { lobbySteps } from '../scenes/lobby.js';
import { sliced } from '../perf/slice.js';
import { K } from '../scenes/office.js';
import { RoomCam } from '../cam.js';
import { ui, sfx } from '../ui.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { PEOPLE, sit, armsLap, idle } from '../cast.js';
import { blob } from '../engine.js';
import { flags, cond } from '../narrative/state.js';
import { rbox } from '../props.js';
import { route } from './route.js';
import { lobbyCommuters } from './lobby-commuters.js';

export const withList = (slot) =>
  (slot.with || []).filter((e) => typeof e === 'string' || cond(e.if)).map((e) => (typeof e === 'string' ? e : e.who));

// walk an object in a straight line, ignoring the walk grid (scripted moves)
import { glide, walkRig } from '../move.js';
export { glide }; // smooth start, turn and stop; never touches the player's facing

export async function lobbyPlace(game) {
  const w = await sliced(lobbySteps()); // in slices between frames: it's built while the train is played
  const { BZ, X, Z } = w;
  const cam = new RoomCam({ elev: 46, fov: 24 });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const st = { cardOk: false, gateOpen: false, flap: 0, flapWant: 0, jam: 0, slam: 0, rush: true, typing: 0 };
  const rei = PEOPLE.rei();
  rei.root.scale.multiplyScalar(K);
  w.root.add(rei.root);
  rei.root.visible = false;
  const reiBlob = blob(0.55, 0.38);
  w.root.add(reiBlob);
  reiBlob.visible = false;
  rei.blob = reiBlob;
  w.aoi.blob = w.aoiBlob;
  w.man.blob = w.manBlob;
  const people = {
    guard: w.guard,
    kuroda: w.man,
    aoi: w.aoi,
    rei,
    tama: { root: w.tama, head: w.tama.userData.head },
  };
  const blobs = { aoi: w.aoiBlob, kuroda: w.manBlob, rei: reiBlob };
  // Aoi hides behind a newsletter on the right bench, upside down
  const paper = new THREE.Group();
  {
    const sheet = rbox(0.26, 0.34, 0.01, '#f2f0ea', { r: 0.004 });
    const band = rbox(0.24, 0.07, 0.012, '#c9473f', { y: 0.25, r: 0.004, cast: false });
    paper.add(sheet, band);
  }
  paper.position.set(0, 0.2, 0.2);
  paper.rotation.x = -0.15;
  w.aoi.torso.add(paper);
  w.man.root.visible = false;
  w.manBlob.visible = false;

  const { list: commuters, step: stepCommuters, clearDoor } = lobbyCommuters(game, w, st, { readerFlash, openFor });

  // background people who aren't going anywhere yet
  const extras = [];
  for (const [k, x, z, ry] of [
    [4, -3.0, -2.9, 0.9],
    [2, -2.45, -2.6, -2.2],
  ]) {
    const r = PEOPLE.worker(k);
    r.root.scale.multiplyScalar(K);
    r.root.position.set(x, 0, z);
    r.root.rotation.y = ry;
    w.root.add(r.root);
    const b = blob(0.5, 0.35);
    b.position.set(x, 0.004, z);
    w.root.add(b);
    extras.push(r);
  }
  // ---- gate ----
  function readerFlash(i, state, quiet) {
    w.readers[i].userData.set(state === 'green' ? 'ok' : state === 'red' ? 'no' : 'idle');
    if (!quiet || Math.hypot(game.player.root.position.x, game.player.root.position.z - BZ) < 4)
      sfx(state === 'green' ? 'ok' : state === 'red' ? 'no' : 'tap');
    clearTimeout(st['rt' + i]);
    if (state !== 'idle') st['rt' + i] = setTimeout(() => w.readers[i].userData.set('idle'), 1300);
  }
  let openTimer = 0;
  function openFor(sec) {
    if (st.jam) return;
    st.flapWant = 1;
    openTimer = Math.max(openTimer, sec);
  }
  function setGate(state) {
    // slam: bursts open, bounces, stays open
    if (state === 'slam') {
      st.slam = 1;
      st.flap = 1.3;
      sfx('flap');
    }
    if (state === 'open' || state === 'slam') {
      st.jam = 0;
      st.gateOpen = true;
      st.flapWant = 1;
      w.nav.unblock('gate');
      w.arch.userData.set('ok');
      flags[ENGINE_KEYS.gateOpen] = true;
    }
    if (state === 'closed') {
      st.jam = 0;
      st.gateOpen = false;
      st.flapWant = 0;
      w.arch.userData.set('idle');
    }
    if (state === 'jam') {
      st.jam = 1;
      st.flapWant = 0;
      w.arch.userData.set('no');
      sfx('no');
    }
    // the head-count screen on the arch: 2 while jammed (it counted the briefcase), back to 1 once the gate moves
    w.arch.userData.count(state === 'jam' ? 'two' : state === 'closed' ? 'idle' : 'ok');
  }

  const spots = {
    entrance_in: [0, Z - 0.8],
    bench_l: [-3.9, 3.2],
    bench_r: [3.6, 1.95],
    before_gate: [0.93, BZ + 0.55],
    after_gate: [0, BZ - 0.9],
    lift_front: [-1.0, -Z + 0.6],
    counter_front: [-4.2, 1.4],
    desk_front: [2.1, BZ + 0.72],
    outside: [0, Z + 1.5],
  };
  const seats = {
    bench_r: { x: 3.6, z: 1.15, y: 0.29, top: 0.29, ry: 0 },
    bench_l: { x: -3.9, z: 2.4, y: 0.29, top: 0.29, ry: 0 },
  };
  const rigAnchor =
    (rig, h = 1.25) =>
    (v) => {
      rig.root.getWorldPosition(v);
      v.y += h;
      return v;
    };
  const v3 = (x, y, z) => (v) => v.set(x, y, z);
  const at = (x, z, fx, fz) => ({ spot: () => [x, z], face: () => [fx, fz] });

  function readerTap(i) {
    return (async () => {
      if (!st.cardOk && !st.gateOpen) {
        readerFlash(i, 'red');
        if (game.runner.has(eventTrigger('gate', 'card_red')))
          await game.runner.run(game.runner.resolve(eventTrigger('gate', 'card_red')));
        else await ui.say(null, 'Red cross. Your card does nothing yet.');
        return;
      }
      readerFlash(i, 'green');
      if (!st.gateOpen) sfx('flap');
      setGate('open');
      const n = game.runner.resolve(eventTrigger('gate', 'card_ok'));
      if (n) await game.runner.run(n);
    })();
  }
  const things = {
    guard: { ...PLACE_DETAILS.gate.things.guard, anchor: rigAnchor(w.guard), ...at(2.1, BZ + 0.72, 2.35, BZ - 0.6) },
    kuroda: {
      ...PLACE_DETAILS.gate.things.kuroda,
      anchor: rigAnchor(w.man),
      spot: () => [w.man.root.position.x, w.man.root.position.z + 0.6],
      face: () => [w.man.root.position.x, w.man.root.position.z],
      enabled: () => w.man.root.visible && !w.man._walk,
    },
    aoi: {
      ...PLACE_DETAILS.gate.things.aoi,
      anchor: rigAnchor(w.aoi),
      spot: () => (w.aoi.seated ? [3.6, 1.95] : [w.aoi.root.position.x, w.aoi.root.position.z + 0.6]),
      face: () => [w.aoi.root.position.x, w.aoi.root.position.z],
      enabled: () => w.aoi.root.visible && !w.aoi._walk,
    },
    tama: {
      ...PLACE_DETAILS.gate.things.tama,
      anchor: v3(3.45, 0.55, BZ + 0.42),
      ...at(3.45, BZ + 1.05, 3.45, BZ + 0.42),
    },
    reader_l: {
      ...PLACE_DETAILS.gate.things.reader_l,
      anchor: v3(-0.93, 1.0, BZ),
      ...at(-0.93, BZ + 0.48, -0.93, BZ),
      act: () => readerTap(0),
      enabled: () => !st.gateOpen,
    },
    reader_r: {
      ...PLACE_DETAILS.gate.things.reader_r,
      anchor: v3(0.93, 1.0, BZ),
      ...at(0.93, BZ + 0.48, 0.93, BZ),
      act: () => readerTap(1),
      enabled: () => !st.gateOpen,
    },
    gate: {
      ...PLACE_DETAILS.gate.things.gate,
      anchor: v3(0, 1.75, BZ),
      ...at(0, BZ + 0.6, 0, BZ),
      enabled: () => !st.gateOpen,
    },
    desk: {
      ...PLACE_DETAILS.gate.things.desk,
      anchor: v3(1.6, 0.9, BZ),
      ...at(1.5, BZ + 0.6, 1.6, BZ),
      noMarker: true,
    },
    counter: {
      ...PLACE_DETAILS.gate.things.counter,
      anchor: v3(-3.7, 0.95, 0.45),
      ...at(-3.6, 1.1, -3.7, 0.45),
      noMarker: true,
    },
    signin: { ...PLACE_DETAILS.gate.things.signin, anchor: v3(-3.75, 0.8, 0.5), ...at(-3.75, 1.1, -3.75, 0.5) },
    lostfound: { ...PLACE_DETAILS.gate.things.lostfound, anchor: v3(-5.7, 1.3, 0.55), ...at(-5.1, 1.2, -5.7, 0.55) },
    screen: {
      ...PLACE_DETAILS.gate.things.screen,
      anchor: v3(-3.95, 1.45, -Z),
      ...at(-3.95, -Z + 0.6, -3.95, -Z),
      enabled: () => st.gateOpen,
    },
    kiosk: { ...PLACE_DETAILS.gate.things.kiosk, anchor: v3(5.75, 1.5, 3.0), ...at(5.0, 3.0, 5.75, 3.0) },
    bench_l: {
      ...PLACE_DETAILS.gate.things.bench_l,
      anchor: v3(-3.9, 0.6, 2.55),
      ...at(-3.9, 3.2, -3.9, 2.55),
      noMarker: true,
    },
    bench_r: {
      ...PLACE_DETAILS.gate.things.bench_r,
      anchor: v3(3.95, 0.6, 1.3),
      ...at(4.4, 1.95, 4.4, 1.3),
      noMarker: true,
    },
    poster_l: {
      ...PLACE_DETAILS.gate.things.poster_l,
      anchor: v3(-2.1, 1.7, -Z),
      ...at(-2.1, -Z + 0.6, -2.1, -Z),
      enabled: () => st.gateOpen,
    },
    poster_r: {
      ...PLACE_DETAILS.gate.things.poster_r,
      anchor: v3(2.1, 1.7, -Z),
      ...at(2.1, -Z + 0.6, 2.1, -Z),
      enabled: () => st.gateOpen,
    },
    lift: {
      ...PLACE_DETAILS.gate.things.lift,
      anchor: v3(-1.0, 1.7, -Z),
      ...at(-1.0, -Z + 0.6, -1.0, -Z),
      enabled: () => st.gateOpen,
    },
    entrance: { ...PLACE_DETAILS.gate.things.entrance, anchor: v3(0, 1.3, Z), ...at(0, Z - 0.6, 0, Z), noMarker: true },
    plant: {
      ...PLACE_DETAILS.gate.things.plant,
      anchor: v3(1.95, 0.9, 3.95),
      ...at(1.95, 3.35, 1.95, 3.95),
      noMarker: true,
    },
    bowl: {
      ...PLACE_DETAILS.gate.things.bowl,
      anchor: v3(3.2, 0.3, BZ + 0.56),
      ...at(3.2, BZ + 1.1, 3.2, BZ + 0.56),
      noMarker: true,
    },
  };

  const zones = {
    arch: (x, z) => Math.abs(x) < 0.6 && z < BZ + 0.5 && z > BZ + 0.1 && !st.gateOpen,
    past_gate: (x, z) => z < BZ - 0.4,
    lift_front: (x, z) => z < -Z + 1.1 && Math.abs(x) < 1.8,
  };

  function standUp(id) {
    const r = people[id];
    if (!r || !r.seated) return;
    r.seated = false;
    r.root.position.y = 0;
    for (const l of r.legs) l.rotation.set(0, 0, 0);
    for (const k of r.knees) k.rotation.set(0, 0, 0);
    for (const a of r.arms) a.rotation.set(0, 0, 0);
    r.root.position.z += 0.45;
  }

  const P = {
    // colour grade (js/post.js): toward game3d/ref/2-security-gate-muted.png: slate shadows, warm sun, low saturation
    grade: {
      exposure: 1.1,
      temp: 0.05,
      sat: 0.84,
      contrast: 1.05,
      lift: [0.012, 0.012, 0.018],
      shadowTint: [-0.008, -0.002, 0.02],
      highTint: [0.022, 0.01, -0.014],
      vignette: 0.26,
      bloom: 0.4,
      bloomThreshold: 0.82,
      focusBand: 0.3,
    },
    _commuters: commuters,
    crowd: commuters.map((c) => Object.assign(c.r, { blob: c.b })),
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    clock: w.clock,
    start: [0, Z - 1.3],
    startFacing: Math.PI,
    things,
    people,
    spots,
    zones,
    seats,
    glide,
    snapshotState() {
      return {
        cardOk: st.cardOk,
        gateOpen: st.gateOpen,
        jam: !!st.jam,
        flap: st.flap,
        flapWant: st.flapWant,
        slam: st.slam,
        openTimer,
        rush: st.rush,
        typing: st.typing,
        paper: snapshotObject(paper),
        lifts: w.lifts.map((lift) => ({ value: lift.k, target: lift.want, leaves: lift.leaves.map(snapshotObject) })),
        people: snapshotPeople(people),
        player: snapshotPeople({ eric: game.player }),
      };
    },
    restoreState(saved) {
      const f = saved.flags || {},
        state = saved.world || {};
      st.cardOk = state.cardOk ?? !!f.cardOk;
      st.gateOpen = state.gateOpen ?? !!(f.gateOpen || f.gate_through_way);
      st.jam = state.jam ?? !!(f.jammed && !st.gateOpen);
      st.flap = state.flap ?? (st.gateOpen ? 1 : 0);
      st.flapWant = state.flapWant ?? (st.gateOpen ? 1 : 0);
      st.slam = state.slam || 0;
      openTimer = state.openTimer || 0;
      st.rush = state.rush ?? true;
      st.typing = state.typing || 0;
      restoreObject(paper, state.paper);
      state.lifts?.forEach((savedLift, i) => {
        const lift = w.lifts[i];
        if (!lift) return;
        lift.k = savedLift.value;
        lift.want = savedLift.target;
        lift.t = null;
        lift.leaves.forEach((leaf, j) => restoreObject(leaf, savedLift.leaves[j]));
      });
      w.nav.unblock('gate');
      if (!st.gateOpen) w.nav.blockTagged('gate', -0.6, 0.6, BZ - 0.1, BZ + 0.1);
      w.arch.userData.flaps(st.flap);
      w.arch.userData.set(st.gateOpen ? 'ok' : st.jam ? 'no' : 'idle');
      w.arch.userData.count(st.jam ? 'two' : st.gateOpen ? 'ok' : 'idle');
      if (st.jam) {
        w.man.root.visible = w.manBlob.visible = true;
        w.man.root.position.set(0.93, 0, BZ + 0.6);
        w.man.root.rotation.y = Math.PI;
        w.manBlob.position.set(0.93, 0.004, BZ + 0.6);
      }
      restorePeople(people, state.people);
      if (state.player) {
        game.walker.stop();
        restorePeople({ eric: game.player }, state.player);
        game.walker.sync?.();
        game.walker.facing = game.player.root.rotation.y;
        cam.snap?.(game.player.root.position);
      }
    },
    fit(aspect) {
      const pts = [];
      for (const x of [-X - 0.2, X + 0.2])
        for (const z of [-Z - 0.2, Z + 0.3]) for (const y of [0, 1.6]) pts.push(new THREE.Vector3(x, y, z));
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-5.6, 0, 0),
            new THREE.Vector3(5.6, 0, 0),
            new THREE.Vector3(0, 2.25, -Z),
            new THREE.Vector3(0, 0, Z + 0.1),
          ],
          new THREE.Vector3(0, 0, 0.05),
          { follow: true, clamp: [-0.9, 0.9, -0.7, 0.05], limY: 0.97 },
        ); // headroom above the lifts for their markers; pans up when he walks north
      else
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-2.8, 0, 0),
            new THREE.Vector3(2.8, 0, 0),
            new THREE.Vector3(0, 0, -2.7),
            new THREE.Vector3(0, 1.4, 2.5),
          ],
          new THREE.Vector3(0, 0, 0),
          { follow: true, clamp: [-X + 2.4, X - 2.4, -Z + 1.75, Z - 2.9], lead: -2.3 },
        );
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    walkPerson(id, [x, z], { speed } = {}) {
      const r = people[id];
      if (!r || !r.hips) return Promise.resolve();
      if (r.seated) standUp(id);
      r.root.visible = true;
      if (blobs[id]) blobs[id].visible = true;
      return walkPerson(r, route(w.nav, r.root.position, [x, z]), { speed: speed || 1.2, blobM: blobs[id] });
    },
    async sitPerson(id, seatId) {
      const s = seats[seatId];
      if (!s || id === 'eric' || id === 'player') return;
      const r = people[id];
      if (!r) return;
      await P.walkPerson(id, [s.x, s.z + 0.5]);
      r.root.rotation.y = 0;
      sit(r);
      armsLap(r);
      r.root.position.set(s.x, r.root.position.y + (s.y - 0.22) * K, s.z);
      r.seated = true;
      if (blobs[id]) blobs[id].position.set(s.x, 0.004, s.z + 0.25);
    },
    async standPerson(id) {
      standUp(id);
    },
    update(dt, t) {
      w.update(t);
      stepPeople([w.aoi, w.man, w.guard, rei], dt);
      stepCommuters(dt);
      for (const [i, r] of extras.entries()) {
        idle(r, t + i);
        r.head.rotation.y = Math.sin(t * 0.7 + i * 2) * 0.35;
        if (i < 2) r.arms[i].rotation.x = -0.3 - Math.max(0, Math.sin(t * 2 + i)) * 0.4;
      }
      if (openTimer > 0) {
        openTimer -= dt;
        if (openTimer <= 0 && !st.gateOpen) st.flapWant = 0;
      }
      const jit = st.jam ? Math.abs(Math.sin(t * 38)) * 0.07 * (Math.sin(t * 2.5) > 0.3 ? 1 : 0) : 0;
      st.flap += (st.flapWant - st.flap) * Math.min(1, dt * (st.slam ? 10 : 5));
      if (st.slam && Math.abs(st.flap - 1) < 0.02) st.slam = 0;
      w.arch.userData.flaps(Math.max(0, st.flap + jit));
      if (st.typing > 0) {
        st.typing -= dt;
        w.guard.arms[0].rotation.x = -1.1 + Math.max(0, Math.sin(t * 22)) * 0.12;
        w.guard.arms[1].rotation.x = -1.1 + Math.max(0, Math.sin(t * 22 + 2)) * 0.12;
      }
      const p = game.player.root.position;
      for (const r of Object.values(people)) {
        if (!r.hips || r._walk) continue;
        if (r.lookTarget) lookAt(r, r.lookTarget[0], r.lookTarget[1], 1);
        else if (Math.hypot(p.x - r.root.position.x, p.z - r.root.position.z) < 2.6) lookAt(r, p.x, p.z, 0.8);
        else
          lookAt(
            r,
            r.root.position.x + Math.sin(r.root.rotation.y),
            r.root.position.z + Math.cos(r.root.rotation.y),
            0.8,
          );
      }
      if (!w.man._walk && w.man.root.visible) idle(w.man, t);
      if (w.aoi.seated) idle(w.aoi, t);
      if (!rei._walk && rei.root.visible) idle(rei, t);
    },
    hooks: {
      reader: ({ side = 'r', state = 'green' }) => readerFlash(side === 'l' ? 0 : 1, state),
      gate: ({ state }) => {
        if (state === 'open' && !st.gateOpen) sfx('flap');
        setGate(state);
      },
      cardOk: () => {
        st.cardOk = true;
        flags[ENGINE_KEYS.cardOk] = true;
      },
      enter: async ({ who, to = 'before_gate', wait = true }) => {
        const r = people[who];
        if (!r) return;
        r.root.visible = true;
        r.root.position.set(0.6, 0, Z + 1.6);
        r.root.rotation.y = Math.PI;
        if (blobs[who]) {
          blobs[who].visible = true;
          blobs[who].position.set(0.6, 0.004, Z + 1.6);
        }
        sfx('glassdoor');
        const pr = walkPerson(r, [[0.5, Z - 0.6], game.posOf(to)], { speed: 1.7, blobM: blobs[who] });
        if (wait) await pr;
      },
      typing: ({ ms = 2500 }) => {
        st.typing = ms / 1000;
      },
      // the guard on hold: handset at his ear, faint hold music
      phone: ({ who = 'guard', state = 'on' }) => {
        const r = people[who];
        if (!r || !r.arms) return;
        if (state === 'on') {
          r.arms[1].rotation.set(-2.5, 0, -0.35);
          if (!st.hold)
            st.hold = setInterval(() => {
              sfx('tap');
              setTimeout(() => sfx('tap'), 180);
            }, 1600);
        } else {
          r.arms[1].rotation.set(-1.1, 0, 0);
          clearInterval(st.hold);
          st.hold = null;
        }
      },
      rush: ({ on }) => {
        st.rush = !!on;
      },
      catTo: async ({ to }) => {
        const p = game.posOf(to);
        if (!p) return;
        const crosses = (w.tama.position.z - BZ) * (p[1] - BZ) < 0;
        const run = walkRig(game, w.tama, p, { speed: 1.1 });
        if (crosses) {
          await game.wait((Math.abs(w.tama.position.z - BZ) / 1.1) * 1000);
          readerFlash(1, 'red');
          w.arch.userData.set('no');
          setTimeout(() => w.arch.userData.set(st.gateOpen ? 'ok' : 'idle'), 1200);
        }
        await run;
      },
      newsletter: ({ state }) => {
        paper.visible = true;
        if (state === 'down') {
          paper.position.set(0, 0.02, 0.24);
          paper.rotation.x = -1.2;
          w.aoi.arms[0].rotation.x = -0.8;
          w.aoi.arms[1].rotation.x = -0.8;
        } else {
          paper.position.set(0, 0.2, 0.2);
          paper.rotation.x = -0.15;
          w.aoi.arms[0].rotation.x = -1.3;
          w.aoi.arms[1].rotation.x = -1.3;
        }
      },
      liftOpen: () => {
        w.lifts[0].want = 1;
        sfx('liftdoor');
      },
      liftClose: () => {
        w.lifts[0].want = 0;
      },
    },
    // the lift's landing doors here (places/lift.js hides them while the wall is cut away and waits on k)
    liftLanding: { leaves: w.lifts[0].leaves, k: () => w.lifts[0].k },
    capState(s) {
      if (s === 'aoi') {
        sit(w.aoi);
        armsLap(w.aoi);
        w.aoi.root.position.set(3.6, 0.07 * K, 1.15);
        w.aoi.root.rotation.y = 0;
        w.aoiBlob.position.set(3.6, 0.004, 1.4);
        w.aoi.seated = true;
      }
      if (s === 'open') setGate('open');
      if (s === 'jam') {
        w.man.root.visible = true;
        w.manBlob.visible = true;
        w.man.root.position.set(0.93, 0, BZ + 0.6);
        w.man.root.rotation.y = Math.PI;
        w.manBlob.position.set(0.93, 0.004, BZ + 0.6);
        setGate('jam');
      }
    },

    // arriving from the platform walkway: in through the glass doors, the camera easing out from close
    async tripIn(g, slot) {
      st.leaving = false;
      const mio = g.player;
      mio.scripted = true;
      mio.root.position.set(0, 0, Z + 1.7);
      mio.root.rotation.y = Math.PI;
      const wl = withList(slot);
      const walkers = [];
      wl.forEach((id, i) => {
        const r = people[id];
        if (!r) return;
        const x0 = i ? -0.75 : 0.75;
        if (r.meshy) {
          r.root.visible = true;
          r.seated = false;
          r.root.position.set(x0, 0, Z + 2.3);
          r.root.rotation.y = Math.PI;
          r.setState('walk');
          walkers.push(
            glide(g, r.root, [x0, Z - 0.3], 1.35)
              .then(() => glide(g, r.root, [x0 * 1.8, Z - 1.25], 1.35))
              .then(() => r.setState('idle')),
          );
          return;
        }
        if (!r.hips) return;
        if (r.seated) standUp(id);
        if (id === 'aoi') paper.visible = false;
        const x = i ? -0.75 : 0.75;
        r.root.visible = true;
        if (blobs[id]) blobs[id].visible = true;
        r.root.position.set(x, 0, Z + 2.3);
        r.root.rotation.y = Math.PI;
        walkers.push(
          walkPerson(
            r,
            [
              [x, Z - 0.3],
              [x * 1.8, Z - 1.25],
            ],
            { speed: 1.35, blobM: blobs[id] },
          ),
        );
      });
      cam.closeOn([0, Z], 1.7);
      cam.snap(mio.root.position);
      sfx('glassdoor');
      mio.setState('walk');
      const aoiWalk = walkers.length ? Promise.all(walkers) : null;
      await glide(g, mio.root, [0, Z - 1.3], 1.3);
      g.walker.facing = Math.PI;
      mio.root.rotation.y = Math.PI;
      mio.setState('idle');
      mio.scripted = false;
      cam.release();
      if (aoiWalk) await aoiWalk;
    },
    // The old lift marker now names the station's outdoor exit; keep its id for saves.
    async tripOut(g) {
      await clearDoor(g); // the commuters leave by this door too (lobby-commuters.js)
      await g.walkTo(-1.0, -Z + 0.6);
      g.player.scripted = true;
      g.walker.locked = true;
      cam.closeOn([-1, -Z], 1.7);
      await glide(g, g.player.root, [-1, -Z - 0.65], 1.1);
      g.player.setState('idle');
    },
  };
  // Aoi isn't in today's gate story: she stays on the right bench, hidden, unless the story shows her
  w.aoi.root.visible = false;
  w.aoiBlob.visible = false;
  sit(w.aoi);
  armsLap(w.aoi);
  w.aoi.arms[0].rotation.x = -1.3;
  w.aoi.arms[1].rotation.x = -1.3;
  w.aoi.root.position.set(3.6, w.aoi.root.position.y + 0.07 * K, 1.15);
  w.aoi.root.rotation.y = 0;
  w.aoiBlob.position.set(3.6, 0.004, 1.4);
  w.aoi.seated = true;
  return P;
}
