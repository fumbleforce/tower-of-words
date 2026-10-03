// Preview settings only: no VRM geometry, textures, metadata or game saves are written.
export const VARIANTS = ['base', 'recolour', 'flat'];
export const VIEWS = ['front', 'three', 'face', 'game'];
export const ANIMATIONS = ['idle', 'walk', 'run'];
export const EXPRESSIONS = ['neutral', 'happy', 'relaxed', 'angry', 'sad', 'surprised'];
export const TINTS = ['hair', 'top', 'bottom', 'shoes'];
export function defaults(variant = 'base') {
  return {
    version: 1,
    variant,
    view: 'three',
    animation: 'idle',
    paused: false,
    expression: 'neutral',
    strength: 0.5,
    blink: 0,
    headPitch: 0,
    glasses: variant !== 'base',
    tints: Object.fromEntries(TINTS.map((key) => [key, '#ffffff'])),
  };
}
export function parseConfig(text) {
  if (typeof text !== 'string' || text.length > 16384) throw new Error('Settings JSON must be smaller than 16 KB.');
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Use a JSON settings file downloaded from this preview.');
  }
  const fail = (label) => {
    throw new Error('Invalid setting: ' + label);
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('settings object');
  const expected = Object.keys(defaults());
  if (Object.keys(value).length !== expected.length || expected.some((key) => !Object.hasOwn(value, key)))
    fail('fields');
  if (value.version !== 1) fail('version');
  for (const [key, options] of [
    ['variant', VARIANTS],
    ['view', VIEWS],
    ['animation', ANIMATIONS],
    ['expression', EXPRESSIONS],
  ])
    if (!options.includes(value[key])) fail(key);
  for (const [key, min, max] of [
    ['strength', 0, 1],
    ['blink', 0, 1],
    ['headPitch', -25, 25],
  ])
    if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max) fail(key);
  for (const key of ['paused', 'glasses']) if (typeof value[key] !== 'boolean') fail(key);
  if (!value.tints || typeof value.tints !== 'object' || Object.keys(value.tints).length !== TINTS.length)
    fail('tints');
  for (const key of TINTS)
    if (typeof value.tints[key] !== 'string' || !/^#[a-f0-9]{6}$/i.test(value.tints[key])) fail(key + ' tint');
  return structuredClone(value);
}
export const storageKey = (variant) => 'amakawa.vrm-preview.v1.' + variant;
