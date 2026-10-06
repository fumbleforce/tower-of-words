// Node-only boundaries for save characterization. Simulation, Runner, language and
// menu saving code remain real; rendering, audio, settings and input are stubbed.
const modules = {
  'ui.js': `export const ui = new Proxy({}, { get: (_, key) => globalThis.__saveTestUI?.[key] || (() => {}) });
    export const voice = async () => {}; export const sfx = () => {};
    export const setFace = () => {}; export const newScene = () => {}; export const PORTRAITS = {}; export const FACE = {};
    export const voiceThenBeat = async () => {}; export const unlockAudio = () => {};
    export const pauseAudio = () => {}; export const keyLabel = () => '';`,
  'settings.js': `export const settings = {}; export const setSetting = () => {};
    export const onSettings = () => {}; export const qualityTier = () => 'low';`,
  'onboard.js': 'export const startOnboarding = () => {}; export const resetOnboarding = () => {};',
  'speech.js': 'export const browserSpeechAvailable = () => false; export const prepareVoice = () => {};',
};
export async function resolve(specifier, context, next) {
  const source = specifier === 'three' ? 'export {};' : modules[specifier.split('/').at(-1)];
  if (source !== undefined) return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  const result = await next(url, context);
  if (url.endsWith('/game3d/js/menu.js')) {
    // Expose existing operations only in the test loader; do not copy their bodies.
    return { ...result, source: String(result.source) + '\nexport { saving, onTitleShow };\n' };
  }
  return result;
}
