// The product shell around the day: the boot loader, the title (a posed shot of the train from outside, then a
// camera flight into the car on Start), settings, the pause menu, three save slots with thumbnails, and the
// loading chip between places. Talks to the game through window.__game.
//
// Hooks it expects from main.js (see notes/production-requests.md):
//   game.paused       menu.js sets it while the pause menu is open; the loop skips step() meanwhile
//   body.loading      places/lifecycle.js sets it while travel() waits for the next place to finish building
// Without them the pause menu still stops sound, input and text, and the loading chip never shows.
//
// QA: ?shell=title|settings|pause|save|load|loading|end opens that screen on its own (with made-up save data),
// for screenshots of each screen in isolation (game3d/tools/shell-shots.mjs).
import * as THREE from 'three';
import { ui, sfx, unlockAudio, pauseAudio, keyLabel } from './ui.js';
import { settings, setSetting, onSettings, qualityTier } from './settings.js';
import { sim, PERIOD_NAMES, save as simSave } from './sim.js';
import { startOnboarding, resetOnboarding } from './onboard.js';
import { browserSpeechAvailable, prepareVoice } from './speech.js';
import { PLACE_NAMES } from './places/definitions.js';
import { installGoalArrow } from './ui/goal-arrow.js';

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
const SAVE_KEY = 'amakawa-day1-save',
  AUTO_META = 'amakawa-auto-meta',
  SLOT = (i) => `amakawa-slot-${i}`,
  CONTINUE_FLAG = 'amakawa-continue';
