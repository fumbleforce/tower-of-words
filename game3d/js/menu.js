// The product shell around the day: the boot loader, the title (a posed shot of the train from outside, then a
// camera flight into the car on Start), settings, the pause menu (with quick save and load; the saves screen is saves/), and the
// loading chip between places. Talks to the game through window.__game.
//
// Hooks it expects from main.js (see notes/production-requests.md):
//   game.paused       menu.js sets it while the pause menu is open; the loop skips step() meanwhile
//   body.loading      places/lifecycle.js sets it while travel() waits for the next place to finish building
// Without them the pause menu still stops sound, input and text, and the loading chip never shows.
//
// QA: ?shell=title|settings|pause|save|load|loading|end opens that screen on its own (with made-up save data),
// for screenshots of each screen in isolation (game3d/tools/shell-shots.mjs).
import { ui, sfx, unlockAudio, pauseAudio } from './ui.js';
import { settings } from './settings.js';
import { sim, periodName } from './sim.js';
import { startOnboarding, resetOnboarding } from './onboard.js';
import { PLACE_NAMES } from './places/definitions.js';
import { installGoalArrow } from './ui/goal-arrow.js';
import { addDayPicker } from './ui/title-days.js';
import { poseTitleCamera, releaseTitleCamera, flightAt } from './ui/title-camera.js';
import { snapshot, crossfade } from './places/crossfade.js';
import { settingsView } from './ui/settings-view.js';
import { createSaving, kv, store as slots } from './saves/actions.js';
import { savesView } from './saves/view.js';
import { KEYS, slotKey } from './saves/store.js';

const Q = new URLSearchParams(location.search);
const TEST = Q.get('test') === 'fast',
  CAP = Q.has('cap'),
  SHELL = Q.get('shell');
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const game = () => window.__game;
const shell = (window.__shell = { photos: {}, PLACE_NAMES });

// ---------- thumbnails: a frame of the world with no UI on it ----------
// The canvas keeps its picture only until the frame is shown, so the copy is taken in an animation frame
// callback queued after main.js's own (which has just rendered).
function grab(w = 320, aspect = 1.6) {
  return new Promise((res) => {
    setTimeout(
      () =>
        requestAnimationFrame(() => {
          try {
            const c = $('#c');
            if (!c || !c.width) return res(null);
            const h = Math.round(w / aspect),
              cv = document.createElement('canvas');
            cv.width = w;
            cv.height = h;
            let sw = c.width,
              sh = c.width / aspect;
            if (sh > c.height) {
              sh = c.height;
              sw = sh * aspect;
            }
            cv.getContext('2d').drawImage(c, (c.width - sw) / 2, (c.height - sh) / 2, sw, sh, 0, 0, w, h);
            res(cv.toDataURL('image/jpeg', 0.74));
          } catch {
            res(null);
          }
        }),
      0,
    );
  });
}
shell.grab = grab;

// ---------- helpers ----------
const phone = () => document.body.classList.contains('phone');
function focusables(root) {
  return [...root.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), input, [tabindex="0"]')].filter(
    (e) => e.offsetParent !== null,
  );
}
// Tab stays inside an open layer; Up and Down move through its list of buttons
function trap(root, e) {
  const f = focusables(root);
  if (!f.length) return;
  if (e.key === 'Tab') {
    const i = f.indexOf(document.activeElement);
    const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i + 1) % f.length;
    f[n].focus();
    e.preventDefault();
  } else if (
    (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
    document.activeElement &&
    document.activeElement.closest('.mlist')
  ) {
    const list = [...document.activeElement.closest('.mlist').querySelectorAll('button:not([disabled])')].filter(
      (b) => b.offsetParent !== null,
    );
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
    e.preventDefault();
  }
}
const layers = []; // open layers, top last: { el, close }
function openLayer(elm, close) {
  const prev = document.activeElement;
  for (const l of layers) l.el.classList.add('under');
  document.body.append(elm); // the active layer must paint above layers opened earlier
  elm.hidden = false;
  elm.classList.remove('out');
  void elm.offsetWidth;
  elm.classList.add('in');
  layers.push({ el: elm, close, prev });
  // focus at once (not in an animation frame: a slow frame would leave the keyboard on the page behind)
  const f = focusables(elm);
  (elm.querySelector('[data-first]') || f[0])?.focus({ preventScroll: true });
}
function closeLayer(elm) {
  const i = layers.findIndex((l) => l.el === elm);
  if (i < 0) return;
  const [l] = layers.splice(i, 1);
  if (layers.length) layers[layers.length - 1].el.classList.remove('under');
  elm.classList.remove('in');
  elm.classList.add('out');
  setTimeout(() => {
    if (!elm.classList.contains('in')) elm.hidden = true;
  }, 180);
  if (l.prev && l.prev.isConnected) l.prev.focus({ preventScroll: true });
}
const topLayer = () => layers[layers.length - 1];

