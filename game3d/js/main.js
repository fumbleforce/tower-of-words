import { title } from './ui/title.js';
import { migrateForecourtSave } from './places/forecourt-save.js';
import { createPlaceLifecycle } from './places/lifecycle.js';
import { GLOBAL_HOOKS } from './narrative/hooks.js';
import { installInteractions } from './gameplay/interactions.js';
import { outlineMeshes, meshesNear } from './gameplay/highlight.js';
import { PLACE_FILES, NEXT } from './places/definitions.js';
import { assertRegistered } from './narrative/registration.js';
import * as THREE from 'three';
import { createRenderer, Markers, Q, blob } from './engine.js';
import { installMetrics } from './perf/metrics.js';
import { createView } from './perf/view.js';
import { guardedLoop } from './perf/gl-guard.js';
import { pickPerson, softSeparate } from './move.js';
import { scanTargets } from './gameplay/targeting.js';
import { installSteer } from './movement/steer.js';
import * as ambience from './ambience.js';
import { mioBody, playerBody } from './chibi.js';
import { reloadForMc } from './mc.js';
import { makeAvatar } from './avatar.js';
import { setSitLift } from './movement/sit-height.js';
import { createTargets } from './narrative/hooks/targets.js';
export { isPlayer } from './narrative/hooks/targets.js';
import { installMovementHooks } from './narrative/hooks/movement.js';
import { installPresentationHooks } from './narrative/hooks/presentation.js';
import { installGesturesHooks } from './narrative/hooks/gestures.js';
import { installKotodamaHooks } from './narrative/hooks/kotodama.js';
import { installProgressionHooks } from './narrative/hooks/progression.js';
import { ui, unlockAudio } from './ui.js';
import { known, SAYABLE } from './lang.js';
import { Runner, flags } from './runner.js';
import { trainPlace as train } from './places/train.js';
import { lobbyPlace as gate } from './places/lobby.js';
import { forecourtPlace as forecourt } from './places/forecourt.js';
import { canteenPlace as canteen } from './places/canteen.js';
import { plazaPlace as plaza } from './places/plaza.js';
import { officePlace as office } from './places/office.js';
import { dormCourtPlace as dorm_court } from './places/dorm-court.js';
import { dormsPlace as dorms } from './places/dorms.js';
import { shotengaiPlace as shotengai } from './places/shotengai.js';
import { karaokePlace as karaoke } from './places/karaoke.js';
import { karaokeBoothPlace as karaoke_booth } from './places/karaoke-booth.js';
import { eastLanePlace as east_lane } from './places/east-lane.js';
import { eastCoastPlace as east_coast } from './places/east-coast.js';
import { commonsPlace as dorm_commons } from './places/commons.js';
import { sportsPlace as sports } from './places/sports.js';
import { poolPlace as pool } from './places/pool.js';
import { gymPlace as gym } from './places/gym.js';
import { officeQuarterPlace as office_quarter } from './places/office-quarter.js';
import { harbourPlace as harbour } from './places/harbour.js';
import { worksPlace as works } from './places/works.js';
import { snapshot as snapshotOf, crossfade } from './places/crossfade.js';
import { installSim, sim, stepAmbient, save, loadSave, clearSave } from './sim.js';
import { createContinue, dayStartSave } from './continue.js';
import { installViewer } from './plugins.js';
import { installMinimap } from './ui/minimap.js';

const CAP = Q.has('cap');
const TEST = Q.get('test') === 'fast';
const TS = TEST ? +(Q.get('ts') || 8) : 1; // test clock
const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
ui.build();
if (CAP) document.body.classList.add('cap');
const PLACES = {
  train,
  gate,
  forecourt,
  plaza,
  canteen,
  office,
  dorm_court,
  dorms,
  shotengai,
  karaoke,
  karaoke_booth,
  east_lane,
  east_coast,
  dorm_commons,
  sports,
  pool,
  gym,
  office_quarter,
  harbour,
  works,
};
assertRegistered(Object.keys(PLACE_FILES), PLACES, 'place factories');

