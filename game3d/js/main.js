// Day one: train, lobby, office. One renderer, one Mio, three places joined by continuous trips.
import * as THREE from 'three';
import { createRenderer, makeComposer, Walker, Markers, Q, blob } from './engine.js';
import { loadMio } from './mio.js';
import { makeAvatar, loadEric, setSitLift } from './avatar.js';
import { glide } from './places/lobby.js';
export const isPlayer = (id) => id === 'eric' || id === 'player';
import { ui, unlockAudio, sfx, voice, setFace, faceForEmote } from './ui.js';
import { WORDS, known, SAYABLE } from './lang.js';
import { defaultReaction } from './story.js';
import { Runner, flags, cond } from './runner.js';
import { trainPlace } from './places/train.js';
import { lobbyPlace } from './places/lobby.js';
import { officePlace } from './places/office.js';
import { showEnd } from './end.js';
import * as trips from './trips.js';
import { PERIODS as PERIOD_ORDER, sim, ITEMS, setPeriod, applySchedule, stepAmbient, bond, meet, noteTeacher, absorb, buy, take, peopleHTML, save, loadSave, restore, clearSave } from './sim.js';

const CAP = Q.has('cap');
const TEST = Q.get('test') === 'fast';
const TS = TEST ? +(Q.get('ts') || 8) : 1;   // test mode: everything runs this many times faster
const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
let quality = Q.has('q') ? +Q.get('q') : (renderer.userData.software ? 0 : 1);
ui.build();
if (CAP) document.body.classList.add('cap');

const PLACES = { train: trainPlace, gate: lobbyPlace, office: officePlace };
const NEXT = { train: 'gate', gate: 'office' };

// ---------- shared game state ----------
export const game = {
  renderer, ui, mio: null, walker: null, place: null, markers: new Markers(document.getElementById('marks')),
  t: 0, busy: false, near: null, sayTarget: null, found: new Set(), after: null, hooks: {},
  runner: null, story: null, prepared: {}, queue: [], timeScale: TS, test: TEST,
  async beat(fn) {
    if (this.busy) return;
    this.busy = true; this.walker.locked = true; this.walker.stop(); document.body.classList.add('busy');
    try { await fn(); } catch (e) { console.error(e); } finally { ui.closeTalk(); this.busy = false; if (this.walker) this.walker.locked = false; document.body.classList.remove('busy'); }
    if (this.after) { const a = this.after; this.after = null; await a(); return; }
    if (this.queue.length) { const q = this.queue.shift(); this.beat(q); }
  },
  wait(ms) { return new Promise((r) => setTimeout(r, ms / TS)); },
  walkTo(x, z) { if (this.player.seated) { this.player.seated = false; this.player.setState('idle'); this.player.root.position.y = 0; } return new Promise((res) => { const was = this.walker.locked; this.walker.locked = false; this.walker.goTo(x, z, () => { this.walker.locked = was; res(); }); }); },
  event(name) { if (this.runner) this.runner.trigger('event:' + name); },
  mioSays(id) { this.place.onMioSays?.(id); },
};
window.__game = game;

// ---------- rendering ----------
let composer = null, gtao = null;
function setComposer(place) {
  const c = makeComposer(renderer, place.scene, place.camera, { beforeAO: place.beforeAO });
  composer = c.composer; gtao = c.gtao;
  applyQuality();
}
function applyQuality() {
  const dpr = Math.min(window.devicePixelRatio || 1, Q.has('dpr') ? +Q.get('dpr') : 2);
  renderer.setPixelRatio(quality ? dpr : 1);
  if (gtao) gtao.enabled = !!quality;
  if (game.place && game.place.sun) {
    const s = game.place.sun, ms = quality ? 2048 : 1024;
    if (s.shadow.mapSize.x !== ms) { s.shadow.mapSize.set(ms, ms); if (s.shadow.map) { s.shadow.map.dispose(); s.shadow.map = null; } }
    s.shadow.radius = quality ? 4 : 2;
  }
  resize();
}
function size() { return [+(Q.get('w') || window.innerWidth), +(Q.get('h') || window.innerHeight)]; }
function resize() {
  const [w, h] = size();
  renderer.setSize(w, h, !Q.has('w'));
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  document.body.classList.toggle('phone', w / h < 0.8 || w < 640);
  if (game.place) { game.place.fit(w / h); if (game.player) game.place.cam?.snap?.(game.player.root.position); }
}
window.addEventListener('resize', resize);

