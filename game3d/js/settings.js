// Player settings: text, sound, graphics and motion. Kept (storage.js), applied at once, and announced to
// whoever listens (ui.js for sound and text, main.js and post.js for the graphics tier, the camera for motion).
//   import { settings, setSetting, onSettings } from './settings.js'
//   window.__settings is the same object, for modules that don't import this one.
//   A 'amakawa:settings' event fires on window after every change (detail: { key, value, settings }).

import './full.js';
import { flags } from './narrative/state.js';
import { storage } from './storage.js';

const KEY = 'amakawa-settings';
const reduceDefault = (() => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
})();
const phoneDefault = (() => {
  try {
    return (
      matchMedia('(pointer: coarse)').matches ||
      Math.min(innerWidth || screen.width, innerHeight || screen.height) < 600
    );
  } catch {
    return false;
  }
})();

export const DEFAULTS = {
  textSpeed: 'fast', // 'slow' | 'normal' | 'fast' | 'instant': how quickly a line writes itself out
  autoSpeed: 'normal', // 'slow' | 'normal' | 'fast': how long Auto (the dialogue box's toggle, ui/vn-controls.js) waits
  skipUnread: false, // Skip runs through lines not seen before too (off: it stops at the first new line)
  master: 0.9,
  music: 0.7,
  voice: 1,
  ambience: 0.8, // 0..1
  voiceOn: true,
  quality: 'auto', // 'auto' | 'low' | 'medium' | 'high' (post.js reads the tier; see qualityTier())
  frameCap: 'auto', // 'auto' | '30' | '60' | 'off': the most frames a second (see frameCap(), perf/view.js)
  surfaces: true, // Surface detail: patterns in floors, walls, fabric and metal (look/procedural.js)
  reduceMotion: reduceDefault,
  cameraMode: 'overview', // desktop only: 'overview' | 'follow' (approved camera-plan-1 preset 1c)
  keySay: 'KeyQ',
  uiSize: 1, // a multiplier on the viewport-based UI scale (0.85, 1, 1.2, 1.4)
  voiceInput: 'device', // 'off' | 'device' | 'browser': saying a word into the mic (the mic is only asked for on first press)
  voiceKey: 'KeyV', // hold-to-talk key
  voiceModel: 'auto', // 'auto' | 'base' | 'moon' | 'tiny' (testing only, no UI)
  masteryUses: 3, // how many times a word is typed or said before Say sends it with one click
  skipChecks: false, // a word's typing prompt is a line showing the word, passed without typing (narrative/hooks/progression.js)
  perfOverlay: false, // the performance numbers overlay (F3; js/perf/metrics.js)
  // full builds only (js/full.js): adult scenes. Off on a phone until turned on (GUIDE, Rewards and privacy).
  ...(__FULL__ ? { privateMode: !phoneDefault } : {}),
};
// characters per second for each text speed (0 = all at once)
export const CPS = { slow: 28, normal: 55, fast: 110, instant: 0 };
// Auto's wait on a line with no voice: a base plus a time per character (ms), for each auto speed
export const AUTO_WAIT = { slow: [1800, 70], normal: [1300, 45], fast: [800, 28] };

// One-time changes to saved settings, in order; v is the version they were saved at (missing = 0).
//   1, 2: the chibi look's switch, on and then off (2026-10-03 and 10-04).
//   3: the chibi look was removed, and its saved switch with it.
const VERSION = 3;
function migrate(s) {
  delete s.chibi;
  s.v = VERSION;
  return s;
}

function load() {
  const s = storage.get(KEY);
  if (s && typeof s === 'object') {
    if ((s.v || 0) < VERSION) storage.set(KEY, migrate(s));
    return { ...DEFAULTS, ...s };
  }
  return { ...DEFAULTS, v: VERSION }; // saved with the first change, so the migrations above never run on it
}
export const settings = load();
window.__settings = settings;
// private_mode: the setting as a story flag, read live, so a scene's condition follows a switch mid-game. Never saved (not
// enumerable) and a write is ignored, so a save made in either mode reads the mode the player has now (plugins.js).
if (__FULL__)
  Object.defineProperty(flags, 'private_mode', {
    get: () => !!settings.privateMode,
    set() {},
    configurable: true,
    enumerable: false,
  });