// ---------- boot loader (markup in index.html) ----------
function hideBoot() {
  const b = $('#boot');
  if (!b || b.classList.contains('gone')) return;
  b.classList.add('gone');
  setTimeout(() => b.remove(), 700);
  window.__shellBooted = true;
}

// ---------- title ----------
// The key art is the game itself: the train's own scene, seen from outside the car at dawn. On Start the camera
// flies from there into the car and lands on the play view while the title fades, so the day starts with no cut.
// Continue (and a loaded slot, quick load or Day 2, which reload into it) has no flight: the shot holds under the
// loading chip until the saved place is in, then crossfades to it (shell.titleEntered, called by continue.js).
// The train's clacks and carriage bed stay quiet under the title (sfx.js titleQuiet). The camera: ui/title-camera.js.
shell._flightAt = flightAt; // QA: a point k (0..1) of the flight, for stills
function buildTitle() {
  const t = $('#title');
  if (!t || t.dataset.shell) return t;
  t.dataset.shell = '1';
  const cont = t.querySelector('.cont'); // main.js listens on .go and .cont; .cont stays hidden
  const inner = t.querySelector('.inner');
  const menu = el('nav', 'mlist tmenu');
  menu.setAttribute('aria-label', 'Title menu');
  const go = t.querySelector('.go');
  go.dataset.first = '';
  const mc = el('button', 'mcont', '<span class="l">Continue</span><span class="s"></span>');
  mc.type = 'button';
  const ms = el('button', 'msettings', 'Settings');
  ms.type = 'button';
  menu.append(go, mc, ms);
  inner.querySelector('.btns')?.remove();
  inner.querySelector('.keys')?.remove();
  inner.append(menu);
  addDayPicker(menu, ms, {
    inProgress: () => !!slots.info('auto') && !slots.info('auto').data.ended,
    keys: { SAVE_KEY: KEYS.SAVE, AUTO_META: KEYS.AUTO_META, CONTINUE_FLAG: KEYS.CONTINUE },
  });
  t.append(cont);
  go.innerHTML = '<span class="l">Start</span>';
  mc.onclick = () => {
    sfx('tap');
    openSaves('load');
  };
  ms.onclick = () => {
    sfx('tap');
    openSettings();
  };
  go.addEventListener('click', () => {
    resetOnboarding();
    onTitleLeave();
  });
  cont.addEventListener('click', () => {
    onTitleLeave({ fly: false });
  });
  t.addEventListener('keydown', (e) => {
    if (!topLayer()) trap(t, e);
  });
  return t;
}
function refreshTitle() {
  const t = $('#title');
  if (!t) return;
  const mc = t.querySelector('.mcont');
  const latest = slots.latest();
  mc.hidden = !latest;
  if (latest)
    mc.querySelector('.s').textContent =
      `${latest.data?.day > 1 ? `Day ${latest.data.day} · ` : ''}${PLACE_NAMES[latest.place] || latest.place} · ${periodName(latest.period, latest.data?.day) || ''}`;
}
let titleShown = false;
function onTitleShow() {
  if (titleShown) return;
  titleShown = true;
  buildTitle();
  refreshTitle();
  document.body.classList.add('at-title');
  poseTitleCamera();
  // a save picked on the last visit's title (a reload carries the choice): continue straight into it, with the
  // boot loader up until the saved place is in (shell.titleEntered), so no title shot shows first
  if (sessionStorage.getItem(KEYS.CONTINUE)) {
    sessionStorage.removeItem(KEYS.CONTINUE);
    $('#title .cont').click();
    return;
  }
  // the boot loader goes once the posed shot has had a frame to render
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      hideBoot();
      requestAnimationFrame(() => $('#title .go')?.focus({ preventScroll: true }));
    }),
  );
}
function onTitleLeave({ fly = true } = {}) {
  const b = document.body.classList;
  if (!b.contains('at-title')) return;
  b.add('title-leaving');
  if (!fly) b.add('title-cont', 'loading');
  b.remove('at-title');
  // the title shot, to crossfade from (read in the frame after the game's own draw); none behind the boot loader
  contSnap = null;
  if (!fly && !$('#boot:not(.gone)')) requestAnimationFrame(() => (contSnap = snapshot(() => {}, $('#c'))));
  unlockAudio();
  if (fly) releaseTitleCamera(1700).then(() => b.remove('title-leaving'));
}
// Continue: the saved place is in (continue.js); the title shot lets go of the camera with no flight
let contSnap = null;
shell.titleEntered = () => {
  const b = document.body.classList;
  if (!b.contains('title-cont')) return;
  releaseTitleCamera(0);
  b.remove('title-cont', 'loading', 'title-leaving');
  hideBoot();
  crossfade(contSnap);
};