// ---------- things, markers, triggers ----------
function thingOn(id, t) {
  const person = game.place && game.place.people[id];
  if (person && person.root && !person.root.visible) return false;
  const s = game.story && game.story.show && game.story.show[id];
  if (s !== undefined && !cond(s)) return false;
  if (t.enabled !== undefined) return typeof t.enabled === 'function' ? t.enabled() : t.enabled;
  return true;
}
function buildMarkers(place) {
  game.markers.clear();
  const labels = (game.story && game.story.labels) || {};
  for (const [id, t] of Object.entries(place.things)) {
    if (t.noMarker) continue;
    const L = labels[id];
    const item = { ...t, id, label: Array.isArray(L) ? L[0] : (L || t.label), labelIf: Array.isArray(L) ? { text: L[0], cond: L[1], other: t.label } : null, labelCond: cond, enabled: () => thingOn(id, t), goal: () => { const g = game.story && game.story.goal && game.story.goal[id]; return g !== undefined ? cond(g) : false; } };
    game.markers.add(item);
  }
}
game.use = (item) => use(item);
function use(item) {
  if (!item || game.busy) return;
  const go = () => { if (game.busy) return; if (item.face) game.walker.faceTo(...item.face()); talk(item); };
  const sp = item.spot ? item.spot() : null;
  // seated (at a desk, on a bench), Eric talks from where he is: the walker doesn't run while he sits
  if (game.player.seated) { go(); return; }
  if (sp) {
    const p = game.player.root.position;
    if (Math.hypot(p.x - sp[0], p.z - sp[1]) < 0.12) go();
    else game.walker.goTo(sp[0], sp[1], go);
  } else go();
}
function talk(item) {
  if (game.place.people[item.id]) { meet(game, item.id); ui.refreshPeople(sim.met.size); }
  if (game.runner.trigger('talk:' + item.id)) return;
  if (item.act) { game.beat(() => item.act()); return; }
  const look = item.look;
  if (look) game.beat(() => ui.say(null, typeof look === 'function' ? look() : look));
}
async function say() {
  if (game.busy || !known.size) return;
  const target = game.sayTarget;
  const id = await ui.sayMenu(target ? target.label : null);
  if (!id) return;
  const key = target ? `say:${id}:${target.id}` : null;
  if (target && target.face) game.walker.faceTo(...target.face());
  voice(WORDS[id].voice);
  game.mioSays(id);
  await game.wait(350);
  if (key && game.runner.has(key)) { game.found.add(key); game.runner.trigger(key); return; }
  if (game.runner.has(`say:${id}:*`)) { game.runner.trigger(`say:${id}:*`); return; }
  game.beat(async () => {
    if (target) await ui.say(null, defaultReaction(target, id));
    else await ui.say(null, `You say ${WORDS[id].ja} to nobody in particular. Nobody in particular does anything.`);
  });
}
ui.onSay = say;
ui.peopleHTML = peopleHTML; ui.items = ITEMS;
async function give() {
  if (game.busy || !sim.inv.length || !game.sayTarget) return;
  const target = game.sayTarget;
  const item = await ui.giveMenu(target.label, sim.inv, ITEMS);
  if (!item) return;
  const keys = [`give:${item}:${target.id}`, `give:*:${target.id}`];
  const k = keys.find((x) => game.runner.has(x));
  if (k) { take(item); flags['gave_' + item + '_' + target.id] = true; game.runner.trigger(k); return; }
  game.beat(() => ui.say(null, `${target.label} doesn't seem to want the ${ITEMS[item].name.toLowerCase()}. You keep it.`));
}
ui.onGive = give;
game.sim = sim;