flags.skill_checks = !settings.skipChecks; // the save keeps both choices of the new-game screen (ui/new-game.js)

const subs = new Set();
export function onSettings(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function setSetting(key, value) {
  if (!(key in DEFAULTS) || settings[key] === value) return;
  settings[key] = value;
  if (key === 'skipChecks') flags.skill_checks = !value;
  storage.set(KEY, settings);
  apply();
  for (const fn of subs) {
    try {
      fn(key, value, settings);
    } catch (e) {
      console.error(e);
    }
  }
  window.dispatchEvent(new CustomEvent('amakawa:settings', { detail: { key, value, settings } }));
}
// a setting changed for this page only, not saved and not announced (the local scene viewer, plugins.js installViewer)
export function forceSetting(key, value) {
  settings[key] = value;
}
export function resetSettings() {
  for (const k of Object.keys(DEFAULTS)) setSetting(k, DEFAULTS[k]);
}

// The tier the renderer should use. 'auto' picks low for software GL, medium on phones and integrated GPUs (a laptop
// without a graphics card ran hot at high, perf/gpu.js), high otherwise.
export function qualityTier() {
  if (settings.quality !== 'auto') return settings.quality;
  const r = window.__game && window.__game.renderer;
  if (r && r.userData && r.userData.software) return 'low';
  return isPhone() || r?.userData?.integrated ? 'medium' : 'high';
}
// Whether 'auto' saves power: software GL, a phone or integrated graphics, where every frame costs battery and heat
// (a laptop without a graphics card ran hot, notes/PERF.md). A desktop graphics card draws at the screen's own rate.
export function autoSavesPower() {
  const r = window.__game && window.__game.renderer;
  return !!(r?.userData?.software || r?.userData?.integrated || isPhone());
}
// The most frames a second the game draws in play. 'auto': no limit on a desktop graphics card, so a 120 or 144 Hz
// screen gets every refresh (Jørgen, RTX 3080 at 120 Hz: "why not 120 like my screen?"); where Auto saves power, 30
// with software GL and 60 otherwise. ?fps=N overrides (0: no cap). The title and pause on Auto: perf/view.js.
export function frameCap() {
  const q = new URLSearchParams(location.search);
  if (q.has('fps')) return +q.get('fps') || 0;
  const s = settings.frameCap;
  if (s === 'off') return 0;
  if (s !== 'auto') return +s || 60;
  if (!autoSavesPower()) return 0;
  return window.__game?.renderer?.userData?.software ? 30 : 60;
}
// the phone layout (body.phone) or a phone-sized screen: the tier above and the lighter phone places (perf/phone.js)
export const isPhone = () => document.body.classList.contains('phone') || Math.min(innerWidth, innerHeight) < 600;
window.__qualityTier = qualityTier;

// The UI scales with the screen (Jørgen, QHD: "default interface size is probably too small"): 1 at 1366 x 860 CSS
// px and up to 2 on big screens, times the UI size setting. Phones keep 1 (their layout is built for the size).
export function uiScale() {
  const w = innerWidth,
    h = innerHeight,
    phone = w / h < 0.8 || w < 640;
  const base = phone ? 1 : Math.max(1, Math.min(2, Math.min(w / 1366, h / 860)));
  return +(base * (+settings.uiSize || 1)).toFixed(3);
}
// body classes and the --ui scale that CSS reads
function apply() {
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
  document.documentElement.style.setProperty('--ui', uiScale());
}
addEventListener('resize', () => apply());
if (document.body) apply();
else addEventListener('DOMContentLoaded', apply);
