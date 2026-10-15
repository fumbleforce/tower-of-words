// Shape of the shared editor composition, including supported legacy aliases and editor metadata.
// Prompt semantics stay in image-compose.js. Agent policy is a separate constraint layer.
const string = {type: 'string'}, number = {type: 'number'}, boolean = {type: 'boolean'};
const anyObject = {type: 'object'};
const array = items => ({type: 'array', items});
const either = (...anyOf) => ({anyOf});
const nullable = value => either(value, {type: 'null'});
const object = properties => ({type: 'object', properties, additionalProperties: false});
const record = additionalProperties => ({type: 'object', additionalProperties});
const numericString = {type: 'string', pattern: '^(?:[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?)?$'};
const numeric = either(number, numericString);
const strings = array(string);
// Existing provider formats: recipes.mjs catalog, source.mjs target and studio.py ID.
export const SCENE_ID_PATTERN = /^(?:local:[^:\s]+:[^:\s]+:[^:\s]+|public:game3d\/story\/[^#\s]+\.js#[^#\s]+|studio:(?:public|private):[a-f0-9]{32})$/;
// recipes.mjs imageSlots, model.js new picture beats, and studio.py's initial image:0.
export const IMAGE_SLOT_PATTERN = /^(?:(?:pic|file|new):\S+|image:[0-9]+)$/;
const person = object({appearance: string, clothing: string, appearanceNegative: string, clothingNegative: string});
const place = object({x: number, d: number, placed: boolean, facing: string, toward: string, gaze: string,
  lookAt: string, expression: string, height: string});
const start = object({image: string, denoise: number, mask: string});
const lora = object({file: string, weight: number});
const control = object({file: string, image: string, strength: number, start: number, end: number});
const hue = object({op: string, box: array(number), hmin: number, hmax: number, target: number, sat: number});
const promptOverride = nullable(either(string, object({positive: string, negative: string})));

export function compositionSchema(defaults) {
  const properties = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key,
    Array.isArray(value) ? strings : typeof value === 'object' && value !== null ? anyObject : {type: typeof value}]));
  Object.assign(properties, {
    characters: strings, chars: strings, cameras: strings, cams: strings, camera: string, sceneRefs: strings,
    negatives: nullable(strings), negs: nullable(strings), outfit: record(either(boolean, string)),
    seed: numeric, seedMode: {enum: ['fixed', 'random']}, rating: {enum: ['safe', 'sensitive', 'nsfw']},
    model: string, style: string, framing: string, negative: string,
    width: numeric, height: numeric, steps: numeric, cfg: numeric, count: numeric, referenceStrength: numeric, faceStrength: numeric, sampler: string, scheduler: string,
    man: boolean, stage: object({people: record(place), contact: string, lightFrom: string, mood: string}),
    start: nullable(start), loras: array(lora), control: nullable(control), huefix: array(hue),
    ipa: object({ref: string, on: boolean, strength: number, cutout: boolean}), omRef: string,
    fix: object({on: boolean, denoise: number}), override: promptOverride,
    styleNegOff: boolean, charNegOff: record(boolean), people: record(person),
    blockOverrides: record(record(record(string))), subplotId: string, imageSlot: string,
    castInitialized: boolean, sourceChecked: boolean, edited: boolean, toolsOpen: boolean,
    originalOpen: boolean, directionOpen: boolean, source: anyObject, original: anyObject,
    recipe: string, made: string, repaintText: string, example: string, placePreview: string,
  });
  return object(properties);
}

// A small reader for this schema's JSON Schema subset; no coercion or field removal.
export function validateCompositionShape(value, schema, at = 'composition') {
  if (schema.anyOf) {
    if (schema.anyOf.some(candidate => { try { validateCompositionShape(value, candidate, at); return true; } catch { return false; } })) return;
    throw new Error(`${at} does not match its supported type.`);
  }
  if (schema.pattern && (typeof value !== 'string' || !new RegExp(schema.pattern).test(value) || !Number.isFinite(+value)))
    throw new Error(`${at} must be a finite numeric input.`);
  if (schema.enum && !schema.enum.includes(value)) throw new Error(`${at} is not a supported value.`);
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (schema.type && (type !== schema.type || type === 'number' && !Number.isFinite(value)))
    throw new Error(`${at} must be ${schema.type}.`);
  if (type === 'array' && schema.items) value.forEach((item, index) => validateCompositionShape(item, schema.items, `${at}[${index}]`));
  if (type === 'object') for (const [key, item] of Object.entries(value)) {
    const child = Object.hasOwn(schema.properties || {}, key) ? schema.properties[key] : schema.additionalProperties;
    if (child === false) throw new Error(`${at}: unsupported field ${key}.`);
    if (child && child !== true) validateCompositionShape(item, child, `${at}.${key}`);
  }
}