// ---------- settings (the panel is ui/settings-view.js) ----------
const settingsPanel = settingsView({ openLayer, closeLayer, trap });
const openSettings = settingsPanel.open;
shell.openSettings = openSettings;

// ---------- saves (saves/actions.js: saving and loading; saves/view.js: the screen) ----------
let pendingThumb = null; // a frame taken as the pause menu opens, before it covers the world
const saving = createSaving({ game, grab, openLayer, closeLayer, setPaused: (on) => setPaused(on) });
const savesPanel = savesView({
  saving,
  openLayer,
  closeLayer,
  trap,
  thumbNow: async () => pendingThumb || (await grab()),
});
const openSaves = (mode) => savesPanel.open(mode);
shell.saving = saving;
shell.closeLayers = () => layers.slice().forEach((l) => closeLayer(l.el));
Object.assign(shell, { openLayer, closeLayer }); // the map is a layer too (ui/map/view.js)
saving.noteAutosave();

// ---------- pause ----------
function buildPause() {
  let p = $('#pause');
  if (p) return p;
  p = el(
    'div',
    'layer pause',
    `<div class="scrim"></div>
    <section class="pane" role="dialog" aria-modal="true" aria-labelledby="pauseTitle">
      <h2 id="pauseTitle">Paused</h2>
      <p class="where"></p>
      <nav class="mlist pmenu">
        <button type="button" class="resume primary" data-first>Resume</button>
        <button type="button" class="qsave">Quick save<kbd class="desk">F5</kbd></button>
        <button type="button" class="qload">Quick load<kbd class="desk">F9</kbd></button>
        <button type="button" class="save">Save</button>
        <button type="button" class="load">Load</button>
        <button type="button" class="settings">Settings</button>
        <button type="button" class="quit">Quit to title</button>
      </nav>
      <div class="confirmq" hidden>
        <p>Quit to the title? Anything since your last save is lost.</p>
        <div class="mlist row2"><button type="button" class="yes">Quit</button><button type="button" class="no primary">Keep playing</button></div>
      </div>
      <p class="keys desk">Esc to resume</p>
    </section>`,
  );
  p.id = 'pause';
  p.hidden = true;
  document.body.appendChild(p);
  p.querySelector('.resume').onclick = () => setPaused(false);
  p.querySelector('.save').onclick = () => {
    sfx('tap');
    openSaves('save');
  };
  p.querySelector('.qsave').onclick = () => saving.quickSave();
  p.querySelector('.qload').onclick = () => {
    sfx('tap');
    saving.quickLoad();
  };
  p.querySelector('.load').onclick = () => {
    sfx('tap');
    openSaves('load');
  };
  p.querySelector('.settings').onclick = () => {
    sfx('tap');
    openSettings();
  };
  p.querySelector('.quit').onclick = () => {
    sfx('tap');
    p.querySelector('.pmenu').hidden = true;
    p.querySelector('.confirmq').hidden = false;
    p.querySelector('.confirmq .no').focus();
  };
  p.querySelector('.confirmq .no').onclick = () => {
    p.querySelector('.confirmq').hidden = true;
    p.querySelector('.pmenu').hidden = false;
    p.querySelector('.quit').focus();
  };
  p.querySelector('.confirmq .yes').onclick = () => {
    document.body.classList.add('reloading');
    setTimeout(() => location.reload(), 200);
  };
  p.addEventListener('keydown', (e) => {
    if (topLayer()?.el === p) trap(p, e);
    e.stopPropagation();
  });
  return p;
}
let isPaused = false;
function canPause() {
  const g = game();
  return (
    g &&
    !g.runner?.recoveryError &&
    g.place &&
    !TEST &&
    !CAP &&
    !document.body.classList.contains('at-title') &&
    !document.body.classList.contains('title-leaving') &&
    !window.__ended
  );
}
function setPaused(on) {
  if (game()?.runner?.recoveryError) return;
  if (on === isPaused) return;
  if (on && !canPause() && !SHELL) return;
  const g = game(),
    p = buildPause();
  isPaused = on;
  if (g) g.paused = on;
  pauseAudio(on);
  document.body.classList.toggle('paused', on);
  if (on) {
    grab().then((t) => {
      pendingThumb = t;
    });
    p.querySelector('.load').disabled = !slots.any();
    p.querySelector('.qload').disabled = !slots.info('quick');
    p.querySelector('.where').textContent = [PLACE_NAMES[g?.place?.name] || '', periodName(sim.period) || '', sim.date]
      .filter(Boolean)
      .join(' · ');
    p.querySelector('.pmenu').hidden = false;
    p.querySelector('.confirmq').hidden = true;
    sfx('tap');
    openLayer(p, () => setPaused(false));
  } else {
    layers
      .slice()
      .reverse()
      .forEach((l) => closeLayer(l.el));
    pendingThumb = null;
  }
}
shell.setPaused = setPaused;
shell.isPaused = () => isPaused;