export const game = {
  renderer,
  ui,
  mio: null,
  walker: null,
  place: null,
  markers: new Markers(document.getElementById('marks')),
  t: 0,
  busy: false,
  saveEnabled: false,
  near: null,
  sayTarget: null,
  found: new Set(),
  after: null,
  hooks: {},
  runner: null,
  story: null,
  prepared: {},
  queue: [],
  timeScale: TS,
  test: TEST,
  async beat(fn) {
    if (this.busy || this.runner?.recoveryError) return;
    this.busy = true;
    this.walker.locked = true;
    this.walker.stop();
    document.body.classList.add('busy');
    ui.closeSayMenu?.();
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      ui.closeTalk({ sceneOver: true });
      this.setHurry?.(false);
      this.busy = !!this.runner?.recoveryError;
      if (this.walker) this.walker.locked = this.busy;
      document.body.classList.toggle('busy', this.busy);
    }
    if (this.runner?.recoveryError) return;
    if (this.after) {
      const a = this.after;
      this.after = null;
      await a();
      return;
    }
    if (this.queue.length) {
      const q = this.queue.shift();
      this.beat(q);
    }
  },
  // waits hold while the game is paused (the pause menu sets game.paused)
  wait(ms) {
    return new Promise((r) => {
      let left = ms / TS,
        last = performance.now();
      const tick = () => {
        const now = performance.now();
        if (!game.paused) left -= (now - last) * (game.hurry ? HURRY : 1);
        last = now;
        if (left <= 0) r();
        else setTimeout(tick, Math.min(50, left));
      };
      setTimeout(tick, Math.min(50, left));
    });
  },
  // a scripted walk; resolves on arrival, or if the walk is dropped or stalls (a stop, a blocked path), so a scene
  // can never hang on it
  walkTo(x, z) {
    if (this.player.seated) {
      this.player.seated = false;
      this.player.setState('idle');
      this.player.root.position.y = 0;
    }
    return new Promise((res) => {
      const w = this.walker,
        was = w.locked;
      w.locked = false;
      let done = false,
        still = 0,
        watch = null;
      const p = this.player.root.position,
        last = p.clone();
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(watch);
        w.locked = was;
        res();
      };
      // watch is declared before goTo: goTo calls finish at once when there is no path (already there)
      w.goTo(x, z, finish, { scripted: true });
      if (done) return;
      watch = setInterval(() => {
        if (this.paused) return;
        if (p.distanceTo(last) < 0.002) still++;
        else still = 0;
        last.copy(p);
        if (!w.path || still > 12) {
          if (w.path && still > 12) w.stop();
          finish();
        }
      }, 250);
    });
  },
  event(name) {
    if (this.runner) this.runner.trigger('event:' + name);
  },
  mioSays(id) {
    this.place.onMioSays?.(id);
  },
};
window.__game = game;
game.flagsRef = flags;
game.onRecoveryError = (message) => {
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
  notice.addEventListener('cancel', (event) => event.preventDefault());
  document.body.append(notice);
  notice.showModal();
};
// Clicking while a scene plays out (a walk, a door, a gesture) with no line waiting fast-forwards it to the next line
// (Jørgen: clicks that did nothing were frustrating). runner clears it when a line, choice or prompt shows.
const HURRY = 6;
game.hurry = false;
game.setHurry = (on) => {
  game.hurry = on;
  game.timeScale = TS * (on ? HURRY : 1);
  document.body.classList.toggle('hurry', on);
};
function hurryIfWaiting() {
  if (game.mapOpen) return;
  if (
    game.busy &&
    !ui._advance &&
    !ui._chipKeys &&
    !document.querySelector('#talk.typing:not([hidden])') &&
    ui.menuClosed?.() !== false
  )
    game.setHurry(true);
}
window.addEventListener(
  'pointerdown',
  (e) => {
    if (e.target.closest('#talk, .panel, #menu, button')) {
      if (!e.target.closest('#talk')) return;
    }
    hurryIfWaiting();
  },
  true,
);
window.addEventListener(
  'keydown',
  (e) => {
    if (['Space', 'Enter', 'KeyE'].includes(e.code)) hurryIfWaiting();
  },
  true,
);

