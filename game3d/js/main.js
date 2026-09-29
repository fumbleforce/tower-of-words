import { createPlaceLifecycle } from './places/lifecycle.js';
import { GLOBAL_HOOKS } from './narrative/hooks.js';
import { installInteractions } from './gameplay/interactions.js';
import { PLACE_FILES, NEXT } from './places/definitions.js';
import { assertRegistered } from './narrative/registration.js';
import { needsLegacyOpening } from './narrative/legacy-opening.js';
// Day one: train, lobby, office. One renderer, one Mio, three places joined by continuous trips.
import * as THREE from 'three';
import { createRenderer, Markers, Q, blob } from './engine.js';
import { makePost } from './post.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { pickPerson, bodies, softSeparate } from './move.js';
import * as ambience from './ambience.js';
import { loadMio } from './mio.js';
import { makeAvatar, loadEric, setSitLift } from './avatar.js';
import { createTargets } from './narrative/hooks/targets.js';
export { isPlayer } from './narrative/hooks/targets.js';
import { installMovementHooks } from './narrative/hooks/movement.js';
import { installPresentationHooks } from './narrative/hooks/presentation.js';
import { installGesturesHooks } from './narrative/hooks/gestures.js';
import { installKotodamaHooks } from './narrative/hooks/kotodama.js';
import { installProgressionHooks } from './narrative/hooks/progression.js';
import { ui, unlockAudio, sfx } from './ui.js';
import { known, SAYABLE } from './lang.js';
import { Runner, flags } from './runner.js';
import { trainPlace } from './places/train.js';
import { lobbyPlace } from './places/lobby.js';
import { officePlace } from './places/office.js';
import { showEnd } from './end.js';
import { installSim, sim, stepAmbient, save, loadSave, restore, clearSave } from './sim.js';

const CAP = Q.has('cap');
const TEST = Q.get('test') === 'fast';
const TS = TEST ? +(Q.get('ts') || 8) : 1; // test mode: everything runs this many times faster
const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
// quality tier 0 low, 1 medium, 2 high (post.js). ?q= forces it; otherwise Settings > Graphics (window.__qualityTier)
const TIER = { low: 0, medium: 1, high: 2 };
const tierNow = () =>
  Q.has('q')
    ? +Q.get('q')
    : window.__qualityTier
      ? (TIER[window.__qualityTier()] ?? 1)
      : renderer.userData.software
        ? 0
        : 2;
let quality = tierNow();
ui.build();
if (CAP) document.body.classList.add('cap');

const PLACES = { train: trainPlace, gate: lobbyPlace, office: officePlace };
assertRegistered(Object.keys(PLACE_FILES), PLACES, 'place factories');

// ---------- shared game state ----------
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
      ui.closeTalk();
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
      w.goTo(x, z, finish);
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
let composer = null,
  post = null;
let outline = null;
function setComposer(place) {
  post = makePost(renderer, place, quality);
  composer = post.composer;
  // a soft outline on the current target and on what the mouse is over (Jørgen: interactive things should be
  // highlighted slightly); right after the render pass, off at low quality
  const [w, h] = size();
  outline = new OutlinePass(new THREE.Vector2(w, h), place.scene, place.camera);
  // hidden edges black (the pass adds them): no outline showing through walls (QA round 1)
  outline.visibleEdgeColor.set('#bff1ea');
  outline.hiddenEdgeColor.set('#000000');
  outline.edgeStrength = 5.0;
  outline.edgeThickness = 1.0; // was 2.2: too faint to see on hover (Jørgen: "i want the MODEL ITSELF to get an outline") outline.edgeGlow = 0; outline.pulsePeriod = 0;
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
    const s = game.place.sun,
      ms = quality ? 2048 : 1024;
    if (s.shadow.mapSize.x !== ms) {
      s.shadow.mapSize.set(ms, ms);
      if (s.shadow.map) {
        s.shadow.map.dispose();
        s.shadow.map = null;
      }
    }
    s.shadow.radius = quality ? 4 : 2;
  }
  resize();
}
function size() {
  return [+(Q.get('w') || window.innerWidth), +(Q.get('h') || window.innerHeight)];
}
function resize() {
  const [w, h] = size();
  renderer.setSize(w, h, !Q.has('w'));
  if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
  }
  document.body.classList.toggle('phone', w / h < 0.8 || w < 640);
  if (game.place) {
    game.place.fit(w / h);
    if (game.player) game.place.cam?.snap?.(game.player.root.position);
  }
}
window.addEventListener('resize', resize);
// the 3D objects that stand for a marker (people's bodies, a thing's obj or outline())
function objsOf(m) {
  const P = game.place;
  if (!P || !m) return [];
  const r = P.people && P.people[m.id];
  if (r && r.root && r.root.visible) return [r.root];
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
  const P = game.place,
    key = P.name + ':' + id;
  if (nearCache.has(key)) return nearCache.get(key);
  const a = t.anchor(new THREE.Vector3()),
    box = new THREE.Box3(),
    c = new THREE.Vector3(),
    sz = new THREE.Vector3(),
    out = [];
  P.space.updateMatrixWorld(true);
  P.space.traverse((o) => {
    if (!o.isMesh || !o.visible || o.isSkinnedMesh) return;
    box.setFromObject(o);
    box.getCenter(c);
    box.getSize(sz);
    if (sz.x > 1.6 || sz.z > 1.6 || sz.y > 2.2) return; // walls, floors, counters
    if (Math.hypot(c.x - a.x, c.z - a.z) < 0.55 && c.y < a.y + 0.3) out.push(o);
  });
  nearCache.set(key, out);
  return out;
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
  if (!outline || !outline.enabled) return;
  if (titleUp()) {
    if (outlineKey !== 'title') {
      outlineKey = 'title';
      outline.selectedObjects = [];
    }
    return;
  }
  const sel = [...new Set([game.near, !document.body.classList.contains('phone') && game.hover].filter(Boolean))];
  const key = sel.map((m) => m.id).join(',') + (game.busy ? '|b' : '');
  if (key === outlineKey) return;
  outlineKey = key;
  outline.selectedObjects = game.busy ? [] : sel.flatMap(objsOf);
}
// a tap while a scene plays out with no line waiting: hurry it along (ui.js calls this)
game.skip = () => {
  if (game.busy) game.setHurry(true);
};
game.setQuality = (q) => {
  quality = q;
  applyQuality();
};
window.addEventListener('amakawa:settings', (e) => {
  if (e.detail && e.detail.key === 'quality' && !Q.has('q')) {
    quality = tierNow();
    applyQuality();
  }
});