// Esc releases mouse capture, then closes a layer or opens pause. Capture runs before ui.js; paused keys stay here.
window.addEventListener(
  'keydown',
  (e) => {
    if (game()?.runner?.recoveryError) {
      e.stopImmediatePropagation();
      if (e.code === 'Escape') e.preventDefault();
      return; // Tab and button activation keep their native dialog behaviour.
    }
    // Enter and Space on a focused menu button click it; the game's own Enter/Space (talk, advance) must not
    // swallow them first
    if (
      (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') &&
      e.target &&
      e.target.tagName === 'BUTTON' &&
      e.target.closest('#title, .layer, #end, #sayMenu, .panel, #cmdsPanel, #hint, #sayTip')
    ) {
      e.stopImmediatePropagation();
      return;
    }
    if (settingsPanel.captureKey(e)) return;
    // F5 quick save, F9 quick load (the browser's own F5 reload is kept off once the game is running)
    if ((e.code === 'F5' || e.code === 'F9') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const top = topLayer();
      const free = !top || top.el.id === 'pause';
      if (e.code === 'F5' && (saving.canSave() || !document.body.classList.contains('at-title'))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (free && !e.repeat) saving.quickSave();
        return;
      }
      if (e.code === 'F9') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (free && !e.repeat && !document.body.classList.contains('reloading')) saving.quickLoad();
        return;
      }
    }
    // Say (Q by default, rebindable): opens the Say menu, or closes it again. Taken here in the capture phase so the
    // key does nothing else in the game.
    if (
      e.code === (settings.keySay || 'KeyQ') &&
      !e.repeat &&
      !topLayer() &&
      !isPaused &&
      !(e.target && e.target.tagName === 'INPUT') &&
      !document.body.classList.contains('at-title')
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
      const menu = $('#sayMenu');
      const g = game();
      if (menu && !menu.hidden) {
        menu.querySelector('.cancel')?.click();
        return;
      }
      if (g && !g.busy && !ui.talking && ui.menuClosed() && ui.onSay) ui.onSay();
      return;
    }
    if (e.key === 'Escape') {
      if (game()?.followCamera?.captured) return game().followCamera.releaseMouse();
      const top = topLayer();
      if (top) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (top.el.id === 'pause') {
          const c = top.el.querySelector('.confirmq');
          if (!c.hidden) {
            c.querySelector('.no').click();
            return;
          }
          setPaused(false);
        } else if (top.close) top.close();
        else closeLayer(top.el);
        return;
      }
      if (!$('#sayMenu')?.hidden) return; // ui.js closes the Say menu
      for (const pnl of document.querySelectorAll('#cmdsPanel, .panel')) {
        if (!pnl.hidden) {
          pnl.hidden = true;
          e.preventDefault();
          return;
        }
      }
      if (canPause()) {
        e.preventDefault();
        setPaused(true);
      }
      return;
    }
    if (isPaused || topLayer()) {
      // keys inside a menu go to it (its own listener stops them there, before the game's window listeners);
      // keys anywhere else don't reach the game while a menu is open
      if (e.target.closest && e.target.closest('.layer')) return;
      e.stopImmediatePropagation();
      if (/^(Space|Enter|Key[WASDEFQ]|Arrow|Digit)/.test(e.code)) e.preventDefault();
    }
  },
  true,
);
// the page going to the background pauses the game (phones switching apps)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && canPause()) setPaused(true);
});

