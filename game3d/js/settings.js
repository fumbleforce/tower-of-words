// Player settings: text, sound, graphics and motion. Kept in localStorage, applied at once, and announced to
// whoever listens (ui.js for sound and text, main.js and post.js for the graphics tier, the camera for motion).
//   import { settings, setSetting, onSettings } from './settings.js'
//   window.__settings is the same object, for modules that don't import this one.
//   A 'amakawa:settings' event fires on window after every change (detail: { key, value, settings }).

const KEY = 'amakawa-settings';
const reduceDefault = (() => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
})();

export const DEFAULTS = {
  textSpeed: 'fast', // 'slow' | 'normal' | 'fast' | 'instant': how quickly a line writes itself out
  autoAdvance: false, // lines move on by themselves once the voice has finished
  master: 0.9,
  music: 0.7,
  voice: 1,
  ambience: 0.8, // 0..1
  voiceOn: true,
  quality: 'auto', // 'auto' | 'low' | 'medium' | 'high' (post.js reads the tier; see qualityTier())
  surfaces: true, // Surface detail: patterns in floors, walls, fabric and metal (look/procedural.js)
  reduceMotion: reduceDefault,
  keySay: 'KeyQ',
  uiSize: 1, // a multiplier on the viewport-based UI scale (0.85, 1, 1.2, 1.4)
  voiceInput: 'device', // 'off' | 'device' | 'browser': saying a word into the mic (the mic is only asked for on first press)
  voiceKey: 'KeyV', // hold-to-talk key
  voiceModel: 'auto', // 'auto' | 'base' | 'moon' | 'tiny' (testing only, no UI)
  masteryUses: 3, // how many times a word is typed or said before Say sends it with one click
  perfOverlay: false, // the performance numbers overlay (F3; js/perf/metrics.js)
};
// characters per second for each text speed (0 = all at once)
export const CPS = { slow: 28, normal: 55, fast: 110, instant: 0 };

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') return { ...DEFAULTS, ...s };
  } catch {
    /* storage off */
  }
  return { ...DEFAULTS };
}
export const settings = load();
window.__settings = settings;

const subs = new Set();
export function onSettings(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
export function setSetting(key, value) {
  if (!(key in DEFAULTS) || settings[key] === value) return;
  settings[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage off */
  }
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
export function resetSettings() {
  for (const k of Object.keys(DEFAULTS)) setSetting(k, DEFAULTS[k]);
}

// The tier the renderer should use. 'auto' picks low for software GL, medium on phones, high otherwise.
export function qualityTier() {
  if (settings.quality !== 'auto') return settings.quality;
  const r = window.__game && window.__game.renderer;
  if (r && r.userData && r.userData.software) return 'low';
  return isPhone() ? 'medium' : 'high';
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
