// Node-only boundaries for the private mode switch test (test/unit/private-toggle.test.mjs). Runner, plugins.js and the
// story state stay real; the dialogue box, audio and input are stubbed, and settings is a small live copy of settings.js:
// setSetting tells its listeners, and private_mode is the live story flag.
const state = new URL('../../js/narrative/state.js', import.meta.url).href;
const modules = {
  'ui.js': `export const ui = new Proxy({}, { get: (_, key) => globalThis.__saveTestUI?.[key] || (() => {}) });
    export const voice = async () => {}; export const sfx = () => {}; export const playMusic = () => {};
    export const setFace = () => {}; export const newScene = () => {}; export const PORTRAITS = {}; export const FACE = {};
    export const voiceThenBeat = async () => {}; export const unlockAudio = () => {};
    export const pauseAudio = () => {}; export const keyLabel = () => '';`,
  'audio/core.js': `export const voice = async () => {}; export const stopVoice = () => { globalThis.__stopped = (globalThis.__stopped || 0) + 1; };
    export const setClipResolver = () => {};`,
  'settings.js': `import { flags } from ${JSON.stringify(state)};
    export const settings = globalThis.__settings = { privateMode: false };
    const subs = new Set();
    export const onSettings = (fn) => (subs.add(fn), () => subs.delete(fn));
    export function setSetting(key, value) { settings[key] = value; for (const fn of subs) fn(key, value, settings); }
    export function forceSetting(key, value) { settings[key] = value; }
    export const qualityTier = () => 'low'; export const frameCap = () => 30; export const autoSavesPower = () => true;
    Object.defineProperty(flags, 'private_mode', { get: () => !!settings.privateMode, set() {}, configurable: true, enumerable: false });`,
  'onboard.js': 'export const startOnboarding = () => {}; export const resetOnboarding = () => {};',
  'speech.js': 'export const browserSpeechAvailable = () => false; export const prepareVoice = () => {};',
};
export async function resolve(specifier, context, next) {
  const key = specifier.endsWith('/audio/core.js') ? 'audio/core.js' : specifier.split('/').at(-1);
  const source = specifier === 'three' ? 'export {};' : modules[key];
  if (source !== undefined) return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };
  return next(specifier, context);
}