// ---------- input ----------
const raycaster = new THREE.Raycaster();
function ndc(e) { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (game.busy || !game.place) return;
  const [w, h] = [canvas.clientWidth, canvas.clientHeight];
  let best = null, bd = 44;
  const v = new THREE.Vector3();
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    for (const a of [m.anchor(v.clone()), m.body ? m.body(v.clone()) : null]) {
      if (!a) continue; a.project(game.place.camera);
      const d = Math.hypot(((a.x + 1) / 2) * w - e.clientX, ((1 - a.y) / 2) * h - e.clientY);
      if (d < bd) { bd = d; best = m; }
    }
  }
  if (best) { use(best); return; }
  raycaster.setFromCamera(ndc(e), game.place.camera);
  const p = game.place.pick(raycaster);
  if (p) { game.walker.goTo(p.x, p.z); showTapRing(p); }
});
document.getElementById('marks').addEventListener('click', (e) => {
  const b = e.target.closest('.mark'); if (!b) return;
  const m = game.markers.list.find((x) => x.el === b); if (m) use(m);
});
window.addEventListener('keydown', (e) => {
  if (!game.walker) return;
  if (/^(Arrow|Key[WASD])/.test(e.code)) { game.walker.keys.add(e.code); e.preventDefault(); unlockAudio(); }
  if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !game.busy && game.near && !ui.talking && ui.menuClosed()) { e.preventDefault(); use(game.near); }
  if (e.code === 'KeyF' && !ui.talking && !game.busy && ui.menuClosed()) say();
  if (e.code === 'KeyQ' && !CAP) { quality = quality ? 0 : 1; applyQuality(); }
});
window.addEventListener('keyup', (e) => game.walker && game.walker.keys.delete(e.code));
window.addEventListener('blur', () => game.walker && game.walker.keys.clear());