function addPauseChip() {
  const hud = $('#hud');
  if (!hud || $('#pauseBtn')) return;
  // a settings cog: it opens the pause menu (resume, save, settings, quit)
  const b = el(
    'button',
    'hchip icon',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.4"/></svg>',
  );
  b.id = 'pauseBtn';
  b.type = 'button';
  b.setAttribute('aria-label', 'Menu and settings');
  b.onclick = (e) => {
    e.stopPropagation();
    setPaused(true);
  };
  hud.appendChild(b);
  saving.addQuickChip(hud, b);
}

// ---------- loading between places ----------
// The trips between places are continuous (a walk out, a crossfade, a walk in). If the next place is still being
// built when the walk out ends, a small chip says so over the held frame, in the HUD's style, instead of a black
// screen. Only that wait (body.loading, places/lifecycle.js) shows it; never a watched walk.
function buildLoadChip() {
  let c = $('#loadchip');
  if (c) return c;
  c = el(
    'div',
    'hchip',
    '<span class="track" aria-hidden="true"><i></i></span><span class="lt">Loading</span><span class="dest"></span>',
  );
  c.update = () => {
    const d = PLACE_NAMES[window.__game?.transition?.to];
    c.querySelector('.dest').textContent = d || '';
    c.querySelector('.lt').textContent = d ? 'On the way to' : 'Loading';
  };
  c.id = 'loadchip';
  c.hidden = true;
  c.setAttribute('role', 'status');
  document.body.appendChild(c);
  return c;
}
let loadTimer = 0;
function watchLoading() {
  const c = buildLoadChip();
  const check = () => {
    const b = document.body;
    const want = b.classList.contains('loading');
    if (want && c.hidden && !loadTimer)
      loadTimer = setTimeout(() => {
        loadTimer = 0;
        c.update();
        c.hidden = false;
        c.classList.add('in');
        b.classList.add('loadwait');
      }, 350);
    // (only touch the class when it changes: classList.remove rewrites the attribute even when the class isn't there,
    // which fires this observer again, forever: the page hung on load)
    if (!want) {
      clearTimeout(loadTimer);
      loadTimer = 0;
      if (b.classList.contains('loadwait')) b.classList.remove('loadwait');
      if (!c.hidden) {
        c.classList.remove('in');
        c.hidden = true;
      }
    }
  };
  new MutationObserver(check).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-place'] });
  setInterval(check, 500);
}

