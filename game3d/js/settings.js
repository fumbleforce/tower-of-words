// Player settings: text, sound, graphics and motion. Kept in localStorage, applied at once, and announced to
// whoever listens (ui.js for sound and text, main.js and post.js for the graphics tier, the camera for motion).
//   import { settings, setSetting, onSettings } from './settings.js'
//   window.__settings is the same object, for modules that don't import this one.
//   A 'amakawa:settings' event fires on window after every change (detail: { key, value, settings }).

const KEY = 'amakawa-settings';
const reduceDefault = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();

export const DEFAULTS = {
  textSpeed: 'fast',      // 'slow' | 'normal' | 'fast' | 'instant': how quickly a line writes itself out
  autoAdvance: false,     // lines move on by themselves once the voice has finished
  master: 0.9, music: 0.7, voice: 1, ambience: 0.8,   // 0..1
  voiceOn: true,
  quality: 'auto',        // 'auto' | 'low' | 'medium' | 'high' (post.js reads the tier; see qualityTier())
  reduceMotion: reduceDefault,
  keySay: 'KeyQ',         // the Say key (KeyboardEvent.code); Talk stays on E, Space and Enter
};
// characters per second for each text speed (0 = all at once)
export const CPS = { slow: 28, normal: 55, fast: 110, instant: 0 };

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return { ...DEFAULTS, ...s }; } catch { /* storage off */ }
  return { ...DEFAULTS };
}
export const settings = load();
window.__settings = settings;

const subs = new Set();
export function onSettings(fn) { subs.add(fn); return () => subs.delete(fn); }
export function setSetting(key, value) {
  if (!(key in DEFAULTS) || settings[key] === value) return;
  settings[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage off */ }
  apply();
  for (const fn of subs) { try { fn(key, value, settings); } catch (e) { console.error(e); } }
  window.dispatchEvent(new CustomEvent('amakawa:settings', { detail: { key, value, settings } }));
}
export function resetSettings() { for (const k of Object.keys(DEFAULTS)) setSetting(k, DEFAULTS[k]); }

// The tier the renderer should use. 'auto' picks low for software GL, medium on phones, high otherwise.
export function qualityTier() {
  if (settings.quality !== 'auto') return settings.quality;
  const r = window.__game && window.__game.renderer;
  if (r && r.userData && r.userData.software) return 'low';
  const phone = document.body.classList.contains('phone') || Math.min(innerWidth, innerHeight) < 600;
  return phone ? 'medium' : 'high';
}
window.__qualityTier = qualityTier;

// body classes that CSS reads
function apply() {
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
}
if (document.body) apply(); else addEventListener('DOMContentLoaded', apply);
