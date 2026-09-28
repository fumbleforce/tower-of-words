// Place 2, the lobby and security gate, as the engine side: things, spots, zones, hooks, commuters and trips.
// Every word said here comes from game3d/story/gate.js (placeholder: story/placeholder/gate.js).
import * as THREE from 'three';
import { buildLobby } from '../scenes/lobby.js';
import { K } from '../scenes/office.js';
import { RoomCam } from '../cam.js';
import { ui, sfx } from '../ui.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { PEOPLE, sit, armsLap, walkPose, HIP, idle } from '../cast.js';
import { blob } from '../engine.js';
import { flags, cond } from '../runner.js';
import { rbox } from '../props.js';
import { route } from './route.js';

export const withList = (slot) => (slot.with || []).filter((e) => typeof e === 'string' || cond(e.if)).map((e) => (typeof e === 'string' ? e : e.who));

// walk an object in a straight line, ignoring the walk grid (scripted moves)
export function glide(g, obj, [x, z], speed) {
  return new Promise((res) => {
    let last = performance.now();
    const tick = () => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000) * (g.timeScale || 1); last = now;
      const p = obj.position, d = Math.hypot(x - p.x, z - p.z);
      if (d < 0.03) { res(); return; }
      const s = Math.min(d, speed * dt); p.x += (x - p.x) / d * s; p.z += (z - p.z) / d * s;
      obj.rotation.y = Math.atan2(x - p.x, z - p.z); if (g.walker) g.walker.facing = obj.rotation.y;
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export async function lobbyPlace(game) {
  const w = buildLobby();
  const { BZ, X, Z } = w;
  const cam = new RoomCam({ elev: 46, fov: 24 });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const st = { cardOk: false, gateOpen: false, flap: 0, flapWant: 0, jam: 0, slam: 0, rush: true, typing: 0 };
  const rei = PEOPLE.rei(); rei.root.scale.multiplyScalar(K); w.root.add(rei.root); rei.root.visible = false;
  const reiBlob = blob(0.55, 0.38); w.root.add(reiBlob); reiBlob.visible = false; rei.blob = reiBlob;
  w.aoi.blob = w.aoiBlob; w.man.blob = w.manBlob;
  const people = { guard: w.guard, kuroda: w.man, aoi: w.aoi, kuro: w.kuro, rei, tama: { root: w.tama, head: w.tama.userData.head } };
  const blobs = { aoi: w.aoiBlob, kuroda: w.manBlob, rei: reiBlob };
  // Aoi hides behind a newsletter on the right bench, upside down
  const paper = new THREE.Group();
  { const sheet = rbox(0.26, 0.34, 0.01, '#f2f0ea', { r: 0.004 }); const band = rbox(0.24, 0.07, 0.012, '#c9473f', { y: 0.25, r: 0.004, cast: false }); paper.add(sheet, band); }
  paper.position.set(0, 0.2, 0.2); paper.rotation.x = -0.15; w.aoi.torso.add(paper);
  w.man.root.visible = false; w.manBlob.visible = false;

  // ---- commuters: walk in, tap a reader, pass the arch, take a lift ----
  const commuters = [];
  [0, 2, 5].forEach((k, i) => {   // a small crowd, so the story's people stand out
    const r = PEOPLE.worker(k); r.root.scale.multiplyScalar(K);
    if (i === 2) { const box = rbox(0.2, 0.12, 0.2, '#f4efe6', { y: -0.3, z: 0.05, r: 0.01 }); box.add(rbox(0.21, 0.02, 0.05, '#d9534f', { y: 0.11, r: 0.004 })); r.arms[1].add(box); }
    w.root.add(r.root); r.root.visible = false;
    const b = blob(0.5, 0.35); w.root.add(b); b.visible = false;
    commuters.push({ r, b, t: 1 - i * 3.5, side: i % 2 ? 1 : -1, stage: 'wait', ph: 0, qi: i });
  });
  function stepCommuter(c, dt) {
    const r = c.r, p = r.root.position;
    c.t += dt;
    if (c.stage === 'wait') {
      if (c.t > 0 && st.rush && !game.busyTrip) { c.stage = 'in'; r.root.visible = true; c.b.visible = true; p.set(c.side * (0.3 + Math.random() * 0.45), 0, Z + 1.6); c.path = [[c.side * (0.45 + Math.random() * 0.35), Z - 0.9], [c.side * 0.93, BZ + 0.55]]; }  // in through the open doorway (|x| < 1.1), never the glass
      return;
    }
    const moveTo = (tx, tz, sp = 1.25) => {
      const d = Math.hypot(tx - p.x, tz - p.z); if (d < 0.04) return true;
      const s = Math.min(d, sp * dt); p.x += (tx - p.x) / d * s; p.z += (tz - p.z) / d * s;
      r.root.rotation.y = Math.atan2(tx - p.x, tz - p.z); c.ph += dt * 9.5; walkPose(r, c.ph, 1); c.b.position.set(p.x, 0.004, p.z);
      return false;
    };
    if (c.stage === 'in') {
      if (!st.gateOpen && c.path.length === 1) { c.stage = 'toqueue'; c.path = [[-1.9 - c.qi * 0.55, BZ + 1.15 + (c.qi % 2) * 0.35]]; }
      else if (moveTo(...c.path[0])) { c.path.shift(); if (!c.path.length) { c.stage = 'tap'; c.t = 0; walkPose(r, 0, 0); r.hips.position.y = HIP; r.arms[0].rotation.x = -1.2; } }
      return;
    }
    if (c.stage === 'toqueue') { if (moveTo(...c.path[0], 1.1)) { c.stage = 'queue'; c.t = 0; walkPose(r, 0, 0); r.hips.position.y = HIP; r.root.rotation.y = Math.PI * 0.9; } return; }
    if (c.stage === 'queue') {
      // waiting: a phone out, a glance at the gate now and then, a sigh (shoulders drop)
      r.arms[1].rotation.x = -1.25; r.head.rotation.x = 0.35 - Math.max(0, Math.sin(c.t * 0.7 + c.qi)) * 0.35; r.head.rotation.y = Math.sin(c.t * 0.4 + c.qi) * 0.4;
      r.torso.position.y = 0.02 - Math.max(0, Math.sin(c.t * 0.9 + c.qi * 2) - 0.96) * 0.3;
      if (st.gateOpen) { r.arms[1].rotation.x = 0; r.head.rotation.set(0, 0, 0); r.torso.position.y = 0.02; c.stage = 'in'; c.path = [[c.side * 0.93, BZ + 0.55]]; }
      return;
    }
    if (c.stage === 'tap') {
      if (st.jam) { if (c.t > 1.5) { r.arms[0].rotation.x = 0; c.stage = 'back'; } return; }
      if (c.t > 0.4 && c.t - dt <= 0.4) { readerFlash(c.side > 0 ? 1 : 0, 'green', true); openFor(1.6); }
      if (c.t > 0.7) { r.arms[0].rotation.x = 0; c.stage = 'through'; c.path = [[c.side * 0.2, BZ + 0.2], [c.side * 0.1, BZ - 0.8], [c.side * 1.0, -Z + 0.55]]; }
      return;
    }
    if (c.stage === 'back') { if (moveTo(c.side * 1.6, BZ + 1.2)) { c.stage = 'tapwait'; c.t = 0; walkPose(r, 0, 0); } return; }
    if (c.stage === 'tapwait') { if (!st.jam) { c.stage = 'in'; c.path = [[c.side * 0.93, BZ + 0.5]]; } return; }
    if (c.stage === 'through') {
      if (c.path.length === 1) w.lifts[c.side > 0 ? 1 : 0].want = 1;
      if (moveTo(...c.path[0])) { c.path.shift(); if (!c.path.length) { c.stage = 'enter'; c.t = 0; } }
      return;
    }
    if (c.stage === 'enter') { if (moveTo(c.side * 1.0, -Z - 0.2, 1.0)) { r.root.visible = false; c.b.visible = false; w.lifts[c.side > 0 ? 1 : 0].want = 0; c.stage = 'wait'; c.t = -4 - Math.random() * 5; } }
  }

  // background people who aren't going anywhere yet
  const extras = [];
  for (const [k, x, z, ry] of [[4, -3.0, -2.9, 0.9], [2, -2.45, -2.6, -2.2]]) {
    const r = PEOPLE.worker(k); r.root.scale.multiplyScalar(K); r.root.position.set(x, 0, z); r.root.rotation.y = ry; w.root.add(r.root);
    const b = blob(0.5, 0.35); b.position.set(x, 0.004, z); w.root.add(b); extras.push(r);
  }
  // ---- gate ----
  function readerFlash(i, state, quiet) {
    w.readers[i].userData.set(state === 'green' ? 'ok' : state === 'red' ? 'no' : 'idle');
    if (!quiet || Math.hypot(game.player.root.position.x, game.player.root.position.z - BZ) < 4) sfx(state === 'green' ? 'ok' : state === 'red' ? 'no' : 'tap');
    clearTimeout(st['rt' + i]); if (state !== 'idle') st['rt' + i] = setTimeout(() => w.readers[i].userData.set('idle'), 1300);
  }
  let openTimer = 0;
  function openFor(sec) { if (st.jam) return; st.flapWant = 1; openTimer = Math.max(openTimer, sec); }
  function setGate(state) {
    if (state === 'open') { st.jam = 0; st.gateOpen = true; st.flapWant = 1; w.nav.unblock('gate'); w.arch.userData.set('ok'); flags.gateOpen = true; }
    if (state === 'closed') { st.jam = 0; st.gateOpen = false; st.flapWant = 0; w.arch.userData.set('idle'); }
    if (state === 'jam') { st.jam = 1; st.flapWant = 0; w.arch.userData.set('no'); sfx('no'); }
    if (state === 'slam') { st.jam = 0; st.slam = 1; st.flap = 1.3; st.flapWant = 1; sfx('door'); openTimer = 2.5; w.arch.userData.set('ok'); }
  }

  const spots = {
    entrance_in: [0, Z - 0.8], bench_l: [-3.9, 3.2], bench_r: [3.6, 1.95], before_gate: [0.93, BZ + 0.55], after_gate: [0, BZ - 0.9],
    lift_front: [-1.0, -Z + 0.6], counter_front: [-4.2, 1.1], desk_front: [2.1, BZ + 0.72], outside: [0, Z + 1.5],
  };
  const seats = { bench_r: { x: 3.6, z: 1.15, y: 0.29, top: 0.29, ry: 0 }, bench_l: { x: -3.9, z: 2.4, y: 0.29, top: 0.29, ry: 0 } };
  const rigAnchor = (rig, h = 1.25) => (v) => { rig.root.getWorldPosition(v); v.y += h; return v; };
  const v3 = (x, y, z) => (v) => v.set(x, y, z);
  const at = (x, z, fx, fz) => ({ spot: () => [x, z], face: () => [fx, fz] });

  function readerTap(i) {
    return (async () => {
      if (!st.cardOk && !st.gateOpen) { readerFlash(i, 'red'); if (game.runner.has('event:card_red')) await game.runner.run(game.runner.resolve('event:card_red')); else await ui.say(null, 'Red cross. Your card does nothing yet.'); return; }
      readerFlash(i, 'green'); setGate('open');
      const n = game.runner.resolve('event:card_ok'); if (n) await game.runner.run(n);
    })();
  }
  const things = {
    guard: { label: 'Mr. Ishibashi', kind: 'person', anchor: rigAnchor(w.guard), ...at(2.1, BZ + 0.72, 2.35, BZ - 0.6) },
    kuroda: { label: 'Mr. Hamada', kind: 'person', anchor: rigAnchor(w.man), spot: () => [w.man.root.position.x, w.man.root.position.z + 0.6], face: () => [w.man.root.position.x, w.man.root.position.z], enabled: () => w.man.root.visible && !w.man._walk },
    aoi: { label: 'Aoi', kind: 'person', anchor: rigAnchor(w.aoi), spot: () => (w.aoi.seated ? [3.6, 1.95] : [w.aoi.root.position.x, w.aoi.root.position.z + 0.6]), face: () => [w.aoi.root.position.x, w.aoi.root.position.z], enabled: () => w.aoi.root.visible && !w.aoi._walk },
    kuro: { label: 'Receptionist', kind: 'person', anchor: rigAnchor(w.kuro), ...at(-4.2, 1.1, -4.2, -0.05) },
    tama: { label: 'Tama', verb: 'Pet', kind: 'person small', anchor: v3(3.45, 0.55, BZ + 0.42), ...at(3.45, BZ + 1.05, 3.45, BZ + 0.42) },
    reader_l: { label: 'Card reader', kind: 'thing', anchor: v3(-0.93, 1.0, BZ), ...at(-0.93, BZ + 0.48, -0.93, BZ), act: () => readerTap(0), enabled: () => !st.gateOpen },
    reader_r: { label: 'Card reader', kind: 'thing', anchor: v3(0.93, 1.0, BZ), ...at(0.93, BZ + 0.48, 0.93, BZ), act: () => readerTap(1), enabled: () => !st.gateOpen },
    gate: { label: 'Gate', kind: 'thing', anchor: v3(0, 1.75, BZ), ...at(0, BZ + 0.6, 0, BZ), enabled: () => !st.gateOpen },
    desk: { label: 'Guard desk', kind: 'thing small', anchor: v3(1.6, 0.9, BZ), ...at(1.5, BZ + 0.6, 1.6, BZ), noMarker: true },
    counter: { label: 'Visitor counter', kind: 'thing small', anchor: v3(-3.7, 0.95, 0.45), ...at(-3.6, 1.1, -3.7, 0.45), noMarker: true },
    signin: { label: 'Visitor book', kind: 'thing small', anchor: v3(-3.75, 0.8, 0.5), ...at(-3.75, 1.1, -3.75, 0.5) },
    lostfound: { label: 'Lost and found', kind: 'thing small', anchor: v3(-5.85, 1.3, 0.3), ...at(-5.1, 1.2, -5.85, 0.3) },
    screen: { label: 'Notice screen', kind: 'thing small', anchor: v3(-3.95, 1.45, -Z), ...at(-3.95, -Z + 0.6, -3.95, -Z), enabled: () => st.gateOpen },
    kiosk: { label: 'Coffee machine', kind: 'thing small', anchor: v3(5.75, 1.5, 3.0), ...at(5.0, 3.0, 5.75, 3.0) },
    bench_l: { label: 'Bench', kind: 'thing small', anchor: v3(-3.9, 0.6, 2.55), ...at(-3.9, 3.2, -3.9, 2.55), noMarker: true },
    bench_r: { label: 'Bench', kind: 'thing small', anchor: v3(3.95, 0.6, 1.3), ...at(4.4, 1.95, 4.4, 1.3), noMarker: true },
    poster_l: { label: 'Poster', kind: 'thing small', anchor: v3(-2.1, 1.7, -Z), ...at(-2.1, -Z + 0.6, -2.1, -Z), enabled: () => st.gateOpen },
    poster_r: { label: 'Poster', kind: 'thing small', anchor: v3(2.1, 1.7, -Z), ...at(2.1, -Z + 0.6, 2.1, -Z), enabled: () => st.gateOpen },
    lift: { label: 'Lift', kind: 'thing', anchor: v3(-1.0, 1.7, -Z), ...at(-1.0, -Z + 0.6, -1.0, -Z), enabled: () => st.gateOpen },
    entrance: { label: 'Entrance', kind: 'thing small', anchor: v3(0, 1.3, Z), ...at(0, Z - 0.6, 0, Z), noMarker: true },
    plant: { label: 'Plant', kind: 'thing small', anchor: v3(1.95, 0.9, 3.95), ...at(1.95, 3.35, 1.95, 3.95), noMarker: true },
    bowl: { label: "Tama's bowl", kind: 'thing small', anchor: v3(3.2, 0.3, BZ + 0.56), ...at(3.2, BZ + 1.1, 3.2, BZ + 0.56), noMarker: true },
  };

  const zones = {
    arch: (x, z) => Math.abs(x) < 0.6 && z < BZ + 0.5 && z > BZ + 0.1 && !st.gateOpen,
    past_gate: (x, z) => z < BZ - 0.4,
    lift_front: (x, z) => z < -Z + 1.1 && Math.abs(x) < 1.8,
  };

  function standUp(id) {
    const r = people[id]; if (!r || !r.seated) return;
    r.seated = false; r.root.position.y = 0; for (const l of r.legs) l.rotation.set(0, 0, 0); for (const k of r.knees) k.rotation.set(0, 0, 0); for (const a of r.arms) a.rotation.set(0, 0, 0);
    r.root.position.z += 0.45;
  }

  const P = {
    // colour grade (js/post.js): toward game3d/ref/2-security-gate-muted.png: slate shadows, warm sun, low saturation
    grade: { exposure: 1.04, temp: 0.02, sat: 0.88, contrast: 1.07, lift: [0.005, 0.008, 0.016], shadowTint: [-0.008, -0.002, 0.02], highTint: [0.022, 0.01, -0.014], vignette: 0.26, bloom: 0.4, bloomThreshold: 0.82, focusBand: 0.3 },
    _commuters: commuters,
    scene: w.scene, camera: cam.camera, cam, space: w.root, nav: w.nav, sun: w.sun, charScale: K, clock: w.clock,
    start: [0, Z - 1.3], startFacing: Math.PI, things, people, spots, zones, seats, glide,
    fit(aspect) {
      const pts = [];
      for (const x of [-X - 0.2, X + 0.2]) for (const z of [-Z - 0.2, Z + 0.3]) for (const y of [0, 1.6]) pts.push(new THREE.Vector3(x, y, z));
      if (aspect >= 1) cam.fit(aspect, [new THREE.Vector3(-5.6, 0, 0), new THREE.Vector3(5.6, 0, 0), new THREE.Vector3(0, 2.25, -Z), new THREE.Vector3(0, 0, Z + 0.1)], new THREE.Vector3(0, 0, 0.05), { follow: true, clamp: [-0.9, 0.9, -0.7, 0.05], limY: 0.97 }); // headroom above the lifts for their markers; pans up when he walks north
      else cam.fit(aspect, [new THREE.Vector3(-2.4, 0, 0), new THREE.Vector3(2.4, 0, 0), new THREE.Vector3(0, 0, -2.7), new THREE.Vector3(0, 1.4, 2.5)], new THREE.Vector3(0, 0, 0), { follow: true, clamp: [-X + 2.4, X - 2.4, -Z + 1.75, Z - 2.9], lead: -2.7 });
    },
    pick(rc) { const p = new THREE.Vector3(); return rc.ray.intersectPlane(floor, p) ? p : null; },
    walkPerson(id, [x, z], { speed } = {}) {
      const r = people[id]; if (!r || !r.hips) return Promise.resolve();
      if (r.seated) standUp(id);
      r.root.visible = true; if (blobs[id]) blobs[id].visible = true;
      return walkPerson(r, route(w.nav, r.root.position, [x, z]), { speed: speed || 1.2, blobM: blobs[id] });
    },
    async sitPerson(id, seatId) {
      const s = seats[seatId]; if (!s || (id === 'eric' || id === 'player')) return;
      const r = people[id]; if (!r) return;
      await P.walkPerson(id, [s.x, s.z + 0.5]);
      r.root.rotation.y = 0; sit(r); armsLap(r); r.root.position.set(s.x, r.root.position.y + (s.y - 0.22) * K, s.z); r.seated = true;
      if (blobs[id]) blobs[id].position.set(s.x, 0.004, s.z + 0.25);
    },
    async standPerson(id) { standUp(id); },
    update(dt, t) {
      w.update(t);
      stepPeople([w.aoi, w.man, w.guard, rei], dt);
      for (const c of commuters) stepCommuter(c, dt);
      for (const [i, r] of extras.entries()) { idle(r, t + i); r.head.rotation.y = Math.sin(t * 0.7 + i * 2) * 0.35; if (i < 2) r.arms[i].rotation.x = -0.3 - Math.max(0, Math.sin(t * 2 + i)) * 0.4; }
      if (openTimer > 0) { openTimer -= dt; if (openTimer <= 0 && !st.gateOpen) st.flapWant = 0; }
      const jit = st.jam ? Math.abs(Math.sin(t * 38)) * 0.07 * (Math.sin(t * 2.5) > 0.3 ? 1 : 0) : 0;
      st.flap += (st.flapWant - st.flap) * Math.min(1, dt * (st.slam ? 10 : 5));
      if (st.slam && Math.abs(st.flap - 1) < 0.02) st.slam = 0;
      w.arch.userData.flaps(Math.max(0, st.flap + jit));
      if (st.typing > 0) { st.typing -= dt; w.guard.arms[0].rotation.x = -1.1 + Math.max(0, Math.sin(t * 22)) * 0.12; w.guard.arms[1].rotation.x = -1.1 + Math.max(0, Math.sin(t * 22 + 2)) * 0.12; }
      const p = game.player.root.position;
      for (const r of Object.values(people)) {
        if (!r.hips || r._walk) continue;
        if (r.lookTarget) lookAt(r, r.lookTarget[0], r.lookTarget[1], 1);
        else if (Math.hypot(p.x - r.root.position.x, p.z - r.root.position.z) < 2.6) lookAt(r, p.x, p.z, 0.8);
        else lookAt(r, r.root.position.x + Math.sin(r.root.rotation.y), r.root.position.z + Math.cos(r.root.rotation.y), 0.8);
      }
      if (!w.man._walk && w.man.root.visible) idle(w.man, t);
      if (w.aoi.seated) idle(w.aoi, t);
      if (!rei._walk && rei.root.visible) idle(rei, t);
    },
    hooks: {
      reader: ({ side = 'r', state = 'green' }) => readerFlash(side === 'l' ? 0 : 1, state),
      gate: ({ state }) => setGate(state),
      cardOk: () => { st.cardOk = true; flags.cardOk = true; },
      enter: async ({ who, to = 'before_gate', wait = true }) => {
        const r = people[who]; if (!r) return;
        r.root.visible = true; r.root.position.set(0.6, 0, Z + 1.6); r.root.rotation.y = Math.PI;
        if (blobs[who]) { blobs[who].visible = true; blobs[who].position.set(0.6, 0.004, Z + 1.6); }
        sfx('door');
        const pr = walkPerson(r, [[0.5, Z - 0.6], game.posOf(to)], { speed: 1.7, blobM: blobs[who] });
        if (wait) await pr;
      },
      typing: ({ ms = 2500 }) => { st.typing = ms / 1000; },
      // the guard on hold: handset at his ear, faint hold music
      phone: ({ who = 'guard', state = 'on' }) => {
        const r = people[who]; if (!r || !r.arms) return;
        if (state === 'on') { r.arms[1].rotation.set(-2.5, 0, -0.35); if (!st.hold) st.hold = setInterval(() => { sfx('tap'); setTimeout(() => sfx('tap'), 180); }, 1600); }
        else { r.arms[1].rotation.set(-1.1, 0, 0); clearInterval(st.hold); st.hold = null; }
      },
      rush: ({ on }) => { st.rush = !!on; },
      catTo: async ({ to }) => {
        const p = game.posOf(to); if (!p) return;
        const crosses = (w.tama.position.z - BZ) * (p[1] - BZ) < 0;
        const run = glide(game, w.tama, p, 1.1);
        if (crosses) { await game.wait(Math.abs(w.tama.position.z - BZ) / 1.1 * 1000); readerFlash(1, 'red'); w.arch.userData.set('no'); setTimeout(() => w.arch.userData.set(st.gateOpen ? 'ok' : 'idle'), 1200); }
        await run;
      },
      newsletter: ({ state }) => { paper.visible = true; if (state === 'down') { paper.position.set(0, 0.02, 0.24); paper.rotation.x = -1.2; w.aoi.arms[0].rotation.x = -0.8; w.aoi.arms[1].rotation.x = -0.8; } else { paper.position.set(0, 0.2, 0.2); paper.rotation.x = -0.15; w.aoi.arms[0].rotation.x = -1.3; w.aoi.arms[1].rotation.x = -1.3; } },
      liftOpen: () => { w.lifts[0].want = 1; sfx('lift'); },
      liftClose: () => { w.lifts[0].want = 0; },
    },
    capState(s) {
      if (s === 'aoi') { sit(w.aoi); armsLap(w.aoi); w.aoi.root.position.set(3.6, 0.07 * K, 1.15); w.aoi.root.rotation.y = 0; w.aoiBlob.position.set(3.6, 0.004, 1.4); w.aoi.seated = true; }
      if (s === 'open') setGate('open');
      if (s === 'jam') { w.man.root.visible = true; w.manBlob.visible = true; w.man.root.position.set(0.93, 0, BZ + 0.6); w.man.root.rotation.y = Math.PI; w.manBlob.position.set(0.93, 0.004, BZ + 0.6); setGate('jam'); }
    },

    // arriving from the platform walkway: in through the glass doors, the camera easing out from close
    async tripIn(g, slot) {
      const mio = g.player; mio.scripted = true;
      mio.root.position.set(0, 0, Z + 1.7); mio.root.rotation.y = Math.PI;
      const wl = withList(slot);
      const walkers = [];
      wl.forEach((id, i) => {
        const r = people[id]; if (!r) return;
        const x0 = i ? -0.75 : 0.75;
        if (r.meshy) { r.root.visible = true; r.seated = false; r.root.position.set(x0, 0, Z + 2.3); r.root.rotation.y = Math.PI; r.setState('walk'); walkers.push(glide(g, r.root, [x0, Z - 0.3], 1.35).then(() => glide(g, r.root, [x0 * 1.8, Z - 1.25], 1.35)).then(() => r.setState('idle'))); return; }
        if (!r.hips) return;
        if (r.seated) standUp(id);
        if (id === 'aoi') paper.visible = false;
        const x = i ? -0.75 : 0.75;
        r.root.visible = true; if (blobs[id]) blobs[id].visible = true;
        r.root.position.set(x, 0, Z + 2.3); r.root.rotation.y = Math.PI;
        walkers.push(walkPerson(r, [[x, Z - 0.3], [x * 1.8, Z - 1.25]], { speed: 1.35, blobM: blobs[id] }));
      });
      cam.closeOn([0, Z], 1.7); cam.snap(mio.root.position);
      sfx('door'); sfx('crowd');
      mio.setState('walk');
      const aoiWalk = walkers.length ? Promise.all(walkers) : null;
      await glide(g, mio.root, [0, Z - 1.3], 1.3);
      g.walker.facing = Math.PI; mio.root.rotation.y = Math.PI;
      mio.setState('idle'); mio.scripted = false;
      cam.release();
      if (aoiWalk) await aoiWalk;
    },
    // leaving: into a lift, doors close, the floor indicator counts up with the ride's lines
    async tripOut(g, slot) {
      const mio = g.player; const L = w.lifts[0];
      await g.walkTo(-1.0, -Z + 0.6);
      g.walker.locked = true;
      L.want = 1; sfx('lift'); await g.wait(700);
      mio.scripted = true; mio.setState('walk');
      cam.closeOn([-1.0, -Z + 0.2], 2.3);
      await glide(g, mio.root, [-1.0, -Z - 0.12], 1.0);
      mio.root.rotation.y = 0; mio.setState('idle');
      for (const id of withList(slot)) { const r = people[id]; if (!r) continue; if (r.meshy) { r.setState('walk'); await glide(g, r.root, [-0.8, -Z + 0.4], 1.2); r.setState('idle'); r.root.visible = false; continue; } if (r.hips) { await P.walkPerson(id, [-0.8, -Z + 0.4]); r.root.visible = false; if (blobs[id]) blobs[id].visible = false; } }
      await g.wait(300); L.want = 0; sfx('door'); await g.wait(700); mio.root.visible = false; await g.wait(200);
      g.liftFloor = '1'; ui.lift('1'); await g.wait(900);
      const ride = slot.ride || [];
      const drives = ride.some((s) => s && s.do === 'floor');
      if (ride.length) { await g.runner.steps(ride); ui.closeTalk(); }
      if (!drives || g.liftFloor !== 'B2') await g.hooks.floor({ to: 'B2' });
      sfx('lift'); await g.wait(600);
    },
  };
  // Aoi isn't in today's gate story: she stays on the right bench, hidden, unless the story shows her
  w.aoi.root.visible = false; w.aoiBlob.visible = false;
  sit(w.aoi); armsLap(w.aoi); w.aoi.arms[0].rotation.x = -1.3; w.aoi.arms[1].rotation.x = -1.3;
  w.aoi.root.position.set(3.6, w.aoi.root.position.y + 0.07 * K, 1.15); w.aoi.root.rotation.y = 0; w.aoiBlob.position.set(3.6, 0.004, 1.4); w.aoi.seated = true;
  return P;
}
