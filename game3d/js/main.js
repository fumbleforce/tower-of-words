import { flagKeys } from './narrative/engine-flags.js';
import { GLOBAL_HOOKS } from './narrative/hooks.js';
import { eventTrigger } from './narrative/events.js';
import { giveItem } from './gameplay/gifts.js';
const ENGINE_KEYS = flagKeys('game3d/js/main.js');
import { PLACE_FILES, NEXT } from './places/definitions.js';
import { assertRegistered, assertPlaceRegistered } from './narrative/registration.js';
import { PLACE_DETAILS, SHARED_THINGS } from './places/catalog.js';
import { beginSavedWalk, cancelSavedWalk } from './places/saved-people.js';
import { needsLegacyOpening } from './narrative/legacy-opening.js';
// Day one: train, lobby, office. One renderer, one Mio, three places joined by continuous trips.
import * as THREE from 'three';
import { createRenderer, Walker, Markers, Q, blob } from './engine.js';
import { makePost } from './post.js';
import { attachLift } from './places/lift.js';
import { applyLook } from './look/index.js';
import { needsPractice } from './mastery.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { SmoothWalker, walkRig, faceRig, approachSpot, pickPerson, standOut, bodies, softSeparate } from './move.js';
import * as ambience from './ambience.js';
import { setPlace as sfxPlace } from './sfx.js';
import { learned } from './feel.js';
import { loadMio } from './mio.js';
import { makeAvatar, loadEric, setSitLift } from './avatar.js';
import { glide } from './places/lobby.js';
export const isPlayer = (id) => id === 'eric' || id === 'player';
import { ui, unlockAudio, sfx, stopSfx, voice, voiceThenBeat, setFace, faceForEmote, playMusic } from './ui.js';
// background loop per place (audio/music); after work it switches to the night loop
const MUSIC = { train: 'calm', gate: 'lively', office: 'office' };
import { WORDS, known, SAYABLE } from './lang.js';
import { defaultReaction } from './story.js';
import { Runner, flags, cond } from './runner.js';
import { trainPlace } from './places/train.js';
import { lobbyPlace } from './places/lobby.js';
import { officePlace } from './places/office.js';
import { showEnd } from './end.js';
import * as trips from './trips.js';
import { installSim, PERIODS as PERIOD_ORDER, sim, ITEMS, setPeriod, applySchedule, stepAmbient, bond, meet, noteTeacher, absorb, buy, take, peopleHTML, save, loadSave, restore, clearSave } from './sim.js';

const CAP = Q.has('cap');
const TEST = Q.get('test') === 'fast';
const TS = TEST ? +(Q.get('ts') || 8) : 1;   // test mode: everything runs this many times faster
const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
// quality tier 0 low, 1 medium, 2 high (post.js). ?q= forces it; otherwise Settings > Graphics (window.__qualityTier)
const TIER = { low: 0, medium: 1, high: 2 };
const tierNow = () => (Q.has('q') ? +Q.get('q') : window.__qualityTier ? TIER[window.__qualityTier()] ?? 1 : (renderer.userData.software ? 0 : 2));
let quality = tierNow();
ui.build();
if (CAP) document.body.classList.add('cap');

const PLACES = { train: trainPlace, gate: lobbyPlace, office: officePlace };
assertRegistered(Object.keys(PLACE_FILES), PLACES, 'place factories');

// ---------- shared game state ----------
export const game = {
  renderer, ui, mio: null, walker: null, place: null, markers: new Markers(document.getElementById('marks')),
  t: 0, busy: false, saveEnabled: false, near: null, sayTarget: null, found: new Set(), after: null, hooks: {},
  runner: null, story: null, prepared: {}, queue: [], timeScale: TS, test: TEST,
  async beat(fn) {
    if (this.busy || this.runner?.recoveryError) return;
    this.busy = true; this.walker.locked = true; this.walker.stop(); document.body.classList.add('busy'); ui.closeSayMenu?.();
    try { await fn(); } catch (e) { console.error(e); } finally {
      ui.closeTalk(); this.setHurry?.(false); this.busy = !!this.runner?.recoveryError;
      if (this.walker) this.walker.locked = this.busy;
      document.body.classList.toggle('busy', this.busy);
    }
    if (this.runner?.recoveryError) return;
    if (this.after) { const a = this.after; this.after = null; await a(); return; }
    if (this.queue.length) { const q = this.queue.shift(); this.beat(q); }
  },
  // waits hold while the game is paused (the pause menu sets game.paused)
  wait(ms) { return new Promise((r) => { let left = ms / TS, last = performance.now(); const tick = () => { const now = performance.now(); if (!game.paused) left -= (now - last) * (game.hurry ? HURRY : 1); last = now; if (left <= 0) r(); else setTimeout(tick, Math.min(50, left)); }; setTimeout(tick, Math.min(50, left)); }); },
  // a scripted walk; resolves on arrival, or if the walk is dropped or stalls (a stop, a blocked path), so a scene
  // can never hang on it
  walkTo(x, z) {
    if (this.player.seated) { this.player.seated = false; this.player.setState('idle'); this.player.root.position.y = 0; }
    return new Promise((res) => {
      const w = this.walker, was = w.locked; w.locked = false;
      let done = false, still = 0, watch = null; const p = this.player.root.position, last = p.clone();
      const finish = () => { if (done) return; done = true; clearInterval(watch); w.locked = was; res(); };
      // watch is declared before goTo: goTo calls finish at once when there is no path (already there)
      w.goTo(x, z, finish);
      if (done) return;
      watch = setInterval(() => {
        if (this.paused) return;
        if (p.distanceTo(last) < 0.002) still++; else still = 0;
        last.copy(p);
        if (!w.path || still > 12) { if (w.path && still > 12) w.stop(); finish(); }
      }, 250);
    });
  },
  event(name) { if (this.runner) this.runner.trigger('event:' + name); },
  mioSays(id) { this.place.onMioSays?.(id); },
};
window.__game = game;
game.flagsRef = flags;
game.onRecoveryError = message => {
  game.saveEnabled = false;
  game.paused = true;
  const notice = document.createElement('dialog');
  notice.className = 'save-recovery';
  notice.setAttribute('role', 'alertdialog');
  notice.setAttribute('aria-label', 'Unable to resume scene');
  notice.textContent = `${message} Your last save is preserved. `;
  const back = document.createElement('button');
  back.textContent = 'Return to title';
  back.addEventListener('click', () => location.reload());
  notice.append(back);
  notice.addEventListener('cancel', event => event.preventDefault());
  document.body.append(notice);
  notice.showModal();
};
// Clicking while a scene plays out (a walk, a door, a gesture) with no line waiting fast-forwards it to the next line
// (Jørgen: clicks that did nothing were frustrating). runner clears it when a line, choice or prompt shows.
const HURRY = 6;
game.hurry = false;
game.setHurry = (on) => { game.hurry = on; game.timeScale = TS * (on ? HURRY : 1); document.body.classList.toggle('hurry', on); };
function hurryIfWaiting() { if (game.busy && !ui._advance && !ui._chipKeys && !document.querySelector('#talk.typing:not([hidden])') && ui.menuClosed?.() !== false) game.setHurry(true); }
window.addEventListener('pointerdown', (e) => { if (e.target.closest('#talk, .panel, #menu, button')) { if (!e.target.closest('#talk')) return; } hurryIfWaiting(); }, true);
window.addEventListener('keydown', (e) => { if (['Space', 'Enter', 'KeyE'].includes(e.code)) hurryIfWaiting(); }, true);