// ---------- the current target, and cycling through things in reach ----------
// main.js picks the nearest thing as the target every frame, and holds a chosen one (game.targetLock) while it's
// usable and within 1.7 m. When several are close (the gate: guard, gate, cat, sign-in sheet), Tab (or Next in the
// action menu) steps to the next in reach, locks it and opens its menu. What's in reach is read from the markers'
// per-frame update.
function targetCycling() {
  const g = game();
  const mk = g && g.markers;
  if (!mk || mk._cycling) return;
  mk._cycling = true;
  const orig = mk.update.bind(mk);
  const REACH = 1.1;
  let lockPlace = null,
    list = [];
  const dist = (m, p) => {
    const s = m.spot ? m.spot() : null;
    return s ? Math.hypot(p.x - s[0], p.z - s[1]) : 99;
  };
  mk.update = (camera, canvas, mp, near) => {
    const G = game();
    if (G.place !== lockPlace) {
      G.targetLock = null;
      lockPlace = G.place;
    }
    list = G.busy
      ? []
      : mk.list
          .filter((m) => {
            try {
              return m.enabled() && dist(m, mp) < REACH;
            } catch {
              return false;
            }
          })
          .sort((x, y) => dist(x, mp) - dist(y, mp));
    if (near && !list.includes(near)) list.unshift(near);
    ui.cycleInfo = list.length > 1 && near ? { n: list.length, i: Math.max(0, list.indexOf(near)), next: cycle } : null;
    return orig(camera, canvas, mp, near);
  };
  function cycle() {
    const G = game();
    if (!list.length) return;
    const i = list.indexOf(G.targetLock || G.near);
    G.targetLock = list[(i + 1) % list.length];
    ui.openActs((G.near = G.targetLock));
    sfx('tap');
  }
  shell.cycleTarget = cycle;
}
window.addEventListener(
  'keydown',
  (e) => {
    if (
      e.code !== 'Tab' ||
      topLayer() ||
      isPaused ||
      document.body.classList.contains('at-title') ||
      (window.__onboard && window.__onboard.active)
    )
      return;
    const g = game();
    if (!g || g.busy || ui.talking || !ui.menuClosed() || !ui.cycleInfo) return;
    if (e.target && e.target.closest && e.target.closest('#ui button, input')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    shell.cycleTarget && shell.cycleTarget();
  },
  true,
);

// ---------- photos of the day, for the end screen ----------
// A quiet frame per place once photoReady() allows (#92; tests: ?photos); end.js redoes the last
let placeSince = 0,
  placeName = '';
async function photo(n, replace = false) {
  const shot = await grab(560, 1.5);
  if (shot && (replace || !shell.photos[n])) shell.photos[n] = { src: shot, period: sim.period };
  try {
    sessionStorage.setItem('amakawa-photos', JSON.stringify(shell.photos));
  } catch {
    /* */
  }
}
const canShoot = (g) => g?.place && (!TEST || Q.has('photos')) && !CAP && !SHELL && g.place.photoReady?.() !== false;
shell.photoNow = async () => {
  const g = game();
  if (canShoot(g)) await photo(g.place.name, true);
};
setInterval(async () => {
  const g = game();
  if (!canShoot(g) || document.body.classList.contains('at-title') || document.body.classList.contains('title-leaving'))
    return;
  const n = g.place.name,
    now = performance.now();
  if (n !== placeName) {
    placeName = n;
    placeSince = now;
    return;
  }
  if (shell.photos[n] || isPaused) return;
  const leaving = document.body.classList.contains('trip') && g.transition?.phase === 'leaving';
  if (!leaving && (now - placeSince < 3500 || g.busy || ui.talking || document.body.classList.contains('trip'))) return;
  await photo(n);
}, 1000);
try {
  Object.assign(shell.photos, JSON.parse(sessionStorage.getItem('amakawa-photos') || '{}'));
} catch {
  /* */
}

// ---------- start ----------
function whenReady(fn) {
  const tick = () => {
    if ($('#hud') && window.__game) fn();
    else setTimeout(tick, 60);
  };
  tick();
}
whenReady(() => {
  addPauseChip();
  watchLoading();
  installGoalArrow({ game, phone, paused: () => isPaused, root: $('#ui') });
  targetCycling();
  startOnboarding(game());
  const t = $('#title');
  if (t) {
    buildTitle();
    const obs = new MutationObserver(() => {
      if (!t.hidden && !t.classList.contains('out')) onTitleShow();
    });
    obs.observe(t, { attributes: true, attributeFilter: ['hidden', 'class'] });
    if (!t.hidden) onTitleShow();
  }
  // no title (a test run, a capture, ?place= or ?skip): the loader goes once the first place is in
  const g0 = () => {
    const g = game();
    if (g && g.place && (t?.hidden ?? true) && !titleShown) {
      if (!SHELL) hideBoot();
    } else if (!window.__shellBooted) setTimeout(g0, 200);
  };
  setTimeout(g0, 400);
  if (SHELL)
    import('./shell-qa.js')
      .then((m) =>
        m.run(SHELL, {
          openSettings,
          openSaves,
          setPaused,
          onTitleShow,
          hideBoot,
          store: kv,
          SLOT: slotKey,
          SAVE_KEY: KEYS.SAVE,
          AUTO_META: KEYS.AUTO_META,
          grab,
        }),
      )
      .catch((e) => console.error(e));
});