let ring = null;
function showTapRing(p) {
  if (!ring) {
    ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 32), new THREE.MeshBasicMaterial({ color: '#6fd0c6', transparent: true, opacity: 0.85, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 3;
  }
  game.place.space.add(ring); ring.position.set(p.x, (game.place.floorY || 0) + 0.012, p.z); ring.userData.t = 0; ring.visible = true;
}

// ---------- hooks that work in every place ----------
const H = game.hooks;
function rigOf(id) { return isPlayer(id) ? null : game.place.people[id]; }
function posOf(to) {
  if (Array.isArray(to)) return to;
  const P = game.place;
  if (P.spots[to]) return P.spots[to];
  if (isPlayer(to)) return [game.player.root.position.x, game.player.root.position.z];
  if (P.people[to]) { const p = P.people[to].root.position; return [p.x, p.z]; }
  if (P.things[to]) { const s = P.things[to].spot?.(); if (s) return s; }
  console.warn('unknown spot', to); return null;
}
game.posOf = posOf;
H.goal = ({ text }) => ui.goal(text);
H.hint = ({ text, what }) => { if (what === 'say') ui.introSay(text); else ui.hint(text, 5000); };
H.wait = ({ ms }) => game.wait(ms);
H.sound = ({ name }) => sfx(name);
H.voice = ({ key }) => voice(key);
H.walk = async ({ who, to, wait = true, speed }) => {
  const p = posOf(to); if (!p) return;
  if (isPlayer(who)) { const pr = game.walkTo(p[0], p[1]); if (wait) await pr; return; }
  const r = rigOf(who); if (!r) return;
  if (r.meshy) { r.root.visible = true; if (r.seated) { r.root.position.y = 0; r.root.position.z += r.root.position.z < 0 ? 0.45 : -0.45; } r.seated = false; r.setState('walk'); const pr = glide(game, r.root, p, speed || 1.2).then(() => r.setState('idle')); if (wait) await pr; return; }
  const pr = game.place.walkPerson(who, p, { speed });
  if (wait) await pr;
};
H.face = ({ who, to }) => {
  const p = posOf(to); if (!p) return;
  if (isPlayer(who)) { game.walker.faceTo(p[0], p[1]); return; }
  const r = rigOf(who); if (!r) return;
  r.root.rotation.y = Math.atan2(p[0] - r.root.position.x, p[1] - r.root.position.z);
};
H.look = ({ who, at }) => { const r = rigOf(who); const p = posOf(at); if (r && p) r.lookTarget = p; };
H.sit = async ({ who, at }) => {
  const r = rigOf(who);
  if (r && r.meshy) { const s = game.place.seats[at]; if (!s) return; r.root.visible = true; await H.walk({ who, to: [s.x, s.z + (s.ry ? -0.5 : 0.5)] }); r.sitAt(s.x, s.top, s.z, s.ry || 0); r.seated = true; return; }
  await game.place.sitPerson?.(isPlayer(who) ? 'eric' : who, at);
};
H.stand = async ({ who }) => { await game.place.standPerson?.(who); };
H.cam = ({ on, zoom = 1.8, back }) => { if (back) game.place.cam.release?.(); else { const p = posOf(on); if (p) game.place.cam.closeOn?.(p, zoom); } };
H.expression = ({ who, face }) => setFace(who, face);
H.emote = ({ who, kind }) => {
  faceForEmote(who, kind);
  const el = document.createElement('div'); el.className = 'emote'; el.textContent = kind === 'heart' ? '♥' : kind === 'sweat' ? '💧' : kind;
  document.getElementById('ui').appendChild(el);
  const t0 = performance.now();
  const f = () => {
    const dt = performance.now() - t0; if (dt > 1700) { el.remove(); return; }
    const v = new THREE.Vector3();
    if (isPlayer(who)) game.player.root.getWorldPosition(v); else rigOf(who)?.root.getWorldPosition(v);
    v.y += 1.55 * (game.place.charScale || 1); v.project(game.place.camera);
    el.style.transform = `translate(${((v.x + 1) / 2) * canvas.clientWidth}px, ${((1 - v.y) / 2) * canvas.clientHeight - dt * 0.012}px)`;
    el.style.opacity = dt > 1300 ? String(1 - (dt - 1300) / 400) : '1';
    requestAnimationFrame(f);
  };
  f();
};
H.show = ({ id }) => { const r = game.place.people[id]; const o = r?.root || game.place.things[id]?.obj; if (o) o.visible = true; if (r?.blob) r.blob.visible = true; flags['shown_' + id] = true; };
H.hide = ({ id }) => { const r = game.place.people[id]; const o = r?.root || game.place.things[id]?.obj; if (o) o.visible = false; if (r?.blob) r.blob.visible = false; flags['shown_' + id] = false; };
// the lift's floor indicator: counts one floor at a time to the target
const FLOORS = ['B2', 'B1', '1', '2', '3', '4', '5'];
H.floor = async ({ to }) => {
  let i = FLOORS.indexOf(game.liftFloor || '1'); const j = FLOORS.indexOf(String(to));
  if (j < 0) return;
  const dir = j < i ? 'down' : 'up';
  ui.lift(FLOORS[i], dir);
  while (i !== j) { await game.wait(750); i += j > i ? 1 : -1; game.liftFloor = FLOORS[i]; ui.lift(FLOORS[i], dir); }
  sfx('lift');
};
H.liftDoors = ({ state }) => { sfx(state === 'open' ? 'lift' : 'door'); };
// ---------- small staged moves (bow, gestures, props), so beats are shown instead of narrated ----------
const tweens = [];
game.tween = (dur, fn) => new Promise((res) => tweens.push({ t: 0, dur, fn, res }));
function stepTweens(dt) { for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(k); if (k >= 1) { tweens.splice(i, 1); w.res(); } } }
game.stepTweens = stepTweens;
const bell = (k) => Math.sin(Math.PI * Math.min(1, k)) ** 0.7;   // 0 -> 1 -> 0, holding at the top
function whoRig(who) { return isPlayer(who) ? game.player : rigOf(who); }
H.bow = async ({ who, depth = 'small' }) => {
  const r = whoRig(who); if (!r) return;
  const d = depth === 'deep' ? 1 : 0.5, dur = depth === 'deep' ? 1.6 : 1.1;
  if (r.pose) { await game.tween(dur, (k) => { r.pose.bow = bell(k) * d; }); r.pose.bow = 0; return; }
  if (r.torso) { const x0 = r.torso.rotation.x; await game.tween(dur, (k) => { r.torso.rotation.x = x0 + bell(k) * d * 0.9; r.head.rotation.x = bell(k) * d * 0.3; }); r.torso.rotation.x = x0; }
};
H.gesture = async ({ who, kind }) => {
  const r = whoRig(who); if (!r || !r.arms) return;
  const save = r.arms.map((a) => a.rotation.clone()), hy = r.hips.position.y, legs = r.legs.map((l) => l.rotation.x), knees = r.knees.map((q) => q.rotation.x);
  if (kind === 'nine') {
    H.emote({ who, kind: '9' });
    await game.tween(1.6, (k) => { const b = bell(k); r.arms[0].rotation.set(-2.7 * b + save[0].x * (1 - b), 0, 0.35 * b); r.arms[1].rotation.set(-2.7 * b + save[1].x * (1 - b), 0, -0.35 * b); });
  } else if (kind === 'point') {
    await game.tween(1.2, (k) => { r.arms[1].rotation.x = save[1].x + (-1.5 - save[1].x) * bell(k); });
  } else if (kind === 'skijump') {
    // crouch with arms back, slide, then spring up with arms forward, and land
    await game.tween(2.6, (k) => {
      const crouch = k < 0.55 ? Math.sin((k / 0.55) * Math.PI / 2) : Math.max(0, 1 - (k - 0.55) / 0.12);
      const air = k > 0.58 && k < 0.85 ? Math.sin(((k - 0.58) / 0.27) * Math.PI) : 0;
      for (const l of r.legs) l.rotation.x = -0.6 * crouch; for (const q of r.knees) q.rotation.x = 1.1 * crouch;
      r.hips.position.y = hy - 0.07 * crouch + 0.12 * air;
      r.torso.rotation.x = 0.5 * crouch + 0.3 * air;
      for (const a of r.arms) a.rotation.x = crouch > 0.1 && air === 0 && k < 0.6 ? 0.7 * crouch : -1.3 * air;
    });
    r.hips.position.y = hy; r.torso.rotation.x = 0; r.legs.forEach((l, i) => { l.rotation.x = legs[i]; }); r.knees.forEach((q, i) => { q.rotation.x = knees[i]; });
  } else if (kind === 'shrug') {
    await game.tween(1.0, (k) => { const b = bell(k); r.arms[0].rotation.z = save[0].z + 0.5 * b; r.arms[1].rotation.z = save[1].z - 0.5 * b; r.torso.position.y = 0.02 + 0.02 * b; });
  } else if (kind === 'finger') {
    await game.tween(1.4, (k) => { r.arms[1].rotation.set(save[1].x + (-2.0 - save[1].x) * bell(k), 0, save[1].z + 0.3 * bell(k)); });
  }
  r.arms.forEach((a, i) => a.rotation.copy(save[i]));
};
// Mio's headphones: on (both cups on), half (one cup off), neck (round her neck)
H.headphones = ({ who = 'mio', state = 'on' }) => { const r = whoRig(who); if (r && r.setHeadphones) r.setHeadphones(state); };
// typing prompt: Eric types the romaji of a new word, then says it (voiced) and knows it
H.type = async ({ word, prompt, from }) => {
  if (from && game.sim && !game.sim.taught[word]) game.sim.taught[word] = from;
  if (!WORDS[word]) { console.warn('type: unknown word', word); return; }
  let pr = prompt;
  if (prompt) { const i = prompt.indexOf(': '); if (i > 0 && /^\w+$/.test(prompt.slice(0, i))) pr = { who: game.runner.speaker(prompt.slice(0, i)), text: prompt.slice(i + 2) }; else pr = { who: null, text: prompt.replace(/^>\s*/, '') }; }
  await ui.typePrompt(word, pr);
  voice(WORDS[word].voice || '');
  game.runner.learnCmd(word);
  flags['typed_' + word] = true;
  await game.wait(500);
};
H.period = ({ to }) => setPeriod(to, game);
H.bond = ({ who, add = 1 }) => { bond(game, who, add); };
H.meet = ({ who }) => { meet(game, who); ui.refreshPeople(sim.met.size); };
H.buy = ({ item }) => { if (buy(game, item)) flags['bought_' + item] = true; else flags['cant_buy'] = true; };
H.take = ({ item }) => take(item);
H.save = () => save(game);
H.next = () => { game.after = () => travel(NEXT[game.place.name]); };
H.end = () => { game.after = async () => { await game.wait(500); showEnd(game); }; };