// ---------- rendering ----------
let composer = null, post = null;
let outline = null;
function setComposer(place) {
  post = makePost(renderer, place, quality); composer = post.composer;
  // a soft outline on the current target and on what the mouse is over (Jørgen: interactive things should be
  // highlighted slightly); right after the render pass, off at low quality
  const [w, h] = size();
  outline = new OutlinePass(new THREE.Vector2(w, h), place.scene, place.camera);
  // hidden edges black (the pass adds them): no outline showing through walls (QA round 1)
  outline.visibleEdgeColor.set('#bff1ea'); outline.hiddenEdgeColor.set('#000000');
  outline.edgeStrength = 5.0; outline.edgeThickness = 1.0;   // was 2.2: too faint to see on hover (Jørgen: "i want the MODEL ITSELF to get an outline") outline.edgeGlow = 0; outline.pulsePeriod = 0;
  // after the place's beforeAO pass: the train's shadow proxy (a roof) hides there, and seen by the outline's depth
  // mask it made every target count as behind a wall, so the train showed no outline at all
  composer.insertPass(outline, place.beforeAO ? 2 : 1);
  applyQuality();
}
function applyQuality() {
  const dpr = Math.min(window.devicePixelRatio || 1, Q.has('dpr') ? +Q.get('dpr') : 2, post ? post.dpr(quality) : 2);
  renderer.setPixelRatio(dpr);
  if (post) post.setQuality(quality);
  if (outline) outline.enabled = quality > 0;
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
// the 3D objects that stand for a marker (people's bodies, a thing's obj or outline())
function objsOf(m) {
  const P = game.place; if (!P || !m) return [];
  const r = P.people && P.people[m.id]; if (r && r.root && r.root.visible) return [r.root];
  const t = P.things && P.things[m.id];
  if (t && t.outline) return [].concat(t.outline()).filter(Boolean);
  if (t && t.obj) return [t.obj];
  if (t && t.anchor && !/person/.test(t.kind || '')) return meshesNear(m.id, t);
  return [];
}
// a thing with no obj of its own: the small meshes around its anchor (cached per place and thing), so outlines and
// the kotodama shimmer land on the copier, the kettle, the vending machine... (QA round 1: no visible payoff)
const nearCache = new Map();
function meshesNear(id, t) {
  const P = game.place, key = P.name + ':' + id;
  if (nearCache.has(key)) return nearCache.get(key);
  const a = t.anchor(new THREE.Vector3()), box = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3(), out = [];
  P.space.updateMatrixWorld(true);
  P.space.traverse((o) => {
    if (!o.isMesh || !o.visible || o.isSkinnedMesh) return;
    box.setFromObject(o); box.getCenter(c); box.getSize(sz);
    if (sz.x > 1.6 || sz.z > 1.6 || sz.y > 2.2) return;                 // walls, floors, counters
    if (Math.hypot(c.x - a.x, c.z - a.z) < 0.55 && c.y < a.y + 0.3) out.push(o);
  });
  nearCache.set(key, out); return out;
}
game.objsOf = objsOf;
const hoverRay = new THREE.Raycaster();
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || !game.place || document.body.classList.contains('phone')) return;
  if (titleUp()) { game.hover = null; canvas.style.cursor = ''; return; }
  const r = canvas.getBoundingClientRect();
  hoverRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), game.place.camera);
  const best = modelAt(hoverRay);
  if (game.hover !== best) { if (game.hover && game.hover.el) game.hover.el.classList.remove('hover'); if (best && best.el) best.el.classList.add('hover'); }
  game.hover = best; canvas.style.cursor = best ? 'pointer' : '';
});
// the usable thing whose model is under the ray: the nearest hit wins, so the cat on the seat beats the seat, the
// floor and whoever stands behind it (Jørgen: "I end up sitting on the cat"). Hover and click both use this.
function modelAt(ray) {
  let best = null, bd = 1e9;
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    for (const o of objsOf(m)) { const hit = ray.intersectObject(o, true)[0]; if (hit && hit.distance < bd) { bd = hit.distance; best = m; } }
  }
  return best;
}
let outlineKey = '';
// the title screen is up (no outline, no hover)
const titleUp = () => { const t = document.getElementById('title'); return !!(t && !t.hidden && t.offsetParent !== null); };
function updateOutline() {
  if (!outline || !outline.enabled) return;
  if (titleUp()) { if (outlineKey !== 'title') { outlineKey = 'title'; outline.selectedObjects = []; } return; }
  const sel = [...new Set([game.near, !document.body.classList.contains('phone') && game.hover].filter(Boolean))];
  const key = sel.map((m) => m.id).join(',') + (game.busy ? '|b' : '');
  if (key === outlineKey) return; outlineKey = key;
  outline.selectedObjects = game.busy ? [] : sel.flatMap(objsOf);
}
// a tap while a scene plays out with no line waiting: hurry it along (ui.js calls this)
game.skip = () => { if (game.busy) game.setHurry(true); };
game.setQuality = (q) => { quality = q; applyQuality(); };
window.addEventListener('amakawa:settings', (e) => { if (e.detail && e.detail.key === 'quality' && !Q.has('q')) { quality = tierNow(); applyQuality(); } });

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
    // noMarker things (door_l, the plant...) stay unmarked, except while the story makes one of them the goal
    // (the train's "Wait by the doors" goal was on door_l and had no marker: a softlock)
    const quiet = !!t.noMarker;
    const L = labels[id];
    const item = { ...t, id, label: Array.isArray(L) ? L[0] : (L || t.label), labelIf: Array.isArray(L) ? { text: L[0], cond: L[1], other: t.label } : null, labelCond: cond, enabled: () => thingOn(id, t), goal: () => { const g = game.story && game.story.goal && game.story.goal[id]; return g !== undefined ? cond(g) : false; },
      // a thing that a word he knows does something to right now
      // (cached for a moment: it is asked every frame)
      wordable: () => { const now = performance.now(); if (!item._wa || now - item._wa > 400) { item._wa = now; item._wv = !/person/.test(t.kind || '') && SAYABLE.some((w) => known.has(w) && game.runner.has(`say:${w}:${id}`)); } return item._wv; } };
    if (quiet) item.enabled = () => thingOn(id, t) && item.goal();
    game.markers.add(item);
  }
}
game.use = (item) => use(item);
// get Eric out of his seat (a tap on the floor or on something out of reach does this)
function standUp() {
  const pl = game.player; if (!pl.seated) return;
  if (game.place.standPerson) game.place.standPerson('eric'); else { pl.seated = false; pl.setState('idle'); pl.root.position.y = 0; }
  pl.seated = false; pl.setState('idle');
}
game.standUp = standUp;
// a story hold ({ do: 'hold', who: 'mori' }): he stays with that person until the story lets go. Walking and taps on
// anything else do nothing but get a small bow from them; that person and the Say menu still work. Only once he knows
// a word that person answers to, so a hold can never shut him in (Jørgen: left Mori standing and got stuck in the office)
function held() { const h = game.hold; return !!(h && !game.busy && game.place && game.place.people[h] && SAYABLE.some((w) => known.has(w) && game.runner.has(`say:${w}:${h}`))); }
function holdNudge() {
  if (game._holdBow) return;
  game._holdBow = true; game.walker.stop();
  Promise.resolve(H.bow({ who: game.hold })).finally(() => { game._holdBow = false; });
}
function use(item) {
  if (!item || game.busy) return;
  if (held() && item.id !== game.hold) { holdNudge(); return; }
  const go = () => { if (game.busy) return; if (item.face) game.walker.faceTo(...item.face()); talk(item); };
  const sp = approachSpot(game, item) || (item.spot ? item.spot() : null);
  // seated: he talks from his seat to what's within reach; for anything further he stands up and walks over
  if (game.player.seated) {
    const p = game.player.root.position, a = item.anchor(new THREE.Vector3()); game.place.space.worldToLocal(a);
    if (Math.hypot(p.x - a.x, p.z - a.z) < 1.3) { go(); return; }
    standUp();
  }
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
  // one Say at a time: no reopening while the last word's reaction is still coming (QA round 1: menu under the dialogue, the cat line twice)
  if (game.busy || !SAYABLE.some((w) => known.has(w)) || game.saying) return;
  const target = game.sayTarget;
  const id = await ui.sayMenu(target ? target.label : null);
  if (!id) return;
  await sayWord(id, target);
}
// saying a chosen word to a target, as the Say menu does (the fast test drives words through this too)
async function sayWord(id, target) {
  game.saying = true;
  try { return await sayWord0(id, target); } finally { game.saying = false; }
}
async function sayWord0(id, target) {
  // until a word has been typed or said a few times, Say asks for it again (Jørgen: not just clicking it)
  if (needsPractice(id)) { const ok = await ui.typePrompt(id, { who: null, text: target ? `Say it to ${sayName(target)}.` : 'Say it.' }, { cancel: true }); ui.closeTalk(); if (!ok) return; }
  const key = target ? `say:${id}:${target.id}` : null;
  if (target && target.face) game.walker.faceTo(...target.face());
  const spoken = voice(WORDS[id].voice);
  game.mioSays(id);
  // Eric finishes his word before anyone answers
  await voiceThenBeat(spoken, 300);
  if (key && game.runner.has(key)) { game.found.add(key); game.runner.trigger(key); return; }
  if (game.runner.has(`say:${id}:*`)) { game.runner.trigger(`say:${id}:*`); return; }
  game.beat(async () => {
    if (target) await ui.say(null, defaultReaction(target, id));
    else await ui.say(null, `You say ${WORDS[id].ja} to nobody in particular. Nobody in particular does anything.`);
  });
}
// "Say it to Mio.", "Say it to the sleeping man.", "Say it to the machine room."
function sayName(t) { const l = t.label || ''; return /^(Mr|Ms|Mrs)\.? |^[A-Z][a-z]+$/.test(l) && /person/.test(t.kind || '') ? l : 'the ' + l.charAt(0).toLowerCase() + l.slice(1); }
ui.onSay = say;
game.sayWord = sayWord;
ui.peopleHTML = peopleHTML; ui.items = ITEMS;
async function give() {
  if (game.busy || !sim.inv.length || !game.sayTarget) return;
  const target = game.sayTarget;
  const item = await ui.giveMenu(target.label, sim.inv, ITEMS);
  if (!item) return;
  // a refusal (keep: true on the trigger entry, e.g. a second gift) runs its lines but leaves the item in the bag
  if (giveItem({ runner: game.runner, flags, take }, item, target.id)) return;
  game.beat(() => ui.say(null, `${target.label} doesn't seem to want the ${ITEMS[item].name.toLowerCase()}. You keep it.`));
}
ui.onGive = give;
game.sim = sim;
// a small moment when a bond steps up (sim.js fires amakawa:bondstep); meeting someone (0 to 1) stays quiet
window.addEventListener('amakawa:bondstep', (e) => { const d = e.detail || {}; if (!d.to || d.to <= 1 || d.to < d.from) return; const nm = (sim.people[d.who] && sim.people[d.who].name) || d.who; ui.toast?.(`${nm}: ${d.name || 'closer'}`, 3000); sfx('word'); });
game.learned = (kind) => learned(game, kind);