// ---------- things, markers, triggers ----------
const { buildMarkers, use, standUp, held, holdNudge, say } = installInteractions(game);

// ---------- input ----------
const raycaster = new THREE.Raycaster();
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
  buildMarkers,
  nearSet,
  zoneSet,
  snapshot,
  crossfade,
});
const targets = createTargets(game);
game.posOf = targets.posOf;
installMovementHooks(game, targets);
installPresentationHooks(game, { ...targets, canvas, TS });
installGesturesHooks(game, targets);
installKotodamaHooks(game, { renderer, objsOf });
installProgressionHooks(game, { travel });

// ---------- entering places ----------
function snapshot() {
  render();
  try {
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
}
function crossfade(url) {
  if (!url) return;
  const img = document.getElementById('xfade');
  img.src = url;
  img.classList.remove('go');
  img.style.opacity = '1';
  img.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      img.classList.add('go');
      img.style.opacity = '0';
      setTimeout(() => {
        img.hidden = true;
      }, 1300);
    }),
  );
}

// ---------- loop ----------
let lastT = performance.now();
let frames = 0;
// stills and frame sequences (?cap): advance game time exactly, independent of how slow the renderer is
if (CAP)
  window.__advance = (sec) => {
    for (let t = sec; t > 1e-6; t -= 1 / 30) step(Math.min(1 / 30, t));
  };