// ---------- entering places ----------
async function prepare(name) {
  if (!game.prepared[name]) game.prepared[name] = (async () => {
    const story = await game.runner.load(name);
    const place = await PLACES[name](game, story);
    place.name = name;
    return { place, story };
  })();
  return game.prepared[name];
}
async function enter(name) {
  const { place, story } = await prepare(name);
  if (game.place && game.place.leave) game.place.leave();
  game.place = place; game.story = story;
  game.runner.use(place, story);
  place.space.add(game.player.root);
  place.space.add(game.mioNpc.root); game.mioNpc.root.visible = false; game.mioNpc.root.scale.setScalar(place.charScale || 1); game.mioNpc.setState('idle');
  place.people.mio = game.mioNpc;
  const mr = game.mioNpc.root;
  place.things.mio = place.things.mio || { label: 'Mio', kind: 'person', anchor: (v) => { mr.getWorldPosition(v); v.y += 1.12 * (place.charScale || 1); return v; },
    spot: () => { const r = mr.rotation.y; return [mr.position.x + Math.sin(r) * 0.6, mr.position.z + Math.cos(r) * 0.6]; }, face: () => [mr.position.x, mr.position.z], enabled: () => mr.visible };
  game.mioNpc.seated = false; game.mioNpc.root.position.y = 0;
  if (place.spots.mio_start) game.mioNpc.root.position.set(place.spots.mio_start[0], 0, place.spots.mio_start[1]);
  place.placeMio?.(game.mioNpc);
  game.player.root.scale.setScalar(place.charScale || 1);
  game.player.seated = false; game.player.scripted = false; game.player.setState('idle'); game.player.root.visible = true;
  game.walker = new Walker(game.player.root, place.nav, { speed: 1.45 });
  game.walker.facing = place.startFacing ?? Math.PI;
  game.player.root.rotation.y = game.walker.facing;
  const [sx, sz] = place.start;
  game.player.root.position.set(sx, place.floorY ?? 0, sz);
  setComposer(place);
  resize();
  place.cam?.snap?.(game.player.root.position);
  absorb(story);
  if (place.defaultPeriod && PERIOD_ORDER.indexOf(sim.period) < PERIOD_ORDER.indexOf(place.defaultPeriod)) sim.period = place.defaultPeriod;
  applySchedule(game, { instant: true });
  ui.clock(sim.date, { commute: 'Morning commute', morning: 'Morning at work', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'After work' }[sim.period]);
  buildMarkers(place);
  ui.goal('');
  save(game);
  nearSet.clear(); zoneSet.clear();
  return place;
}