// ---------- input ----------
const raycaster = new THREE.Raycaster();
function ndc(e) { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (game.busy || !game.place) return;
  // what the cursor is visibly on first (the model itself), then the looser person and marker picks around it
  raycaster.setFromCamera(ndc(e), game.place.camera);
  const hitM = modelAt(raycaster); if (hitM) { use(hitM); return; }
  const who = pickPerson(game, e.clientX, e.clientY, canvas); if (who) { use(who); return; }
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
  if (held()) { holdNudge(); return; }
  if (p) standUp();
  game.walker.tapRay(raycaster, game.place);
});
document.getElementById('marks').addEventListener('click', (e) => {
  const b = e.target.closest('.mark'); if (!b) return;
  const m = game.markers.list.find((x) => x.el === b); if (m) use(m);
});
window.addEventListener('keydown', (e) => {
  if (!game.walker) return;
  if (/^(Arrow|Key[WASD])/.test(e.code)) { if (!game.busy) standUp(); game.walker.keys.add(e.code); e.preventDefault(); unlockAudio(); }
  if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !game.busy && game.near && !ui.talking && ui.menuClosed()) { e.preventDefault(); use(game.near); }
  if (e.code === 'KeyF' && !ui.talking && !game.busy && ui.menuClosed()) say();
});
window.addEventListener('keyup', (e) => game.walker && game.walker.keys.delete(e.code));
window.addEventListener('blur', () => game.walker && game.walker.keys.clear());


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
// { do: 'goal', text } sets the main goal; { do: 'goal', text, side: true } a side goal under it ('' clears either)
H.goal = ({ text, side }) => (side ? ui.sideGoal(text) : ui.goal(text));
H.hint = ({ text, what }) => { if (what === 'say') ui.introSay(text); else ui.hint(text, 5000); };
H.wait = ({ ms }) => game.wait(ms);
H.hold = ({ who }) => { game.hold = who || null; };
H.sound = ({ name }) => sfx(name);