function frame() {
  const now = performance.now();
  if (game.paused) {
    lastT = now;
    render();
    requestAnimationFrame(frame);
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
  requestAnimationFrame(frame);
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
  if (game.walker && !mio.seated && !mio.scripted) moving = game.walker.update(dt, place.camera);
  if (!mio.seated && !mio.scripted) {
    mio.setState(moving ? 'walk' : 'idle');
    mio.setGait?.(game.walker.gait ? game.walker.gait.v : null);
  } else mio.setGait?.(null);
  mio.update(dt, 1.25);
  if (game.mioNpc.root.visible) game.mioNpc.update(dt, 1.25);
  game.stepTweens(dt);
  place.update(dt, game.t);
  softSeparate(game, dt); // people overlapping are pushed apart gently (move.js, soft collision)
  place.cam?.update?.(dt, mio.root.position);
  if (!game.saveEnabled) return;
  // nearest usable thing, the Say target, and near/zone triggers
  let near = null,
    nd = 0.95,
    st = null,
    sd = 2.2;
  // seated he can reach a bit further (his seat spot is not the bench edge), but not across the carriage
  const seatedReach = game.player.seated ? 0.35 : 0;
  const mp = mio.root.position;
  // people are in reach within talking range of the person, from any side (not only at their one marker spot); the
  // current goal wins a close call (QA round 1: E and the phone's Use button picked the reader next to Mio)
  const who = new Map();
  for (const b of bodies(game)) who.set(b.id, b);
  const talkR = 0.8 * (place.charScale || 1);
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    const s = m.spot ? m.spot() : null;
    if (!s) continue;
    const d = Math.hypot(mp.x - s[0], mp.z - s[1]);
    const b = /person/.test(m.kind || '') && who.get(m.id);
    const dr =
      b && b.root !== mio.root ? Math.min(d, Math.max(0, Math.hypot(mp.x - b.x, mp.z - b.z) - talkR) + 0.3) : d;
    const dn = dr - (m.goal && m.goal() ? 0.3 : 0);
    if (!game.busy && dn < nd + seatedReach) {
      nd = dn - seatedReach;
      near = m;
    }
    const bias =
      (m.goal && m.goal() ? -1.2 : 0) +
      (/person/.test(m.kind || '') ? -0.7 : 0) +
      (m.wordable && m.wordable() ? -0.6 : 0);
    // Say works on what's in reach; goals and people win over things when several are close
    if (!game.busy && known.size && d < 1.6 + seatedReach && d + bias < sd) {
      sd = d + bias;
      st = m;
    }
    if (d < 0.9) {
      if (!nearSet.has(m.id) && !game.busy) {
        nearSet.add(m.id);
        game.runner.trigger('near:' + m.id);
      }
    } else if (d > 1.3) nearSet.delete(m.id);
  }
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
  // Say beside the target: shown when a known word does something there (or while the Say tip is up)
  let sayShow = false,
    sx = 0,
    sy = 0;
  if (st && !game.busy && known.size) {
    const any = SAYABLE.some(
      (w) => known.has(w) && (game.runner.has(`say:${w}:${st.id}`) || game.runner.has(`say:${w}:*`)),
    );
    if (any || ui.sayIntro) {
      const v = st.anchor(new THREE.Vector3()).project(place.camera);
      sx = ((v.x + 1) / 2) * canvas.clientWidth;
      sy = ((1 - v.y) / 2) * canvas.clientHeight;
      sayShow = true;
    }
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
  installSim(game); // bonds: bond, bondStep, remember, fact, relate hooks (js/bonds/)
  assertRegistered(GLOBAL_HOOKS, game.hooks, 'global hooks');
  if (Q.has('slift')) setSitLift(+Q.get('slift'));
  // Eric: Jørgen's Meshy model; the code-built chibi is the fallback (?eric=chibi, or if loading fails)
  game.player =
    Q.get('eric') === 'chibi'
      ? makeAvatar()
      : await loadEric().catch((e) => {
          console.warn('Meshy Eric failed, using the chibi', e);
          return makeAvatar();
        });
  game.player.root.add(blob(0.55, 0.4));
  // Mio is an NPC now: Jørgen's Meshy model, colour-tweaked only, shown wherever the story puts her
  game.mioNpc = await loadMio({ height: 1.12 });
  game.mioNpc.meshy = true;
  game.mioNpc.root.visible = false;
  game.mioNpc.blob = blob(0.55, 0.4);
  game.mioNpc.root.add(game.mioNpc.blob);
  requestAnimationFrame(frame);
  const start = Q.get('place') || 'train';
  const showTitle = start === 'train' && !Q.has('skip') && !TEST && !CAP;
  const saved = showTitle ? loadSave() : null;
  game.saveEnabled = !showTitle;
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
      game.busy = true;
      restore(game, saved);
      await enter(saved.place || 'train', { persist: false, resuming: true });
      // Rebuild the saved room directly. Arrival cinematics and opening scenes belong to new visits.
      game.place.restoreState?.(saved);
      // Schedule hooks may set visibility flags; saved progression remains authoritative.
      for (const key of Object.keys(flags)) delete flags[key];
      Object.assign(flags, saved.flags || {});
      ui.refreshWords();
      ui.refreshPeople(sim.met.size);
      ui.refreshBag(sim);
      ui.goal(saved.ui?.goal || '');
      ui.sideGoal(saved.ui?.sideGoal || '');
      game.hold = saved.ui?.hold || null;
      game.busy = false;
      game.saveEnabled = true;
      const transition = saved.transition;
      if (saved.ended) {
        showEnd(game);
        save(game);
      } else if (transition && NEXT[transition.from] === transition.to && PLACES[transition.to]) {
        await travel(transition.to, { arriving: saved.place === transition.to, fromName: transition.from });
      } else if (saved.runner?.execution || saved.runner?.queued?.length)
        await game.beat(async () => {
          await game.runner.resume();
        });
      else if (saved.pendingStart === game.place.name || needsLegacyOpening(saved, game.story))
        startScene(game.place.name);
      else {
        game.resumeWalks();
        save(game);
      }
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
  unlockAudio();
  sfx('tap');
  t.classList.add('out');
  setTimeout(() => {
    t.hidden = true;
  }, 700);
  return pick;
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('ui').insertAdjacentHTML('beforeend', `<div class="err">Couldn't start: ${e.message}</div>`);
});