// The trip between places: the old place plays its leaving move while the next one is ready (it was built
// in the background), then a soft crossfade from the last frame into the next place, where its arriving
// move plays. No black screens.
async function travel(name) {
  const from = game.place;
  game.busy = true; game.walker.locked = true; document.body.classList.add('busy', 'trip');
  const ready = prepare(name);
  const tr = await game.runner.load('transitions');
  const slot = (tr && tr[`${from.name}_to_${name}`]) || {};
  await trips.leave(game, from, slot);
  await ready;
  const snap = snapshot();
  await enter(name);
  crossfade(snap);
  await trips.arrive(game, game.place, slot);
  document.body.classList.remove('busy', 'trip');
  game.busy = false; game.walker.locked = false;
  game.player.scripted = false;
  if (NEXT[name]) setTimeout(() => prepare(NEXT[name]), 1500);
  if (game.runner.has('event:start')) game.runner.trigger('event:start');
  else if (game.story.start) game.beat(() => game.runner.run(game.story.start));
}
game.travel = travel;
function snapshot() {
  render();
  try { return canvas.toDataURL('image/jpeg', 0.9); } catch { return null; }
}
function crossfade(url) {
  if (!url) return;
  const img = document.getElementById('xfade');
  img.src = url; img.classList.remove('go'); img.style.opacity = '1'; img.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => { img.classList.add('go'); img.style.opacity = '0'; setTimeout(() => { img.hidden = true; }, 1300); }));
}