// ---------- rendering ----------
const view = createView(game, renderer, canvas, () => save(game)); // quality, post chain, size, render (perf/view.js)
const { setComposer, resize, size, render } = view;
// the 3D objects that stand for a marker (people's bodies, a thing's obj or outline())
function objsOf(m) {
  const P = game.place;
  if (!P || !m) return [];
  const r = P.people && P.people[m.id];
  if (r && r.root && r.root.visible) return [r.root];
  const t = P.things && P.things[m.id];
  if (t && t.outline) return [].concat(t.outline()).filter(Boolean);
  if (t && t.obj) return [t.obj];
  if (t && t.anchor && !/person/.test(t.kind || '')) return nearOf(m.id, t);
  return [];
}
// a thing with no obj of its own: the small meshes around its anchor, cached per place and thing (gameplay/highlight.js)
const nearCache = new Map();
function nearOf(id, t) {
  const P = game.place,
    key = P.name + ':' + id;
  if (!nearCache.has(key)) {
    const skip = new Set([game.player?.root, game.mioNpc?.root]);
    for (const r of Object.values(P.people || {})) skip.add(r?.root);
    for (const x of Object.values(P.things || {})) skip.add(x?.obj);
    nearCache.set(key, meshesNear(P.space, t.anchor(new THREE.Vector3()), skip));
  }
  return nearCache.get(key);
}
game.objsOf = objsOf;
const hoverRay = new THREE.Raycaster();
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || !game.place || document.body.classList.contains('phone')) return;
  if (titleUp()) {
    game.hover = null;
    canvas.style.cursor = '';
    return;
  }
  const r = canvas.getBoundingClientRect();
  hoverRay.setFromCamera(
    new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1),
    game.place.camera,
  );
  const best = modelAt(hoverRay);
  if (game.hover !== best) {
    if (game.hover && game.hover.el) game.hover.el.classList.remove('hover');
    if (best && best.el) best.el.classList.add('hover');
  }
  game.hover = best;
  canvas.style.cursor = best ? 'pointer' : '';
});
// the usable thing whose model is under the ray: the nearest hit wins, so the cat on the seat beats the seat, the
// floor and whoever stands behind it (Jørgen: "I end up sitting on the cat"). Hover and click both use this.
function modelAt(ray) {
  ray.layers.enable(31); // Original interactive meshes remain pickable when batched.
  let best = null,
    bd = 1e9;
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    for (const o of objsOf(m)) {
      const hit = ray.intersectObject(o, true)[0];
      if (hit && hit.distance < bd) {
        bd = hit.distance;
        best = m;
      }
    }
  }
  return best;
}
let outlineKey = '';
// the title screen is up (no outline, no hover)
const titleUp = () => {
  const t = document.getElementById('title');
  return !!(t && !t.hidden && t.offsetParent !== null);
};
function updateOutline() {
  const outline = view.outline;
  if (!outline || !outline.enabled) return;
  if (titleUp()) {
    if (outlineKey !== 'title') {
      outlineKey = 'title';
      outline.selectedObjects = [];
    }
    return;
  }
  const sel = [...new Set([game.near, !document.body.classList.contains('phone') && game.hover].filter(Boolean))];
  const key = sel.map((m) => m.id).join(',') + (game.busy ? '|b' : '') + ((performance.now() / 500) | 0);
  if (key === outlineKey) return;
  outlineKey = key;
  outline.selectedObjects = game.busy ? [] : outlineMeshes(sel.flatMap(objsOf));
}
// a tap while a scene plays out with no line waiting: hurry it along (ui.js calls this)
game.skip = () => {
  if (game.busy) game.setHurry(true);
};
installMetrics(game, () => view.quality); // F3 overlay and the fast test's per-place numbers
// what the look passes draw the whole scene with while on (GTAO normals, outline depth and mask), for js/perf/warm.js
const overrides = (p) => (p?.enabled ? p.normalMaterial || [p.depthMaterial, p.prepareMaskMaterial] : []);
game.overrideMaterials = () => [view.post?.gtao, view.outline].flatMap(overrides);