const store = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null');
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
};
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
const fmtTime = (t) => {
  if (!t) return '';
  const d = new Date(t),
    now = new Date();
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today ${hm}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday ${hm}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${hm}`;
};
const phone = () => document.body.classList.contains('phone');
function focusables(root) {
  return [...root.querySelectorAll('button:not([disabled]), input, [tabindex="0"]')].filter(
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
const TITLE_POSE = {
  land: { t: [-2.6, -0.9, 0.6], el: 24, yaw: 30, d: 16, fov: 30 },
  port: { t: [-0.3, -2.0, 0.6], el: 32, yaw: -62, d: 17, fov: 40 },
};
let titleCam = null;
function poseTitleCamera() {
  const g = game();
  if (!g || !g.place || g.place.name !== 'train' || titleCam) return;
  const cam = g.place.cam,
    camera = g.place.camera;
  const orig = { update: cam.update, fov: camera.fov };
  let t0 = performance.now();
  const place = () => {
    const P = TITLE_POSE[camera.aspect >= 1 ? 'land' : 'port'];
    if (camera.fov !== P.fov) orig.fov = camera.fov; // a resize re-fit the game camera: remember its fov
    const drift = settings.reduceMotion ? 0 : Math.sin((performance.now() - t0) / 9000) * 3.5; // a slow sway of a few degrees
    const el = THREE.MathUtils.degToRad(P.el),
      yw = THREE.MathUtils.degToRad(P.yaw + drift);
    camera.fov = P.fov;
    camera.updateProjectionMatrix();
    camera.position.set(
      P.t[0] + Math.sin(yw) * Math.cos(el) * P.d,
      P.t[1] + Math.sin(el) * P.d,
      P.t[2] + Math.cos(yw) * Math.cos(el) * P.d,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(P.t[0], P.t[1], P.t[2]);
    camera.updateMatrixWorld();
  };
  cam.update = function () {
    place();
  };
  if (cam.snap) {
    cam._titleSnap = cam.snap;
    cam.snap = function () {
      place();
    };
  }
  place();
  titleCam = { cam, camera, orig, place };
}
// fly from the title shot to the play view; resolves when the camera is back under the game's control
function releaseTitleCamera(ms = 1600) {
  const tc = titleCam;
  if (!tc) return Promise.resolve();
  titleCam = null;
  const { cam, camera, orig } = tc;
  if (cam._titleSnap) {
    cam.snap = cam._titleSnap;
    delete cam._titleSnap;
  }
  const p0 = camera.position.clone(),
    q0 = camera.quaternion.clone(),
    f0 = camera.fov;
  const done = () => {
    cam.update = orig.update;
    camera.fov = orig.fov;
    camera.updateProjectionMatrix();
  };
  if (settings.reduceMotion || ms <= 0) {
    done();
    cam.snap?.(game().player.root.position);
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise((res) => {
    // Continue into another place stops this camera's updates before the flight ends: finish on time anyway, or
    // the UI stays hidden under title-leaving (the day's summary never showed after a Continue in the dorms)
    const late = setTimeout(() => {
      done();
      res();
    }, ms + 400);
    cam.update = function (dt, p) {
      camera.fov = orig.fov;
      orig.update.call(this, dt, p); // where the game camera wants to be now
      const k = Math.min(1, (performance.now() - start) / ms),
        e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const pg = camera.position.clone(),
        qg = camera.quaternion.clone();
      camera.position.lerpVectors(p0, pg, e);
      camera.quaternion.slerpQuaternions(q0, qg, e);
      camera.fov = f0 + (orig.fov - f0) * e;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (k >= 1) {
        clearTimeout(late);
        done();
        res();
      }
    };
  });
}

// QA: hold the camera at a point k (0..1) of the flight from the title shot into the car, for stills
shell._flightAt = (k) => {
  if (!titleCam) poseTitleCamera();
  const tc = titleCam;
  if (!tc) return;
  const { cam, camera, orig } = tc;
  tc.place();
  const p0 = camera.position.clone(),
    q0 = camera.quaternion.clone(),
    f0 = camera.fov;
  camera.fov = orig.fov;
  (cam._titleSnap || orig.update).call(cam, game().player.root.position);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const pg = camera.position.clone(),
    qg = camera.quaternion.clone();
  camera.position.lerpVectors(p0, pg, e);
  camera.quaternion.slerpQuaternions(q0, qg, e);
  camera.fov = f0 + (orig.fov - f0) * e;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  cam.update = () => {};
};

function autosaveInfo() {
  const d = store.get(SAVE_KEY);
  if (!d || !d.place) return null;
  const m = store.get(AUTO_META) || {};
  return {
    kind: 'auto',
    data: d,
    place: d.place,
    period: d.period,
    date: m.date || sim.date,
    at: m.at,
    thumb: m.thumb,
  };
}
function slotInfo(i) {
  const s = store.get(SLOT(i));
  return s && s.data ? { kind: 'slot', i, ...s } : null;
}
function anySave() {
  return !!(autosaveInfo() || [1, 2, 3].some(slotInfo));
}

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
    onTitleLeave();
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
  const a = autosaveInfo();
  const latest = [a, ...[1, 2, 3].map(slotInfo)].filter(Boolean).sort((x, y) => (y.at || 0) - (x.at || 0))[0];
  mc.hidden = !latest;
  if (latest)
    mc.querySelector('.s').textContent =
      `${latest.data?.day > 1 ? `Day ${latest.data.day} · ` : ''}${PLACE_NAMES[latest.place] || latest.place} · ${PERIOD_NAMES[latest.period] || ''}`;
}
let titleShown = false;
function onTitleShow() {
  if (titleShown) return;
  titleShown = true;
  buildTitle();
  refreshTitle();
  document.body.classList.add('at-title');
  poseTitleCamera();
  // the boot loader goes once the posed shot has had a frame to render
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      hideBoot();
      requestAnimationFrame(() => $('#title .go')?.focus({ preventScroll: true }));
    }),
  );
  // a save picked on the last visit's title (a reload carries the choice): continue straight into it
  if (sessionStorage.getItem(CONTINUE_FLAG)) {
    sessionStorage.removeItem(CONTINUE_FLAG);
    $('#title .cont').click();
  }
}
function onTitleLeave() {
  if (!document.body.classList.contains('at-title')) return;
  document.body.classList.remove('at-title');
  document.body.classList.add('title-leaving');
  unlockAudio();
  releaseTitleCamera(1700).then(() => document.body.classList.remove('title-leaving'));
}

// ---------- settings ----------
const SEG = {
  textSpeed: [
    ['slow', 'Slow'],
    ['normal', 'Normal'],
    ['fast', 'Fast'],
    ['instant', 'Instant'],
  ],
  quality: [
    ['auto', 'Auto'],
    ['low', 'Low'],
    ['medium', 'Medium'],
    ['high', 'High'],
  ],
  uiSize: [
    [0.85, 'Small'],
    [1, 'Normal'],
    [1.2, 'Large'],
    [1.4, 'Larger'],
  ],
  voiceInput: [
    ['off', 'Off'],
    ['device', 'On this device'],
    ['browser', 'Browser'],
  ],
  masteryUses: [
    [1, '1'],
    [3, '3'],
    [5, '5'],
  ],
};
const VOICE_NOTE = {
  device:
    'Runs in the game. A one-time download (77 MB on a computer, 147 MB on a phone), then it works offline. What you say stays on this device.',
  browser: "Uses the browser's own recogniser. Chrome sends what you say to Google.",
  off: 'Type the words. Voice is optional.',
};
function buildSettings() {
  let s = $('#settings');
  if (s) return s;
  s = el(
    'div',
    'layer sheet',
    `
    <div class="scrim" data-close></div>
    <section class="pane" role="dialog" aria-modal="true" aria-labelledby="setTitle">
      <header><h2 id="setTitle">Settings</h2><button type="button" class="x" data-close aria-label="Close settings"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
      <div class="rows">
        <div class="row"><span class="lbl" id="l-ts">Text speed</span><div class="seg" role="radiogroup" aria-labelledby="l-ts" data-key="textSpeed"></div></div>
        <div class="row"><span class="lbl" id="l-aa">Auto-advance<small>Lines move on once they've been spoken</small></span><button type="button" class="sw" role="switch" data-key="autoAdvance" aria-labelledby="l-aa"><i></i></button></div>
        <div class="gap"></div>
        ${[
          ['master', 'Master volume'],
          ['music', 'Music'],
          ['voice', 'Voices'],
          ['ambience', 'Ambience'],
        ]
          .map(
            ([k, l]) =>
              `<div class="row"><span class="lbl" id="l-${k}">${l}</span><span class="rng">${k === 'voice' ? '<button type="button" class="sw sm" role="switch" data-key="voiceOn" aria-label="Voices on or off"><i></i></button>' : ''}<input type="range" min="0" max="100" step="5" data-key="${k}" aria-labelledby="l-${k}"><output></output></span></div>`,
          )
          .join('')}
        <div class="gap"></div>
        <div class="row"><span class="lbl" id="l-q">Graphics<small class="qnow"></small></span><div class="seg" role="radiogroup" aria-labelledby="l-q" data-key="quality"></div></div>
        <div class="row"><span class="lbl" id="l-sf">Surface detail<small>Patterns in floors, walls, fabric and metal</small></span><button type="button" class="sw" role="switch" data-key="surfaces" aria-labelledby="l-sf"><i></i></button></div>
        <div class="row"><span class="lbl" id="l-ui">Interface size</span><div class="seg" role="radiogroup" aria-labelledby="l-ui" data-key="uiSize"></div></div>
        <div class="gap"></div>
        <div class="row"><span class="lbl" id="l-vi">Voice input<small class="vnote"></small></span><div class="seg" role="radiogroup" aria-labelledby="l-vi" data-key="voiceInput"></div></div>
        <div class="row"><span class="lbl" id="l-mu">Before a word is one click<small>Times you type or say it first</small></span><div class="seg" role="radiogroup" aria-labelledby="l-mu" data-key="masteryUses"></div></div>
        <div class="row"><span class="lbl" id="l-ks">Say key<small class="kmsg">Talk is E, Space or Enter</small></span><button type="button" class="keybind" data-key="keySay" aria-labelledby="l-ks"></button></div>
        <div class="row"><span class="lbl" id="l-rm">Reduce motion<small>Less camera sway and fewer moving parts in menus</small></span><button type="button" class="sw" role="switch" data-key="reduceMotion" aria-labelledby="l-rm"><i></i></button></div>
        <div class="row"><span class="lbl" id="l-pf">Performance numbers<small>Frame rate and draw calls in a corner (F3)</small></span><button type="button" class="sw" role="switch" data-key="perfOverlay" aria-labelledby="l-pf"><i></i></button></div>
      </div>
      <footer><button type="button" class="done" data-close>Done</button></footer>
    </section>`,
  );
  s.id = 'settings';
  s.hidden = true;
  document.body.appendChild(s);
  for (const seg of s.querySelectorAll('.seg')) {
    const k = seg.dataset.key;
    for (const [v, l] of SEG[k]) {
      const b = el('button', '', l);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.v = v;
      if (k === 'voiceInput' && v === 'browser' && !browserSpeechAvailable()) continue;
      b.onclick = () => {
        setSetting(k, v);
        sfx('tap');
        if (k === 'voiceInput') {
          const note = s.querySelector('.vnote');
          note.textContent = VOICE_NOTE[v] || '';
          if (v === 'device')
            prepareVoice((f) => {
              note.textContent = `Downloading the voice model: ${Math.round(f * 100)}%`;
            })
              .then(() => {
                note.textContent = VOICE_NOTE.device;
              })
              .catch(() => {
                note.textContent = "Couldn't load the voice model. Typing still works.";
              });
        }
      };
      seg.appendChild(b);
    }
    seg.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const opts = SEG[k].map((o) => o[0]);
      const i = opts.indexOf(settings[k]);
      const n = opts[(i + (e.key === 'ArrowRight' ? 1 : opts.length - 1)) % opts.length];
      setSetting(k, n);
      seg.querySelector(`[data-v="${n}"]`).focus();
      e.preventDefault();
    });
  }
  const kb = s.querySelector('.keybind');
  kb.onclick = () => {
    if (kb.classList.contains('listening')) {
      stopListen();
      return;
    }
    kb.classList.add('listening');
    kb.textContent = 'Press a key';
    s.querySelector('.kmsg').textContent = 'Esc to cancel';
    listening = kb;
  };
  s.addEventListener('focusout', (e) => {
    if (e.target === kb && listening) stopListen();
  });
  for (const sw of s.querySelectorAll('.sw'))
    sw.onclick = () => {
      setSetting(sw.dataset.key, !settings[sw.dataset.key]);
      sfx('tap');
    };
  for (const r of s.querySelectorAll('input[type=range]')) {
    r.addEventListener('input', () => setSetting(r.dataset.key, +r.value / 100));
    r.addEventListener('change', () => {
      if (r.dataset.key !== 'music') sfx('tap');
    });
  }
  s.querySelectorAll('[data-close]').forEach((b) => {
    b.onclick = () => closeLayer(s);
  });
  s.addEventListener('keydown', (e) => {
    trap(s, e);
    e.stopPropagation();
  });
  syncSettings();
  return s;
}
// rebinding: the next key pressed becomes the Say key, unless the game already uses it
let listening = null;
const RESERVED = /^(Escape|Tab|Enter|Space|Key[WASDE]|Arrow\w+|Digit\d|Shift\w*|Control\w*|Alt\w*|Meta\w*)$/;
function stopListen(msg) {
  const kb = listening;
  listening = null;
  if (!kb) return;
  kb.classList.remove('listening');
  syncSettings();
  const m = $('#settings .kmsg');
  if (m) m.textContent = msg || 'Talk is E, Space or Enter';
}
function syncSettings() {
  const s = $('#settings');
  if (!s) return;
  for (const seg of s.querySelectorAll('.seg'))
    for (const b of seg.children) {
      const on = String(settings[seg.dataset.key]) === b.dataset.v;
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
    }
  for (const sw of s.querySelectorAll('.sw')) sw.setAttribute('aria-checked', !!settings[sw.dataset.key]);
  for (const r of s.querySelectorAll('input[type=range]')) {
    const v = Math.round((settings[r.dataset.key] ?? 0) * 100);
    if (+r.value !== v) r.value = v;
    r.nextElementSibling.textContent = v;
    r.style.setProperty('--p', v + '%');
  }
  const kb = s.querySelector('.keybind');
  if (kb && !kb.classList.contains('listening')) kb.textContent = keyLabel(settings.keySay || 'KeyQ');
  const vn = s.querySelector('.vnote');
  if (vn && !/Downloading/.test(vn.textContent)) vn.textContent = VOICE_NOTE[settings.voiceInput] || '';
  const q = s.querySelector('.qnow');
  if (q)
    q.textContent = settings.quality === 'auto' ? `Auto picks ${qualityTier()} on this device` : 'Takes effect at once';
}
onSettings(syncSettings);
function openSettings() {
  const s = buildSettings();
  syncSettings();
  s.querySelector('.done').dataset.first = '';
  openLayer(s, () => closeLayer(s));
}
shell.openSettings = openSettings;

// ---------- saves ----------
function slotCard(info, i, mode) {
  const b = el('button', 'slot' + (info ? '' : ' empty'));
  b.type = 'button';
  const label = info ? (info.kind === 'auto' ? 'Autosave' : `Slot ${i}`) : `Slot ${i}`;
  b.innerHTML = `<span class="thumb">${info && info.thumb ? `<img alt="" src="${info.thumb}">` : '<span class="blank"></span>'}</span>
    <span class="meta"><span class="nm">${label}</span>${info ? `<span class="pl">${PLACE_NAMES[info.place] || info.place}</span><span class="tm">${[info.date, PERIOD_NAMES[info.period]].filter(Boolean).join(' · ')}</span><span class="at">${info.at ? 'Saved ' + fmtTime(info.at) : ''}</span>` : `<span class="pl dim">${mode === 'save' ? 'Empty. Save here' : 'Empty'}</span>`}</span>`;
  b.setAttribute(
    'aria-label',
    info
      ? `${label}: ${PLACE_NAMES[info.place] || info.place}, ${PERIOD_NAMES[info.period] || ''}${info.at ? ', saved ' + fmtTime(info.at) : ''}`
      : `${label}, empty`,
  );
  return b;
}
function buildSaves() {
  let s = $('#saves');
  if (s) return s;
  s = el(
    'div',
    'layer sheet',
    `<div class="scrim" data-close></div>
    <section class="pane wide" role="dialog" aria-modal="true" aria-labelledby="savesTitle">
      <header><h2 id="savesTitle"></h2><button type="button" class="x" data-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
      <div class="slots mlist"></div>
      <p class="note" aria-live="polite"></p>
    </section>`,
  );
  s.id = 'saves';
  s.hidden = true;
  document.body.appendChild(s);
  s.querySelectorAll('[data-close]').forEach((b) => {
    b.onclick = () => closeLayer(s);
  });
  s.addEventListener('keydown', (e) => {
    trap(s, e);
    e.stopPropagation();
  });
  return s;
}
let pendingThumb = null;
function renderSaves(mode) {
  const s = buildSaves();
  s.dataset.mode = mode;
  s.querySelector('h2').textContent = mode === 'save' ? 'Save' : 'Continue';
  const list = s.querySelector('.slots');
  list.innerHTML = '';
  const note = s.querySelector('.note');
  note.textContent = '';
  if (mode === 'load') {
    const a = autosaveInfo();
    if (a) {
      const c = slotCard(a, 0, mode);
      c.onclick = () => loadInto(a);
      list.appendChild(c);
    }
  }
  for (const i of [1, 2, 3]) {
    const info = slotInfo(i);
    const c = slotCard(info, i, mode);
    if (mode === 'load') {
      if (!info) continue;
      c.onclick = () => loadInto(info);
    } else
      c.onclick = () => {
        if (info && !c.classList.contains('confirm')) {
          list.querySelectorAll('.confirm').forEach((x) => x.classList.remove('confirm'));
          c.classList.add('confirm');
          note.textContent = `Slot ${i} has a save. Press it again to replace it.`;
          return;
        }
        saveTo(i).then((ok) => {
          note.textContent = ok
            ? `Saved to slot ${i}.`
            : "Couldn't save: this browser isn't keeping data for the game.";
          if (ok) {
            sfx('ok');
            renderSaves('save');
            s.querySelector('.note').textContent = `Saved to slot ${i}.`;
            s.querySelectorAll('.slot')[i - 1]?.focus();
          }
        });
      };
    list.appendChild(c);
  }
  const first = list.querySelector('.slot:not([disabled])');
  list.querySelectorAll('[data-first]').forEach((x) => delete x.dataset.first);
  if (first) first.dataset.first = '';
  return s;
}
function openSaves(mode) {
  const s = renderSaves(mode);
  openLayer(s, () => closeLayer(s));
}
async function saveTo(i) {
  const g = game();
  if (!g || !g.place || g.runner?.recoveryError) return false;
  simSave(g);
  const data = store.get(SAVE_KEY);
  if (!data) return false;
  const thumb = pendingThumb || (await grab());
  return store.set(SLOT(i), { data, thumb, place: data.place, period: data.period, date: sim.date, at: Date.now() });
}
// loading a save: it becomes the current save, and the page restarts into it (the title's Continue does the rest)
function loadInto(info) {
  sfx('tap');
  if (info.kind === 'slot') {
    store.set(SAVE_KEY, info.data);
    store.set(AUTO_META, { at: info.at, thumb: info.thumb, date: info.date });
  }
  const t = $('#title');
  if (
    info.kind === 'auto' &&
    t &&
    !t.hidden &&
    t.querySelector('.cont') &&
    document.body.classList.contains('at-title')
  ) {
    // the autosave is what main.js already read: continue without a reload
    layers.slice().forEach((l) => closeLayer(l.el));
    t.querySelector('.cont').click();
    return;
  }
  try {
    sessionStorage.setItem(CONTINUE_FLAG, '1');
  } catch {
    /* */
  }
  document.body.classList.add('reloading');
  setTimeout(() => location.reload(), 250);
}

// keep a note of when the autosave last changed, with a thumbnail, for the Continue card
let lastAuto = null;
setInterval(async () => {
  const g = game();
  if (!g || !g.place || document.body.classList.contains('at-title') || SHELL) return;
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return;
  }
  if (!raw || raw === lastAuto) return;
  lastAuto = raw;
  const thumb = await grab();
  store.set(AUTO_META, { at: Date.now(), thumb, date: sim.date });
}, 2500);

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
    p.querySelector('.load').disabled = !anySave();
    p.querySelector('.where').textContent = [
      PLACE_NAMES[g?.place?.name] || '',
      PERIOD_NAMES[sim.period] || '',
      sim.date,
    ]
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

// Esc: closes the top layer (or a game panel that's open); otherwise opens or closes the pause menu. Registered
// in the capture phase so it sees the state before ui.js's own Esc handling. While paused, keys don't reach the game.
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
    if (listening) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === 'Escape') {
        stopListen();
        return;
      }
      if (RESERVED.test(e.code)) {
        stopListen(`${keyLabel(e.code)} is already used by the game`);
        return;
      }
      setSetting('keySay', e.code);
      sfx('ok');
      stopListen(`Say is now ${keyLabel(e.code)}`);
      return;
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
        } else closeLayer(top.el);
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
          store,
          SLOT,
          SAVE_KEY,
          AUTO_META,
          grab,
        }),
      )
      .catch((e) => console.error(e));
});