// ---------- loop ----------
let lastT = performance.now();
let frames = 0;
const nearSet = new Set(), zoneSet = new Set();
function frame() {
  const now = performance.now(); let dt = Math.min(0.1, (now - lastT) / 1000) * TS; lastT = now;
  if (!CAP || window.__run) while (dt > 1e-4) { const s = Math.min(0.05, dt); step(s); dt -= s; }
  render();
  frames++;
  if (frames > 3 && game.place) window.__done = true;
  requestAnimationFrame(frame);
}
function step(dt) {
  game.t += dt;
  const place = game.place; if (!place) return;
  const mio = game.player;
  let moving = false;
  if (game.walker && !mio.seated && !mio.scripted) moving = game.walker.update(dt, place.camera);
  if (!mio.seated && !mio.scripted) mio.setState(moving ? 'walk' : 'idle');
  mio.update(dt, 1.25);
  if (game.mioNpc.root.visible) game.mioNpc.update(dt, 1.25);
  stepTweens(dt);
  place.update(dt, game.t);
  place.cam?.update?.(dt, mio.root.position);
  // nearest usable thing, the Say target, and near/zone triggers
  let near = null, nd = 0.95, st = null, sd = 2.2;
  const seatedReach = game.player.seated ? 1.6 : 0;
  const mp = mio.root.position;
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    const s = m.spot ? m.spot() : null; if (!s) continue;
    const d = Math.hypot(mp.x - s[0], mp.z - s[1]);
    if (!game.busy && d < nd + seatedReach) { nd = d - seatedReach; near = m; }
    const bias = (m.goal && m.goal() ? -1.2 : 0) + (/person/.test(m.kind || '') ? -0.7 : 0);
    if (!game.busy && known.size && d + bias < sd) { sd = d + bias; st = m; }
    if (d < 0.9) { if (!nearSet.has(m.id)) { nearSet.add(m.id); if (!game.busy) game.runner.trigger('near:' + m.id); } }
    else if (d > 1.3) nearSet.delete(m.id);
  }
  for (const [z, fn] of Object.entries(place.zones || {})) {
    const inz = fn(mp.x, mp.z);
    if (inz && !zoneSet.has(z)) { zoneSet.add(z); if (!game.busy) game.runner.trigger('zone:' + z); }
    else if (!inz) zoneSet.delete(z);
  }
  game.near = near; game.sayTarget = st;
  // when a goal is waiting on a word he knows, the Say button lights up
  const waiting = !game.busy && known.size && game.markers.list.some((m) => m.enabled() && m.goal() && SAYABLE.some((w) => known.has(w) && game.runner.has(`say:${w}:${m.id}`)));
  ui.sayReady(waiting);
  ui.setSayTarget(st ? st.label : '');
  const person = st && place.people[st.id] && /person/.test(st.kind || '');
  ui.setGiveTarget(person ? st.label : '', !!(person && sim.inv.length && !game.busy));
  stepAmbient(game);
  game.markers.update(place.camera, canvas, mp, near);
  if (ring && ring.visible) { ring.userData.t += dt; ring.scale.setScalar(1 + ring.userData.t * 2); ring.material.opacity = Math.max(0, 0.7 - ring.userData.t * 1.6); if (ring.userData.t > 0.5) ring.visible = false; }
}
function render() {
  if (!composer || !game.place) return;
  game.place.beforeRender?.();
  renderer.shadowMap.needsUpdate = true;
  composer.render();
}
game.step = step;