// ---------- things, markers, triggers ----------
const { buildMarkers, use, standUp, held, holdNudge, say } = installInteractions(game);

// ---------- input ----------
const raycaster = new THREE.Raycaster();
const steer = installSteer(game, canvas); // hold on the floor to steer (movement/steer.js)
function ndc(e) {
  const r = canvas.getBoundingClientRect();
  return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (game.busy || !game.place) return;
  // what the cursor is visibly on first (the model itself), then the looser person and marker picks around it
  raycaster.setFromCamera(ndc(e), game.place.camera);
  const hitM = modelAt(raycaster);
  if (hitM) {
    use(hitM);
    return;
  }
  const who = pickPerson(game, e.clientX, e.clientY, canvas);
  if (who) {
    use(who);
    return;
  }
  const [w, h] = [canvas.clientWidth, canvas.clientHeight];
  let best = null,
    bd = 44;
  const v = new THREE.Vector3();
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    for (const a of [m.anchor(v.clone()), m.body ? m.body(v.clone()) : null]) {
      if (!a) continue;
      a.project(game.place.camera);
      const d = Math.hypot(((a.x + 1) / 2) * w - e.clientX, ((1 - a.y) / 2) * h - e.clientY);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
  }
  if (best) {
    use(best);
    return;
  }
  raycaster.setFromCamera(ndc(e), game.place.camera);
  const p = game.place.pick(raycaster);
  if (held()) {
    holdNudge();
    return;
  }
  if (p) standUp();
  game.walker.tapRay(raycaster, game.place);
  steer.press(e);
});
document.getElementById('marks').addEventListener('click', (e) => {
  const b = e.target.closest('.mark');
  if (!b) return;
  const m = game.markers.list.find((x) => x.el === b);
  if (m) use(m);
});
window.addEventListener('keydown', (e) => {
  if (!game.walker) return;
  if (/^(Arrow|Key[WASD])/.test(e.code)) {
    if (!game.busy) standUp();
    game.walker.keys.add(e.code);
    e.preventDefault();
    unlockAudio();
  }
  if (
    (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') &&
    !game.busy &&
    game.near &&
    !ui.talking &&
    ui.menuClosed()
  ) {
    e.preventDefault();
    use(game.near);
  }
  if (e.code === 'KeyF' && !ui.talking && !game.busy && ui.menuClosed()) say();
});
window.addEventListener('keyup', (e) => game.walker && game.walker.keys.delete(e.code));
window.addEventListener('blur', () => game.walker && game.walker.keys.clear());

// ---------- hooks that work in every place ----------
const nearSet = new Set(),
  zoneSet = new Set();
const { prepare, enter, travel, startScene } = createPlaceLifecycle(game, {
  PLACES,
  setComposer,
  resize,
  size,
  buildMarkers,
  nearSet,
  zoneSet,
  snapshot: () => snapshotOf(render, canvas),
  crossfade,
});
const continueFrom = createContinue(game, { enter, travel, startScene, PLACES });
const targets = createTargets(game);
game.posOf = targets.posOf;
installMovementHooks(game, targets);
installPresentationHooks(game, { ...targets, canvas, TS });
installGesturesHooks(game, targets);
installKotodamaHooks(game, { renderer, objsOf });
installProgressionHooks(game, { travel });

// ---------- loop ----------
let lastT = performance.now();
let frames = 0;
// stills and frame sequences (?cap): advance game time exactly, independent of how slow the renderer is
if (CAP)
  window.__advance = (sec) => {
    for (let t = sec; t > 1e-6; t -= 1 / 30) step(Math.min(1 / 30, t));
  };
const frame = guardedLoop(tick); // an error in one frame never stops the loop (perf/gl-guard.js)
function tick() {
  const now = performance.now();
  if (game.mapOpen) return void (lastT = now); // the map covers the screen: nothing drawn (ui/map/view.js)
  if (game.paused) {
    lastT = now;
    render();
    return;
  }
  let dt = Math.min(0.1, (now - lastT) / 1000) * TS * (game.hurry ? HURRY : 1);
  lastT = now;
  if (!CAP || window.__run)
    while (dt > 1e-4) {
      const s = Math.min(0.05, dt);
      step(s);
      dt -= s;
    }
  render();
  frames++;
  if (frames > 3 && game.place) window.__done = true;
}
function step(dt) {
  game.t += dt;
  const place = game.place;
  if (!place) return;
  const mio = game.player;
  let moving = false;
  if (held() && game.walker.keys.size) {
    game.walker.keys.clear();
    holdNudge();
  }
  steer.update(dt);
  if (game.walker && !mio.seated && !mio.scripted) moving = game.walker.update(dt, place.camera);
  if (!mio.seated && !mio.scripted && !mio._walk) {
    mio.setState(moving ? 'walk' : 'idle');
    mio.setGait?.(game.walker.gait.v, game.walker.gait); // .run
  }
  mio.update(dt, 1.25);
  if (game.mioNpc.root.visible) game.mioNpc.update(dt, 1.25);
  game.stepTweens(dt);
  place.update(dt, game.t);
  game.stepRigLayers(dt); // looks and cues over the idles (rig-gestures.js)
  softSeparate(game, dt); // people overlapping are pushed apart gently (move.js, soft collision)
  place.cam?.update?.(dt, mio.root.position);
  if (!game.saveEnabled) return;
  // nearest usable thing, the Say target and near: triggers (gameplay/targeting.js); then the zones
  let { near, st } = scanTargets(game, nearSet);
  const mp = mio.root.position;
  for (const [z, fn] of Object.entries(place.zones || {})) {
    const inz = fn(mp.x, mp.z);
    // a zone fires once per visit, but only when it can: if he walked in during a scene, or before the zone's
    // condition was true (the lift before the gate flag), it fires as soon as it can while he's still inside.
    // (Jørgen's lift softlock: entered while busy, the trigger was dropped and never came back.)
    if (inz && !zoneSet.has(z) && !game.busy && game.runner.has('zone:' + z)) {
      zoneSet.add(z);
      game.runner.trigger('zone:' + z);
    } else if (!inz) zoneSet.delete(z);
  }
  // a target the player chose (Tab / Next in the action menu) holds while it's usable and within 1.7 m
  const lk = game.targetLock;
  if (lk) {
    const s = lk.spot && lk.spot();
    if (game.busy || !lk.enabled() || !s || Math.hypot(mp.x - s[0], mp.z - s[1]) > 1.7) game.targetLock = null;
    else near = lk;
  }
  game.near = near;
  // the target in the action menu is the one Say speaks to, when a word does something there (the menu's Say row)
  const nearSays = !!(near && !game.busy && game.saysSomething(near));
  if (nearSays) st = near;
  game.sayTarget = st;
  updateOutline();
  // when a goal is waiting on a word he knows, the Say button lights up
  const waiting =
    !game.busy &&
    known.size &&
    game.markers.list.some(
      (m) => m.enabled() && m.goal() && SAYABLE.some((w) => known.has(w) && game.runner.has(`say:${w}:${m.id}`)),
    );
  ui.sayReady(waiting);
  // Say in the target's menu: when a known word does something there (or while the Say tip is up)
  ui.placeSay(!!(st && st === near && !game.busy && known.size && (nearSays || ui.sayIntro)));
  const person = st && place.people[st.id] && /person/.test(st.kind || '');
  ui.setGiveTarget(person ? st.label : '', !!(person && sim.inv.length && !game.busy));
  stepAmbient(game);
  ambience.update(game, dt);
  game.markers.update(place.camera, canvas, mp, near);
}
game.step = step;

// ---------- boot ----------
async function boot() {
  game.runner = new Runner(game);
  installSim(game); // bonds: bond, bondStep, remember, fact, relate hooks (js/bonds/)
  assertRegistered(GLOBAL_HOOKS, game.hooks, 'global hooks');
  if (Q.has('slift')) setSitLift(+Q.get('slift'));
  // the player: the protagonist's Meshy model (mc.js); the code-built chibi is the fallback (?eric=chibi, or if loading fails)
  game.player =
    Q.get('eric') === 'chibi'
      ? makeAvatar()
      : await playerBody().catch((e) => {
          console.warn('Meshy body failed, using the chibi', e);
          return makeAvatar();
        });
  game.player.root.add(blob(0.55, 0.4));
  // Mio is an NPC now: Jørgen's Meshy model, colour-tweaked only, shown wherever the story puts her
  game.mioNpc = await mioBody();
  game.mioNpc.meshy = true;
  game.mioNpc.root.visible = false;
  game.mioNpc.blob = blob(0.55, 0.4);
  game.mioNpc.root.add(game.mioNpc.blob);
  requestAnimationFrame(frame);
  installMinimap(game); // the minimap and the map, M (ui/minimap.js)
  if (await installViewer(Q, { game, continueFrom })) return; // ?scene=<id>, local only (plugins.js)
  // ?day=2: straight into that day, from the player's own finished day before it, or a plain one (days.js)
  const forced = +Q.get('day') > 1 ? dayStartSave(+Q.get('day'), Q.get('history') || 'mio', Q.get('place')) : null;
  const start = forced?.place || Q.get('place') || 'train';
  const showTitle = start === 'train' && !forced && !Q.has('skip') && !TEST && !CAP;
  const saved = forced || (showTitle ? migrateForecourtSave(loadSave()) : null);
  game.saveEnabled = !showTitle;
  if (forced) {
    if (TEST) (await import('./testmode.js')).start(game);
    await continueFrom(forced);
    return;
  }
  await enter(start, { persist: !showTitle });
  if (CAP) {
    if (Q.has('mx')) game.player.root.position.set(+Q.get('mx'), game.player.root.position.y, +Q.get('mz'));
    if (Q.has('face')) {
      game.walker.facing = +Q.get('face');
      game.player.root.rotation.y = +Q.get('face');
    }
    game.place.cam?.snap?.(game.player.root.position);
    if (Q.has('st')) await game.place.capState?.(Q.get('st'));
    // ?advance=N runs the world for N/30 s so moving things (commuters) are in the shot
    for (let i = 0; i < +(Q.get('advance') || 0); i++) {
      game.place.update(1 / 30, (game.t += 1 / 30));
    }
    for (let i = 0; i < 30; i++) step(1 / 60);
    return;
  }
  if (TEST) {
    const t = await import('./testmode.js');
    t.start(game);
  }
  if (showTitle) {
    const pick = await title(saved);
    if (pick === 'continue' && saved) {
      if (reloadForMc(saved)) return; // saved with another protagonist than ?mc= asked for
      await continueFrom(saved);
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

boot().catch((e) => {
  console.error(e);
  document.getElementById('ui').insertAdjacentHTML('beforeend', `<div class="err">Couldn't start: ${e.message}</div>`);
});