// ---------- kotodama: the look of a word taking hold ----------
// One reusable effect for every command that works: the closing chime (or any cuttable sound) stops mid-note,
// a faint cold shimmer runs along the edges of whatever the word caught, the lights dip and hum for a moment,
// and a low tone swells. The thing itself is frozen by whoever calls this (the place's hook).
// targets: Object3Ds whose meshes get the shimmer. Resolves when the effect has settled (about 2.6 s).
game.kotodama = async (targets = [], { cut = ['chime'], focus, zoom = 1.25, pulse = targets } = {}) => {
  for (const k of cut) stopSfx(k);
  // clear the view: the text box and portraits sit over the bottom of the screen, where things like the doors are
  ui.closeTalk();
  const cam = game.place.cam; const prevClose = cam && cam.close;
  if (focus && cam && cam.closeOn) cam.closeOn(focus, zoom);
  sfx('kotodama');
  const edges = [];
  const mat = new THREE.LineBasicMaterial({ color: '#eafcff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  // a pulse ring (two, a beat apart) that grows out from the middle of what the word caught, facing the camera
  const rings = [];
  if (pulse.length) {
    const bb = new THREE.Box3(); for (const t of pulse) bb.expandByObject(t);
    const c = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3()).length();
    for (let i = 0; i < 2; i++) {
      const rm = new THREE.MeshBasicMaterial({ color: '#d8f8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 64), rm); ring.position.copy(c); ring.renderOrder = 7;
      game.place.scene.add(ring); rings.push({ ring, rm, size, delay: i * 0.32 });
    }
  }
  const glowM = new THREE.MeshBasicMaterial({ color: '#9fe6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const dotM = new THREE.PointsMaterial({ color: '#ffffff', size: 0.12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const runners = [];
  const meshes = []; for (const t of targets) t.traverse((o) => { if (o.isMesh && o.geometry) meshes.push(o); });
  for (const o of meshes) {
    const eg = new THREE.EdgesGeometry(o.geometry, 35);
    const l = new THREE.LineSegments(eg, mat); l.renderOrder = 5; o.add(l); edges.push(l);
    // a faint cold glow over the whole thing, a touch bigger than it
    const gl = new THREE.Mesh(o.geometry, glowM); gl.scale.setScalar(1.12); gl.renderOrder = 4; gl.userData.shared = true; o.add(gl); edges.push(gl);
    // a few bright points that run along the edges
    const p = eg.attributes.position; const segs = p.count / 2; if (!segs) continue;
    const pts = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    const d = new THREE.Points(pts, dotM); d.renderOrder = 6; o.add(d); edges.push(d);
    runners.push({ p, segs, pts, ph: Math.random() });
  }
  const r = renderer, e0 = r.toneMappingExposure;
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  await game.tween(2.6, (k) => {
    // lights: a quick dip with a flicker, then back
    const dip = k < 0.08 ? k / 0.08 : Math.max(0, 1 - (k - 0.45) / 0.4);
    r.toneMappingExposure = e0 * (1 - 0.28 * dip + 0.05 * dip * Math.sin(k * 90));
    const vis = Math.min(1, k / 0.1) * Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4);
    mat.opacity = vis * (0.85 + 0.15 * Math.sin(k * 40)); dotM.opacity = vis; glowM.opacity = vis * (0.4 + 0.15 * Math.sin(k * 23));
    for (const q of rings) {
      const s = Math.max(0, Math.min(1, (k * 2.6 - q.delay) / 0.9));
      q.ring.quaternion.copy(game.place.camera.quaternion);
      q.ring.scale.setScalar(0.2 + s * q.size * 1.6); q.rm.opacity = s > 0 && s < 1 ? 0.9 * (1 - s) : 0;
    }
    for (const q of runners) {
      const arr = q.pts.attributes.position.array;
      for (let j = 0; j < 3; j++) {
        const s = ((k * 0.9 + q.ph + j / 3) % 1) * q.segs, i = Math.floor(s), f = s - i;
        a.fromBufferAttribute(q.p, i * 2); b.fromBufferAttribute(q.p, i * 2 + 1); a.lerp(b, f);
        arr[j * 3] = a.x; arr[j * 3 + 1] = a.y; arr[j * 3 + 2] = a.z;
      }
      q.pts.attributes.position.needsUpdate = true;
    }
  });
  r.toneMappingExposure = e0;
  if (focus && cam) { if (prevClose) cam.close = prevClose; else cam.release?.(); }
  for (const l of edges) { l.parent && l.parent.remove(l); if (!l.userData.shared) l.geometry.dispose(); }
  mat.dispose(); dotM.dispose(); glowM.dispose();
  for (const q of rings) { q.ring.parent?.remove(q.ring); q.ring.geometry.dispose(); q.rm.dispose(); }
};
// { do: 'phone', who: 'mio', state: 'buzz' | 'look' | 'away' }: her phone. buzz: a buzz and a phone bubble over
// her head, repeating until she looks; look/away: her rig's phone pose if it has one (characters agent), else nothing.
// Other people (the guard in the lobby) go to the place's own phone hook.
let phoneBuzz = 0;
H.phone = async (s) => {
  const rig = s.who === 'mio' ? game.mioNpc : isPlayer(s.who) ? game.player : null;
  if (!rig) return game.place.hooks?.phone?.(s);
  clearInterval(phoneBuzz); phoneBuzz = 0;
  if (s.state === 'buzz') {
    // the phone bubble stays up (no timers on anything the player should catch) until she looks at the phone
    H.emote({ who: s.who, kind: 'phone', ms: 1e9, id: 'phone-' + s.who });
    sfx('buzz'); phoneBuzz = setInterval(() => sfx('buzz'), 1400 / TS);
    return;
  }
  document.querySelector(`.emote[data-id="phone-${s.who}"]`)?.remove();
  // her portrait looks at the phone while she does (face 'phone', neutral until the art lands)
  if (s.who === 'mio') setFace('mio', s.state === 'look' ? 'phone' : 'neutral');
  if (rig.phone) await rig.phone(s.state);
};
// { do: 'kotodama', target: 'doors' }: the effect on its own, on a place's named target (place.kotodamaTargets)
H.kotodama = async ({ target }) => { let t = game.place.kotodamaTargets?.(target) || []; if (!t.length) t = objsOf({ id: target }); await game.kotodama(t); };
H.voice = ({ key }) => voice(key);
H.walk = async ({ who, to, wait = true, speed }) => {
  const p = posOf(to); if (!p) return;
  const r = isPlayer(who) ? game.player : rigOf(who); if (!r) return;
  const place = game.place;
  const pr = beginSavedWalk(r, { to: [...p], ...(speed ? { speed } : {}) }, () => {
    if (isPlayer(who)) return game.walkTo(p[0], p[1]);
    if (r.meshy) {
      r.root.visible = true;
      if (r.seated) { r.root.position.y = 0; r.root.position.z += r.root.position.z < 0 ? 0.45 : -0.45; }
      r.seated = false;
      return walkRig(game, r, p, { speed: speed || 1.0 });
    }
    return place.walkPerson(who, p, { speed });
  }, () => { if (game.place === place) save(game); });
  if (wait) await pr;
  else void pr.catch(error => { game.runner.failRecovery('A character could not finish walking.'); console.error(error); });
};
game.resumeWalks = () => {
  for (const [who, person] of Object.entries({ ...game.place.people, eric: game.player })) {
    if (person.savedWalk) void H.walk({ who, ...person.savedWalk, wait: false });
  }
};
game.captureStaging = () => {
  const close = game.place.cam?.close;
  return { place: game.place.name, flags: { ...flags }, world: game.place.snapshotState?.(),
    ui: { goal: ui.goalText || '', sideGoal: ui.sideText || '', hold: game.hold || null },
    camera: close ? { ...close, ...(close.target ? { target: close.target.toArray() } : {}) } : null };
};
game.restoreStaging = staging => {
  if (staging.place !== game.place.name) throw new Error('Scene staging belongs to another place');
  game.walker.stop();
  game.place.restoreState?.({ flags: staging.flags, world: staging.world, runner: { execution: true } });
  if (staging.ui) { ui.goal(staging.ui.goal); ui.sideGoal(staging.ui.sideGoal); game.hold = staging.ui.hold; }
  const cam = game.place.cam;
  if (cam) {
    cam.close = staging.camera ? { ...staging.camera,
      ...(staging.camera.target ? { target: new THREE.Vector3().fromArray(staging.camera.target) } : {}) } : null;
    cam.snap?.(game.player.root.position);
  }
  game.resumeWalks();
};
H.face = ({ who, to }) => {
  const p = posOf(to); if (!p) return;
  if (isPlayer(who)) { game.walker.faceTo(p[0], p[1]); return; }
  const r = rigOf(who); if (!r) return;
  faceRig(game, r, p);
};
H.look = ({ who, at }) => { const r = rigOf(who); const p = posOf(at); if (r && p) r.lookTarget = p; };
H.sit = async ({ who, at }) => {
  const r = rigOf(who);
  if (r && r.meshy) { const s = game.place.seats[at]; if (!s) return; r.root.visible = true; await H.walk({ who, to: [s.x, s.z + (s.ry ? -0.5 : 0.5)] }); r.sitAt(s.x, s.top, s.z, s.ry || 0); r.seated = true; return; }
  await game.place.sitPerson?.(isPlayer(who) ? 'eric' : who, at);
};
H.stand = async ({ who }) => {
  const r = rigOf(who);
  // Meshy rigs (Mio, and Eric when it's him) stand by leaving the sit pose and stepping off the bench
  if (r && r.meshy && !isPlayer(who)) { if (r.seated) await standOut(game, r, r.root.position.z < 0 ? 0.45 : -0.45); return; }
  await game.place.standPerson?.(who);
};
H.cam = ({ on, zoom = 1.8, back }) => { if (back) game.place.cam.release?.(); else { const p = posOf(on); if (p) game.place.cam.closeOn?.(p, zoom); } };
H.expression = ({ who, face }) => setFace(who, face);
// Emote bubbles: big and drawn, readable on a phone (Jørgen: much bigger). Kinds: ! ? … zzz heart sweat ♪ and
// 'nine' / '9' (a clock at 9:00). They stay on screen: clamped to the edges, and below the head if there's no room above.
const EMOTE_SVG = {
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#e0607a" stroke="#b8405a"/>',
  sweat: '<path d="M12 3c3 4.2 5 7 5 9.6a5 5 0 0 1-10 0C7 10 9 7.2 12 3z" fill="#7cc4f0" stroke="#3e8fc4"/>',
  nine: '<circle cx="12" cy="12" r="8.5" fill="#fff" stroke="#2a2f3a" stroke-width="1.8"/><path d="M12 12V6.2M12 12H7.2" stroke="#2a2f3a" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="#2a2f3a"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.2" fill="#fff" stroke="#2a2f3a" stroke-width="1.8"/><path d="M10.5 18h3" stroke="#2a2f3a" stroke-width="1.6" stroke-linecap="round"/><path d="M3.5 9.5c-.8 1.6-.8 3.4 0 5M20.5 9.5c.8 1.6.8 3.4 0 5" stroke="#4f6aa8" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  note: '<path d="M9 17.5V6l9-2v11.5" fill="none" stroke="#2a2f3a" stroke-width="1.9"/><circle cx="7" cy="17.5" r="2.3" fill="#2a2f3a"/><circle cx="16" cy="15.5" r="2.3" fill="#2a2f3a"/>',
};
H.emote = ({ who, kind, ms = 1900, id }) => {
  faceForEmote(who, kind);
  const el = document.createElement('div'); el.className = 'emote'; if (id) el.dataset.id = id;
  const k = kind === '9' ? 'nine' : kind === '♪' ? 'note' : kind;
  if (EMOTE_SVG[k]) el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${EMOTE_SVG[k]}</svg>${k === 'nine' ? '<span class="lbl">9:00</span>' : ''}`;
  else { el.innerHTML = `<span class="tx">${kind === '…' ? '···' : kind}</span>`; if (kind === '!') el.classList.add('bang'); if (kind === 'zzz') el.classList.add('zzz'); }
  if (k === 'nine') { el.classList.add('wide'); ms = Math.max(ms, 3200); }
  document.getElementById('ui').appendChild(el);
  const t0 = performance.now();
  const f = () => {
    const dt = performance.now() - t0; if (dt > ms || !el.isConnected) { el.remove(); return; }
    const v = new THREE.Vector3();
    if (isPlayer(who)) game.player.root.getWorldPosition(v); else rigOf(who)?.root.getWorldPosition(v);
    v.y += 1.55 * (game.place.charScale || 1); v.project(game.place.camera);
    const W = canvas.clientWidth, Hh = canvas.clientHeight, bw = el.offsetWidth || 64, bh = el.offsetHeight || 64;
    let x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * Hh - Math.min(10, dt * 0.012);
    // someone off screen: no bubble pinned to the edge pointing at nothing (QA round 1)
    const off = v.z > 1 || v.x < -1.05 || v.x > 1.05 || v.y < -1.05 || v.y > 1.05;
    el.style.visibility = off ? 'hidden' : '';
    // the bubble's bottom sits at y; keep it inside the screen, and under the head if the top is too close
    const below = y - bh - 12 < 8; el.classList.toggle('below', below);
    if (below) y += bh + 40;
    x = Math.max(bw / 2 + 8, Math.min(W - bw / 2 - 8, x)); y = Math.max(bh + 8, Math.min(Hh - 8, y));
    // keep clear of the HUD and the goal chip: drop below them if the bubble would sit on one
    for (const id of ['hud', 'goal', 'goal2']) {
      const r = document.getElementById(id); if (!r || r.hidden || !r.offsetParent) continue;
      const q = r.getBoundingClientRect();
      if (x + bw / 2 > q.left && x - bw / 2 < q.right && y > q.top && y - bh < q.bottom) y = q.bottom + bh + 6;
    }
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = dt < 120 ? String(dt / 120) : dt > ms - 400 ? String(Math.max(0, (ms - dt) / 400)) : '1';
    requestAnimationFrame(f);
  };
  f();
};
H.show = ({ id }) => { const r = game.place.people[id]; const o = r?.root || game.place.things[id]?.obj; if (o) o.visible = true; if (r?.blob) r.blob.visible = true; flags[ENGINE_KEYS.shown + id] = true; };
H.hide = ({ id }) => { const r = game.place.people[id]; const o = r?.root || game.place.things[id]?.obj; if (o) o.visible = false; if (r?.blob) r.blob.visible = false; flags[ENGINE_KEYS.shown + id] = false; };
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
  const r = whoRig(who);
  // Meshy rigs play their own library clips (wave, shrug, nod, bow); others fall through (point, nine... do their
  // emote and camera parts only on them)
  if (r && r.gesture && r.gestures && r.gestures.includes(kind)) return r.gesture(kind);
  if (r && r.meshy && kind === 'nine') { game.place.clock?.userData.highlight(true); H.emote({ who, kind: 'nine', ms: 3600 }); await game.wait(2600); game.place.clock?.userData.highlight(false); return; }
  if (!r || !r.arms || r.meshy) return;
  const save = r.arms.map((a) => a.rotation.clone()), hy = r.hips.position.y, legs = r.legs.map((l) => l.rotation.x), knees = r.knees.map((q) => q.rotation.x);
  if (kind === 'nine') {
    // "at nine": he points up at the wall clock (which lights up, the nine picked out) and a 9:00 clock shows over him
    const clk = game.place.clock; clk?.userData.highlight(true);
    // frame him and the clock together for the moment, then back to whatever the story had
    const cam = game.place.cam, prev = cam?.close;
    if (clk && cam?.closeOn) { const c = clk.getWorldPosition(new THREE.Vector3()); game.place.space.worldToLocal(c); const g0 = r.root.position; cam.closeOn([(c.x + g0.x) / 2, (c.z + g0.z) / 2 + 0.6], 1.25); }
    H.emote({ who, kind: 'nine', ms: 3600 });
    const h0 = r.head.rotation.clone();
    // arm straight up and out, toward the clock behind him; head turned up at it
    await game.tween(2.8, (k) => { const b = bell(k); r.arms[1].rotation.set(save[1].x + (-0.3 - save[1].x) * b, 0, save[1].z + (2.7 - save[1].z) * b); r.head.rotation.x = h0.x - 0.3 * b; });
    r.head.rotation.copy(h0);
    clk?.userData.highlight(false);
    if (cam) { if (prev) cam.close = prev; else cam.release?.(); }
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
// headphones: removed (Jørgen: no props on his models); kept as a no-op so old story steps don't break
H.headphones = () => {};
// typing prompt: Eric types the romaji of a new word, then says it (voiced) and knows it
H.type = async ({ word, prompt, from }, complete = (apply) => apply()) => {
  game.setHurry(false);
  if (from && game.sim && !game.sim.taught[word]) game.sim.taught[word] = from;
  if (!WORDS[word]) { console.warn('type: unknown word', word); return; }
  let pr = prompt;
  if (prompt) { const i = prompt.indexOf(': '); if (i > 0 && /^\w+$/.test(prompt.slice(0, i))) pr = { who: game.runner.speaker(prompt.slice(0, i)), whoId: prompt.slice(0, i), text: prompt.slice(i + 2) }; else pr = { who: null, text: prompt.replace(/^>\s*/, '') }; }
  await ui.typePrompt(word, pr);
  const spoken = voice(WORDS[word].voice || '');
  complete(() => {
    game.runner.learnCmd(word);
    flags[ENGINE_KEYS.typed + word] = true;
  });
  await voiceThenBeat(spoken, 350);
};
H.period = ({ to }) => { setPeriod(to, game); if (to === 'evening') playMusic('night'); };
// a story can change the loop: { hook: 'music', name: 'calm' | 'office' | 'lively' | 'night' | null }
H.music = ({ name }) => playMusic(name || null);
H.meet = ({ who }) => { meet(game, who); ui.refreshPeople(sim.met.size); };
H.buy = ({ item }) => { if (buy(game, item)) flags[ENGINE_KEYS.bought + item] = true; else flags[ENGINE_KEYS.cant_buy] = true; };
H.take = ({ item }) => take(item);
H.save = () => save(game);
H.next = () => {
  game.transition = { from: game.place.name, to: NEXT[game.place.name], phase: 'leaving' };
  game.after = () => travel(game.transition.to);
};
H.end = () => { game.ended = true; game.after = async () => { await game.wait(500); showEnd(game); }; };

// ---------- entering places ----------
async function prepare(name) {
  if (!game.prepared[name]) game.prepared[name] = (async () => {
    const story = await game.runner.load(name);
    const place = await PLACES[name](game, story);
    assertPlaceRegistered(place, name, PLACE_DETAILS[name]);
    place.name = name;
    attachLift(game, place);   // walk-in lift (places/lift.js)
    applyLook(place, game);    // surface patterns, baked light (look/index.js); materials patched in place
    return { place, story };
  })();
  return game.prepared[name];
}
async function enter(name, { persist = true, resuming = false } = {}) {
  const { place, story } = await prepare(name);
  if (game.place && game.place.leave) game.place.leave();
  cancelSavedWalk(game.player); cancelSavedWalk(game.mioNpc);
  game.hold = null;
  game.place = place; game.story = story; document.body.dataset.place = name;
  game.runner.use(place, story);
  if (!resuming) game.pendingStart = name;
  place.space.add(game.player.root);
  place.space.add(game.mioNpc.root); game.mioNpc.root.visible = false; game.mioNpc.root.scale.setScalar(place.charScale || 1); game.mioNpc.setState('idle');
  place.people.mio = game.mioNpc;
  const mr = game.mioNpc.root;
  place.things.mio = place.things.mio || { ...SHARED_THINGS.mio, anchor: (v) => { mr.getWorldPosition(v); v.y += 1.12 * (place.charScale || 1); return v; },
    spot: () => { const r = mr.rotation.y; return [mr.position.x + Math.sin(r) * 0.6, mr.position.z + Math.cos(r) * 0.6]; }, face: () => [mr.position.x, mr.position.z], enabled: () => mr.visible };
  game.mioNpc.seated = false; game.mioNpc.root.position.y = 0;
  if (place.spots.mio_start) game.mioNpc.root.position.set(place.spots.mio_start[0], 0, place.spots.mio_start[1]);
  place.placeMio?.(game.mioNpc);
  game.player.root.scale.setScalar(place.charScale || 1);
  game.player.seated = false; game.player.scripted = false; game.player.setState('idle'); game.player.root.visible = true;
  game.walker = new SmoothWalker(game.player.root, place.nav, { speed: 1.3 });
  sfxPlace(name);
  game.walker.facing = place.startFacing ?? Math.PI;
  game.player.root.rotation.y = game.walker.facing;
  const [sx, sz] = place.start;
  game.player.root.position.set(sx, place.floorY ?? 0, sz);
  setComposer(place);
  resize();
  place.cam?.snap?.(game.player.root.position);
  absorb(story);
  if (!resuming && place.defaultPeriod && PERIOD_ORDER.indexOf(sim.period) < PERIOD_ORDER.indexOf(place.defaultPeriod)) sim.period = place.defaultPeriod;
  applySchedule(game, { instant: true });
  ui.clock(sim.date, { early: 'Early morning', morning: 'Morning at work', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'After work' }[sim.period]);
  playMusic(sim.period === 'evening' ? 'night' : (place.music || MUSIC[name] || 'calm'));
  buildMarkers(place);
  ui.goal('');
  if (persist) save(game);
  nearSet.clear(); zoneSet.clear();
  return place;
}

// The trip between places: the old place plays its leaving move while the next one is ready (it was built
// in the background), then a soft crossfade from the last frame into the next place, where its arriving
// move plays. No black screens.
async function travel(name, { arriving = false, fromName } = {}) {
  const from = arriving ? { name: fromName } : game.place;
  game.transition = { from: from.name, to: name, phase: arriving ? 'arriving' : 'leaving' };
  save(game);
  game.busy = true; game.walker.locked = true; document.body.classList.add('busy', 'trip');
  const ready = prepare(name);
  document.body.classList.add('loading');
  const tr = await game.runner.load('transitions');
  const slot = (tr && tr[`${from.name}_to_${name}`]) || {};
  if (!arriving) await trips.leave(game, from, slot);
  await ready;
  document.body.classList.remove('loading');
  if (!arriving) {
    const snap = snapshot();
    game.transition.phase = 'arriving';
    await enter(name);
    crossfade(snap);
  }
  await trips.arrive(game, game.place, slot);
  document.body.classList.remove('busy', 'trip');
  game.busy = false; game.walker.locked = false;
  game.player.scripted = false;
  if (NEXT[name]) setTimeout(() => prepare(NEXT[name]), 1500);
  game.transition = null;
  startScene(name);
}
game.travel = travel;

function startScene(name) {
  game.pendingStart = null;
  if (game.runner.has(eventTrigger(name, 'start'))) game.runner.trigger(eventTrigger(name, 'start'));
  else if (game.story.start) game.beat(() => game.runner.run(game.story.start));
  else save(game);
}
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
// stills and frame sequences (?cap): advance game time exactly, independent of how slow the renderer is
if (CAP) window.__advance = (sec) => { for (let t = sec; t > 1e-6; t -= 1 / 30) step(Math.min(1 / 30, t)); };
function frame() {
  const now = performance.now();
  if (game.paused) { lastT = now; render(); requestAnimationFrame(frame); return; } let dt = Math.min(0.1, (now - lastT) / 1000) * TS * (game.hurry ? HURRY : 1); lastT = now;
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
  if (held() && game.walker.keys.size) { game.walker.keys.clear(); holdNudge(); }
  if (game.walker && !mio.seated && !mio.scripted) moving = game.walker.update(dt, place.camera);
  if (!mio.seated && !mio.scripted) { mio.setState(moving ? 'walk' : 'idle'); mio.setGait?.(game.walker.gait ? game.walker.gait.v : null); } else mio.setGait?.(null);
  mio.update(dt, 1.25);
  if (game.mioNpc.root.visible) game.mioNpc.update(dt, 1.25);
  stepTweens(dt);
  place.update(dt, game.t);
  softSeparate(game, dt);   // people overlapping are pushed apart gently (move.js, soft collision)
  place.cam?.update?.(dt, mio.root.position);
  if (!game.saveEnabled) return;
  // nearest usable thing, the Say target, and near/zone triggers
  let near = null, nd = 0.95, st = null, sd = 2.2;
  // seated he can reach a bit further (his seat spot is not the bench edge), but not across the carriage
  const seatedReach = game.player.seated ? 0.35 : 0;
  const mp = mio.root.position;
  // people are in reach within talking range of the person, from any side (not only at their one marker spot); the
  // current goal wins a close call (QA round 1: E and the phone's Use button picked the reader next to Mio)
  const who = new Map(); for (const b of bodies(game)) who.set(b.id, b);
  const talkR = 0.8 * (place.charScale || 1);
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    const s = m.spot ? m.spot() : null; if (!s) continue;
    const d = Math.hypot(mp.x - s[0], mp.z - s[1]);
    const b = /person/.test(m.kind || '') && who.get(m.id);
    const dr = b && b.root !== mio.root ? Math.min(d, Math.max(0, Math.hypot(mp.x - b.x, mp.z - b.z) - talkR) + 0.3) : d;
    const dn = dr - (m.goal && m.goal() ? 0.3 : 0);
    if (!game.busy && dn < nd + seatedReach) { nd = dn - seatedReach; near = m; }
    const bias = (m.goal && m.goal() ? -1.2 : 0) + (/person/.test(m.kind || '') ? -0.7 : 0) + (m.wordable && m.wordable() ? -0.6 : 0);
    // Say works on what's in reach; goals and people win over things when several are close
    if (!game.busy && known.size && d < 1.6 + seatedReach && d + bias < sd) { sd = d + bias; st = m; }
    if (d < 0.9) { if (!nearSet.has(m.id) && !game.busy) { nearSet.add(m.id); game.runner.trigger('near:' + m.id); } }
    else if (d > 1.3) nearSet.delete(m.id);
  }
  for (const [z, fn] of Object.entries(place.zones || {})) {
    const inz = fn(mp.x, mp.z);
    // a zone fires once per visit, but only when it can: if he walked in during a scene, or before the zone's
    // condition was true (the lift before the gate flag), it fires as soon as it can while he's still inside.
    // (Jørgen's lift softlock: entered while busy, the trigger was dropped and never came back.)
    if (inz && !zoneSet.has(z) && !game.busy && game.runner.has('zone:' + z)) { zoneSet.add(z); game.runner.trigger('zone:' + z); }
    else if (!inz) zoneSet.delete(z);
  }
  // a target the player chose (Tab / Next in the action menu) holds while it's usable and within 1.7 m
  const lk = game.targetLock;
  if (lk) {
    const s = lk.spot && lk.spot();
    if (game.busy || !lk.enabled() || !s || Math.hypot(mp.x - s[0], mp.z - s[1]) > 1.7) game.targetLock = null;
    else near = lk;
  }
  game.near = near; game.sayTarget = st;
  updateOutline();
  // when a goal is waiting on a word he knows, the Say button lights up
  const waiting = !game.busy && known.size && game.markers.list.some((m) => m.enabled() && m.goal() && SAYABLE.some((w) => known.has(w) && game.runner.has(`say:${w}:${m.id}`)));
  ui.sayReady(waiting);
  // Say beside the target: shown when a known word does something there (or while the Say tip is up)
  let sayShow = false, sx = 0, sy = 0;
  if (st && !game.busy && known.size) {
    const any = SAYABLE.some((w) => known.has(w) && (game.runner.has(`say:${w}:${st.id}`) || game.runner.has(`say:${w}:*`)));
    if (any || ui.sayIntro) { const v = st.anchor(new THREE.Vector3()).project(place.camera); sx = ((v.x + 1) / 2) * canvas.clientWidth; sy = ((1 - v.y) / 2) * canvas.clientHeight; sayShow = true; }
  }
  ui.placeSay(sx, sy, sayShow);
  const person = st && place.people[st.id] && /person/.test(st.kind || '');
  ui.setGiveTarget(person ? st.label : '', !!(person && sim.inv.length && !game.busy));
  stepAmbient(game);
  ambience.update(game, dt);
  game.markers.update(place.camera, canvas, mp, near);
}
function render() {
  if (!composer || !game.place) return;
  game.place.beforeRender?.();
  renderer.shadowMap.needsUpdate = true;
  post.render();
}
game.step = step;

// ---------- boot ----------
async function boot() {
  game.runner = new Runner(game);
  installSim(game);   // bonds: bond, bondStep, remember, fact, relate hooks (js/bonds/)
  assertRegistered(GLOBAL_HOOKS, game.hooks, 'global hooks');
  if (Q.has('slift')) setSitLift(+Q.get('slift'));
  // Eric: Jørgen's Meshy model; the code-built chibi is the fallback (?eric=chibi, or if loading fails)
  game.player = Q.get('eric') === 'chibi' ? makeAvatar() : await loadEric().catch((e) => { console.warn('Meshy Eric failed, using the chibi', e); return makeAvatar(); });
  game.player.root.add(blob(0.55, 0.4));
  // Mio is an NPC now: Jørgen's Meshy model, colour-tweaked only, shown wherever the story puts her
  game.mioNpc = await loadMio({ height: 1.12 });
  game.mioNpc.meshy = true; game.mioNpc.root.visible = false;
  game.mioNpc.blob = blob(0.55, 0.4); game.mioNpc.root.add(game.mioNpc.blob);
  requestAnimationFrame(frame);
  const start = Q.get('place') || 'train';
  const showTitle = start === 'train' && !Q.has('skip') && !TEST && !CAP;
  const saved = showTitle ? loadSave() : null;
  game.saveEnabled = !showTitle;
  await enter(start, { persist: !showTitle });
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
  if (showTitle) {
    const pick = await title(saved);
    if (pick === 'continue' && saved) {
      game.busy = true;
      restore(game, saved);
      await enter(saved.place || 'train', { persist: false, resuming: true });
      // Rebuild the saved room directly. Arrival cinematics and opening scenes belong to new visits.
      game.place.restoreState?.(saved);
      // Schedule hooks may set visibility flags; saved progression remains authoritative.
      for (const key of Object.keys(flags)) delete flags[key];
      Object.assign(flags, saved.flags || {});
      ui.refreshWords(); ui.refreshPeople(sim.met.size); ui.refreshBag(sim);
      ui.goal(saved.ui?.goal || ''); ui.sideGoal(saved.ui?.sideGoal || '');
      game.hold = saved.ui?.hold || null;
      game.busy = false;
      game.saveEnabled = true;
      const transition = saved.transition;
      if (saved.ended) { showEnd(game); save(game); }
      else if (transition && NEXT[transition.from] === transition.to && PLACES[transition.to]) {
        await travel(transition.to, { arriving: saved.place === transition.to, fromName: transition.from });
      } else if (saved.runner?.execution || saved.runner?.queued?.length) await game.beat(async () => {
        await game.runner.resume();
      });
      else if (saved.pendingStart === game.place.name || needsLegacyOpening(saved, game.story)) startScene(game.place.name);
      else { game.resumeWalks(); save(game); }
      return;
    }
    clearSave();
    game.saveEnabled = true;
    game.pendingStart = start;
    save(game);
  }
  await game.place.onEnter?.();
  startScene(start);
  if (NEXT[start]) setTimeout(() => prepare(NEXT[start]), 1500);
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