// ---------- boot ----------
async function boot() {
  game.runner = new Runner(game);
  if (Q.has('slift')) setSitLift(+Q.get('slift'));
  // Eric: Jørgen's Meshy model; the code-built chibi is the fallback (?eric=chibi, or if loading fails)
  game.player = Q.get('eric') === 'chibi' ? makeAvatar() : await loadEric().catch((e) => { console.warn('Meshy Eric failed, using the chibi', e); return makeAvatar(); });
  game.player.root.add(blob(0.55, 0.4));
  // Mio is an NPC now: Jørgen's Meshy model, colour-tweaked only, shown wherever the story puts her
  game.mioNpc = await loadMio({ height: 1.12 });
  game.mioNpc.meshy = true; game.mioNpc.root.visible = false;
  addHeadphones(game.mioNpc);
  game.mioNpc.blob = blob(0.55, 0.4); game.mioNpc.root.add(game.mioNpc.blob);
  requestAnimationFrame(frame);
  const start = Q.get('place') || 'train';
  await enter(start);
  if (CAP) {
    if (Q.has('mx')) game.player.root.position.set(+Q.get('mx'), game.player.root.position.y, +Q.get('mz'));
    if (Q.has('face')) { game.walker.facing = +Q.get('face'); game.player.root.rotation.y = +Q.get('face'); }
    game.place.cam?.snap?.(game.player.root.position);
    if (Q.has('st')) await game.place.capState?.(Q.get('st'));
    // ?advance=N runs the world for N/30 s so moving things (commuters) are in the shot
    for (let i = 0; i < +(Q.get('advance') || 0); i++) { game.place.update(1 / 30, game.t += 1 / 30); }
    for (let i = 0; i < 30; i++) step(1 / 60);
    return;
  }
  if (TEST) { const t = await import('./testmode.js'); t.start(game); }
  if (start === 'train' && !Q.has('skip') && !TEST) {
    const saved = loadSave();
    const pick = await title(saved);
    if (pick === 'continue' && saved) {
      restore(game, saved); ui.refreshWords(); ui.refreshPeople(sim.met.size); ui.refreshBag(sim);
      if (saved.place && saved.place !== 'train') { await enter(saved.place); game.place.tripIn && (await game.place.tripIn(game, {})); }
    } else clearSave();
  }
  await game.place.onEnter?.();
  if (game.runner.has('event:start')) game.runner.trigger('event:start');
  else if (game.story.start) game.beat(() => game.runner.run(game.story.start));
  if (NEXT[start]) setTimeout(() => prepare(NEXT[start]), 1500);
}

// Mio's teal headphones (her approved design has them), placed from her head bone every frame
function addHeadphones(a) {
  let head = null; a.model.traverse((o) => { if (!head && o.isBone && /head$/i.test(o.name.replace(/[^a-z]/gi, ''))) head = o; });
  const g = new THREE.Group(); a.root.add(g);
  const teal = new THREE.MeshStandardMaterial({ color: '#20a081', roughness: 0.6 }), dark = new THREE.MeshStandardMaterial({ color: '#1f2a30', roughness: 0.7 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 20, Math.PI), dark); g.add(band);
  const cups = [-1, 1].map((s) => { const c = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14), teal); m.rotation.z = Math.PI / 2; c.add(m); c.position.x = s; g.add(c); return c; });
  for (const o of [band, ...cups]) o.traverse((q) => { if (q.isMesh) q.castShadow = true; });
  let state = 'neck';
  const v = new THREE.Vector3(), top = new THREE.Vector3();
  a.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.model); top.copy(box.max); a.root.worldToLocal(top);
  a.setHeadphones = (s) => { state = s; };
  const up = a.update;
  a.update = (dt, sp) => {
    up(dt, sp);
    head.getWorldPosition(v); a.root.worldToLocal(v);
    const r = Math.max(0.12, (top.y - v.y) * 0.55);
    g.scale.setScalar(r);
    if (state === 'neck') { g.position.set(v.x, v.y - r * 1.35, v.z - r * 0.1); g.rotation.set(Math.PI / 2 - 0.3, 0, 0); cups[0].rotation.x = cups[1].rotation.x = 0; }
    else { g.position.set(v.x, v.y + r * 0.1, v.z - r * 0.05); g.rotation.set(0, 0, 0); cups[0].position.set(-1.02, 0, 0); cups[1].position.set(1.02, state === 'half' ? 0.55 : 0, state === 'half' ? -0.35 : 0); }
  };
}

async function title(saved) {
  const t = document.getElementById('title');
  t.hidden = false;
  const cont = t.querySelector('.cont');
  cont.hidden = !(saved && saved.place);
  const pick = await new Promise((res) => {
    t.querySelector('.go').addEventListener('click', () => res('new'), { once: true });
    cont.addEventListener('click', () => res('continue'), { once: true });
  });
  unlockAudio(); sfx('tap');
  t.classList.add('out');
  setTimeout(() => { t.hidden = true; }, 700);
  return pick;
}

boot().catch((e) => { console.error(e); document.getElementById('ui').insertAdjacentHTML('beforeend', `<div class="err">Couldn't start: ${e.message}</div>`); });
